import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get("tmdb");
  const type = searchParams.get("type") || "movie";

  if (!tmdbId || !/^\d{1,10}$/.test(tmdbId)) {
    return NextResponse.json({ synopsis: null });
  }

  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    return NextResponse.json({ synopsis: null });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${type === "tv" ? "tv" : "movie"}/${tmdbId}?language=fr-FR`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ synopsis: null });
    }
    const data = (await res.json()) as { overview?: string };
    return NextResponse.json({ synopsis: data.overview || null });
  } catch {
    return NextResponse.json({ synopsis: null });
  }
}