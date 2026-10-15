/**
 * CLI de synchronisation du catalogue mangas French-Manga.
 *
 *   npm run mangas:sync                  # 3 pages de catégorie (défaut)
 *   npm run mangas:sync -- --pages=20    # fenêtre plus large
 *   npm run mangas:sync -- --dry-run     # simulation, aucune écriture
 *
 * Incrémental par conception : seules les premières pages du catalogue sont
 * rapportées ; le catalogue complet n'est jamais aspiré d'un coup.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syncFrenchMangaCatalog } from "../src/modules/providers/frenchmanga/frenchmanga.sync";

/** Charge .env si la variable n'est pas déjà définie (pas de dépendance dotenv). */
function loadDotEnv(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      const value = rawValue.replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env absent : on s'appuie sur l'environnement (ex. Vercel, CI).
  }
}

function parseArgs(argv: string[]): { pages?: number; dryRun: boolean } {
  const out: { pages?: number; dryRun: boolean } = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const pages = arg.match(/^--pages=(\d{1,4})$/);
    if (pages) out.pages = Number.parseInt(pages[1], 10);
  }
  return out;
}

async function main(): Promise<void> {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));

  console.log("🔄 Synchro catalogue mangas (French-Manga)…");
  const report = await syncFrenchMangaCatalog(options);

  console.log(`\n${report.dryRun ? "🧪 Simulation (aucune écriture)" : "✅ Synchro terminée"}`);
  console.log(`  Pages           : ${report.pagesPerType}`);
  console.log(`  Titres rapportés: ${report.fetched}`);
  console.log(`  Assets upsertés : ${report.upserted}`);
  console.log(`  Assets purgés   : ${report.pruned}`);
  console.log(`  Durée           : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
