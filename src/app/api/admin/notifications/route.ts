import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Non autorisÃ©" }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const link = typeof body?.link === "string" ? body.link.trim() : null;
    const target = body?.target === "SUBSCRIBERS" ? "SUBSCRIBERS" : "ALL";
    const type = body?.type === "ANNONCE" ? "ANNONCE" : "NOUVEAUTE";
    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }
    let where: any = {};
    if (target === "SUBSCRIBERS") {
      where = { role: "SUBSCRIBER" };
    } else {
      // Exclude admin users from receiving notifications
      where = { role: { not: "ADMIN" } };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    if (users.length === 0) {
      return NextResponse.json({ error: "Aucun utilisateur ciblÃ©" }, { status: 400 });
    }
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        link,
        type,
      })),
    });
    return NextResponse.json({
      success: true,
      count: users.length,
      message: `Notification envoyÃ©e Ã  ${users.length} utilisateur(s)`,
    });
  } catch (error) {
    console.error("admin notifications error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}



