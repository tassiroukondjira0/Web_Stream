import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";
import { resolveCatalogPlayback, resolvePlaybackByTmdbId } from "@/lib/vidzy";
import { providerSources, vidzySources, type PlayerSource } from "@/lib/player-sources";
import {
  fetchMovieEmbeds as fetchFStreamTvMovieEmbeds,
  fetchSeriesDetail as fetchFStreamTvSeriesDetail,
} from "@/modules/providers/fstreamtv/fstreamtv.client";
import {
  fetchMovieEmbeds as fetchPartnerMovieEmbeds,
  fetchSeriesDetail as fetchPartnerSeriesDetail,
} from "@/modules/providers/partner/partner.client";
import {
  resolvePartnerPlaybackSources,
  resolveFStreamTvPlaybackSources,
} from "@/lib/partner-playback";
import { publicOrigin } from "@/lib/public-origin";

/** Résout une URL potentiellement relative en URL absolue basée sur la requête entrante. */
function toAbsoluteUrl(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const rawType = (searchParams.get("type") || "movie").toUpperCase();
  const contentType = rawType === "SERIES" || rawType === "TV" ? "SERIES" : "MOVIE";
  const provider = (searchParams.get("provider") || "FSTREAMTV").toUpperCase();

  if (!id) {
    return NextResponse.json({ error: "Identifiant id requis." }, { status: 400 });
  }

  try {
    let title = searchParams.get("title") || "";
    let releaseYear: number | null = null;

    // 1. Recherche des métadonnées dans Prisma si possible
    const asset = await prisma.providerAsset
      .findFirst({
        where: {
          OR: [{ externalId: id }, { id: id }],
        },
        select: { title: true, releaseYear: true, contentType: true, provider: true },
      })
      .catch(() => null);

    if (asset) {
      title = asset.title || title;
      releaseYear = asset.releaseYear ?? null;
    }

    const sources: PlayerSource[] = [];

    // 2. Si c'est du catalogue TMDB pur (ID numérique)
    if (provider === "TMDB" || /^\d{1,10}$/.test(id)) {
      const isSeries = contentType === "SERIES";
      const playback = await resolvePlaybackByTmdbId(id, isSeries ? "tv" : "movie").catch(() => null);
      if (playback?.available) {
        sources.push(...vidzySources(playback));
      }

      if (title) {
        const partnerSources = await resolvePartnerPlaybackSources(title, contentType, releaseYear).catch(() => []);
        sources.push(...partnerSources);
      }
    } else if (provider === "FSTREAMTV") {
      // 3. Fournisseur FStreamTv
      if (contentType === "MOVIE") {
        const [playback, embeds] = await Promise.all([
          title ? resolveCatalogPlayback(title, "MOVIE", releaseYear).catch(() => null) : null,
          fetchFStreamTvMovieEmbeds(id).catch(() => []),
        ]);

        if (playback?.available) {
          sources.push(...vidzySources(playback));
        }

        if (embeds.length > 0) {
          sources.push(
            ...providerSources(
              embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
              1,
              "fstreamtv"
            )
          );
        }
      } else {
        // Série FStreamTv
        const detail = await fetchFStreamTvSeriesDetail(id).catch(() => null);
        if (detail?.streams && detail.streams.length > 0) {
          sources.push(...providerSources(detail.streams, 1, "fstreamtv"));
        }
      }
    } else {
      // 4. Fournisseur Partenaire (FrenchStream)
      if (contentType === "MOVIE") {
        const [playback, embeds] = await Promise.all([
          title ? resolveCatalogPlayback(title, "MOVIE", releaseYear).catch(() => null) : null,
          fetchPartnerMovieEmbeds(id).catch(() => []),
        ]);

        if (playback?.available) {
          sources.push(...vidzySources(playback));
        }

        if (embeds.length > 0) {
          sources.push(
            ...providerSources(
              embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
              1,
              "frenchstream"
            )
          );
        }
      } else {
        const detail = await fetchPartnerSeriesDetail(id).catch(() => null);
        if (detail?.streams && detail.streams.length > 0) {
          sources.push(...providerSources(detail.streams, 1, "frenchstream"));
        }
      }
    }

    // Déduplication par URL
    const seen = new Set<string>();
    const uniqueSources = sources.filter((s) => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return NextResponse.json({
      title,
      contentType,
      sources: uniqueSources.map((s) => ({
        host: s.host,
        label: s.label,
        lang: s.lang.toUpperCase(),
        season: s.season,
        episode: s.episode,
        // Résoudre les URLs relatives (/api/embed?...) en URLs absolues
        // pour que les clients mobiles puissent les charger dans un WebView.
        url: toAbsoluteUrl(s.url, publicOrigin(request)),
      })),
    });
  } catch (error) {
    console.error("Erreur media-sources :", error);
    return NextResponse.json({ error: "Impossible de récupérer les sources de lecture." }, { status: 500 });
  }
}
