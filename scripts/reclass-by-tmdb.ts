/**
 * Reclassification automatique des assets du catalogue externe via TMDB.
 *
 * Corrige les titres mal classés : films classés comme séries, séries classées
 * comme films, et animés non détectés. Utilise l'API TMDB pour vérifier le type
 * réel de chaque titre et applique les corrections via reclassifyProviderAssets.
 *
 *   npx tsx scripts/reclass-by-tmdb.ts              # tous les fournisseurs
 *   npx tsx scripts/reclass-by-tmdb.ts --provider FRENCHSTREAM
 *   npx tsx scripts/reclass-by-tmdb.ts --dry-run    # simulation sans écriture
 */

import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { resolveTmdbMatch } from "../src/lib/tmdb";
import { reclassifyProviderAssets } from "../src/modules/providers/reclass";
import { cleanTitle } from "../src/lib/title-clean";

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

function parseArgs(argv: string[]) {
  const out: { provider?: string; dryRun: boolean; batchSize: number } = {
    dryRun: false,
    batchSize: 500,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const pm = arg.match(/^--provider=(.+)$/i);
    if (pm) out.provider = pm[1].toUpperCase();
    const bm = arg.match(/^--batch-size=(\d+)$/);
    if (bm) out.batchSize = Math.min(Number.parseInt(bm[1], 10), 2000);
  }
  return out;
}

async function main() {
  loadEnv();
  const { provider, dryRun, batchSize } = parseArgs(process.argv.slice(2));

  console.log("🔍 Reclassification via TMDB…");
  if (dryRun) console.log("🧪 Mode simulation — aucune écriture ne sera effectuée.");
  if (provider) console.log(`  Fournisseur filtré : ${provider}`);

  // Récupérer tous les assets (sauf ANIME qui sont déjà reclassés par la synchro)
  const where: any = {
    contentType: { in: ["MOVIE", "SERIES"] },
    isPublished: true,
  };
  if (provider) where.provider = provider;

  const assets = await prisma.providerAsset.findMany({
    where,
    select: { id: true, externalId: true, provider: true, contentType: true, title: true, releaseYear: true },
  });

  console.log(`  Assets à vérifier : ${assets.length}`);

  const toMovie: string[] = []; // IDs à passer de SERIES → MOVIE
  const toSeries: string[] = []; // IDs à passer de MOVIE → SERIES
  const matched = new Set<string>();
  let tmdbErrors = 0;

  // Traiter par lots pour ne pas surcharger TMDB
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    console.log(`  🔄 Lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)} (${batch.length} titres)…`);

    const results = await Promise.allSettled(
      batch.map(async (asset) => {
        const cleaned = cleanTitle(asset.title);
        // On cherche dans TMDB en fonction du type actuel, mais on accepte aussi l'autre type
        const tmdbKind = asset.contentType === "MOVIE" ? "movie" : "tv";
        const match = await resolveTmdbMatch(cleaned, tmdbKind, asset.releaseYear ?? null).catch(() => null);

        if (!match) {
          // Essayer avec l'autre type si le premier échoue
          const otherKind = tmdbKind === "movie" ? "tv" : "movie";
          return { asset, match: await resolveTmdbMatch(cleaned, otherKind, asset.releaseYear ?? null).catch(() => null) };
        }
        return { asset, match };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        tmdbErrors++;
        continue;
      }

      const { asset, match } = result.value;
      if (!match) continue;

      const currentType = asset.contentType;
      const tmdbType = match.mediaType === "movie" ? "MOVIE" : "SERIES";

      if (currentType !== tmdbType) {
        // Type TMDB ne correspond pas au type stocké → correction nécessaire
        if (tmdbType === "MOVIE" && currentType === "SERIES") {
          toMovie.push(asset.externalId);
        } else if (tmdbType === "SERIES" && currentType === "MOVIE") {
          toSeries.push(asset.externalId);
        }
        matched.add(asset.externalId);
      }
    }

    // Petit délai entre les lots pour respecter les limites TMDB
    if (i + batchSize < assets.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n📊 Résultats de la vérification TMDB :`);
  console.log(`  Titres vérifiés : ${matched.size + (assets.length - matched.size)}`);
  console.log(`  Erreurs TMDB : ${tmdbErrors}`);
  console.log(`  SERIES → MOVIE à corriger : ${toMovie.length}`);
  console.log(`  MOVIE → SERIES à corriger : ${toSeries.length}`);

  if (dryRun || (toMovie.length === 0 && toSeries.length === 0)) {
    if (toMovie.length === 0 && toSeries.length === 0) {
      console.log("\n✅ Aucun titre à reclasser — le catalogue est cohérent.");
    } else {
      console.log("\n🧪 Simulation terminée — les corrections ci-dessus seraient appliquées sans --dry-run.");
    }
    return;
  }

  // Appliquer les corrections
  console.log("\n🔄 Application des corrections…");

  let corrected = 0;
  if (toMovie.length > 0) {
    const count = await reclassifyProviderAssets(
      provider || undefined as any,
      toMovie,
      "SERIES",
      "MOVIE"
    );
    corrected += count;
    console.log(`  ✅ ${count} titres reclassés SERIES → MOVIE`);
  }

  if (toSeries.length > 0) {
    const count = await reclassifyProviderAssets(
      provider || undefined as any,
      toSeries,
      "MOVIE",
      "SERIES"
    );
    corrected += count;
    console.log(`  ✅ ${count} titres reclassés MOVIE → SERIES`);
  }

  console.log(`\n🎉 Reclassification terminée : ${corrected} titres corrigés.`);
}

main().catch((e) => {
  console.error("❌ Échec :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
