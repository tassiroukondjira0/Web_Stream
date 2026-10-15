import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Slugs des contenus de démonstration insérés par prisma/seed.ts. */
const DEMO_SLUGS = ["sintel", "tears-of-steel", "cosmos-laundromat", "chroniques-pionnieres"];

async function main() {
  // 1. Favoris / listes de souhaits pointant vers les slugs de démo (pas de FK).
  const bookmarks = await prisma.bookmark.deleteMany({ where: { mediaSlug: { in: DEMO_SLUGS } } });
  const wishlist = await prisma.wishlistItem.deleteMany({
    where: { mediaSlug: { in: DEMO_SLUGS } },
  });
  console.log(`🗑️ Favoris de démo supprimés : ${bookmarks.count}`);
  console.log(`🗑️ Souhaits de démo supprimés : ${wishlist.count}`);

  // 2. Les médias de démo (saisons, épisodes, catégories liées et historique
  //    partent en cascade via les onDelete du schéma).
  const medias = await prisma.media.deleteMany({ where: { slug: { in: DEMO_SLUGS } } });
  console.log(`🗑️ Médias de démo supprimés : ${medias.count}`);

  const remaining = await prisma.media.count();
  console.log(`📊 Médias restants en base : ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
