/**
 * API de playback complète — expose au mobile tout ce dont il a besoin pour
 * afficher un lecteur intégré avec sélecteurs de langue, saison, épisode et
 * source, exactement comme les pages `/films/tmdb/[id]` et `/series/tmdb/[id]`.
 *
 * GET /api/media-playback?tmdbId=123&type=movie&title=Titre&year=2024&season=1
 *
 * Retourne :
 * - Métadonnées (titre, affiche, année, synopsis, nombre d'épisodes)
 * - Grille Vidzy (saisons avec listes d'épisodes, langues disponibles)
 * - Sources partenaires (FStreamTV, Partner)
 * - Détails TMDB des saisons/épisodes (nom, overview, still)
 * - Liste plate de PlayerSource pour le lecteur
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchTmdbOverviewById,
  fetchTvDetails,
  fetchTvSeason,
  type TmdbEpisode,
  type TmdbSeason,
  type TmdbTvDetails,
} from "@/lib/tmdb";
import { resolvePlaybackByTmdbId } from "@/lib/vidzy";
import { vidzySources, type PlayerSource } from "@/lib/player-sources";
import {
  resolveFStreamTvPlaybackSources,
  resolvePartnerPlaybackSources,
} from "@/lib/partner-playback";
import {
  episodeNumbersForSeason,
  pickActiveSeason,
  resolveDisplayedEpisodes,
} from "@/lib/episode-list";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";

interface PlaybackResponse {
  title: string;
  posterUrl: string | null;
  year: number | null;
  overview: string | null;
  totalEpisodes: number;
  mediaType: "movie" | "tv";
  /** Sources de lecture disponibles (Vidzy + partenaires). */
  sources: PlayerSource[];
  /** Langues disponibles. */
  languages: string[];
  /** Saisons disponibles (grille Vidzy). */
  seasons: { season: number; episodes: number[] }[];
  /** Détails des épisodes de la saison active depuis TMDB. */
  episodes: TmdbEpisode[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get("tmdbId");
  const type = (searchParams.get("type") as "movie" | "tv") ?? "movie";
  const title = searchParams.get("title") ?? "";
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : null;
  const season = searchParams.get("season") ? Number(searchParams.get("season")) : null;

  if (!tmdbId || !/^\d{1,10}$/.test(tmdbId)) {
    return NextResponse.json(
      { error: "Paramètre tmdbId invalide." },
      { status: 400 }
    );
  }

  // 1. Métadonnées depuis Prisma
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: TMDB_PROVIDER, externalId: tmdbId },
      select: {
        title: true,
        posterUrl: true,
        totalEpisodes: true,
        releaseYear: true,
        contentType: true,
      },
    })
    .catch(() => null);

  const mediaTitle = asset?.title ?? title ?? "Titre inconnu";
  const mediaYear = asset?.releaseYear ?? year ?? null;

  // 2. Vidzy : disponibilité + grille saisons/épisodes
  const playback = await resolvePlaybackByTmdbId(tmdbId, type).catch(() => null);

  // 3. Synopsis depuis TMDB
  const overview = await fetchTmdbOverviewById(tmdbId, type).catch(() => null);

  // 4. Détails TV (nombre de saisons/épisodes) pour les séries
  let tvDetails: TmdbTvDetails | null = null;
  if (type === "tv") {
    tvDetails = await fetchTvDetails(Number(tmdbId)).catch(() => null);
  }

  // 5. Saison active
  const allSeasons = playback?.seasons ?? [];
  const availableSeasons =
    allSeasons.length > 0
      ? allSeasons.map((s) => s.season)
      : tvDetails
        ? Array.from({ length: tvDetails.number_of_seasons }, (_, i) => i + 1)
        : [];

  const activeSeason = pickActiveSeason(season ?? null, availableSeasons);

  // 6. Sources partenaires
  const partnerSources = await resolvePartnerPlaybackSources(
    mediaTitle,
    type === "tv" ? "SERIES" : "MOVIE",
    mediaYear,
    type === "tv" ? activeSeason : undefined,
  ).catch(() => []);

  const fallbackSources =
    partnerSources.length > 0
      ? []
      : await resolveFStreamTvPlaybackSources(
          mediaTitle,
          type === "tv" ? "SERIES" : "MOVIE",
          mediaYear,
          type === "tv" ? activeSeason : undefined,
        ).catch(() => []);

  const sources: PlayerSource[] = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...partnerSources,
    ...fallbackSources,
  ];

  // 7. Langues disponibles
  const languages = playback?.languages ?? [];

  // 8. Détails des épisodes de la saison active depuis TMDB
  let episodes: TmdbEpisode[] = [];
  if (type === "tv" && allSeasons.length > 0) {
    const tmdbIdNum = playback?.tmdbId ?? Number(tmdbId);
    const seasonDetail: TmdbSeason | null = await fetchTvSeason(
      tmdbIdNum,
      activeSeason,
    ).catch(() => null);

    const seasonToShow = allSeasons.find((s) => s.season === activeSeason) ?? null;
    episodes = resolveDisplayedEpisodes({
      tmdbEpisodes: seasonDetail?.episodes,
      gridEpisodes: seasonToShow?.episodes ?? [],
      sourceEpisodes: episodeNumbersForSeason(sources, activeSeason),
    });
  }

  // 9. Nombre total d'épisodes
  const totalEpisodes = Math.max(
    asset?.totalEpisodes ?? 0,
    tvDetails?.number_of_episodes ?? 0,
    playback?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0,
  );

  // 10. Affiche
  const posterUrl = asset?.posterUrl ?? playback?.poster ?? null;

  return NextResponse.json<PlaybackResponse>({
    title: mediaTitle,
    posterUrl,
    year: mediaYear,
    overview,
    totalEpisodes,
    mediaType: playback?.kind ?? type,
    sources,
    languages,
    seasons: allSeasons,
    episodes,
  });
}
