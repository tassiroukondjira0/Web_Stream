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

  const existing = await prisma.buildInfo.findFirst({
    where: { buildId: "050909d7-d764-4e20-aec1-e375e96446ca" },
  });

  if (!existing) {
    await prisma.buildInfo.create({
      data: {
        buildId: "050909d7-d764-4e20-aec1-e375e96446ca",
        buildUrl: "https://expo.dev/accounts/tassirou/projects/cinemax-mobile/builds/050909d7-d764-4e20-aec1-e375e96446ca",
        artifactUrl: "https://expo.dev/artifacts/eas/050909d7-d764-4e20-aec1-e375e96446ca.apk",
        platform: "android",
      },
    });
    console.log("✅ Build info seedé avec succès");
  } else {
    console.log(`⏭️  Build info déjà existant — seed sauté`);
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
