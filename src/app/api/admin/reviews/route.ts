import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ reviews: [] });
  }

  const slug = new URL(request.url).searchParams.get("slug");

  try {
    const reviews = await prisma.review.findMany({
      where: slug ? { mediaSlug: slug } : undefined,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        mediaSlug: r.mediaSlug,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: r.user.name || "Utilisateur",
        userEmail: r.user.email,
      })),
    });
  } catch (error) {
    console.error("Erreur lecture avis admin :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await readRequestBodyLimited(request, 4 * 1024);
  if (!body) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const id = (input as Record<string, unknown>)?.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ error: "Base de données indisponible." }, { status: 503 });
  }

  try {
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  }
}
