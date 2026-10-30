import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/auth";

/**
 * Favoris persistés en base (table `bookmarks`).
 * Le slug identifie le titre, qu'il soit local (Media.slug) ou partenaire
 * externe (`partner-series-…`, `frenchmanga-anime-…`, …) — aucune FK vers
 * Media pour ne pas exclure le catalogue externe.
 */

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
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
      where: {
        userId_mediaSlug: {
          userId: user.id,
          mediaSlug: slug,
        },
      },
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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const items = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { mediaSlug: true },
    });

const slugs = items.map((i) => i.mediaSlug);
    const posterMap: Record<string, string | null> = {};
    const titleMap: Record<string, string> = {};

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
          select: { provider: true, externalId: true, posterUrl: true, title: true },
        }),
        prisma.media.findMany({
          where: {
            slug: { in: slugs },
          },
          select: { slug: true, posterUrl: true, title: true },
        }),
      ]);

      // Associer les affiches et titres des médias locaux
      for (const m of localMedias) {
        if (m.posterUrl) {
          posterMap[m.slug] = m.posterUrl;
        }
        if (m.title) {
          titleMap[m.slug] = m.title;
        }
      }

      // Associer les affiches et titres des providerAssets
      for (const slug of slugs) {
        if (posterMap[slug] && titleMap[slug]) continue;
        const m = slug.match(/^(?:partner|frenchmanga|tmdb|fstreamtv)-(?:movie|series|anime)-(.+)$/);
        const id = m ? m[1] : slug;
        const asset = providerAssets.find((a) => a.externalId === id);
        if (asset?.posterUrl && !posterMap[slug]) {
          posterMap[slug] = asset.posterUrl;
        }
        if (asset?.title && !titleMap[slug]) {
          titleMap[slug] = asset.title;
        }
      }
    }

    return NextResponse.json({ bookmarks: slugs, posterMap, titleMap });
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
