/**
 * Synchro des plateformes de diffusion (Netflix, Prime Video, Disney+,
 * Paramount+, Apple TV+) → PostgreSQL.
 *
 * Pour chaque plateforme, `/discover/movie` et `/discover/tv` filtrés par
 * `with_watch_providers` (région `TMDB_WATCH_REGION`) rapportent les titres
 * disponibles :
 *  - un titre déjà en base est TAGUÉ (colonne `platforms`, liste encadrée par
 *    des virgules — l'union des plateformes trouvées pour ce titre au cours de
 *    la synchro) ;
 *  - un titre inconnu est AJOUTÉ au catalogue (métadonnées TMDB complètes).
 *
 * La lecture reste assurée par notre lecteur Vidzy (externalId = id TMDB) :
 * aucune vidéo n'est récupérée des plateformes, uniquement des métadonnées.
 *
 * Aucune purge : un titre reste en catalogue même s'il quitte une plateforme ;
 * son tag est rafraîchi dès qu'il reparaît dans les listes rapportées.
 * Les titres entrants reçoivent un rang de tendance hors top « À la une ».
 *
 * Usage : npm run platform:sync [-- --pages=3] [-- --dry-run]
 *         [-- --platforms=netflix,disney]
 */

import { prisma } from "@/lib/prisma";
import { CATALOG_PLATFORMS } from "@/lib/provider-catalog";
import {
  TMDB_WATCH_PROVIDER_IDS,
  TMDB_WATCH_REGION,
  fetchTmdbDiscover,
} from "@/lib/tmdb";
import { bulkUpsertProviderAssets } from "../bulk-upsert";
import { TMDB_PROVIDER, mapTmdbItem, type TmdbCatalogItem } from "./tmdb.client";

const DEFAULT_PAGES = 3;
const MAX_PAGES = 500; // TMDB plafonne ses listes à 500 pages
/** Pages téléchargées simultanément par plateforme (limite le débit TMDB). */
const FETCH_CONCURRENCY = 6;
/** Rang de tendance des titres entrants : jamais retenus en « À la une ». */
const PLATFORM_TRENDING_OFFSET = 1_000_000;
/** Fournisseur du journal de synchro (ProviderSyncRun). */
export const PLATFORM_SYNC_PROVIDER = "PLATFORMS";

export interface PlatformSyncOptions {
  /** Nombre de pages rapportée par liste et par plateforme (1..MAX_PAGES). */
  pages?: number;
  /** Simulation : compte sans écrire. */
  dryRun?: boolean;
  /** Slugs de plateformes à rapporter (défaut : toutes). */
  platforms?: string[];
}

export interface PlatformSyncReport {
  provider: string;
  pagesPerSource: number;
  dryRun: boolean;
  /** Titres distincts remontés (toutes plateformes confondues). */
  fetched: number;
  upserted: number;
  /** Titres remontés par plateforme (avant fusion des doublons). */
  byPlatform: Record<string, number>;
  durationMs: number;
}

interface DiscoveredTitle {
  item: TmdbCatalogItem;
  /** Slugs de plateformes où le titre est disponible (union pendant la synchro). */
  platforms: Set<string>;
}

/** Récupère `pages` pages d'une liste discover en parallèle (ordre préservé). */
async function fetchPlatformKind(
  platformSlug: string,
  kind: "movie" | "tv",
  pages: number,
): Promise<TmdbCatalogItem[]> {
  const ids = TMDB_WATCH_PROVIDER_IDS[platformSlug];
  if (!ids || ids.length === 0) return [];

  const results: TmdbCatalogItem[][] = new Array(pages);
  let next = 1;
  async function worker(): Promise<void> {
    for (;;) {
      const page = next++;
      if (page > pages) return;
      try {
        const data = await fetchTmdbDiscover(
          `/discover/${kind}`,
          {
            watch_region: TMDB_WATCH_REGION,
            // Pipe = OU sur TMDB (la virgule signifierait ET !) : le titre est
            // retourné s'il est disponible sur AU MOINS un des identifiants.
            with_watch_providers: ids.join("|"),
            sort_by: "popularity.desc",
          },
          page,
        );
        results[page - 1] = (data.results ?? [])
          .map((item) => mapTmdbItem(item, kind))
          .filter((item): item is TmdbCatalogItem => item !== null);
      } catch {
        // §11 : erreur TMDB absorbée — le reste de la synchro continue.
        results[page - 1] = [];
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages) }, worker));
  return results.flat();
}

/** Exécute une synchro des plateformes et retourne le rapport. */
export async function syncPlatformCatalog(
  options: PlatformSyncOptions = {},
): Promise<PlatformSyncReport> {
  const startedAt = Date.now();
  const pages = Math.min(Math.max(options.pages ?? DEFAULT_PAGES, 1), MAX_PAGES);
  const dryRun = options.dryRun ?? false;
  const selected = CATALOG_PLATFORMS.filter(
    (p) => !options.platforms || options.platforms.includes(p.value),
  );

  const byPlatform: Record<string, number> = {};
  const discovered = new Map<string, DiscoveredTitle>();

  // Plateformes traitées en série (deux kinds en parallèle) : au plus
  // 2 × FETCH_CONCURRENCY requêtes TMDB simultanées.
  for (const { value } of selected) {
    const [movies, series] = await Promise.all([
      fetchPlatformKind(value, "movie", pages),
      fetchPlatformKind(value, "tv", pages),
    ]);
    byPlatform[value] = movies.length + series.length;
    for (const item of [...movies, ...series]) {
      const key = `${item.contentType}:${item.externalId}`;
      const entry = discovered.get(key);
      if (entry) {
        entry.platforms.add(value);
      } else {
        discovered.set(key, { item, platforms: new Set([value]) });
      }
    }
  }

  const rows = Array.from(discovered.values()).map((entry, i) => ({
    provider: TMDB_PROVIDER,
    externalId: entry.item.externalId,
    contentType: entry.item.contentType,
    title: entry.item.title,
    releaseYear: entry.item.releaseYear,
    posterUrl: entry.item.posterUrl,
    totalEpisodes: null,
    sourceType: entry.item.sourceType,
    categorySlug: entry.item.categorySlug,
    // Liste encadrée (« ,netflix,disney, ») → filtrable via `contains`.
    platforms: `,${Array.from(entry.platforms).sort().join(",")},`,
    trendingRank: PLATFORM_TRENDING_OFFSET + i,
  }));

  const fetched = rows.length;
  const pagesFetched = selected.length > 0 ? selected.length * 2 * pages : 0;

  let upserted = 0;
  if (!dryRun) {
    if (rows.length > 0) {
      upserted = await bulkUpsertProviderAssets(rows);
    }
    await prisma.providerSyncRun.create({
      data: {
        provider: PLATFORM_SYNC_PROVIDER,
        status: upserted > 0 ? "SUCCESS" : pagesFetched > 0 ? "PARTIAL" : "FAILED",
        pagesFetched,
        assetsUpserted: upserted,
        assetsPruned: 0,
        finishedAt: new Date(),
      },
    });
  } else {
    upserted = fetched;
  }

  return {
    provider: PLATFORM_SYNC_PROVIDER,
    pagesPerSource: pages,
    dryRun,
    fetched,
    upserted,
    byPlatform,
    durationMs: Date.now() - startedAt,
  };
}
