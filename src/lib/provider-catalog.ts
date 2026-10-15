import { prisma } from "./prisma";

/**
 * Lecture du catalogue externe synchronisÃ© (CDC Â§4.7 : grilles/listes depuis
 * la base â€” rapide, paginable. L'API partenaire reste rÃ©servÃ©e Ã  la fiche et Ã 
 * la lecture, donnÃ©es volatiles).
 *
 * ProviderAsset â‰  Media : jamais mÃ©langÃ©s (Â§4.6).
 */

export interface ProviderCatalogItem {
  id: string;
  externalId: string;
  /** Fournisseur d'origine (Â« FRENCHSTREAM Â», Â« FRENCHMANGA Â») â€” dÃ©termine le lecteur. */
  provider: string;
  contentType: "MOVIE" | "SERIES" | "ANIME";
  /** Forme de lecture rÃ©elle chez le fournisseur ("movie" ou "tv"). */
  sourceType: "movie" | "tv" | null;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  totalEpisodes: number | null;
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
}): ProviderCatalogItem {
  return {
    id: a.externalId,
    externalId: a.externalId,
    provider: a.provider ?? "FRENCHSTREAM",
    contentType: a.contentType,
    sourceType: a.sourceType === "tv" ? "tv" : a.sourceType === "movie" ? "movie" : null,
    title: a.title,
    releaseYear: a.releaseYear,
    posterUrl: a.posterUrl,
    totalEpisodes: a.totalEpisodes,
  };
}

/** Fournisseur FrenchStream (films + sÃ©ries). */
const FRENCHSTREAM_PROVIDER = "FRENCHSTREAM";

/** Fournisseur French-Manga (animés). */
const FRENCHMANGA_PROVIDER = "FRENCHMANGA";

/**
 * Route de fiche/lecture d'un asset partenaire. Chaque fournisseur a son
 * lecteur : French-Manga et FrenchStream â†’ fiches dÃ©diÃ©es. Les animÃ©s peuvent
 * Ãªtre des films OU des sÃ©ries : on se fie Ã  `sourceType`.
 */
export function providerItemHref(
  item: Pick<ProviderCatalogItem, "contentType" | "sourceType" | "externalId"> &
    Partial<Pick<ProviderCatalogItem, "provider">>,
): string {
  if (item.provider === FRENCHSTREAM_PROVIDER) {
    return item.contentType === "SERIES"
      ? `/series/frenchstream/${item.externalId}`
      : `/films/frenchstream/${item.externalId}`;
  }
  // FrenchManga (animés) : lecteur dédié `/series/frenchmanga/`. Router vers la
  // page FrenchStream ferait échouer `/ep-data.php` (IDs inconnus) → message
  // « indisponible » à tort. La page FrenchManga lit l'API JSON du site ; un
  // film d'animation n'est qu'un flux unique (épisode 1), géré de la même façon.
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
  providers: string[] = [FRENCHSTREAM_PROVIDER],
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(60, Math.max(1, Math.floor(pageSize) || 24));

  // Base pas prÃªte (build) â†’ page vide, pas d'erreur (CDC Â§11).
  if (process.env.DATABASE_READY !== "true") {
    return { items: [], page: safePage, pageSize: safeSize, totalItems: 0, totalPages: 0 };
  }

  try {
    // Seuls les titres publiÃ©s par l'admin apparaissent dans la grille.
    const where = { provider: { in: providers }, contentType, isPublished: true } as const;
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

/** Films du catalogue partenaire â€” French-Stream uniquement. */
export function getPartnerMovies(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("MOVIE", page, pageSize, [FRENCHSTREAM_PROVIDER]);
}

/** SÃ©ries du catalogue partenaire â€” French-Stream uniquement. */
export function getPartnerSeries(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("SERIES", page, pageSize, [FRENCHSTREAM_PROVIDER]);
}

/** Films & sÃ©ries FrenchStream â€” mis en avant sur l'accueil.
 *  FrenchStream fournit une affiche pour la quasi-totalitÃ© de ses titres.
 */
export function getFrenchStreamMovies(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("MOVIE", page, pageSize, [FRENCHSTREAM_PROVIDER]);
}

export function getFrenchStreamSeries(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("SERIES", page, pageSize, [FRENCHSTREAM_PROVIDER]);
}
/**
 * Animés / mangas du catalogue partenaire — French-Manga uniquement.
 * (Le type `ANIME` n'est utilisé que par ce fournisseur.)
 */
export function getPartnerAnimes(page = 1, pageSize = 24): Promise<ProviderCatalogPage> {
  return listAssets("ANIME", page, pageSize, [FRENCHMANGA_PROVIDER]);
}

/**
 * Derniers ajouts au catalogue (tous types : films, series, animes), tries du
 * plus recemment synchronise au plus ancien. Alimente la page « Nouveautes ».
 * Seuls les titres publies par l'admin sont retournes.
 */
export async function getLatestPartnerAssets(limit = 60): Promise<ProviderCatalogItem[]> {
  if (process.env.DATABASE_READY !== "true") return [];
  const take = Math.min(60, Math.max(1, limit));
  try {
    const rows = await prisma.providerAsset.findMany({
      where: {
        provider: { in: [FRENCHMANGA_PROVIDER, FRENCHSTREAM_PROVIDER] },
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
 * Films les plus tendance â€” dans l'ordre Â« popular Â» du fournisseur (rang
 * stockÃ© lors de la synchro). ComplÃ¨te avec les derniers films synchronisÃ©s
 * si le classement popular est incomplet (avant premiÃ¨re synchro).
 */
export async function getTrendingPartnerMovies(limit = 18): Promise<ProviderCatalogItem[]> {
  if (process.env.DATABASE_READY !== "true") return [];
  const take = Math.min(60, Math.max(1, limit));
  try {
    const trending = await prisma.providerAsset.findMany({
      where: { provider: FRENCHSTREAM_PROVIDER, contentType: "MOVIE", isPublished: true, trendingRank: { not: null } },
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
        where: { provider: FRENCHSTREAM_PROVIDER, contentType: "MOVIE", isPublished: true, externalId: { notIn: [...seen] } },
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
/* Â« Ã€ la une Â» â€” sÃ©lection rotative par pÃ©riode                        */
/* ------------------------------------------------------------------ */

/**
 * DurÃ©e d'une pÃ©riode Ã©ditoriale (2 semaines). La sÃ©lection Â« Ã  la une Â»
 * change automatiquement au dÃ©but de chaque pÃ©riode, sans cron ni tÃ¢che de
 * fond : c'est une fonction PURE de la date courante (Â§4.7).
 */
export const FEATURED_PERIOD_DAYS = 14;

/**
 * Index de pÃ©riode courante (0, 1, 2, â€¦), stable pendant 14 jours puis
 * incrÃ©mentÃ©. Sert de graine dÃ©terministe Ã  la rotation Â« Ã  la une Â».
 */
export function getFeaturedPeriodIndex(now: Date = new Date()): number {
  const MS_PER_PERIOD = FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  // Ancre arbitraire fixe (Ã©poque) â†’ pÃ©riodes calendaires stables.
  return Math.floor(now.getTime() / MS_PER_PERIOD);
}

/** PRNG dÃ©terministe (mulberry32) â€” mÃªme graine â‡’ mÃªme sÃ©quence. */
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
 * MÃ©lange dÃ©terministe d'une copie du tableau (Fisher-Yates semÃ©). Ne mute
 * pas l'entrÃ©e. Deux appels avec le mÃªme `seed` donnent le mÃªme ordre.
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
  /** Date (ISO) du prochain renouvellement de la sÃ©lection. */
  renewalAt: string;
  /** LibellÃ© lisible du prochain renouvellement (fr-FR). */
  renewalLabel: string;
  /** Index de pÃ©riode Ã©ditoriale courant. */
  period: number;
}

/**
 * SÃ©lection Â« Ã  la une Â» : les films les plus tendance (ordre Â« popular Â» du
 * fournisseur), mÃ©langÃ©s de faÃ§on dÃ©terministe selon la pÃ©riode courante pour
 * renouveler la vitrine. Change automatiquement toutes les FEATURED_PERIOD_DAYS
 * (2 semaines).
 *
 * Tout le calcul temporel est fait ICI (hors composant) : la sÃ©lection est
 * dÃ©terministe pour une pÃ©riode donnÃ©e, et le composant n'appelle jamais
 * `Date.now()` (rÃ¨gle de puretÃ© React sous Cache Components). Chaque entrÃ©e
 * porte l'URL de fiche adaptÃ©e Ã  son type.
 */
export async function getFeaturedPartner(
  limit = 12,
  now: Date = new Date(),
): Promise<FeaturedSelection> {
  const empty: FeaturedSelection = { items: [], renewalAt: "", renewalLabel: "", period: -1 };
  if (process.env.DATABASE_READY !== "true") return empty;

  const period = getFeaturedPeriodIndex(now);
  // Graine dÃ©pendant de la pÃ©riode : l'ordre de la vitrine se renouvelle Ã 
  // chaque pÃ©riode sans changer les donnÃ©es (rotation dÃ©terministe).
  const seed = (period * 2654435761 + hashString("trending")) >>> 0;

  const periodMs = FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const renewalAt = new Date((period + 1) * periodMs);
  const renewalLabel = renewalAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  try {
    // Pool plus large que la vitrine â†’ la composition varie aussi d'une pÃ©riode
    // Ã  l'autre tout en restant dominÃ©e par les meilleures tendances.
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

/** Hachage de chaÃ®ne stable (FNV-1a 32 bits) â†’ graine entiÃ¨re. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Recherche locale sur les assets synchronisÃ©s (films + sÃ©ries). */
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
        provider: { in: [FRENCHMANGA_PROVIDER, FRENCHSTREAM_PROVIDER] },
        // Films, sÃ©ries, animÃ©s et mangas : la recherche locale couvre tout le
        // catalogue synchronisÃ© (chaque fournisseur a son lecteur).
        contentType: { in: ["MOVIE", "SERIES", "ANIME"] },
        // Seuls les titres publiÃ©s par l'admin sont trouvables.
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
