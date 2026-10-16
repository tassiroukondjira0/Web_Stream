/**
 * CLI de synchronisation du catalogue mangas French-Manga.
 *
 *   npm run mangas:sync                  # 3 pages de catÃ©gorie (dÃ©faut)
 *   npm run mangas:sync -- --pages=20    # fenÃªtre plus large
 *   npm run mangas:sync -- --dry-run     # simulation, aucune Ã©criture
 *
 * IncrÃ©mental par conception : seules les premiÃ¨res pages du catalogue sont
 * rapportÃ©es ; le catalogue complet n'est jamais aspirÃ© d'un coup.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syncFrenchMangaCatalog } from "../src/modules/providers/frenchmanga/frenchmanga.sync";

/** Charge .env si la variable n'est pas dÃ©jÃ  dÃ©finie (pas de dÃ©pendance dotenv). */
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

  console.log("ðŸ”„ Synchro catalogue mangas (French-Manga)â€¦");
  const report = await syncFrenchMangaCatalog(options);

  console.log(`\n${report.dryRun ? "ðŸ§ª Simulation (aucune Ã©criture)" : "âœ… Synchro terminÃ©e"}`);
  console.log(`  Pages           : ${report.pagesPerType}`);
  console.log(`  Titres rapportÃ©s: ${report.fetched}`);
  console.log(`  Assets upsertÃ©s : ${report.upserted}`);
  console.log(`  Assets purgÃ©s   : ${report.pruned}`);
  console.log(`  DurÃ©e           : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("âŒ Ã‰chec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

