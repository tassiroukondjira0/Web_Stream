/**
 * CLI de synchronisation du fournisseur de repli `french-streaming.tv`
 * (films + séries).
 *
 *   npm run fstreamtv:sync                                   # 5 pages films + 5 séries
 *   npm run fstreamtv:sync -- --film-pages=50 --series-pages=50
 *   npm run fstreamtv:sync -- --dry-run
 */

import { readFileSync } from "node:fs";
import { syncFStreamTvCatalog } from "../src/modules/providers/fstreamtv/fstreamtv.sync";

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
  filmPages?: number;
  seriesPages?: number;
  dryRun: boolean;
  markCoverage: boolean;
  checkVidzy: boolean;
} {
  const out: {
    filmPages?: number;
    seriesPages?: number;
    dryRun: boolean;
    markCoverage: boolean;
    checkVidzy: boolean;
  } = { dryRun: false, markCoverage: true, checkVidzy: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    if (arg === "--no-coverage") out.markCoverage = false;
    if (arg === "--check-vidzy") out.checkVidzy = true;
    const fm = arg.match(/^--film-pages=(\d{1,4})$/);
    if (fm) out.filmPages = Number.parseInt(fm[1], 10);
    const sm = arg.match(/^--series-pages=(\d{1,4})$/);
    if (sm) out.seriesPages = Number.parseInt(sm[1], 10);
  }
  return out;
}

async function main(): Promise<void> {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));

  console.log("🔄 Synchro catalogue french-streaming.tv (films + séries)…");
  const report = await syncFStreamTvCatalog(options);

  console.log(`\n${report.dryRun ? "🧪 Simulation (aucune écriture)" : "✅ Synchro terminée"}`);
  console.log(`  Pages films      : ${report.filmPages}`);
  console.log(`  Pages séries     : ${report.seriesPages}`);
  console.log(`  Films rapportés  : ${report.fetchedMovies}`);
  console.log(`  Séries rapportées: ${report.fetchedSeries}`);
  console.log(`  Assets upsertés  : ${report.upserted}`);
  console.log(`  Assets purgés    : ${report.pruned}`);
  console.log(`  Durée            : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
