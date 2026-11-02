import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  // Insère le dernier build EAS connu si la table est vide
  // Ce script est exécuté après `prisma db push` ou `prisma migrate dev`
  // Le webhook `/api/eas-webhook` mettra à jour cet enregistrement après chaque nouveau build
  
  const existing = await prisma.buildInfo.count();
  
  if (existing === 0) {
    await prisma.buildInfo.create({
      data: {
        buildId: "3b56c3bc-083d-4988-aff4-fd38eefc1fa8",
        buildUrl: "https://expo.dev/accounts/tassirou/projects/cinemax-mobile/builds/3b56c3bc-083d-4988-aff4-fd38eefc1fa8",
        artifactUrl: "https://expo.dev/artifacts/eas/GnIzVS4hKyr7s2sI8DZYjrWuo6E5tWq_T6j5E6sdGJs.apk",
        platform: "android",
      },
    });
    console.log("✅ Build info seedé avec succès");
  } else {
    console.log(`⏭️  Build info déjà existant (${existing} enregistrement(s)) — seed sauté`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
