/**
 * Synchronisation du catalogue mangas French-Manga → PostgreSQL.
 *
 * Même principe que la synchro FrenchStream (§4.7) : synchro incrémentale
 * bornée (jamais tout le catalogue — ~2000 titres), upserts idempotents,
 * purge des assets disparus depuis N jours, et journal d'exécution
 * (ProviderSyncRun).
 *
 * Optimisée pour de gros volumes : pages récupérées en parallèle (borné) et
 * upserts groupés par lots dans une transaction (moins d'allers-retours DB).
 *
 * Les vignettes sont stables et bien plus légères que les fiches : on stocke
 * le titre, l'affiche (TMDB), le nombre d'épisodes et la version. La fiche et
 * la lecture interrogent l'API du site à la demande.
 *
 * Usage : npm run mangas:sync [-- --pages=115] [-- --dry-run]
 */

import { prisma } from "@/lib/prisma";
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { FRENCHMANGA_PROVIDER, fetchMangaCatalogPage } from "./frenchmanga.client";
import type { FrenchMangaItem } from "./frenchmanga.types";

const DEFAULT_PAGES = 3;
const MAX_PAGES = 130; // garde-fou : couvre le catalogue sans l'aspirer d'un coup
const PRUNE_AFTER_DAYS = 30;
/** Pages téléchargées simultanément (anti-bot + vitesse). */
const FETCH_CONCURRENCY = 5;

export interface FrenchMangaSyncOptions {
  /** Nombre de pages de catégorie à rapporter (1..MAX_PAGES). */
  pages?: number;
  /** Simulation : compte sans écrire ni purger. */
  dryRun?: boolean;
}

export interface FrenchMangaSyncReport {
  provider: string;
  pagesPerType: number;
  dryRun: boolean;
  fetched: number;
  upserted: number;
  pruned: number;
  durationMs: number;
}

/** Récupère `pages` pages de catégorie en parallèle (ordre préservé). */
async function fetchPages(pages: number): Promise<FrenchMangaItem[]> {
  const results: FrenchMangaItem[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      results[page - 1] = await fetchMangaCatalogPage(page);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages) }, worker));
  return results.flat();
}

/** Exécute une synchro incrémentale du catalogue mangas et retourne le rapport. */
export async function syncFrenchMangaCatalog(
  options: FrenchMangaSyncOptions = {},
): Promise<FrenchMangaSyncReport> {
  const startedAt = Date.now();
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_PAGES, 1), MAX_PAGES);
  const dryRun = options.dryRun ?? false;

  const all = await fetchPages(pages);
  const valid = all.filter((item) => item.externalId && item.title);
  const fetched = valid.length;
  const pagesFetched = all.length > 0 ? pages : 0;

  let upserted = 0;
  if (!dryRun) {
    upserted = await bulkUpsertProviderAssets(
      valid.map((item, i) => ({
        provider: FRENCHMANGA_PROVIDER,
        externalId: item.externalId,
        contentType: "ANIME",
        title: item.title,
        posterUrl: item.posterUrl,
        totalEpisodes: item.totalEpisodes,
        sourceType: "tv",
        trendingRank: i + 1,
      })),
    );
  } else {
    upserted = fetched;
  }

  let pruned = 0;
  if (!dryRun) {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const stale = await prisma.providerAsset.findMany({
      where: { provider: FRENCHMANGA_PROVIDER, lastSeenAt: { lt: cutoff } },
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
        provider: FRENCHMANGA_PROVIDER,
        status: upserted > 0 ? "SUCCESS" : pagesFetched > 0 ? "PARTIAL" : "FAILED",
        pagesFetched,
        assetsUpserted: upserted,
        assetsPruned: pruned,
        finishedAt: new Date(),
      },
    });
  }

  return {
    provider: FRENCHMANGA_PROVIDER,
    pagesPerType: pages,
    dryRun,
    fetched,
    upserted,
    pruned,
    durationMs: Date.now() - startedAt,
  };
}
