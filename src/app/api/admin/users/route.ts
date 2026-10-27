import { NextResponse } from "next/server";
import { getCurrentUser, hasSuperAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !hasSuperAdminAccess(user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Erreur liste utilisateurs :", error);
    return NextResponse.json({ error: "Impossible de lister les utilisateurs." }, { status: 500 });
  }
}