/**
 * Fonctions de requête base de données du catalogue externe.
 * Ce fichier est réservé au serveur — ne l'importez jamais dans un composant "use client".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import {
  ProviderCatalogItem,
  ProviderCatalogPage,
  AssetFilters,
  FeaturedSelection,
  toItem,
  providerItemHref,
  seededShuffle,
  getFeaturedPeriodIndex,
  FEATURED_PERIOD_DAYS,
} from "./provider-catalog.types";

/** Fournisseur partenaire (films + séries). Valeur stockée en base. */
const PARTNER_PROVIDER = "FRENCHSTREAM";

/** Fournisseur French-Manga (animés). */
const FRENCHMANGA_PROVIDER = "FRENCHMANGA";

/** Fournisseur de repli `french-streaming.tv`. */
const FSTREAMTV_PROVIDER = "FSTREAMTV";

/** Fournisseur TMDB. */
const TMDB_PROVIDER = "TMDB";

/** Fournisseurs alimentant les grilles films / séries. */
const MOVIE_SERIES_PROVIDERS = [PARTNER_PROVIDER, FSTREAMTV_PROVIDER, TMDB_PROVIDER];

/** Fournisseurs alimentant la grille animés. */
const ANIME_PROVIDERS = [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER, FSTREAMTV_PROVIDER, TMDB_PROVIDER];

const ASSET_SELECT = {
  externalId: true,
  provider: true,
  contentType: true,
  sourceType: true,
  title: true,
  releaseYear: true,
  posterUrl: true,
  totalEpisodes: true,
  isPublished: true,
  categorySlug: true,
  language: true,
  theme: true,
} as const;

async function listAssets(
  contentType: "MOVIE" | "SERIES" | "ANIME",
  page: number,
  pageSize: number,
  providers: string[] = [PARTNER_PROVIDER],
  filters: AssetFilters = {},
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(60, Math.max(1, Math.floor(pageSize) || 24));

  // Base pas prête (build) → page vide, pas d'erreur (CDC §11).
  if (process.env.DATABASE_READY !== "true") {
    return { items: [], page: safePage, pageSize: safeSize, totalItems: 0, totalPages: 0 };
  }

  try {
    const where = {
      provider: { in: providers },
      contentType,
      isPublished: true,
      isDuplicate: false,
      hasSources: true,
      ...(filters.categorySlug
        ? {
            categorySlug:
              filters.categorySlug === "drame"
                ? { in: ["drame", "k-drama"] }
                : filters.categorySlug,
          }
        : {}),
      ...(filters.language ? { language: filters.language } : {}),
      ...(filters.theme ? { theme: filters.theme } : {}),
      ...(filters.releaseYear ? { releaseYear: filters.releaseYear } : {}),
      ...(filters.platform ? { platforms: { contains: `,${filters.platform},` } } : {}),
    } as const;
    const [totalItems, rows] = await Promise.all([
      prisma.providerAsset.count({ where }),
      prisma.providerAsset.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        select: ASSET_SELECT,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
    return {
      items: rows.map((r: any) =>
        toItem({
          ...r,
          contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME",
        }),
      ),
      page: safePage,
      pageSize: safeSize,
      totalItems,
      totalPages,
    };
  } catch {
    return { items: [], page: safePage, pageSize: safeSize, totalItems: 0, totalPages: 0 };
  }
}

/** Films du catalogue externe (partenaire + TMDB). */
export function getPartnerMovies(
  page = 1,
  pageSize = 24,
  filters: AssetFilters = {},
): Promise<ProviderCatalogPage> {
  return listAssets("MOVIE", page, pageSize, MOVIE_SERIES_PROVIDERS, filters);
}

/** Séries du catalogue externe (partenaire + TMDB). */
export function getPartnerSeries(
  page = 1,
  pageSize = 24,
  filters: AssetFilters = {},
): Promise<ProviderCatalogPage> {
  return listAssets("SERIES", page, pageSize, MOVIE_SERIES_PROVIDERS, filters);
}

/** Animés / mangas du catalogue (French-Manga, partenaire et TMDB). */
export function getPartnerAnimes(
  page = 1,
  pageSize = 24,
  filters: AssetFilters = {},
): Promise<ProviderCatalogPage> {
  return listAssets("ANIME", page, pageSize, ANIME_PROVIDERS, filters);
}

/**
 * Derniers ajouts au catalogue (tous types : films, séries, animes), triés du
 * plus récemment synchronisé au plus ancien. Alimente la page « Nouveautés ».
 * Seuls les titres publiés par l'admin sont retournés.
 */
export async function getLatestPartnerAssets(limit = 60): Promise<ProviderCatalogItem[]> {
  if (process.env.DATABASE_READY !== "true") return [];
  const take = Math.min(60, Math.max(1, limit));
  try {
    const rows = await prisma.providerAsset.findMany({
      where: {
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER, FSTREAMTV_PROVIDER, TMDB_PROVIDER] },
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take,
      select: ASSET_SELECT,
    });
    return rows.map((r: any) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
  } catch {
    return [];
  }
}

/**
 * Films les plus tendance — dans l'ordre « popular » du fournisseur (rang
 * stocké lors de la synchro). Complète avec les dernières sorties (releaseYear)
 * si le classement popular est incomplet (avant première synchro).
 * Ne retourne que les titres ayant un poster.
 */
export async function getTrendingPartnerMovies(limit = 18): Promise<ProviderCatalogItem[]> {
  if (process.env.DATABASE_READY !== "true") return [];
  const take = Math.min(60, Math.max(1, limit));
  try {
    const trending = await prisma.providerAsset.findMany({
      where: {
        provider: { in: MOVIE_SERIES_PROVIDERS },
        contentType: "MOVIE",
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
        trendingRank: { not: null },
        posterUrl: { not: null },
      },
      orderBy: { trendingRank: "asc" },
      take,
      select: ASSET_SELECT,
    });
    let items = trending.map((r: any) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
    if (items.length < take) {
      const exclude =
        trending.length > 0
          ? { NOT: { OR: trending.map((r: any) => ({ provider: r.provider, externalId: r.externalId })) } }
          : {};
      const fill = await prisma.providerAsset.findMany({
        where: {
          provider: { in: MOVIE_SERIES_PROVIDERS },
          contentType: "MOVIE",
          isPublished: true,
          isDuplicate: false,
          hasSources: true,
          posterUrl: { not: null },
          ...exclude,
        },
        orderBy: [{ releaseYear: "desc" }, { title: "asc" }],
        take,
        select: ASSET_SELECT,
      });
      items = items.concat(
        fill.map((r: any) => toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" })),
      );
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Sélection « À la une » : les films les plus tendance (ordre « popular » du
 * fournisseur), mélangés de façon déterministe selon la période courante pour
 * renouveler la vitrine. Change automatiquement toutes les FEATURED_PERIOD_DAYS
 * (2 semaines).
 */
export async function getFeaturedPartner(
  limit = 12,
  now: Date,
): Promise<FeaturedSelection> {
  const empty: FeaturedSelection = { items: [], renewalAt: "", renewalLabel: "", period: -1 };
  if (process.env.DATABASE_READY !== "true") return empty;

  const period = getFeaturedPeriodIndex(now);
  const seed = (period * 2654435761 + hashString("trending")) >>> 0;

  const periodMs = FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const renewalAt = new Date((period + 1) * periodMs);
  const renewalLabel = renewalAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  try {
    const pool = await getTrendingPartnerMovies(60);
    const items = seededShuffle(pool, seed)
      .slice(0, Math.max(1, limit))
      .map((item) => ({
        provider: item.provider,
        externalId: item.externalId,
        contentType: item.contentType,
        title: item.title,
        posterUrl: item.posterUrl,
        releaseYear: item.releaseYear,
        href: providerItemHref(item),
      }));
    return {
      items,
      renewalAt: renewalAt.toISOString(),
      renewalLabel,
      period,
    };
  } catch {
    return { ...empty, period };
  }
}

/** Recherche locale sur les assets synchronisés (films + séries). */
export async function searchPartnerAssets(
  query: string,
  limit = 24,
): Promise<ProviderCatalogItem[]> {
  const q = query.trim();
  if (!q) return [];
  if (process.env.DATABASE_READY !== "true") return [];

  try {
    const rows = await prisma.providerAsset.findMany({
      where: {
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER, FSTREAMTV_PROVIDER, TMDB_PROVIDER] },
        contentType: { in: ["MOVIE", "SERIES", "ANIME"] },
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
      take: Math.min(60, Math.max(1, limit)),
      select: ASSET_SELECT,
    });
    return rows.map((r: any) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
  } catch {
    return [];
  }
}

export async function getPartnerAssetById(
  id: string,
  contentType: "MOVIE" | "SERIES" | "ANIME"
): Promise<ProviderCatalogItem | null> {
  if (process.env.DATABASE_READY !== "true") return null;

  try {
    const asset = await prisma.providerAsset.findFirst({
      where: {
        externalId: id,
        contentType,
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
        provider: {
          in:
            contentType === "ANIME"
              ? ANIME_PROVIDERS
              : MOVIE_SERIES_PROVIDERS,
        },
      },
      select: ASSET_SELECT,
    });

    if (!asset) return null;

    return toItem({
      ...asset,
      contentType: asset.contentType as "MOVIE" | "SERIES" | "ANIME",
    });
  } catch {
    return null;
  }
}

// Hachage de chaîne stable (FNV-1a 32 bits) → graine entière.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
