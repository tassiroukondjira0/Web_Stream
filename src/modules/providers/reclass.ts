/**
 * Reclassement d'assets entre types de contenu (`SERIES` ↔ `ANIME`, etc.).
 *
 * Utile pour rattacher à la section « Animes » les fiches qu'un fournisseur
 * publie dans sa catégorie « Séries » (animes, séries animées). Le déplacement
 * respecte la clé unique (provider, externalId, contentType) : si la ligne de
 * destination existe déjà, la ligne source est supprimée au lieu d'être mise à
 * jour (pas de conflit, pas de doublon).
 *
 * Les métadonnées (titre, affiche, année, épisodes, rang…) sont conservées :
 * seuls `contentType` et, si demandé, `categorySlug` changent. Idempotent.
 */

import { prisma } from "@/lib/prisma";

export type ProviderContentType = "MOVIE" | "SERIES" | "ANIME";

/** Taille des lots (limite le nombre d'allers-retours vers la base distante). */
const UPDATE_CHUNK = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Déplace les assets `externalIds` du type `from` vers le type `to`.
 * Retourne le nombre de lignes effectivement reclassées.
 */
export async function reclassifyProviderAssets(
  provider: string,
  externalIds: readonly string[],
  from: ProviderContentType,
  to: ProviderContentType,
  options: { categorySlug?: string | null } = {},
): Promise<number> {
  const ids = Array.from(new Set(externalIds.filter(Boolean)));
  if (ids.length === 0) return 0;

  let moved = 0;
  for (const batch of chunk(ids, UPDATE_CHUNK)) {
    const rows = await prisma.providerAsset.findMany({
      where: {
        provider,
        externalId: { in: batch },
        contentType: { in: [from, to] },
      },
      select: { id: true, externalId: true, contentType: true },
    });

    const targetIds = new Set(
      rows.filter((row) => row.contentType === to).map((row) => row.externalId),
    );
    const duplicates: string[] = [];
    const toMove: string[] = [];
    for (const row of rows) {
      if (row.contentType !== from) continue;
      if (targetIds.has(row.externalId)) duplicates.push(row.id);
      else toMove.push(row.id);
    }

    if (duplicates.length > 0) {
      await prisma.providerAsset.deleteMany({ where: { id: { in: duplicates } } });
    }
    if (toMove.length > 0) {
      const res = await prisma.providerAsset.updateMany({
        where: { id: { in: toMove } },
        data: {
          contentType: to,
          ...(options.categorySlug ? { categorySlug: options.categorySlug } : {}),
        },
      });
      moved += res.count;
    }
  }

  return moved;
}

/**
 * Rafraîchit `lastSeenAt` des assets listés (toutes lignes confondues).
 * Utile quand une synchro « secondaire » (ex. catégorie Animation) voit passer
 * des fiches sans les upsert : elles restent considérées comme toujours
 * présentes et ne sont pas purgées.
 */
export async function touchProviderAssets(
  provider: string,
  externalIds: readonly string[],
): Promise<number> {
  const ids = Array.from(new Set(externalIds.filter(Boolean)));
  if (ids.length === 0) return 0;

  const now = new Date();
  let touched = 0;
  for (const batch of chunk(ids, UPDATE_CHUNK)) {
    const res = await prisma.providerAsset.updateMany({
      where: { provider, externalId: { in: batch } },
      data: { lastSeenAt: now },
    });
    touched += res.count;
  }
  return touched;
}
