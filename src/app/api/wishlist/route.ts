import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Liste de souhaits persistée en base (table `wishlist_items`).
 * Le slug identifie le titre, qu'il soit local (Media.slug) ou partenaire
 * externe (`frenchstream-series-…`, `frenchmanga-anime-…`, …) — aucune FK vers
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

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_mediaSlug: { userId: user.id, mediaSlug: slug } },
    });

    let inWishlist: boolean;
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      inWishlist = false;
    } else {
      await prisma.wishlistItem.create({
        data: { userId: user.id, mediaSlug: slug },
      });
      inWishlist = true;
    }

    return NextResponse.json({
      success: true,
      mediaSlug: slug,
      inWishlist,
    });
  } catch (error) {
    console.error("Erreur liste de souhaits :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { mediaSlug: true },
  });
  return NextResponse.json({ wishlist: items.map((i) => i.mediaSlug) });
}
