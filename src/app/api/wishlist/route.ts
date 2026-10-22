import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Liste de souhaits persistée en base (table `wishlist_items`).
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
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { mediaSlug: true },
    });

    const slugs = items.map((i) => i.mediaSlug);
    const posterMap: Record<string, string | null> = {};

    if (slugs.length > 0) {
      const externalIds = slugs.map((slug) => {
        const m = slug.match(/^(?:partner|frenchmanga|tmdb|fstreamtv)-(?:movie|series|anime)-(.+)$/);
        return m ? m[1] : slug;
      });

      const [providerAssets, localMedias] = await Promise.all([
        prisma.providerAsset.findMany({
          where: {
            externalId: { in: externalIds },
          },
          select: { provider: true, externalId: true, posterUrl: true },
        }),
        prisma.media.findMany({
          where: {
            slug: { in: slugs },
          },
          select: { slug: true, posterUrl: true },
        }),
      ]);

      // Associer les affiches des médias locaux
      for (const m of localMedias) {
        if (m.posterUrl) {
          posterMap[m.slug] = m.posterUrl;
        }
      }

      // Associer les affiches des providerAssets
      for (const slug of slugs) {
        if (posterMap[slug]) continue;
        const m = slug.match(/^(?:partner|frenchmanga|tmdb|fstreamtv)-(?:movie|series|anime)-(.+)$/);
        const id = m ? m[1] : slug;
        const asset = providerAssets.find((a) => a.externalId === id);
        if (asset?.posterUrl) {
          posterMap[slug] = asset.posterUrl;
        }
      }
    }

    return NextResponse.json({ wishlist: slugs, posterMap });
  } catch (error) {
    console.error("Erreur lors de la récupération de la liste de souhaits :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
