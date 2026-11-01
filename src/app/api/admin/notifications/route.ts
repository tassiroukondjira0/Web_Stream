import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !hasAdminAccess(user.role)) return null;
  return user;
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
    const type = body?.type === "ANNONCE" ? "ANNONCE" : "NOUVEAUTE";

    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }

    let where: Prisma.UserWhereInput = {};
    if (target === "SUBSCRIBERS") {
      where = { role: "SUBSCRIBER" };
    } else {
      // Exclure les administrateurs et super administrateurs des destinataires
      where = { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, pushToken: true },
    });
    if (users.length === 0) {
      return NextResponse.json({ error: "Aucun utilisateur ciblé" }, { status: 400 });
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

    // Envoyer les push notifications Expo aux appareils mobiles
    const tokens = users
      .map((u) => u.pushToken)
      .filter((t): t is string => !!t && t.trim() !== '');

    if (tokens.length > 0) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokens,
            sound: 'default',
            title,
            body: message,
            data: link ? { link } : undefined,
          }),
        });
        console.log(`Push Expo envoyé à ${tokens.length} appareil(s)`);
      } catch (pushError) {
        console.error('Erreur push Expo:', pushError);
      }
    }

    return NextResponse.json({
      success: true,
      count: users.length,
      pushSent: tokens.length,
      message: `Notification envoyée à ${users.length} utilisateur(s) (${tokens.length} push)`,
    });
  } catch (error) {
    console.error("admin notifications error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
