import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePartnerPlaybackSources, resolveFStreamTvPlaybackSources } from "@/lib/partner-playback";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("tmdb") || searchParams.get("id");
  const type = (searchParams.get("type") || "movie").toLowerCase();

  if (!rawId) {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  }

  try {
    let tmdbId = rawId;

    // 1. Si l'identifiant n'est pas un nombre pur, chercher dans ProviderAsset
    if (!/^\d{1,10}$/.test(rawId)) {
      const asset = await prisma.providerAsset.findFirst({
        where: {
          OR: [{ externalId: rawId }, { id: rawId }],
        },
      }).catch(() => null);

      if (asset) {
        // Essayer les sources partenaires en premier
        const partnerSources = await resolvePartnerPlaybackSources(
          asset.title,
          asset.contentType,
          asset.releaseYear ?? null,
          1
        ).catch(() => []);

        const fallbackSources =
          partnerSources.length > 0
            ? []
            : await resolveFStreamTvPlaybackSources(
                asset.title,
                asset.contentType,
                asset.releaseYear ?? null,
                1
              ).catch(() => []);

        const allSources = [...partnerSources, ...fallbackSources];
        if (allSources.length > 0 && allSources[0].url) {
          return NextResponse.json({
            videoUrl: allSources[0].url,
            type: "embed",
            sources: allSources.map((s) => ({ label: s.label, url: s.url, lang: s.lang })),
          });
        }
      }
    }

    // 2. Si c'est un identifiant TMDB numérique
    if (/^\d{1,10}$/.test(tmdbId)) {
      // Construction de l'URL Vidzy standard
      const isSeries = type === "series" || type === "tv";
      const fallbackVidzyEmbed = isSeries
        ? `https://vidzy.org/serie/${tmdbId}/1/1?color=7c3aed`
        : `https://vidzy.org/movie/${tmdbId}?color=7c3aed`;

      try {
        const res = await fetch(`https://vidzy.org/api/${tmdbId}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          // Vidzy utilise la clé 'embed' (ou fallback)
          const embedUrl =
            (typeof data.embed === "string" ? data.embed : null) ||
            (typeof data.embedUrl === "string" ? data.embedUrl : null) ||
            fallbackVidzyEmbed;

          // Tentative d'extraction de flux direct mp4 / m3u8
          try {
            const embedRes = await fetch(embedUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,*/*",
                Referer: "https://vidzy.org/",
              },
              signal: AbortSignal.timeout(4000),
            });

            if (embedRes.ok) {
              const html = await embedRes.text();
              const videoMatch =
                html.match(/src\s*=\s*["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i) ||
                html.match(/file\s*:\s*["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i) ||
                html.match(/source\s*src\s*=\s*["']([^"']+)["']/i);

              if (videoMatch && videoMatch[1]) {
                return NextResponse.json({ videoUrl: videoMatch[1], type: "direct" });
              }
            }
          } catch {
            // Repli sur l'embed
          }

          return NextResponse.json({ videoUrl: embedUrl, type: "embed" });
        }
      } catch (err) {
        console.warn("Vidzy API fetch warning:", err);
      }

      // Repli direct sur l'embed standard Vidzy si disponible
      return NextResponse.json({ videoUrl: fallbackVidzyEmbed, type: "embed" });
    }

    return NextResponse.json(
      { error: "Aucun flux vidéo disponible pour ce contenu." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Video URL error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la résolution du flux." }, { status: 500 });
  }
}
