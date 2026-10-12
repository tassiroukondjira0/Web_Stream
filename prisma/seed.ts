import { PrismaClient, MediaType, AccessLevel, Role } from "@prisma/client";

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

  // 2. Création d'utilisateurs de test (Admin et Utilisateur Freemium)
  const admin = await prisma.user.upsert({
    where: { email: "admin@streamweb.local" },
    update: {},
    create: {
      email: "admin@streamweb.local",
      name: "Administrateur",
      role: Role.ADMIN,
    },
  });

  const subscriber = await prisma.user.upsert({
    where: { email: "abonne@streamweb.local" },
    update: {},
    create: {
      email: "abonne@streamweb.local",
      name: "Abonné Premium",
      role: Role.SUBSCRIBER,
      subscriptions: {
        create: {
          status: "ACTIVE",
          plan: "MONTHLY",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        },
      },
    },
  });
  console.log("✅ Utilisateurs de démonstration créés (Admin & Premium).");

  // 3. Films libres de droits de démonstration (Blender Open Projects)
  const movies = [
    {
      title: "Big Buck Bunny",
      slug: "big-buck-bunny",
      synopsis: "Un lapin géant au grand cœur décide de donner une leçon à un trio d'animaux malicieux qui tyrannisent la forêt.",
      type: MediaType.MOVIE,
      accessLevel: AccessLevel.FREE,
      releaseYear: 2008,
      durationMinutes: 10,
      posterUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg",
      backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200",
      videoStreamId: "demo-stream-bunny",
      isPublished: true,
      rightsValidUntil: new Date("2030-12-31"),
      categories: ["animation", "comedie"],
    },
    {
      title: "Sintel",
      slug: "sintel",
      synopsis: "Une jeune guerrière solitaire parcourt un monde périlleux à la recherche de son dragonneau Scales enlevé par une créature ailée.",
      type: MediaType.MOVIE,
      accessLevel: AccessLevel.FREE,
      releaseYear: 2010,
      durationMinutes: 15,
      posterUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg",
      backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200",
      videoStreamId: "demo-stream-sintel",
      isPublished: true,
      rightsValidUntil: new Date("2030-12-31"),
      categories: ["animation", "action"],
    },
    {
      title: "Tears of Steel",
      slug: "tears-of-steel",
      synopsis: "Dans un futur post-apocalyptique, un groupe de survivants tente de reprogrammer un robot destructeur pour sauver la Terre.",
      type: MediaType.MOVIE,
      accessLevel: AccessLevel.PREMIUM, // Contenu réservé aux abonnés pour tester le mur Freemium
      releaseYear: 2012,
      durationMinutes: 12,
      posterUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/Tears_of_Steel_poster.jpg",
      backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200",
      videoStreamId: "demo-stream-tears",
      isPublished: true,
      rightsValidUntil: new Date("2030-12-31"),
      categories: ["science-fiction", "action"],
    },
    {
      title: "Cosmos Laundromat",
      slug: "cosmos-laundromat",
      synopsis: "Sur une île désolée, un mouton mélancolique rencontre un étrange vendeur qui lui offre une infinité de vies alternatives.",
      type: MediaType.MOVIE,
      accessLevel: AccessLevel.PREMIUM,
      releaseYear: 2015,
      durationMinutes: 12,
      posterUrl: "https://upload.wikimedia.org/wikipedia/commons/0/00/Cosmos_Laundromat_poster.jpg",
      backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200",
      videoStreamId: "demo-stream-cosmos",
      isPublished: true,
      rightsValidUntil: new Date("2030-12-31"),
      categories: ["animation", "science-fiction"],
    },
  ];

  for (const m of movies) {
    const { categories, ...data } = m;
    const media = await prisma.media.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        categories: {
          create: categories.map((catSlug) => ({
            category: { connect: { id: categoriesMap[catSlug] } },
          })),
        },
      },
    });
    console.log(`🎬 Média inséré : ${media.title} (${media.accessLevel})`);
  }

  // 4. Exemple de Série avec saisons et épisodes
  const series = await prisma.media.upsert({
    where: { slug: "chroniques-pionnieres" },
    update: {},
    create: {
      title: "Les Chroniques Pionnières",
      slug: "chroniques-pionnieres",
      synopsis: "Mini-série de découverte explorant les coulisses de la création numérique et des technologies ouvertes.",
      type: MediaType.SERIES,
      accessLevel: AccessLevel.FREE,
      releaseYear: 2024,
      durationMinutes: null,
      posterUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800",
      backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200",
      isPublished: true,
      rightsValidUntil: new Date("2032-12-31"),
      categories: {
        create: [
          { category: { connect: { id: categoriesMap["documentaire"] } } },
          { category: { connect: { id: categoriesMap["science-fiction"] } } },
        ],
      },
      seasons: {
        create: {
          seasonNumber: 1,
          title: "Saison 1 : Les Origines",
          episodes: {
            create: [
              {
                episodeNumber: 1,
                title: "L'Étincelle Créative",
                synopsis: "Comment les artistes indépendants construisent des univers complets.",
                durationMinutes: 24,
                videoStreamId: "demo-ep-1",
                accessLevel: AccessLevel.FREE,
              },
              {
                episodeNumber: 2,
                title: "Au-delà du Réel",
                synopsis: "L'intégration des effets spéciaux photoréalistes.",
                durationMinutes: 26,
                videoStreamId: "demo-ep-2",
                accessLevel: AccessLevel.PREMIUM,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`📺 Série insérée : ${series.title}`);

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
