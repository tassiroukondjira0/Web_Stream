/**
 * CLI de synchronisation du catalogue partenaire (films + séries + animes).
 *
 *   npm run partner:sync                                     # 5 pages films + 5 séries
 *   npm run partner:sync -- --film-pages=20 --series-pages=20
 *   npm run partner:sync -- --anime-pages=80                 # catégorie Animation
 *   npm run partner:sync -- --dry-run
 *
 * Les fiches publiées dans la catégorie « Animation » du site sont reclassées
 * en ANIME (section « Animes » du site) au lieu de rester dans « Séries ».
 */

import { readFileSync } from "node:fs";
import { syncPartnerCatalog } from "../src/modules/providers/partner/partner.sync";

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
  animePages?: number;
  dryRun: boolean;
} {
  const out: {
    filmPages?: number;
    seriesPages?: number;
    animePages?: number;
    dryRun: boolean;
  } = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const fm = arg.match(/^--film-pages=(\d{1,4})$/);
    if (fm) out.filmPages = Number.parseInt(fm[1], 10);
    const sm = arg.match(/^--series-pages=(\d{1,4})$/);
    if (sm) out.seriesPages = Number.parseInt(sm[1], 10);
    const am = arg.match(/^--anime-pages=(\d{1,4})$/);
    if (am) out.animePages = Number.parseInt(am[1], 10);
  }
  return out;
}

async function main(): Promise<void> {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));

  console.log("🔄 Synchro catalogue partenaire (films + séries + animes)…");
  const report = await syncPartnerCatalog(options);

  console.log(`\n${report.dryRun ? "🧪 Simulation (aucune écriture)" : "✅ Synchro terminée"}`);
  console.log(`  Pages films      : ${report.filmPages}`);
  console.log(`  Pages séries     : ${report.seriesPages}`);
  console.log(`  Films rapportés  : ${report.fetchedMovies}`);
  console.log(`  Séries rapportées: ${report.fetchedSeries}`);
  console.log(`  Animés rapportés : ${report.fetchedAnimes}`);
  console.log(`  Animés reclassés : ${report.animesReclassified}`);
  console.log(`  Animés remis en séries : ${report.animesRestored}`);
  console.log(`  Assets upsertés  : ${report.upserted}`);
  console.log(`  Assets purgés    : ${report.pruned}`);
  console.log(`  Durée            : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
