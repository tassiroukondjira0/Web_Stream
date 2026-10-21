/**
 * Reclasse en « Animes » les fiches que les fournisseurs publient dans leur
 * section « Séries » :
 *
 *   npm run animes:reclass                 # partenaire (catégorie Animation) + TMDB
 *   npm run animes:reclass -- --partner    # partenaire uniquement
 *   npm run animes:reclass -- --tmdb       # TMDB uniquement
 *   npm run animes:reclass -- --dry-run    # compte sans écrire
 *
 * Côté FRENCHSTREAM, la catégorie « Animation » du site liste les animés ;
 * côté TMDB, toute série TV du genre Animation (id 16) en fait partie. Les
 * fiches déplacées gardent leurs métadonnées et gagnent le genre « animation ».
 */

import { readFileSync } from "node:fs";
import {
  classifyPartnerAnimes,
  type PartnerAnimeReclassReport,
} from "../src/modules/providers/partner/partner.sync";
import {
  classifyTmdbAnimes,
  type TmdbAnimeReclassReport,
} from "../src/modules/providers/tmdb/tmdb.sync";

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

async function main(): Promise<void> {
  loadEnv();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const onlyPartner = argv.includes("--partner");
  const onlyTmdb = argv.includes("--tmdb");
  const partner = !onlyTmdb || onlyPartner;
  const tmdb = !onlyPartner || onlyTmdb;

  console.log(`🔄 Reclassement des animés${dryRun ? " (simulation)" : ""}…`);

  if (partner) {
    const report: PartnerAnimeReclassReport = await classifyPartnerAnimes({ dryRun });
    console.log("\n  FRENCHSTREAM (catégorie Animation)");
    console.log(`    Fiches animation   : ${report.animationAssets}`);
    console.log(`    Reclassées en animés : ${report.reclassified}`);
    console.log(`    Remises en séries  : ${report.restored}`);
    console.log(`    Catégorie complète : ${report.complete ? "oui" : "non (restauration ignorée)"}`);
  }

  if (tmdb) {
    const report: TmdbAnimeReclassReport = await classifyTmdbAnimes({ dryRun });
    console.log("\n  TMDB (genre Animation)");
    console.log(`    Titres animés      : ${report.animationAssets}`);
    console.log(`    Reclassés en animés : ${report.reclassified}`);
  }
}

main().catch((e) => {
  console.error("❌ Échec du reclassement :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
