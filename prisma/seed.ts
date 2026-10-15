import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début du peuplement de la base de données...");

  // 1. Création des catégories / genres
  const categoriesData = [
    { name: "Animation", slug: "animation", description: "Films et séries d'animation créative et 3D." },
    { name: "Science-Fiction", slug: "science-fiction", description: "Exploration spatiale, futurisme et technologies." },
    { name: "Documentaire", slug: "documentaire", description: "Histoires vraies, nature et culture." },
    { name: "Action", slug: "action", description: "Rythme intense, aventure et cascades." },
    { name: "Comédie", slug: "comedie", description: "Humour, légèreté et divertissement." },
  ];

  const categoriesMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoriesMap[cat.slug] = category.id;
  }
  console.log("✅ Catégories créées.");

  // 2. Les comptes utilisateurs ne sont plus pré-créés : le premier compte
  //    enregistré via l'inscription obtient automatiquement le rôle ADMIN.
  //
  // 3. Les contenus de démonstration (Sintel, Tears of Steel, Cosmos
  //    Laundromat, Les Chroniques Pionnières) ne sont plus insérés : le
  //    catalogue est alimenté par l'import admin / les synchronisations
  //    des fournisseurs externes.

  console.log("✨ Seed terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
