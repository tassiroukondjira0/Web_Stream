/**
 * Passe de couverture : marque `ProviderAsset.hasSources` pour les titres TMDB
 * selon qu'un fournisseur de repli expose un titre homologue.
 *
 * Un titre TMDB est marqué `hasSources=true` si :
 *   1. un asset d'un fournisseur de streaming (FSTREAMTV / FRENCHSTREAM /
 *      FRENCHMANGA) porte le même titre normalisé (et la même année quand elle
 *      est connue) — critère calculé en base, rapide ; ou
 *   2. (option `--check-vidzy`) l'API Vidzy annonce sa disponibilité pour
 *      l'identifiant TMDB.
 *
 * Les grilles filtrent `hasSources=true` pour ne pas exposer de fiches mortes.
 * Les assets des fournisseurs eux-mêmes sont toujours marqués `true` (leur fiche
 * expose des flux à la lecture).
 *
 * Usage : npm run coverage:mark [-- --check-vidzy] [-- --dry-run]
 */

import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { fetchVidzyAvailability } from "@/lib/vidzy";

/** Fournisseurs de streaming (leur fiche expose des flux). */
const STREAM_PROVIDERS = ["FSTREAMTV", "FRENCHSTREAM", "FRENCHMANGA"] as const;

const VIDZY_CONCURRENCY = 12;
const UPDATE_CHUNK = 500;

export interface CoverageReport {
  scanned: number;
  matchedByTitle: number;
  matchedByVidzy: number;
  markedAvailable: number;
  markedUnavailable: number;
  dryRun: boolean;
  durationMs: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Exécute `worker` sur `items` avec une concurrence bornée. */
async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function markProviderCoverage(
  options: { checkVidzy?: boolean; dryRun?: boolean } = {},
): Promise<CoverageReport> {
  const startedAt = Date.now();
  const dryRun = options.dryRun ?? false;

  // 1. Index des titres des fournisseurs de streaming (titre normalisé + année).
  const streamAssets = await prisma.providerAsset.findMany({
    where: { provider: { in: [...STREAM_PROVIDERS] } },
    select: { title: true, releaseYear: true },
  });
  const streamTitles = new Set(streamAssets.map((a) => normalizeTitleKey(a.title)));

  // 2. Titres TMDB à évaluer.
  const tmdbAssets = await prisma.providerAsset.findMany({
    where: { provider: "TMDB" },
    select: { id: true, externalId: true, title: true, releaseYear: true, contentType: true },
  });

  const available: string[] = [];
  const unavailable: string[] = [];
  let matchedByTitle = 0;

  const byTitle: string[] = [];
  for (const a of tmdbAssets) {
    if (streamTitles.has(normalizeTitleKey(a.title))) {
      matchedByTitle++;
      byTitle.push(a.id);
    }
  }
  available.push(...byTitle);
  const titleSet = new Set(byTitle);

  // 3. Vérification Vidzy (optionnelle) pour les titres sans correspondance.
  let matchedByVidzy = 0;
  if (options.checkVidzy) {
    const rest = tmdbAssets.filter((a) => !titleSet.has(a.id));
    const checks = await mapLimit(rest, VIDZY_CONCURRENCY, async (a) => {
      try {
        const info = await fetchVidzyAvailability(a.externalId);
        return info?.available === true ? a.id : null;
      } catch {
        return null;
      }
    });
    for (const id of checks) {
      if (id) {
        available.push(id);
        matchedByVidzy++;
      }
    }
  }

  const availableSet = new Set(available);
  for (const a of tmdbAssets) {
    if (!availableSet.has(a.id)) unavailable.push(a.id);
  }

  // 4. Écriture. Les fournisseurs de streaming restent toujours `true`.
  if (!dryRun) {
    for (const batch of chunk(available, UPDATE_CHUNK)) {
      await prisma.providerAsset.updateMany({
        where: { id: { in: batch } },
        data: { hasSources: true },
      });
    }
    for (const batch of chunk(unavailable, UPDATE_CHUNK)) {
      await prisma.providerAsset.updateMany({
        where: { id: { in: batch } },
        data: { hasSources: false },
      });
    }
    await prisma.providerAsset.updateMany({
      where: { provider: { in: [...STREAM_PROVIDERS] } },
      data: { hasSources: true },
    });
  }

  return {
    scanned: tmdbAssets.length,
    matchedByTitle,
    matchedByVidzy,
    markedAvailable: available.length,
    markedUnavailable: unavailable.length,
    dryRun,
    durationMs: Date.now() - startedAt,
  };
}
