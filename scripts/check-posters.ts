import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const groups = ["FRENCHSTREAM", "FRENCHMANGA"];
  for (const provider of groups) {
    for (const contentType of ["MOVIE", "SERIES", "ANIME"] as const) {
      const total = await prisma.providerAsset.count({ where: { provider, contentType } });
      const withPoster = await prisma.providerAsset.count({
        where: { provider, contentType, posterUrl: { not: null } },
      });
      const sample = await prisma.providerAsset.findMany({
        where: { provider, contentType },
        take: 3,
        select: { title: true, posterUrl: true },
      });
      console.log(`\n=== ${provider} / ${contentType} === total=${total} avecPoster=${withPoster}`);
      for (const s of sample) console.log(`   "${s.title}" -> posterUrl=${JSON.stringify(s.posterUrl)}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
