/**
 * Types, constantes et fonctions pures du catalogue externe.
 * Ce fichier est sûr pour les composants client-side ("use client").
 * Les requêtes base de données sont dans provider-catalog.server.ts.
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
// Used by server module constants
const FRENCHMANGA_PROVIDER = "FRENCHMANGA";
void FRENCHMANGA_PROVIDER;

/**
 * Fournisseur de repli `french-streaming.tv` (films + séries). Alimente les
 * grilles en complément de TMDB/FRENCHSTREAM et sert de source à la lecture.
 */
const FSTREAMTV_PROVIDER = "FSTREAMTV";

/**
 * Fournisseur TMDB (films + séries) — catalogue de métadonnées TMDB lu via
 * Vidzy. `externalId` y est l'identifiant TMDB (lecture directe, sans
 * résolution par titre).
 */
const TMDB_PROVIDER = "TMDB";


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
  if (item.provider === FSTREAMTV_PROVIDER) {
    return item.contentType === "SERIES"
      ? `/series/fstreamtv/${item.externalId}`
      : `/films/fstreamtv/${item.externalId}`;
  }
  // FrenchManga (animés) : lecteur dédié `/animes/frenchmanga/`.
  return `/animes/frenchmanga/${item.externalId}`;
}

export function providerSlugHref(slug: string): string {
  const m = slug.match(/^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/i);
  if (!m) {
    return `/films/${slug}`;
  }

  const [, provider, kind, id] = m;
  const normalizedProvider = provider.toLowerCase();

  if (kind.toLowerCase() === "anime") {
    return `/animes/${normalizedProvider === "frenchstream" ? "partner" : normalizedProvider}/${id}`;
  }

  if (normalizedProvider === "frenchmanga") {
    return `/series/frenchmanga/${id}`;
  }

  const isSeries = kind.toLowerCase() === "series";
  if (normalizedProvider === "tmdb") {
    return isSeries ? `/series/tmdb/${id}` : `/films/tmdb/${id}`;
  }
  if (normalizedProvider === "fstreamtv") {
    return isSeries ? `/series/fstreamtv/${id}` : `/films/fstreamtv/${id}`;
  }

  return isSeries ? `/series/partner/${id}` : `/films/partner/${id}`;
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
  provider: string;
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

// Re-export toItem for use in server module
export { toItem };
