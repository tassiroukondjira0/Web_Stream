import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await prisma.user.updateMany({
    where: { role: "ADMIN" },
    data: { role: "SUPER_ADMIN" },
  });
  console.log("Promoted", r.count, "admin(s) to SUPER_ADMIN");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});