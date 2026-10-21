/**
 * Enrichit les affiches manquantes du catalogue externe (`provider_assets`).
 *
 * Pour chaque fiche sans `posterUrl`, on résout l'affiche via la recherche TMDB
 * par titre (avec l'année quand elle est connue du catalogue), puis on écrit le
 * résultat. Les fiches restant introuvables sont laissées telles quelles.
 *
 *   npm run posters:enrich                          # tous les fournisseurs
 *   npm run posters:enrich -- --provider=TMDB       # un seul fournisseur
 *   npm run posters:enrich -- --limit=200 --dry-run
 */

import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { fetchTmdbPosterByTitle } from "../src/lib/tmdb";

function loadEnv(): void {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const l of raw.split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env absent : on s'appuie sur l'environnement.
  }
}

function parseArgs(argv: string[]): {
  provider?: string;
  limit?: number;
  dryRun: boolean;
  concurrency: number;
} {
  const out: { provider?: string; limit?: number; dryRun: boolean; concurrency: number } = {
    dryRun: false,
    concurrency: 8,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const pm = arg.match(/^--provider=([A-Za-z_]+)$/);
    if (pm) out.provider = pm[1];
    const lm = arg.match(/^--limit=(\d{1,6})$/);
    if (lm) out.limit = Number.parseInt(lm[1], 10);
    const cm = arg.match(/^--concurrency=(\d{1,3})$/);
    if (cm) out.concurrency = Number.parseInt(cm[1], 10);
  }
  return out;
}

/** Exécute `worker` sur `items` avec au plus `limit` tâches simultanées. */
async function mapLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

interface MissingRow {
  provider: string;
  externalId: string;
  contentType: string;
  title: string;
  releaseYear: number | null;
}

async function main(): Promise<void> {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  const where = {
    OR: [{ posterUrl: null }, { posterUrl: "" }],
    ...(options.provider ? { provider: options.provider } : {}),
  };

  const total = await prisma.providerAsset.count({ where });
  console.log(
    `🖼️  Enrichissement des affiches (${total} fiche${total > 1 ? "s" : ""} sans poster` +
      `${options.provider ? `, ${options.provider}` : ", tous fournisseurs"})…`,
  );

  const rows = await prisma.providerAsset.findMany({
    where,
    select: {
      provider: true,
      externalId: true,
      contentType: true,
      title: true,
      releaseYear: true,
    },
    take: options.limit ?? undefined,
  });

  const updates: (MissingRow & { posterUrl: string })[] = [];
  let processed = 0;

  await mapLimit<MissingRow>(rows, options.concurrency, async (row) => {
    const poster = await fetchTmdbPosterByTitle(row.title, row.releaseYear);
    processed++;
    if (processed % 200 === 0) console.log(`   … ${processed}/${rows.length}`);
    if (poster) updates.push({ ...row, posterUrl: poster });
  });

  console.log(
    `\n✅ Affiches trouvées : ${updates.length}/${rows.length}` +
      `${updates.length < rows.length ? ` (${rows.length - updates.length} introuvables)` : ""}`,
  );

  if (options.dryRun) {
    console.log("🧪 Simulation : aucune écriture.");
    console.log(`   Durée : ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
    return;
  }

  let written = 0;
  const CHUNK = 200;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const batch = updates.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = batch.map((row, idx) => {
      const b = idx * 4;
      params.push(row.provider, row.externalId, row.contentType, row.posterUrl);
      return `($${b + 1}, $${b + 2}, $${b + 3}::"ProviderContentType", $${b + 4})`;
    });
    const sql = `UPDATE provider_assets AS pa SET "posterUrl" = v."posterUrl"
      FROM (VALUES ${tuples.join(", ")}) AS v(provider, "externalId", "contentType", "posterUrl")
      WHERE pa.provider = v.provider AND pa."externalId" = v."externalId" AND pa."contentType" = v."contentType"`;
    await prisma.$executeRawUnsafe(sql, ...params);
    written += batch.length;
  }

  console.log(`💾 Affiches écrites : ${written}`);
  console.log(`   Durée : ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de l'enrichissement :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
