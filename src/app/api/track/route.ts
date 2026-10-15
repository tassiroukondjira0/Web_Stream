import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Enregistre une page vue pour les statistiques de trafic admin.
 * Limite anti-bruit : ignore les assets Next, les API et les appels répétés
 * du même visiteur sur la même page à moins de 30 s d'intervalle.
 */
export async function POST(request: Request) {
  try {
    const { path } = await request.json().catch(() => ({}));
    if (!path || typeof path !== "string" || path.length > 512) {
      return NextResponse.json({ error: "Chemin requis." }, { status: 400 });
    }
    if (path.startsWith("/_next") || path.startsWith("/api/") || path === "/favicon.ico") {
      return NextResponse.json({ success: true, skipped: true });
    }

    const user = await getCurrentUser().catch(() => null);
    const since = new Date(Date.now() - 30_000);
    const recent = await prisma.pageView
      .findFirst({
        where: user
          ? { userId: user.id, path, createdAt: { gte: since } }
          : { userId: null, path, createdAt: { gte: since } },
        select: { id: true },
      })
      .catch(() => null);
    if (recent) return NextResponse.json({ success: true, skipped: true });

    await prisma.pageView.create({
      data: { path, userId: user?.id ?? null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur tracking page :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
