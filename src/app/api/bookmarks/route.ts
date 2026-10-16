import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Favoris persistés en base (table `bookmarks`).
 * Le slug identifie le titre, qu'il soit local (Media.slug) ou partenaire
 * externe (`partner-series-…`, `frenchmanga-anime-…`, …) — aucune FK vers
 * Media pour ne pas exclure le catalogue externe.
 */

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { mediaSlug } = await request.json();
    if (!mediaSlug || typeof mediaSlug !== "string") {
      return NextResponse.json({ error: "Média requis" }, { status: 400 });
    }

    const slug = mediaSlug.trim();
    if (!slug) {
      return NextResponse.json({ error: "Média requis" }, { status: 400 });
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_mediaSlug: { userId: user.id, mediaSlug: slug } },
    });

    let isBookmarked: boolean;
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      isBookmarked = false;
    } else {
      await prisma.bookmark.create({
        data: { userId: user.id, mediaSlug: slug },
      });
      isBookmarked = true;
    }

    return NextResponse.json({
      success: true,
      mediaSlug: slug,
      isBookmarked,
    });
  } catch (error) {
    console.error("Erreur favoris :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const items = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { mediaSlug: true },
  });
  return NextResponse.json({ bookmarks: items.map((i) => i.mediaSlug) });
}
