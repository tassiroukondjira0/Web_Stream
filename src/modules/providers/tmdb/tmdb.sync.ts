/**
 * Synchronisation du catalogue TMDB → PostgreSQL (provider « TMDB »).
 *
 * Élargit le catalogue films/séries sans dépendre d'un site de streaming : les
 * métadonnées proviennent de l'API TMDB (officielle, paginée jusqu'à 500 pages)
 * et la lecture est assurée par notre lecteur Vidzy via l'identifiant TMDB.
 *
 * Synchro incrémentale bornée : `pages` listes par source, upserts idempotents
 * groupés, purge des assets disparus depuis N jours, journal d'exécution
 * (ProviderSyncRun). Les pages d'une même liste sont récupérées en parallèle.
 *
 * Usage : npm run tmdb:sync [-- --pages=5] [-- --dry-run]
 */

import { prisma } from "@/lib/prisma";
import { fetchTmdbDiscover } from "@/lib/tmdb";
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { reclassifyProviderAssets, touchProviderAssets } from "../reclass";
import { dedupeAgainstTmdb } from "./dedupe";
import {
  TMDB_ANIMATION_GENRE_ID,
  TMDB_PROVIDER,
  fetchTmdbCatalogPage,
  type TmdbCatalogItem,
  type TmdbListSource,
} from "./tmdb.client";

const DEFAULT_PAGES = 2;
const MAX_PAGES = 500; // TMDB plafonne ses listes à 500 pages
/**
 * Pages de `/discover/tv?with_genres=16` parcourues pour reclasser en `ANIME`
 * les séries animées déjà présentes en base (section « Animes »).
 */
const DEFAULT_ANIME_PAGES = 150;
const MAX_ANIME_PAGES = 500;
const ANIME_FETCH_CONCURRENCY = 6;
const PRUNE_AFTER_DAYS = 30;
/** Pages téléchargées simultanément (limite le débit vers TMDB). */
const FETCH_CONCURRENCY = 6;

/**
 * Listes rapportées par défaut : films puis séries. L'ordre détermine le rang de
 * tendance (les entrées « popular » arrivent en tête).
 */
export const DEFAULT_SOURCES: TmdbListSource[] = [
  { path: "/movie/popular", kind: "movie" },
  { path: "/movie/top_rated", kind: "movie" },
  { path: "/movie/now_playing", kind: "movie" },
  { path: "/movie/upcoming", kind: "movie" },
  { path: "/tv/popular", kind: "tv" },
  { path: "/tv/top_rated", kind: "tv" },
  { path: "/tv/on_the_air", kind: "tv" },
];

/**
 * Séries dramatiques coréennes : alimente le filtre genre « K-Drama ».
 * TMDB n'expose pas de genre « k-drama » : on combine l'origine coréenne
 * (`with_origin_country=KR`) et le genre Drame (`with_genres=18`). Liste
 * distincte des sources classées, ajoutée en fin pour ne pas décaler le rang
 * de tendance.
 */
const KDramaSource: TmdbListSource = {
  path: "/discover/tv?with_origin_country=KR&with_genres=18&sort_by=popularity.desc",
  kind: "tv",
};

/** Taille des lots du tag « k-drama » (updateMany par identifiants). */
const KDrama_TAG_CHUNK = 500;

export interface TmdbSyncOptions {
  /** Nombre de pages rapportées par liste (1..MAX_PAGES). */
  pages?: number;
  /** Simulation : compte sans écrire ni purger. */
  dryRun?: boolean;
  /** Listes à rapporter (défaut : DEFAULT_SOURCES). */
  sources?: TmdbListSource[];
  /** Ne pas recalculer les doublons FRENCHSTREAM (défaut : false). */
  skipDedupe?: boolean;
  /** Ne pas rapporter ni taguer les séries dramatiques coréennes. */
  skipKDrama?: boolean;
}

export interface TmdbSyncReport {
  provider: string;
  pagesPerSource: number;
  dryRun: boolean;
  fetched: number;
  upserted: number;
  pruned: number;
  /** Titres FRENCHSTREAM masqués comme doublons TMDB (après recalcul). */
  duplicatesHidden: number;
  /** Séries coréennes taguées « k-drama » (après synchro). */
  kdramaTagged: number;
  /** Séries animées reclassées en `ANIME` pendant cette synchro. */
  animesReclassified: number;
  durationMs: number;
}

/** Rapport de reclassement des animés TMDB. */
export interface TmdbAnimeReclassReport {
  /** Titres animés trouvés dans `/discover/tv?with_genres=16`. */
  animationAssets: number;
  /** Séries reclassées en animés. */
  reclassified: number;
}

/** Récupère `pages` pages d'une liste en parallèle (ordre préservé). */
async function fetchSource(source: TmdbListSource, pages: number): Promise<TmdbCatalogItem[]> {
  const results: TmdbCatalogItem[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      results[page - 1] = await fetchTmdbCatalogPage(source, page);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages) }, worker));
  return results.flat();
}

/**
 * Reclasse en `ANIME` les séries TV animées déjà présentes en base.
 *
 * TMDB distingue films et séries mais pas les animés : une série TV du genre
 * Animation (id 16) doit apparaître dans la section « Animes », pas « Séries ».
 * On balaie `/discover/tv?with_genres=16` (tri par popularité) et on déplace
 * les lignes correspondantes ; les nouvelles synchros classent déjà via
 * `genre_ids` (voir tmdb.client).
 */
export async function classifyTmdbAnimes(
  options: { pages?: number; dryRun?: boolean } = {},
): Promise<TmdbAnimeReclassReport> {
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_ANIME_PAGES, 1), MAX_ANIME_PAGES);
  const results: string[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      try {
        const data = await fetchTmdbDiscover(
          "/discover/tv",
          { with_genres: String(TMDB_ANIMATION_GENRE_ID), sort_by: "popularity.desc" },
          page,
        );
        results[page - 1] = (data.results ?? [])
          .filter((item) => (item.genre_ids ?? []).includes(TMDB_ANIMATION_GENRE_ID))
          .map((item) => String(item.id));
      } catch {
        results[page - 1] = [];
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(ANIME_FETCH_CONCURRENCY, pages) }, worker),
  );

  const ids = Array.from(new Set(results.flat()));
  const report: TmdbAnimeReclassReport = { animationAssets: ids.length, reclassified: 0 };
  if (options.dryRun || ids.length === 0) return report;

  report.reclassified = await reclassifyProviderAssets(
    TMDB_PROVIDER,
    ids,
    "SERIES",
    "ANIME",
    { categorySlug: "animation" },
  );
  await touchProviderAssets(TMDB_PROVIDER, ids);
  return report;
}

/** Force le tag « k-drama » sur les séries coréennes remontées par discover.
 *
 * Étape POST-upsert obligatoire : les listes populaires ré-attribuent le genre
 * (COALESCE « nouvelle valeur gagne »), on réapplique donc le tag à chaque
 * synchro pour qu'il ne bascule jamais vers « drame ». */
async function tagKdramaSeries(externalIds: string[]): Promise<number> {
  if (externalIds.length === 0) return 0;
  let tagged = 0;
  for (let i = 0; i < externalIds.length; i += KDrama_TAG_CHUNK) {
    const batch = externalIds.slice(i, i + KDrama_TAG_CHUNK);
    const res = await prisma.providerAsset.updateMany({
      where: {
        provider: TMDB_PROVIDER,
        contentType: "SERIES",
        externalId: { in: batch },
      },
      data: { categorySlug: "k-drama" },
    });
    tagged += res.count;
  }
  return tagged;
}

/** Exécute une synchro incrémentale du catalogue TMDB et retourne le rapport. */
export async function syncTmdbCatalog(options: TmdbSyncOptions = {}): Promise<TmdbSyncReport> {
  const startedAt = Date.now();
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_PAGES, 1), MAX_PAGES);
  const dryRun = options.dryRun ?? false;
  const skipDedupe = options.skipDedupe ?? false;
  const sources = options.sources ?? DEFAULT_SOURCES;

  const perSource = await Promise.all(sources.map((source) => fetchSource(source, pages)));

  // Séries dramatiques coréennes (filtre genre « K-Drama ») : rapportées en
  // fin de liste pour préserver le rang de tendance des sources classées.
  const kdramaItems =
    options.skipKDrama === true ? [] : await fetchSource(KDramaSource, pages);
  if (kdramaItems.length > 0) perSource.push(kdramaItems);

  // Déduplication par (type, id) en préservant l'ordre de découverte, puis
  // attribution d'un rang de tendance par type (1 = plus tendance).
  const seen = new Set<string>();
  const rankByType: Record<"MOVIE" | "SERIES" | "ANIME", number> = {
    MOVIE: 0,
    SERIES: 0,
    ANIME: 0,
  };
  const rows: (TmdbCatalogItem & { trendingRank: number })[] = [];
  for (const items of perSource) {
    for (const item of items) {
      const key = `${item.contentType}:${item.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rankByType[item.contentType] += 1;
      rows.push({ ...item, trendingRank: rankByType[item.contentType] });
    }
  }

  const fetched = rows.length;
  const pagesFetched = sources.length > 0 ? pages : 0;
  const animeIds = rows
    .filter((row) => row.contentType === "ANIME")
    .map((row) => row.externalId);

  let upserted = 0;
  let animesReclassified = 0;
  if (!dryRun) {
    // Une série animée déjà en base sous `SERIES` doit être déplacée AVANT
    // l'upsert : la clé unique inclut `contentType`, sinon deux lignes
    // coexisteraient (une en Séries, une en Animes).
    if (animeIds.length > 0) {
      animesReclassified = await reclassifyProviderAssets(
        TMDB_PROVIDER,
        animeIds,
        "SERIES",
        "ANIME",
        { categorySlug: "animation" },
      );
      await touchProviderAssets(TMDB_PROVIDER, animeIds);
    }
    upserted = await bulkUpsertProviderAssets(
      rows.map((row) => ({
        provider: TMDB_PROVIDER,
        externalId: row.externalId,
        contentType: row.contentType,
        title: row.title,
        releaseYear: row.releaseYear,
        posterUrl: row.posterUrl,
        totalEpisodes: null,
        sourceType: row.sourceType,
        categorySlug: row.categorySlug,
        trendingRank: row.trendingRank,
      })),
    );
  } else {
    upserted = fetched;
  }

  let pruned = 0;
  let duplicatesHidden = 0;
  let kdramaTagged = 0;
  if (!dryRun) {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const stale = await prisma.providerAsset.findMany({
      where: { provider: TMDB_PROVIDER, lastSeenAt: { lt: cutoff } },
      select: { id: true },
    });
    if (stale.length > 0) {
      const res = await prisma.providerAsset.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
      pruned = res.count;
    }

    // TMDB fait autorité : masque les doublons FRENCHSTREAM (flag isDuplicate).
    if (!skipDedupe) {
      duplicatesHidden = (await dedupeAgainstTmdb()).hidden;
    }

    // Tag « k-drama » réappliqué APRÈS l'upsert (voir tagKdramaSeries) :
    // les séries coréennes doivent rester trouvables sous le genre K-Drama.
    kdramaTagged = await tagKdramaSeries(kdramaItems.map((item) => item.externalId));

    await prisma.providerSyncRun.create({
      data: {
        provider: TMDB_PROVIDER,
        status: upserted > 0 ? "SUCCESS" : pagesFetched > 0 ? "PARTIAL" : "FAILED",
        pagesFetched,
        assetsUpserted: upserted,
        assetsPruned: pruned,
        finishedAt: new Date(),
      },
    });
  }

  return {
    provider: TMDB_PROVIDER,
    pagesPerSource: pages,
    dryRun,
    fetched,
    upserted,
    pruned,
    duplicatesHidden,
    kdramaTagged,
    animesReclassified,
    durationMs: Date.now() - startedAt,
  };
}
