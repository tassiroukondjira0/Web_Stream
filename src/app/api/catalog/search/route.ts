import { NextResponse } from "next/server";
import { searchPartnerAssets } from "@/lib/provider-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 20), 60);

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  try {
    const assets = await searchPartnerAssets(q, limit);
    const items = assets.map((item) => ({
      id: item.id,
      externalId: item.externalId,
      provider: item.provider,
      type: item.contentType,
      title: item.title,
      releaseYear: item.releaseYear,
      posterUrl: item.posterUrl,
      totalEpisodes: item.totalEpisodes,
      categorySlug: item.categorySlug ?? null,
      language: item.language ?? null,
      theme: item.theme ?? null,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Catalog search error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}