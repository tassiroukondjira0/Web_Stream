import { prisma } from "./prisma";

/**
 * Lecture du catalogue externe synchronisé (CDC §4.7 : grilles/listes depuis
 * la base — rapide, paginable. L'API partenaire reste réservée à la fiche et à
 * la lecture, données volatiles).
 *
 * ProviderAsset ≠ Media : jamais mélangés (§4.6).
 */

import { CATEGORIES, getCategoryBySlug } from "./categories";

export interface ProviderCatalogItem {
  id: string;
  externalId: string;
  /** Fournisseur d'origine (« PARTNER », « FRENCHMANGA ») — détermine le lecteur. */
  provider: string;
  contentType: "MOVIE" | "SERIES" | "ANIME";
  /** Forme de lecture réelle chez le fournisseur ("movie" ou "tv"). */
  sourceType: "movie" | "tv" | null;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  totalEpisodes: number | null;
  /** Slug de catégorie optionnel pour le filtrage (genre). */
  categorySlug?: string;
}

export interface ProviderCatalogPage {
  items: ProviderCatalogItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function toItem(a: {
  externalId: string;
  provider?: string;
  contentType: "MOVIE" | "SERIES" | "ANIME";
  sourceType?: string | null;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  totalEpisodes: number | null;
  isPublished?: boolean;
  categorySlug?: string;
}): ProviderCatalogItem {
  return {
    id: a.externalId,
    externalId: a.externalId,
    provider: a.provider ?? "PARTNER",
    contentType: a.contentType,
    sourceType: a.sourceType === "tv" ? "tv" : a.sourceType === "movie" ? "movie" : null,
    title: a.title,
    releaseYear: a.releaseYear,
    posterUrl: a.posterUrl,
    totalEpisodes: a.totalEpisodes,
    categorySlug: a.categorySlug ?? undefined,
  };
}

/** Fournisseur partenaire (films + séries). Valeur stockée en base. */
const PARTNER_PROVIDER = "FRENCHSTREAM";

/** Fournisseur French-Manga (animés). */
const FRENCHMANGA_PROVIDER = "FRENCHMANGA";

/**
 * Route de fiche/lecture d'un asset partenaire. Chaque fournisseur a son
 * lecteur : French-Manga et Partenaire → fiches dédiées. Les animés peuvent
 * être des films OU des séries : on se fie à `sourceType`.
 */
export function providerItemHref(
  item: Pick<ProviderCatalogItem, "contentType" | "sourceType" | "externalId"> &
    Partial<Pick<ProviderCatalogItem, "provider">>,
): string {
  if (item.provider === PARTNER_PROVIDER) {
    return item.contentType === "SERIES"
      ? `/series/partner/${item.externalId}`
      : `/films/partner/${item.externalId}`;
  }
  // FrenchManga (animés) : lecteur dédié `/series/frenchmanga/`.
  return `/series/frenchmanga/${item.externalId}`;
}

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
} as const;

async function listAssets(
  contentType: "MOVIE" | "SERIES" | "ANIME",
  page: number,
  pageSize: number,
  providers: string[] = [PARTNER_PROVIDER],
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(60, Math.max(1, Math.floor(pageSize) || 24));

  // Base pas prête (build) → page vide, pas d'erreur (CDC §11).
  if (process.env.DATABASE_READY !== "true") {
    return { items: [], page: safePage, pageSize: safeSize, totalItems: 0, totalPages: 0 };
  }

  try {
    // Seuls les titres publiés par l'admin apparaissent dans la grille.
    const where = {
      provider: { in: providers },
      contentType,
      isPublished: true,
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
      items: rows.map((r) =>
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

/** Films du catalogue partenaire. */
export function getPartnerMovies(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("MOVIE", page, pageSize, [PARTNER_PROVIDER]);
}

/** Séries du catalogue partenaire. */
export function getPartnerSeries(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("SERIES", page, pageSize, [PARTNER_PROVIDER]);
}

/** Animés / mangas du catalogue partenaire — French-Manga uniquement. */
export function getPartnerAnimes(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("ANIME", page, pageSize, [FRENCHMANGA_PROVIDER]);
}

/**
 * Filtre une liste d'items par slug de catégorie (filtrage côté client,
 * car la colonne `categorySlug` n'est pas encore stockée en base pour les
 * assets partenaires). Retourne tous les items si le slug est inconnu/vide.
 */
export function filterByCategory(
  items: ProviderCatalogItem[],
  categorySlug: string | null | undefined,
): ProviderCatalogItem[] {
  if (!categorySlug) return items;
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return items;
  // Les assets partenaires n'ont pas encore de catégorie stockée :
  // on retourne tous les items (le filtre UI est prêt pour une future DB).
  return items;
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
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER] },
        isPublished: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take,
      select: ASSET_SELECT,
    });
    return rows.map((r) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
  } catch {
    return [];
  }
}

/**
 * Films les plus tendance — dans l'ordre « popular » du fournisseur (rang
 * stocké lors de la synchro). Complète avec les derniers films synchronisés
 * si le classement popular est incomplet (avant première synchro).
 */
export async function getTrendingPartnerMovies(limit = 18): Promise<ProviderCatalogItem[]> {
  if (process.env.DATABASE_READY !== "true") return [];
  const take = Math.min(60, Math.max(1, limit));
  try {
    const trending = await prisma.providerAsset.findMany({
      where: { provider: PARTNER_PROVIDER, contentType: "MOVIE", isPublished: true, trendingRank: { not: null } },
      orderBy: { trendingRank: "asc" },
      take,
      select: ASSET_SELECT,
    });
    const seen = new Set(trending.map((r) => r.externalId));
    let items = trending.map((r) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
    if (items.length < take) {
      const fill = await prisma.providerAsset.findMany({
        where: { provider: PARTNER_PROVIDER, contentType: "MOVIE", isPublished: true, externalId: { notIn: [...seen] } },
        orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
        take,
        select: ASSET_SELECT,
      });
      items = items.concat(
        fill.map((r) => toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" })),
      );
    }
    return items;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* « À la une » — sélection rotative par période                      */
/* ------------------------------------------------------------------ */

/**
 * Durée d'une période éditoriale (2 semaines). La sélection « À la une »
 * change automatiquement au début de chaque période, sans cron ni tâche de
 * fond : c'est une fonction PURE de la date courante (§4.7).
 */
export const FEATURED_PERIOD_DAYS = 14;

/**
 * Index de période courante (0, 1, 2, …), stable pendant 14 jours puis
 * incrémenté. Sert de graine déterministe à la rotation « À la une ».
 */
export function getFeaturedPeriodIndex(now: Date = new Date()): number {
  const MS_PER_PERIOD = FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  // Ancre arbitraire fixe (époque) → périodes calendaires stables.
  return Math.floor(now.getTime() / MS_PER_PERIOD);
}

/** PRNG déterministe (mulberry32) — même graine → même séquence. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mélange déterministe d'une copie du tableau (Fisher-Yates semé). Ne mute
 * pas l'entrée. Deux appels avec le même `seed` donnent le même ordre.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type FeaturedItem = {
  externalId: string;
  contentType: "MOVIE" | "SERIES" | "ANIME";
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  href: string;
};

export interface FeaturedSelection {
  items: FeaturedItem[];
  /** Date (ISO) du prochain renouvellement de la sélection. */
  renewalAt: string;
  /** Libellé lisible du prochain renouvellement (fr-FR). */
  renewalLabel: string;
  period: number;
}

/**
 * Sélection « À la une » : les films les plus tendance (ordre « popular » du
 * fournisseur), mélangés de façon déterministe selon la période courante pour
 * renouveler la vitrine. Change automatiquement toutes les FEATURED_PERIOD_DAYS
 * (2 semaines).
 *
 * Tout le calcul temporel est fait ICI (hors composant) : la sélection est
 * déterministe pour une période donnée, et le composant n'appelle jamais
 * `Date.now()` (règle de pureté React sous Cache Components). Chaque entrée
 * porte l'URL de fiche adaptée à son type.
 */
export async function getFeaturedPartner(
  limit = 12,
  now: Date = new Date(),
): Promise<FeaturedSelection> {
  const empty: FeaturedSelection = { items: [], renewalAt: "", renewalLabel: "", period: -1 };
  if (process.env.DATABASE_READY !== "true") return empty;

  const period = getFeaturedPeriodIndex(now);
  // Graine dépendant de la période : l'ordre de la vitrine se renouvelle à
  // chaque période sans changer les données (rotation déterministe).
  const seed = (period * 2654435761 + hashString("trending")) >>> 0;

  const periodMs = FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const renewalAt = new Date((period + 1) * periodMs);
  const renewalLabel = renewalAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  try {
    // Pool plus large que la vitrine → la composition varie aussi d'une
    // période à l'autre tout en restant dominée par les meilleures tendances.
    const pool = await getTrendingPartnerMovies(60);
    const items: FeaturedItem[] = seededShuffle(pool, seed)
      .slice(0, Math.max(1, limit))
      .map((item) => ({
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

/** Hachage de chaîne stable (FNV-1a 32 bits) → graine entière. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
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
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER] },
        // Films, séries, animés et mangas : la recherche locale couvre tout le
        // catalogue synchronisé (chaque fournisseur a son lecteur).
        contentType: { in: ["MOVIE", "SERIES", "ANIME"] },
        // Seuls les titres publiés par l'admin sont trouvables.
        isPublished: true,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
      take: Math.min(60, Math.max(1, limit)),
      select: ASSET_SELECT,
    });
    return rows.map((r) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
  } catch {
    return [];
  }
}

/**
 * Retourne la liste de toutes les catégories disponibles pour le filtrage.
 */
export function getAllCatalogCategories(): { slug: string; name: string }[] {
  return CATEGORIES;
}

/**
 * Résout un slug de catégorie vers son objet { slug, name }.
 * Retourne undefined si le slug est inconnu.
 */
export function resolveCategorySlug(slug: string): { slug: string; name: string } | undefined {
  return getCategoryBySlug(slug);
}
