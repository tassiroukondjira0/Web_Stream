import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

async function main() {
  const tables = [
    { name: "Utilisateurs", model: "user", count: async () => await prisma.user.count() },
    { name: "Médias locaux", model: "media", count: async () => await prisma.media.count() },
    { name: "Catalogue externe", model: "providerAsset", count: async () => await prisma.providerAsset.count() },
    { name: "Abonnements", model: "subscription", count: async () => await prisma.subscription.count() },
    { name: "Paiements", model: "payment", count: async () => await prisma.payment.count() },
    { name: "Signets", model: "bookmark", count: async () => await prisma.bookmark.count() },
    { name: "Historique", model: "watchHistory", count: async () => await prisma.watchHistory.count() },
    { name: "Catégories", model: "category", count: async () => await prisma.category.count() },
    { name: "Notifications", model: "notification", count: async () => await prisma.notification.count() },
    { name: "Avis", model: "review", count: async () => await prisma.review.count() },
    { name: "Liste de souhaits", model: "wishlistItem", count: async () => await prisma.wishlistItem.count() },
    { name: "Progression lecture", model: "playbackProgress", count: async () => await prisma.playbackProgress.count() },
    { name: "Pages vues", model: "pageView", count: async () => await prisma.pageView.count() },
    { name: "Sync runs", model: "providerSyncRun", count: async () => await prisma.providerSyncRun.count() },
  ];

  console.log("\n📊 État de la base de données Neon :\n");
  console.log("┌──────────────────────────┬─────────┐");
  console.log("│ Table                    │ Compte  │");
  console.log("├──────────────────────────┼─────────┤");

  let total = 0;
  for (const t of tables) {
    try {
      const c = await t.count();
      total += c;
      const bar = c > 0 ? "✓".repeat(Math.min(c, 20)) : "vide";
      console.log(`│ ${t.name.padEnd(22)} │ ${String(c).padEnd(7)} │`);
    } catch (e) {
      console.log(`│ ${t.name.padEnd(22)} │ erreur  │`);
    }
  }

  console.log("└──────────────────────────┴─────────┘");
  console.log(`\nTotal: ${total} enregistrements\n`);

  if (total === 0) {
    console.log("⚠️  La base de données est VIDE — toutes les données ont été supprimées.\n");
    console.log("🔧 Options de restauration :\n");
    console.log("  1. Neon Dashboard → Branches → restaurer une branche précédente\n");
    console.log("  2. Neon Dashboard → Time Travel → restaurer à un instant avant la suppression\n");
    console.log("  3. Si tu as un dump SQL de backup, importe-le avec : psql < backup.sql\n");
  }
}

main()
  .catch(e => { console.error("❌ Erreur :", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
