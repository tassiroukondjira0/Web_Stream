/**
 * CLI de déduplication inter-catalogues (TMDB prioritaire).
 *
 *   npm run tmdb:dedupe
 *
 * Marque `isDuplicate=true` sur les titres FRENCHSTREAM dont le titre normalisé
 * existe aussi dans TMDB (par type de contenu), pour éviter le double affichage
 * dans les grilles. Idempotent : recalcule intégralement le flag à chaque run.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dedupeAgainstTmdb } from "../src/modules/providers/tmdb/dedupe";

/** Charge .env si la variable n'est pas déjà définie (pas de dépendance dotenv). */
function loadDotEnv(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    // .env absent : on s'appuie sur l'environnement (ex. Vercel, CI).
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  console.log("🔎 Déduplication FRENCHSTREAM vs TMDB…");
  const report = await dedupeAgainstTmdb();
  console.log("✅ Terminé");
  console.log(`  Titres analysés   : ${report.scanned}`);
  console.log(`  Doublons détectés : ${report.matched}`);
  console.log(`  Masqués           : ${report.hidden}`);
  console.log(`  Restaurés         : ${report.restored}`);
  console.log(`  Durée             : ${(report.durationMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error("❌ Échec de la déduplication :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
