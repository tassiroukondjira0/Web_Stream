/**
 * Upserts groupés (bulk) pour `provider_assets`.
 *
 * Les upserts Prisma un par un coûtent un aller-retour réseau chacun ; à
 * l'échelle de dizaines de milliers de lignes c'est le facteur limitant.
 * On regroupe ici les insertions en une seule requête SQL paramétrée
 * (`INSERT ... ON CONFLICT ... DO UPDATE`) par lot, ce qui réduit
 * massivement le nombre d'allers-retours vers une base distante (Neon).
 *
 * Idempotent : même contrat que `providerAsset.upsert` (clé
 * provider + externalId + contentType), en préservant l'affiche et le
 * nombre d'épisodes existants lorsque la nouvelle valeur est nulle.
 */

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export interface BulkProviderAsset {
  provider: string;
  externalId: string;
  contentType: string;
  title: string;
  /** Année de sortie (optionnelle). */
  releaseYear?: number | null;
  posterUrl: string | null;
  totalEpisodes: number | null;
  sourceType: string;
  /** Slug de catégorie / genre (optionnel). */
  categorySlug?: string | null;
  /** Langue de diffusion (optionnel). */
  language?: string | null;
  /** Thème (optionnel). */
  theme?: string | null;
  /** Plateformes encadrées par des virgules (ex: ",netflix,") — optionnel. */
  platforms?: string | null;
  /** Renseigné uniquement à l'insertion (jamais écrasé sur conflit). */
  trendingRank: number;
}

/** Taille d'un lot : 15 colonnes/ligne, marge confortable sous la limite PG. */
const DEFAULT_CHUNK = 200;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Upserts groupés idempotents ; renvoie le nombre de lignes traitées. */
export async function bulkUpsertProviderAssets(
  rows: BulkProviderAsset[],
  chunkSize: number = DEFAULT_CHUNK,
): Promise<number> {
  const now = new Date();
  let processed = 0;

  for (const batch of chunkArray(rows, chunkSize)) {
    const params: unknown[] = [];
    const tuples = batch.map((row, i) => {
      const b = i * 15;
      params.push(
        randomUUID(),
        row.provider,
        row.externalId,
        row.contentType,
        row.title,
        row.releaseYear ?? null,
        row.posterUrl,
        row.totalEpisodes,
        row.sourceType,
        row.categorySlug ?? null,
        row.language ?? null,
        row.theme ?? null,
        row.platforms ?? null,
        row.trendingRank,
        now,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::"ProviderContentType", $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, $${b + 13}, $${b + 14}, $${b + 15})`;
    });

    const sql = `INSERT INTO provider_assets (id, provider, "externalId", "contentType", title, "releaseYear", "posterUrl", "totalEpisodes", "sourceType", "categorySlug", "language", "theme", "platforms", "trendingRank", "lastSeenAt") VALUES ${tuples.join(", ")} ON CONFLICT (provider, "externalId", "contentType") DO UPDATE SET title = EXCLUDED.title, "releaseYear" = COALESCE(EXCLUDED."releaseYear", provider_assets."releaseYear"), "posterUrl" = COALESCE(EXCLUDED."posterUrl", provider_assets."posterUrl"), "totalEpisodes" = COALESCE(EXCLUDED."totalEpisodes", provider_assets."totalEpisodes"), "sourceType" = EXCLUDED."sourceType", "categorySlug" = COALESCE(EXCLUDED."categorySlug", provider_assets."categorySlug"), "language" = COALESCE(EXCLUDED."language", provider_assets."language"), "theme" = COALESCE(EXCLUDED."theme", provider_assets."theme"), "platforms" = COALESCE(EXCLUDED."platforms", provider_assets."platforms"), "lastSeenAt" = EXCLUDED."lastSeenAt"`;

    await prisma.$executeRawUnsafe(sql, ...params);
    processed += batch.length;
  }

  return processed;
}
