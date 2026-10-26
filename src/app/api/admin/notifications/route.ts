import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const link = typeof body?.link === "string" && body.link.trim() ? body.link.trim() : null;
    const type = typeof body?.type === "string" && body.type.trim() ? body.type.trim() : "INFO";
    const target = body?.target === "ALL" ? "ALL" : body?.target === "SUBSCRIBERS" ? "SUBSCRIBERS" : "ALL";

    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }

    let users: { id: string }[] = [];
    if (target === "SUBSCRIBERS") {
      users = await prisma.user.findMany({
        where: { role: { in: [Role.SUBSCRIBER, Role.ADMIN] } },
        select: { id: true },
      });
    } else {
      users = await prisma.user.findMany({
        select: { id: true },
      });
    }

    if (users.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        link,
        type,
        read: false,
      })),
    });

    return NextResponse.json({ success: true, count: users.length });
  } catch (error) {
    console.error("admin notifications send error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
