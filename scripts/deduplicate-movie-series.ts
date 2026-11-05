/**
 * Nettoie les doublons ProviderAsset : un même titre ne doit pas exister
 * à la fois comme MOVIE et SERIES pour un même provider.
 *
 * Le site source (french-streaming.tv, partenaire) peut lister un même titre
 * dans les sections films ET séries. Ce script supprime les entrées SERIES
 * quand une entrée MOVIE existe déjà pour le même (provider, externalId).
 *
 * Usage : npx tsx scripts/deduplicate-movie-series.ts
 */

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("Recherche des doublons MOVIE/SERIES...");

  // Trouve tous les externalId qui ont à la fois MOVIE et SERIES pour un même provider
  const duplicates = await prisma.$queryRaw<
    Array<{ provider: string; externalId: string }>
  >`
    SELECT "provider", "externalId"
    FROM provider_assets
    WHERE "contentType" IN ('MOVIE', 'SERIES')
    GROUP BY "provider", "externalId"
    HAVING COUNT(DISTINCT "contentType") > 1
  `;

  if (duplicates.length === 0) {
    console.log("Aucun doublon trouvé. La base est propre.");
    return;
  }

  console.log(`Trouvé ${duplicates.length} doublon(s). Nettoyage en une seule requête...`);

  // Supprime toutes les entrées SERIES dont le (provider, externalId) a aussi une entrée MOVIE
  // Utilise une sous-requête pour éviter les boucles et le timeout de connexion
  const result = await prisma.$executeRaw`
    DELETE FROM provider_assets
    WHERE "contentType" = 'SERIES'
      AND ("provider", "externalId") IN (
        SELECT "provider", "externalId"
        FROM provider_assets
        WHERE "contentType" IN ('MOVIE', 'SERIES')
        GROUP BY "provider", "externalId"
        HAVING COUNT(DISTINCT "contentType") > 1
      )
  `;

  console.log(`Nettoyage terminé : ${result} entrée(s) SERIES supprimée(s).`);
}

main()
  .catch((err) => {
    console.error("Erreur:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
