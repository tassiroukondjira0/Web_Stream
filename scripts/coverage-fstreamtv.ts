/**
 * CLI de la passe de couverture : marque `ProviderAsset.hasSources` des titres
 * TMDB selon qu'un fournisseur expose un titre homologue (et, en option, que
 * Vidzy annonce la disponibilité).
 *
 *   npm run coverage:mark                  # appariement par titre (base)
 *   npm run coverage:mark -- --check-vidzy # + vérification Vidzy (plus lent)
 *   npm run coverage:mark -- --dry-run
 */

import { readFileSync } from "node:fs";
import { markProviderCoverage } from "../src/modules/providers/coverage";

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

function parseArgs(argv: string[]): { checkVidzy: boolean; dryRun: boolean } {
  let checkVidzy = false;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--check-vidzy") checkVidzy = true;
    if (arg === "--dry-run") dryRun = true;
  }
  return { checkVidzy, dryRun };
}

async function main(): Promise<void> {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));

  console.log("🔄 Passe de couverture (marquage hasSources)…");
  if (options.checkVidzy) console.log("   (vérification Vidzy activée — plus lent)");
  const report = await markProviderCoverage(options);

  console.log(`\n${report.dryRun ? "🧪 Simulation (aucune écriture)" : "✅ Couverture calculée"}`);
  console.log(`  Titres TMDB scannés   : ${report.scanned}`);
  console.log(`  Appariés par titre    : ${report.matchedByTitle}`);
  console.log(`  Appariés par Vidzy    : ${report.matchedByVidzy}`);
  console.log(`  Marqués disponibles   : ${report.markedAvailable}`);
  console.log(`  Marqués indisponibles : ${report.markedUnavailable}`);
  console.log(`  Durée                 : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la passe :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
