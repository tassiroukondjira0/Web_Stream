/**
 * Corrige les `posterUrl` stockés en chemin relatif (`/poster/x.jpg`,
 * `/static/poster/x.jpg`) — ils pointaient vers le site source et donnaient des
 * images cassées. On les absolutise vers le domaine source, et on annule les
 * valeurs manifestement invalides (pixels de tracking).
 *
 *   npm run posters:fix-relative [-- --dry-run]
 */

import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

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
    // .env absent.
  }
}

const DEFAULT_DOMAIN = "https://www.french-streaming.tv";

/** Résout un chemin relatif en URL absolue ; retourne null si invalide. */
function absolutize(value: string, domain: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    if (/histats|statcounter|google-analytics/i.test(value)) return null;
    return `https:${value}`;
  }
  if (value.startsWith("/")) {
    // Le préfixe `/static` devant `/poster/…` est un artefact : le site source
    // sert ces affiches sous `/poster/…` (vérifié — `/static/poster/` → 404).
    const normalized = value.replace(/^\/static(\/poster\/)/, "$1");
    return `${domain}${normalized}`;
  }
  return null;
}

async function main(): Promise<void> {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");
  const DOMAIN = (process.env.FSTREAMTV_DOMAIN || DEFAULT_DOMAIN).replace(/\/+$/, "");

  const rows = await prisma.providerAsset.findMany({
    where: {
      OR: [
        { posterUrl: { startsWith: "/poster" } },
        { posterUrl: { startsWith: "/static" } },
        { posterUrl: { startsWith: "//" } },
      ],
    },
    select: { id: true, posterUrl: true },
  });

  console.log(`🔧 ${rows.length} affiches en chemin relatif à corriger…`);

  let fixed = 0;
  let cleared = 0;
  const toFix: { id: string; url: string }[] = [];
  const toClear: string[] = [];

  for (const row of rows) {
    const resolved = absolutize(row.posterUrl ?? "", DOMAIN);
    if (resolved) {
      toFix.push({ id: row.id, url: resolved });
      fixed++;
    } else {
      toClear.push(row.id);
      cleared++;
    }
  }

  console.log(`   → ${fixed} absolutisées, ${cleared} annulées (tracking)`);
  if (dryRun) {
    console.log("🧪 Simulation : aucune écriture.");
    return;
  }

  const CHUNK = 200;
  for (let i = 0; i < toFix.length; i += CHUNK) {
    const batch = toFix.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = batch.map((row, idx) => {
      const b = idx * 2;
      params.push(row.id, row.url);
      return `($${b + 1}::text, $${b + 2}::text)`;
    });
    const sql = `UPDATE provider_assets AS pa SET "posterUrl" = v.url
      FROM (VALUES ${tuples.join(", ")}) AS v(id, url)
      WHERE pa.id = v.id`;
    await prisma.$executeRawUnsafe(sql, ...params);
  }

  for (let i = 0; i < toClear.length; i += CHUNK) {
    const batch = toClear.slice(i, i + CHUNK);
    await prisma.providerAsset.updateMany({
      where: { id: { in: batch } },
      data: { posterUrl: null },
    });
  }

  console.log(`💾 ${fixed} affiches corrigées, ${cleared} annulées.`);
}

main().catch((e) => {
  console.error("❌ Échec :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
