/**
 * CLI de synchronisation du catalogue partenaire (films + sÃ©ries).
 *
 *   npm run partner:sync                              # 5 pages films + 5 sÃ©ries
 *   npm run partner:sync -- --film-pages=20 --series-pages=20
 *   npm run partner:sync -- --dry-run
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

function parseArgs(argv: string[]): { filmPages?: number; seriesPages?: number; dryRun: boolean } {
  const out: { filmPages?: number; seriesPages?: number; dryRun: boolean } = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
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

  console.log("ðŸ”„ Synchro catalogue partenaire (films + sÃ©ries)â€¦");
  const report = await syncPartnerCatalog(options);

  console.log(`\n${report.dryRun ? "ðŸ§ª Simulation (aucune Ã©criture)" : "âœ… Synchro terminÃ©e"}`);
  console.log(`  Pages films     : ${report.filmPages}`);
  console.log(`  Pages sÃ©ries    : ${report.seriesPages}`);
  console.log(`  Films rapportÃ©s : ${report.fetchedMovies}`);
  console.log(`  SÃ©ries rapportÃ©es: ${report.fetchedSeries}`);
  console.log(`  Assets upsertÃ©s : ${report.upserted}`);
  console.log(`  Assets purgÃ©s   : ${report.pruned}`);
  console.log(`  DurÃ©e           : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("âŒ Ã‰chec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

