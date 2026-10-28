import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
/**
 * Publication des titres partenaires (ProviderAsset).
 *
 * L'admin peut masquer (isPublished=false) un titre issu d'un catalogue externe :
 * il disparaît alors des grilles, de la recherche et de la une, mais reste en
 * base. La synchro n'écrase jamais ce choix (voir bulk-upsert.ts).
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !hasAdminAccess(user.role)) return null;
  return user;
}
/** Liste paginée des titres partenaires avec leur état de publication. */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 },
    );
  }
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(60, Math.max(1, parseInt(searchParams.get("pageSize") || "24", 10) || 24));
  const where = {
    ...(provider ? { provider } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  try {
    const [totalItems, items] = await Promise.all([
      prisma.providerAsset.count({ where }),
      prisma.providerAsset.findMany({
        where,
        orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          provider: true,
          externalId: true,
          contentType: true,
          title: true,
          releaseYear: true,
          posterUrl: true,
          isPublished: true,
          trendingRank: true,
        },
      }),
    ]);
    return NextResponse.json({
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    });
  } catch {
    return NextResponse.json(
      { error: "DB_UNAVAILABLE", message: "Base de données indisponible." },
      { status: 503 },
    );
  }
}
/** Bascule la publication d'un titre partenaire (id). */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
      { status: 403 },
    );
  }
  const { id } = await request.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }
  try {
    const existing = await prisma.providerAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Titre introuvable" }, { status: 404 });
    }
    const updated = await prisma.providerAsset.update({
      where: { id },
      data: { isPublished: !existing.isPublished },
      select: { id: true, isPublished: true, title: true },
    });
    return NextResponse.json({ success: true, item: updated });
  } catch {
    return NextResponse.json(
      { error: "DB_UNAVAILABLE", message: "Base de données indisponible." },
      { status: 503 },
    );
  }
}



