import { NextResponse } from "next/server";
import { getPartnerAssetById } from "@/lib/provider-catalog";

const ALLOWED_TYPES = ["MOVIE", "SERIES", "ANIME"] as const;
type CatalogType = (typeof ALLOWED_TYPES)[number];

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);

  const requestedType = (
    searchParams.get("type") || "MOVIE"
  ).toUpperCase();

  if (!ALLOWED_TYPES.includes(requestedType as CatalogType)) {
    return NextResponse.json(
      { error: "Type invalide." },
      { status: 400 }
    );
  }

  const item = await getPartnerAssetById(
    id,
    requestedType as CatalogType
  );

  if (!item) {
    return NextResponse.json(
      { error: "Titre introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    item: {
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
    },
  });
}