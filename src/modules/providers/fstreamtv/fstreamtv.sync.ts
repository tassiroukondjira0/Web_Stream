/**
 * Synchronisation du catalogue `french-streaming.tv` (films + séries) → PostgreSQL.
 *
 * Même contrat que la synchro partenaire : pages récupérées en parallèle (borné),
 * upserts groupés idempotents, purge des assets disparus depuis N jours, journal
 * d'exécution (ProviderSyncRun). Fournisseur distinct (`FSTREAMTV`) pour servir
 * de repli de flux quand le partenaire principal n'expose rien.
 *
 * Usage : npm run fstreamtv:sync [-- --film-pages=200 --series-pages=200] [-- --dry-run]
 */

import { prisma } from "@/lib/prisma";
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { markProviderCoverage } from "../coverage";
import { FSTREAMTV_PROVIDER, fetchCatalogPage } from "./fstreamtv.client";
import type { PartnerItem } from "../partner/partner.types";

const DEFAULT_PAGES = 5;
const MAX_PAGES = 1500; // garde-fou : couvre tout le catalogue (films ~1115, séries ~615)
const PRUNE_AFTER_DAYS = 30;
/** Pages téléchargées simultanément (vitesse sans marteler le site). */
const FETCH_CONCURRENCY = 8;

export interface FStreamTvSyncOptions {
  filmPages?: number;
  seriesPages?: number;
  dryRun?: boolean;
  /** Recalcule `hasSources` après la synchro (défaut : true). */
  markCoverage?: boolean;
  /** Active la vérification Vidzy dans la passe de couverture (plus lent). */
  checkVidzy?: boolean;
}

export interface FStreamTvSyncReport {
  provider: string;
  filmPages: number;
  seriesPages: number;
  dryRun: boolean;
  fetchedMovies: number;
  fetchedSeries: number;
  upserted: number;
  pruned: number;
  durationMs: number;
}

interface UpsertRow {
  item: PartnerItem;
  contentType: "MOVIE" | "SERIES";
  sourceType: "movie" | "tv";
}

/** Récupère `pages` pages en parallèle (ordre préservé). */
async function fetchCatalogPages(
  fetchPage: (page: number) => Promise<PartnerItem[]>,
  pages: number,
): Promise<PartnerItem[][]> {
  if (pages <= 0) return [];
  const results: PartnerItem[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      results[page - 1] = await fetchPage(page);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages) }, worker));
  return results;
}

export async function syncFStreamTvCatalog(
  options: FStreamTvSyncOptions = {},
): Promise<FStreamTvSyncReport> {
  const startedAt = Date.now();
  const filmPages = Math.min(Math.max(options.filmPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const seriesPages = Math.min(Math.max(options.seriesPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const dryRun = options.dryRun ?? false;

  const [films, series] = await Promise.all([
    fetchCatalogPages((page) => fetchCatalogPage("film", page), filmPages),
    fetchCatalogPages((page) => fetchCatalogPage("serie", page), seriesPages),
  ]);

  const movieRows: UpsertRow[] = films
    .flat()
    .filter((item) => item.externalId && item.title)
    .map((item) => ({ item, contentType: "MOVIE" as const, sourceType: "movie" as const }));
  const seriesRows: UpsertRow[] = series
    .flat()
    .filter((item) => item.externalId && item.title)
    .map((item) => ({ item, contentType: "SERIES" as const, sourceType: "tv" as const }));

  const toBulk = (rows: UpsertRow[], startRank: number) =>
    rows.map((row, i) => ({
      provider: FSTREAMTV_PROVIDER,
      externalId: row.item.externalId,
      contentType: row.contentType,
      title: row.item.title,
      posterUrl: row.item.posterUrl,
      totalEpisodes: row.item.totalEpisodes,
      sourceType: row.sourceType,
      trendingRank: startRank + i,
    }));

  let upserted = 0;
  if (!dryRun) {
    upserted += await bulkUpsertProviderAssets(toBulk(movieRows, 1));
    upserted += await bulkUpsertProviderAssets(toBulk(seriesRows, movieRows.length + 1));
  } else {
    upserted = movieRows.length + seriesRows.length;
  }

  let pruned = 0;
  if (!dryRun) {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const stale = await prisma.providerAsset.findMany({
      where: { provider: FSTREAMTV_PROVIDER, lastSeenAt: { lt: cutoff } },
      select: { id: true },
    });
    if (stale.length > 0) {
      const res = await prisma.providerAsset.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
      pruned = res.count;
    }

    await prisma.providerSyncRun.create({
      data: {
        provider: FSTREAMTV_PROVIDER,
        status: upserted > 0 ? "SUCCESS" : filmPages + seriesPages > 0 ? "PARTIAL" : "FAILED",
        pagesFetched: filmPages + seriesPages,
        assetsUpserted: upserted,
        assetsPruned: pruned,
        finishedAt: new Date(),
      },
    });

    // Le catalogue vient de changer : on recalcule la disponibilité des titres
    // TMDB (marquage `hasSources`) pour que les grilles restent exactes.
    if (options.markCoverage !== false) {
      await markProviderCoverage({ checkVidzy: options.checkVidzy }).catch(() => undefined);
    }
  }

  return {
    provider: FSTREAMTV_PROVIDER,
    filmPages,
    seriesPages,
    dryRun,
    fetchedMovies: movieRows.length,
    fetchedSeries: seriesRows.length,
    upserted,
    pruned,
    durationMs: Date.now() - startedAt,
  };
}
