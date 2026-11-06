/**
 * Peuple les `posterUrl` manquants via l'API TMDB.
 *
 * Cible les titres dont posterUrl est NULL et tente de résoudre l'affiche
 * par recherche de titre (fetchTmdbPosterByTitle). Traite par lots pour
 * respecter les limites de taux de l'API TMDB, puis met à jour la base
 * en une seule requête SQL batch pour éviter les déconnexions.
 *
 * Usage : npx tsx scripts/populate-posters.ts [--limit=500]
 */

import { prisma } from "@/lib/prisma";
import { fetchTmdbPosterByTitle } from "@/lib/tmdb";

const BATCH_SIZE = 20; // Nombre de titres par lot TMDB
const TMDB_DELAY_MS = 2000; // Pause entre chaque appel TMDB (~30 req/min)

async function main() {
  const args = process.argv.slice(2);
  const limitMatch = args.find((a) => a.startsWith("--limit="));
  const limit = limitMatch ? Number(limitMatch.split("=")[1]) : 500;

  if (process.env.DATABASE_READY !== "true") {
    console.log("Base de données non prête (DATABASE_READY !== 'true').");
    return;
  }

  console.log("Recherche des titres sans poster...");

  const assets = await prisma.providerAsset.findMany({
    where: {
      posterUrl: null,
      isPublished: true,
      isDuplicate: false,
    },
    orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
    take: limit,
    select: { id: true, title: true, releaseYear: true, provider: true },
  });

  if (assets.length === 0) {
    console.log("Aucun titre sans poster trouvé.");
    return;
  }

  console.log(`Trouvé ${assets.length} titre(s) sans poster. Peuplement...`);

  const results: { id: string; posterUrl: string }[] = [];
  let skipped = 0;

  // Traiter par lots pour respecter les limites de taux TMDB
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(assets.length / BATCH_SIZE);
    console.log(`  Lot ${batchNum}/${totalBatches} (${batch.length} titres)...`);

    for (const asset of batch) {
      try {
        const posterUrl = await fetchTmdbPosterByTitle(asset.title, asset.releaseYear ?? undefined);

        if (posterUrl) {
          results.push({ id: asset.id, posterUrl });
          console.log(`    ✓ ${asset.title} → ${posterUrl}`);
        } else {
          skipped++;
        }

        await new Promise((r) => setTimeout(r, TMDB_DELAY_MS));
      } catch (err) {
        console.error(`    ✗ Erreur pour ${asset.title}:`, err);
      }
    }
  }

  // Mise à jour en masse — une seule requête SQL pour tous les posters trouvés
  if (results.length > 0) {
    console.log(`\nMise à jour de ${results.length} poster(s) en base...`);

    try {
      const whenClauses = results.map((r) => {
        const escapedUrl = r.posterUrl.replace(/'/g, "''");
        return `WHEN '${r.id}' THEN '${escapedUrl}'`;
      }).join(" ");

      const idList = results.map((r) => `'${r.id}'`).join(", ");

      await prisma.$executeRawUnsafe(
        `UPDATE "ProviderAsset" SET "posterUrl" = CASE "id" ${whenClauses} END WHERE "id" IN (${idList})`
      );
      console.log(`  ✓ ${results.length} poster(s) mis(s) à jour.`);
    } catch (err) {
      console.error("  ✗ Erreur lors de la mise à jour en masse:", err);
      // Fallback: mise à jour un par un en cas d'erreur
      console.log("  Tentative de mise à jour un par un...");
      for (const r of results) {
        try {
          await prisma.providerAsset.update({
            where: { id: r.id },
            data: { posterUrl: r.posterUrl },
          });
        } catch (updateErr) {
          console.error(`    ✗ Échec pour ${r.id}:`, updateErr);
        }
      }
    }
  }

  console.log(`\nTerminé : ${results.length} poster(s) ajouté(s), ${skipped} titre(s) sans résultat TMDB.`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
