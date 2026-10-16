import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.providerAsset.groupBy({
    by: ["provider", "contentType"],
    _count: { _all: true },
  });
  console.log("Assets par provider / contentType :");
  for (const g of groups) {
    console.log(`  ${g.provider.padEnd(12)} ${g.contentType.padEnd(8)} ${g._count._all}`);
  }

  for (const p of ["FRENCHSTREAM", "FRENCHMANGA"]) {
    const total = await prisma.providerAsset.count({ where: { provider: p } });
    const withPoster = await prisma.providerAsset.count({
      where: { provider: p, posterUrl: { not: null } },
    });
    const withRank = await prisma.providerAsset.count({
      where: { provider: p, trendingRank: { not: null } },
    });
    console.log(`\n${p}: total=${total} avecPoster=${withPoster} avecTrendingRank=${withRank}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

