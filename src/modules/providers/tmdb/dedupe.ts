/**
 * Déduplication inter-catalogues : TMDB prioritaire.
 *
 * Le catalogue FRENCHSTREAM (site partenaire, source aujourd'hui morte) et le
 * catalogue TMDB se recouvrent largement (~44 %). Les deux alimentant les mêmes
 * grilles, les titres communs s'afficheraient deux fois. Règle métier retenue :
 * TMDB gagne — on marque `isDuplicate = true` sur les assets FRENCHSTREAM dont
 * le titre (normalisé) existe aussi dans TMDB, pour le même type de contenu.
 *
 * Le flag `isDuplicate` est INDÉPENDANT de `isPublished` (choix de l'admin) :
 * l'opération est donc réversible et n'écrase jamais la mise en ligne.
 *
 * Idempotent : recalcule intégralement le flag à chaque exécution (pose ou
 * retire) afin de rester le reflet exact du recouvrement courant.
 */

import { prisma } from "@/lib/prisma";
import { normalizeTitleKey } from "@/lib/title-key";
import { TMDB_PROVIDER } from "./tmdb.client";

/** Fournisseur dont les doublons sont masqués au profit de TMDB. */
const SECONDARY_PROVIDER = "FRENCHSTREAM";

const CONTENT_TYPES = ["MOVIE", "SERIES"] as const;

/** Taille des lots d'écriture (limite le nombre d'allers-retours DB). */
const UPDATE_CHUNK = 1000;

export interface DedupeReport {
  scanned: number;
  matched: number;
  hidden: number;
  restored: number;
  durationMs: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Marque/retire `isDuplicate` sur une liste d'ids (lots de UPDATE_CHUNK). */
async function flagIds(ids: string[], isDuplicate: boolean): Promise<number> {
  let count = 0;
  for (const batch of chunk(ids, UPDATE_CHUNK)) {
    const res = await prisma.providerAsset.updateMany({
      where: { id: { in: batch } },
      data: { isDuplicate },
    });
    count += res.count;
  }
  return count;
}

/**
 * Recalcule les doublons FRENCHSTREAM par rapport à TMDB (films + séries).
 */
export async function dedupeAgainstTmdb(): Promise<DedupeReport> {
  const startedAt = Date.now();
  let scanned = 0;
  let matched = 0;
  let hidden = 0;
  let restored = 0;

  for (const contentType of CONTENT_TYPES) {
    const [tmdbRows, secondaryRows] = await Promise.all([
      prisma.providerAsset.findMany({
        where: { provider: TMDB_PROVIDER, contentType },
        select: { title: true },
      }),
      prisma.providerAsset.findMany({
        where: { provider: SECONDARY_PROVIDER, contentType },
        select: { id: true, title: true, isDuplicate: true },
      }),
    ]);

    const tmdbKeys = new Set(
      tmdbRows.map((r) => normalizeTitleKey(r.title)).filter((k) => k.length > 1),
    );

    const toHide: string[] = [];
    const toRestore: string[] = [];

    for (const row of secondaryRows) {
      scanned++;
      const key = normalizeTitleKey(row.title);
      const isMatch = key.length > 1 && tmdbKeys.has(key);
      if (isMatch) {
        matched++;
        if (!row.isDuplicate) toHide.push(row.id);
      } else if (row.isDuplicate) {
        toRestore.push(row.id);
      }
    }

    hidden += await flagIds(toHide, true);
    restored += await flagIds(toRestore, false);
  }

  return {
    scanned,
    matched,
    hidden,
    restored,
    durationMs: Date.now() - startedAt,
  };
}
