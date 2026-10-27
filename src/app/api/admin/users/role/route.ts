import { NextResponse } from "next/server";
import { getCurrentUser, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasSuperAdminAccess(user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const targetUserId = body?.userId;
    const newRole = body?.role;

    if (!targetUserId || !["USER", "SUBSCRIBER", "ADMIN"].includes(newRole)) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    // Empêcher de modifier un autre super admin
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Impossible de modifier un Super Admin." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur changement de rôle :", error);
    return NextResponse.json({ error: "Impossible de changer le rôle." }, { status: 500 });
  }
}