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
  /** Slug de catégorie / genre pour le filtrage. */
  categorySlug?: string;
  /** Langue de diffusion (VF, VOSTFR, VO…). */
  language?: string;
  /** Thème / ambiance. */
  theme?: string;
}

export interface ProviderCatalogPage {
  items: ProviderCatalogItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AssetFilters {
  /** Slug de catégorie/genre. */
  categorySlug?: string | null;
  /** Langue de diffusion. */
  language?: string | null;
  /** Thème. */
  theme?: string | null;
  /** Année de sortie (exacte). */
  releaseYear?: number | null;
  /** Slug de plateforme (netflix, prime-video, disney…). */
  platform?: string | null;
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
  categorySlug?: string | null;
  language?: string | null;
  theme?: string | null;
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
    language: a.language ?? undefined,
    theme: a.theme ?? undefined,
  };
}

/** Fournisseur partenaire (films + séries). Valeur stockée en base. */
const PARTNER_PROVIDER = "FRENCHSTREAM";

/** Fournisseur French-Manga (animés). */
const FRENCHMANGA_PROVIDER = "FRENCHMANGA";

/**
 * Fournisseur TMDB (films + séries) — catalogue de métadonnées TMDB lu via
 * Vidzy. `externalId` y est l'identifiant TMDB (lecture directe, sans
 * résolution par titre).
 */
const TMDB_PROVIDER = "TMDB";

/** Fournisseurs alimentant les grilles films / séries. */
const MOVIE_SERIES_PROVIDERS = [PARTNER_PROVIDER, TMDB_PROVIDER];

/**
 * Route de fiche/lecture d'un asset partenaire. Les animés ont leur propre
 * section (`/animes/...`) quel que soit le fournisseur. Les films et séries
 * conservent leurs routes dédiées par fournisseur.
 */
export function providerItemHref(
  item: Pick<ProviderCatalogItem, "contentType" | "sourceType" | "externalId"> &
    Partial<Pick<ProviderCatalogItem, "provider">>,
): string {
  // Les animés sont classés dans la section « Animes », pas dans « Séries ».
  if (item.contentType === "ANIME") {
    const provider = (item.provider ?? PARTNER_PROVIDER).toLowerCase();
    // FRENCHSTREAM est servi par la route dédiée `/animes/partner/…`.
    const segment = provider === "frenchstream" ? "partner" : provider;
    return `/animes/${segment}/${item.externalId}`;
  }
  if (item.provider === TMDB_PROVIDER) {
    return item.contentType === "SERIES"
      ? `/series/tmdb/${item.externalId}`
      : `/films/tmdb/${item.externalId}`;
  }
  if (item.provider === PARTNER_PROVIDER) {
    return item.contentType === "SERIES"
      ? `/series/partner/${item.externalId}`
      : `/films/partner/${item.externalId}`;
  }
  // FrenchManga (animés) : lecteur dédié `/animes/frenchmanga/`.
  return `/animes/frenchmanga/${item.externalId}`;
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
      // Drame inclut les K-Drama : une série coréenne est taguée « k-drama »
      // (voir modules/providers/tmdb/tmdb.sync) mais reste un drame.
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
      // Plateformes stockées en liste encadrée (« ,netflix,disney, ») :
      // on cherche « ,slug, » pour éviter les correspondances partielles.
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

/** Animés / mangas du catalogue partenaire — French-Manga uniquement. */
export function getPartnerAnimes(
  page = 1,
  pageSize = 24,
  filters: AssetFilters = {},
): Promise<ProviderCatalogPage> {
  return listAssets("ANIME", page, pageSize, [FRENCHMANGA_PROVIDER], filters);
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
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER, TMDB_PROVIDER] },
        isPublished: true,
        isDuplicate: false,
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
      where: {
        provider: { in: MOVIE_SERIES_PROVIDERS },
        contentType: "MOVIE",
        isPublished: true,
        isDuplicate: false,
        trendingRank: { not: null },
      },
      orderBy: { trendingRank: "asc" },
      take,
      select: ASSET_SELECT,
    });
    let items = trending.map((r) =>
      toItem({ ...r, contentType: r.contentType as "MOVIE" | "SERIES" | "ANIME" }),
    );
    if (items.length < take) {
      // Exclut les titres déjà retenus (par couple fournisseur + identifiant,
      // car deux fournisseurs peuvent partager un même identifiant numérique).
      const exclude =
        trending.length > 0
          ? { NOT: { OR: trending.map((r) => ({ provider: r.provider, externalId: r.externalId })) } }
          : {};
      const fill = await prisma.providerAsset.findMany({
        where: {
          provider: { in: MOVIE_SERIES_PROVIDERS },
          contentType: "MOVIE",
          isPublished: true,
          isDuplicate: false,
          ...exclude,
        },
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
        provider: { in: [FRENCHMANGA_PROVIDER, PARTNER_PROVIDER, TMDB_PROVIDER] },
        contentType: { in: ["MOVIE", "SERIES", "ANIME"] },
        isPublished: true,
        isDuplicate: false,
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

/**
 * Langues disponibles pour le filtre.
 */
export const CATALOG_LANGUAGES = [
  { value: "vf", label: "VF" },
  { value: "vostfr", label: "VOSTFR" },
  { value: "vo", label: "VO" },
] as const;

/**
 * Thèmes disponibles pour le filtre.
 */
export const CATALOG_THEMES = [
  { value: "action", label: "Action" },
  { value: "drame", label: "Drame" },
  { value: "comedie", label: "Comédie" },
  { value: "horreur", label: "Horreur" },
  { value: "science-fiction", label: "Science-Fiction" },
  { value: "fantastique", label: "Fantastique" },
  { value: "romance", label: "Romance" },
  { value: "policier", label: "Policier / Thriller" },
  { value: "dessin-anime", label: "Dessin animé" },
] as const;

/**
 * Plateformes de diffusion disponibles pour le filtre. Les slugs sont ceux
 * stockés dans `ProviderAsset.platforms` (liste encadrée par des virgules) et
 * correspondent aux clés de `TMDB_WATCH_PROVIDER_IDS` (lib/tmdb.ts).
 */
export const CATALOG_PLATFORMS = [
  { value: "netflix", label: "Netflix" },
  { value: "prime-video", label: "Prime Video" },
  { value: "disney", label: "Disney+" },
  { value: "paramount", label: "Paramount+" },
  { value: "apple-tv", label: "Apple TV+" },
] as const;
