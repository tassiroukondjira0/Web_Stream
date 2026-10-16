/**
 * Synchronisation du catalogue partenaire (films + séries) → PostgreSQL.
 *
 * Optimisée pour de gros volumes : pages récupérées en parallèle (borné) et
 * upserts groupés par lots dans une transaction (moins d'allers-retours DB).
 * Upserts idempotents, purge des assets disparus depuis N jours, journal
 * d'exécution (ProviderSyncRun).
 *
 * Usage : npm run partner:sync [-- --film-pages=200 --series-pages=200] [-- --dry-run]
 */

import { prisma } from "@/lib/prisma";
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { PARTNER_PROVIDER, fetchPartnerCatalogPage } from "./partner.client";
import type { PartnerItem } from "./partner.types";

const DEFAULT_PAGES = 5;
const MAX_PAGES = 3500; // garde-fou : couvre tout le catalogue (films ~1410, séries ~2815)
const PRUNE_AFTER_DAYS = 30;
/** Pages téléchargées simultanément (anti-bot + vitesse). */
const FETCH_CONCURRENCY = 8;

export interface PartnerSyncOptions {
  filmPages?: number;
  seriesPages?: number;
  dryRun?: boolean;
}

export interface PartnerSyncReport {
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

/** Récupère `pages` pages de catégorie en parallèle (ordre préservé). */
async function fetchPages(
  kind: "films" | "series",
  pages: number,
): Promise<PartnerItem[]> {
  if (pages <= 0) return [];
  const results: PartnerItem[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      results[page - 1] = await fetchPartnerCatalogPage(kind, page);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages) }, worker));
  return results.flat();
}

export async function syncPartnerCatalog(
  options: PartnerSyncOptions = {},
): Promise<PartnerSyncReport> {
  const startedAt = Date.now();
  const filmPages = Math.min(Math.max(options.filmPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const seriesPages = Math.min(Math.max(options.seriesPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const dryRun = options.dryRun ?? false;

  const films = await fetchPages("films", filmPages);
  const series = await fetchPages("series", seriesPages);

  const movieRows = films
    .filter((item) => item.externalId && item.title)
    .map((item) => ({ item, contentType: "MOVIE" as const, sourceType: "movie" as const }));
  const seriesRows = series
    .filter((item) => item.externalId && item.title)
    .map((item) => ({ item, contentType: "SERIES" as const, sourceType: "tv" as const }));

  const toBulk = (rows: UpsertRow[], startRank: number) =>
    rows.map((row, i) => ({
      provider: PARTNER_PROVIDER,
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
      where: { provider: PARTNER_PROVIDER, lastSeenAt: { lt: cutoff } },
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
        provider: PARTNER_PROVIDER,
        status: upserted > 0 ? "SUCCESS" : filmPages + seriesPages > 0 ? "PARTIAL" : "FAILED",
        pagesFetched: filmPages + seriesPages,
        assetsUpserted: upserted,
        assetsPruned: pruned,
        finishedAt: new Date(),
      },
    });
  }

  return {
    provider: PARTNER_PROVIDER,
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
