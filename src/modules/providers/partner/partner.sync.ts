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
import { reclassifyProviderAssets, touchProviderAssets } from "../reclass";
import {
  PARTNER_PROVIDER,
  fetchAnimationSeriesPage,
  fetchPartnerCatalogPage,
} from "./partner.client";
import type { PartnerItem } from "./partner.types";

const DEFAULT_PAGES = 5;
const MAX_PAGES = 3500; // garde-fou : couvre tout le catalogue (films ~1410, séries ~2815)
/**
 * Pages balayées dans la catégorie « Animation » pour reclasser les animes.
 * La catégorie compte ~70 pages ; on garde une marge.
 */
const DEFAULT_ANIME_PAGES = 80;
const MAX_ANIME_PAGES = 400;
const PRUNE_AFTER_DAYS = 30;
/** Pages téléchargées simultanément (anti-bot + vitesse). */
const FETCH_CONCURRENCY = 8;

export interface PartnerSyncOptions {
  filmPages?: number;
  seriesPages?: number;
  /** Pages de la catégorie « Animation » parcourues pour le reclassement. */
  animePages?: number;
  dryRun?: boolean;
}

export interface PartnerSyncReport {
  provider: string;
  filmPages: number;
  seriesPages: number;
  dryRun: boolean;
  fetchedMovies: number;
  fetchedSeries: number;
  fetchedAnimes: number;
  upserted: number;
  animesReclassified: number;
  animesRestored: number;
  pruned: number;
  durationMs: number;
}

/** Rapport de reclassement des animes du partenaire. */
export interface PartnerAnimeReclassReport {
  /** Fiches trouvées dans la catégorie « Animation ». */
  animationAssets: number;
  /** Séries reclassées en animés. */
  reclassified: number;
  /** Animés repassés en séries (plus dans la catégorie du site). */
  restored: number;
  /** Vrai si toute la catégorie a été balayée (dernière page atteinte). */
  complete: boolean;
}

interface UpsertRow {
  item: PartnerItem;
  contentType: "MOVIE" | "SERIES" | "ANIME";
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

/** Récupère `pages` pages de catégorie en parallèle (ordre préservé). */
async function fetchPages(
  kind: "films" | "series",
  pages: number,
): Promise<PartnerItem[]> {
  const results = await fetchCatalogPages((page) => fetchPartnerCatalogPage(kind, page), pages);
  return results.flat();
}

/**
 * Reclasse en `ANIME` les fiches publiées par le partenaire dans sa catégorie
 * « Animation », et repasse en `SERIES` celles qui n'y figurent plus (si le
 * balayage est complet). Les fiches concernées gardent leurs métadonnées et
 * gagnent le genre « animation » pour le filtre du catalogue.
 */
export async function classifyPartnerAnimes(
  options: { pages?: number; dryRun?: boolean } = {},
): Promise<PartnerAnimeReclassReport> {
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_ANIME_PAGES, 1), MAX_ANIME_PAGES);
  const results = await fetchCatalogPages(fetchAnimationSeriesPage, pages);
  const ids = Array.from(
    new Set(results.flat().map((item) => item.externalId).filter(Boolean)),
  );
  // Une page vide = on a dépassé la dernière page de la catégorie.
  const complete = results.some((rows) => rows.length === 0);

  const report: PartnerAnimeReclassReport = {
    animationAssets: ids.length,
    reclassified: 0,
    restored: 0,
    complete,
  };
  if (options.dryRun || ids.length === 0) return report;

  report.reclassified = await reclassifyProviderAssets(
    PARTNER_PROVIDER,
    ids,
    "SERIES",
    "ANIME",
    { categorySlug: "animation" },
  );
  // Les fiches de la catégorie Animation ne sont pas upsertées ici : on
  // rafraîchit leur présence pour qu'elles ne soient pas purgées.
  await touchProviderAssets(PARTNER_PROVIDER, ids);

  // Retour en « Séries » des fiches qui ne sont plus dans la catégorie
  // Animation — uniquement si le balayage est exhaustif (sinon on risquerait
  // de rétrograder des animés situés au-delà des pages parcourues).
  if (complete) {
    const extras = await prisma.providerAsset.findMany({
      where: {
        provider: PARTNER_PROVIDER,
        contentType: "ANIME",
        externalId: { notIn: ids },
      },
      select: { externalId: true },
    });
    if (extras.length > 0) {
      report.restored = await reclassifyProviderAssets(
        PARTNER_PROVIDER,
        extras.map((row) => row.externalId),
        "ANIME",
        "SERIES",
      );
    }
  }

  return report;
}

export async function syncPartnerCatalog(
  options: PartnerSyncOptions = {},
): Promise<PartnerSyncReport> {
  const startedAt = Date.now();
  const filmPages = Math.min(Math.max(options.filmPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const seriesPages = Math.min(Math.max(options.seriesPages ?? DEFAULT_PAGES, 0), MAX_PAGES);
  const animePages = Math.min(
    Math.max(options.animePages ?? DEFAULT_ANIME_PAGES, 0),
    MAX_ANIME_PAGES,
  );
  const dryRun = options.dryRun ?? false;

  const [films, series, animationPagesResult] = await Promise.all([
    fetchPages("films", filmPages),
    fetchPages("series", seriesPages),
    fetchCatalogPages(fetchAnimationSeriesPage, animePages),
  ]);

  // La catégorie « Animation » du site regroupe les séries animées : elles
  // partent dans la section « Animes » au lieu de « Séries ».
  const animationIds = new Set(
    animationPagesResult.flat().map((item) => item.externalId).filter(Boolean),
  );
  const animationComplete = animationPagesResult.some((rows) => rows.length === 0);

  const movieRows = films
    .filter((item) => item.externalId && item.title)
    .map((item) => ({ item, contentType: "MOVIE" as const, sourceType: "movie" as const }));
  const seriesRows = series
    .filter((item) => item.externalId && item.title)
    .map((item) => ({
      item,
      contentType: animationIds.has(item.externalId)
        ? ("ANIME" as const)
        : ("SERIES" as const),
      sourceType: "tv" as const,
    }));
  const animeRows = seriesRows.filter((row) => row.contentType === "ANIME");

  let animesReclassified = 0;
  let animesRestored = 0;
  if (!dryRun && animationIds.size > 0) {
    animesReclassified = await reclassifyProviderAssets(
      PARTNER_PROVIDER,
      Array.from(animationIds),
      "SERIES",
      "ANIME",
      { categorySlug: "animation" },
    );
    await touchProviderAssets(PARTNER_PROVIDER, Array.from(animationIds));
    if (animationComplete) {
      const extras = await prisma.providerAsset.findMany({
        where: {
          provider: PARTNER_PROVIDER,
          contentType: "ANIME",
          externalId: { notIn: Array.from(animationIds) },
        },
        select: { externalId: true },
      });
      animesRestored = await reclassifyProviderAssets(
        PARTNER_PROVIDER,
        extras.map((row) => row.externalId),
        "ANIME",
        "SERIES",
      );
    }
  }

  const toBulk = (rows: UpsertRow[], startRank: number) =>
    rows.map((row, i) => ({
      provider: PARTNER_PROVIDER,
      externalId: row.item.externalId,
      contentType: row.contentType,
      title: row.item.title,
      posterUrl: row.item.posterUrl,
      totalEpisodes: row.item.totalEpisodes,
      sourceType: row.sourceType,
      categorySlug: row.contentType === "ANIME" ? "animation" : null,
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
        pagesFetched: filmPages + seriesPages + animePages,
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
    fetchedSeries: seriesRows.length - animeRows.length,
    fetchedAnimes: animeRows.length,
    upserted,
    animesReclassified,
    animesRestored,
    pruned,
    durationMs: Date.now() - startedAt,
  };
}
