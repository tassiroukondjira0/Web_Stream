import { NextResponse } from "next/server";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";

/**
 * Récupère le synopsis (overview) d'un titre depuis TMDB.
 * Utilisé par l'application mobile qui n'a pas accès direct à l'API TMDB.
 *
 * GET /api/media-overview?title=Nom%20du%20titre
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");

  if (!title || title.trim().length < 2) {
    return NextResponse.json(
      { error: "Paramètre 'title' requis." },
      { status: 400 }
    );
  }

  try {
    const overview = await fetchTmdbOverviewByTitle(title.trim());

    return NextResponse.json(
      { overview },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Media overview API error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer le synopsis." },
      { status: 500 }
    );
  }
}

