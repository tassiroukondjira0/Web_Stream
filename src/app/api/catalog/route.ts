import { NextResponse } from "next/server";
import {
  getPartnerMovies,
  getPartnerSeries,
  getPartnerAnimes,
} from "@/lib/provider-catalog";

const ALLOWED_TYPES = ["MOVIE", "SERIES", "ANIME"] as const;
type CatalogType = (typeof ALLOWED_TYPES)[number];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const requestedType = (
    searchParams.get("type") || "MOVIE"
  ).toUpperCase();

  if (!ALLOWED_TYPES.includes(requestedType as CatalogType)) {
    return NextResponse.json(
      {
        error: "Type invalide.",
        allowedTypes: ALLOWED_TYPES,
      },
      { status: 400 }
    );
  }

  const pageValue = Number(searchParams.get("page") || 1);
  const limitValue = Number(searchParams.get("limit") || 20);

  if (
    !Number.isInteger(pageValue) ||
    pageValue < 1 ||
    !Number.isInteger(limitValue) ||
    limitValue < 1
  ) {
    return NextResponse.json(
      { error: "page et limit doivent être des entiers positifs." },
      { status: 400 }
    );
  }

  const page = pageValue;
  const limit = Math.min(limitValue, 60);
  const type = requestedType as CatalogType;

  try {
    const catalog =
      type === "MOVIE"
        ? await getPartnerMovies(page, limit)
        : type === "SERIES"
          ? await getPartnerSeries(page, limit)
          : await getPartnerAnimes(page, limit);

    return NextResponse.json(
      {
        type,
        items: catalog.items.map((item) => ({
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
        })),
        pagination: {
          page: catalog.page,
          pageSize: catalog.pageSize,
          totalItems: catalog.totalItems,
          totalPages: catalog.totalPages,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Catalog API error:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer le catalogue." },
      { status: 500 }
    );
  }
}
