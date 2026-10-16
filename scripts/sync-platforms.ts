/**
 * CLI de synchronisation des plateformes de diffusion (Netflix, Prime Video,
 * Disney+, Paramount+, Apple TV+) — métadonnées TMDB via `/discover`.
 *
 *   npm run platform:sync                          # 3 pages / liste / plateforme
 *   npm run platform:sync -- --pages=10            # fenêtre plus large
 *   npm run platform:sync -- --platforms=netflix,disney
 *   npm run platform:sync -- --dry-run             # simulation, aucune écriture
 *
 * Ajoute au catalogue les titres inconnus et tag `platforms` des titres déjà
 * présents (filtre « Plateforme » des pages films / séries).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syncPlatformCatalog } from "../src/modules/providers/tmdb/platform.sync";

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

function parseArgs(argv: string[]): {
  pages?: number;
  dryRun: boolean;
  platforms?: string[];
} {
  const out: { pages?: number; dryRun: boolean; platforms?: string[] } = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const pages = arg.match(/^--pages=(\d{1,4})$/);
    if (pages) out.pages = Number.parseInt(pages[1], 10);
    const platforms = arg.match(/^--platforms=([a-z0-9,-]+)$/);
    if (platforms) out.platforms = platforms[1].split(",").filter(Boolean);
  }
  return out;
}

async function main(): Promise<void> {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));

  console.log("🔄 Synchro des plateformes (Netflix, Prime, Disney+, Paramount+, Apple TV+)…");
  const report = await syncPlatformCatalog(options);

  console.log(`\n${report.dryRun ? "🧪 Simulation (aucune écriture)" : "✅ Synchro terminée"}`);
  console.log(`  Pages / liste    : ${report.pagesPerSource}`);
  console.log(`  Titres distincts : ${report.fetched}`);
  console.log(`  Assets upsertés  : ${report.upserted}`);
  for (const [slug, count] of Object.entries(report.byPlatform)) {
    console.log(`    - ${slug.padEnd(12)} ${count} titres remontés`);
  }
  console.log(`  Durée            : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la synchro :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
