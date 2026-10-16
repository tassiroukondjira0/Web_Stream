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
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { dedupeAgainstTmdb } from "./dedupe";
import {
  TMDB_PROVIDER,
  fetchTmdbCatalogPage,
  type TmdbCatalogItem,
  type TmdbListSource,
} from "./tmdb.client";

const DEFAULT_PAGES = 2;
const MAX_PAGES = 500; // TMDB plafonne ses listes à 500 pages
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

export interface TmdbSyncOptions {
  /** Nombre de pages rapportées par liste (1..MAX_PAGES). */
  pages?: number;
  /** Simulation : compte sans écrire ni purger. */
  dryRun?: boolean;
  /** Listes à rapporter (défaut : DEFAULT_SOURCES). */
  sources?: TmdbListSource[];
  /** Ne pas recalculer les doublons FRENCHSTREAM (défaut : false). */
  skipDedupe?: boolean;
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
  durationMs: number;
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

/** Exécute une synchro incrémentale du catalogue TMDB et retourne le rapport. */
export async function syncTmdbCatalog(options: TmdbSyncOptions = {}): Promise<TmdbSyncReport> {
  const startedAt = Date.now();
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_PAGES, 1), MAX_PAGES);
  const dryRun = options.dryRun ?? false;
  const skipDedupe = options.skipDedupe ?? false;
  const sources = options.sources ?? DEFAULT_SOURCES;

  const perSource = await Promise.all(sources.map((source) => fetchSource(source, pages)));

  // Déduplication par (type, id) en préservant l'ordre de découverte, puis
  // attribution d'un rang de tendance par type (1 = plus tendance).
  const seen = new Set<string>();
  const rankByType: Record<"MOVIE" | "SERIES", number> = { MOVIE: 0, SERIES: 0 };
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

  let upserted = 0;
  if (!dryRun) {
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
    durationMs: Date.now() - startedAt,
  };
}
