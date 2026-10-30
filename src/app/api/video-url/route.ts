import { NextResponse } from "next/server";
import { vidzyMovieUrl } from "@/lib/vidzy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get("tmdb");
  const type = searchParams.get("type") || "movie";

  if (!tmdbId || !/^\d{1,10}$/.test(tmdbId)) {
    return NextResponse.json({ error: "tmdbId invalide" }, { status: 400 });
  }

  try {
    // Fetch Vidzy availability to get the embed URL
    const res = await fetch(`https://vidzy.org/api/${tmdbId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Vidzy indisponible" }, { status: 502 });
    }
    const data = (await res.json()) as Record<string, unknown>;
    const embedUrl = data.embedUrl as string | null;

    if (!embedUrl) {
      return NextResponse.json({ error: "Pas d'embed disponible" }, { status: 404 });
    }

    // Fetch the embed HTML to extract the video source
    const embedRes = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,*/*",
        Referer: "https://vidzy.org/",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!embedRes.ok) {
      return NextResponse.json({ error: "Embed indisponible" }, { status: 502 });
    }
    const html = await embedRes.text();

    // Try to extract a direct video URL (mp4, m3u8, etc.)
    const videoMatch =
      html.match(/src\s*=\s*["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i) ||
      html.match(/file\s*:\s*["']([^"']+)["']/i) ||
      html.match(/source\s*src\s*=\s*["']([^"']+)["']/i);

    if (videoMatch) {
      return NextResponse.json({ videoUrl: videoMatch[1], type: "direct" });
    }

    // Fallback: return the embed URL for WebView
    return NextResponse.json({ videoUrl: embedUrl, type: "embed" });
  } catch (error) {
    console.error("Video URL error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}