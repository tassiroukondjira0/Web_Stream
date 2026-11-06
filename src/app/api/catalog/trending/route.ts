import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint dédié à la section "À la une".
 * Retourne un mélange des titres les plus populaires (trendingRank) et des
 * dernières sorties (releaseYear) — films + séries + animes combinés.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit") || 30);
  const limit = Math.min(60, Math.max(1, limitValue));

  if (process.env.DATABASE_READY !== "true") {
    return NextResponse.json({ items: [] });
  }

  try {
    const half = Math.ceil(limit / 2);

    // 1. Titres les plus populaires (trendingRank) avec poster
    const trending = await prisma.providerAsset.findMany({
      where: {
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
        trendingRank: { not: null },
        posterUrl: { not: null },
      },
      orderBy: [{ trendingRank: "asc" }, { releaseYear: "desc" }],
      take: half,
      select: {
        id: true,
        externalId: true,
        provider: true,
        contentType: true,
        title: true,
        releaseYear: true,
        posterUrl: true,
        totalEpisodes: true,
        categorySlug: true,
        language: true,
        theme: true,
        trendingRank: true,
      },
    });

    // 2. Dernières sorties (releaseYear) avec poster — exclut ceux déjà dans trending
    const excludeIds = trending.map((r) => r.id);
    const recent = await prisma.providerAsset.findMany({
      where: {
        isPublished: true,
        isDuplicate: false,
        hasSources: true,
        posterUrl: { not: null },
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: [{ releaseYear: "desc" }, { title: "asc" }],
      take: limit - trending.length,
      select: {
        id: true,
        externalId: true,
        provider: true,
        contentType: true,
        title: true,
        releaseYear: true,
        posterUrl: true,
        totalEpisodes: true,
        categorySlug: true,
        language: true,
        theme: true,
        trendingRank: true,
      },
    });

    // Combine les deux listes : populaires d'abord, puis dernières sorties
    const items = [...trending, ...recent];

    return NextResponse.json(
      {
        items: items.map((item) => ({
          id: item.id,
          externalId: item.externalId,
          provider: item.provider,
          type: item.contentType,
          title: item.title,
          releaseYear: item.releaseYear,
          posterUrl: item.posterUrl,
          backdropUrl: null,
          totalEpisodes: item.totalEpisodes,
          categorySlug: item.categorySlug ?? null,
          language: item.language ?? null,
          theme: item.theme ?? null,
          trendingRank: item.trendingRank ?? null,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("Trending API error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les titres tendance." },
      { status: 500 }
    );
  }
}
