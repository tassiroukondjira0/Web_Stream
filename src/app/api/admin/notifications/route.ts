import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "dev-secret");

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "ADMIN") return null;
    return payload as { sub: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const link = typeof body?.link === "string" ? body.link.trim() : null;
    const target = body?.target === "SUBSCRIBERS" ? "SUBSCRIBERS" : "ALL";

    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }

    let where: any = {};
    if (target === "SUBSCRIBERS") {
      where = { role: "SUBSCRIBER" };
    }

    const users = await prisma.user.findMany({ where, select: { id: true } });
    if (users.length === 0) {
      return NextResponse.json({ error: "Aucun utilisateur ciblé" }, { status: 400 });
    }

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        link,
      })),
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      message: `Notification envoyée à ${users.length} utilisateur(s)`,
    });
  } catch (error) {
    console.error("admin notifications error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
