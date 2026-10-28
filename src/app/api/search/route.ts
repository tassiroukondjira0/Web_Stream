import { NextResponse } from "next/server";
import { getAllMedias } from "@/lib/catalog";
import { searchPartnerAssets, providerItemHref } from "@/lib/provider-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || 8), 20);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const allMedias = await getAllMedias();
    const mediaResults = allMedias
      .filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.synopsis.toLowerCase().includes(q) ||
          m.categories.some((c) => c.name.toLowerCase().includes(q))
      )
      .slice(0, limit)
      .map((m) => ({
        title: m.title,
        href: m.type === "SERIES" ? `/series/${m.slug}` : `/films/${m.slug}`,
        type: m.type === "SERIES" ? "Série" : "Film",
      }));

    let partnerResults: { title: string; href: string; type: string }[] = [];
    try {
      const assets = await searchPartnerAssets(q, limit);
      partnerResults = assets.slice(0, limit).map((a) => ({
        title: a.title,
        href: providerItemHref(a),
        type: "Catalogue",
      }));
    } catch {
      partnerResults = [];
    }

    const combined = [...mediaResults, ...partnerResults].slice(0, limit);
    return NextResponse.json({ results: combined });
  } catch (error) {
    console.error("search api error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
