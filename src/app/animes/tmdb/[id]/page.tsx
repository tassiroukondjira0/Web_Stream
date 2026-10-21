import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SourcePlayer } from "@/components/SourcePlayer";
import { UnavailableNotice } from "@/components/UnavailableNotice";
import { SeasonSelector } from "@/components/SeasonSelector";
import { EpisodeList } from "@/components/EpisodeList";
import { prisma } from "@/lib/prisma";
import {
  fetchTmdbOverviewById,
  fetchTvSeason,
  fetchTvSeasonsPosters,
  type TmdbSeason,
} from "@/lib/tmdb";
import { resolvePlaybackByTmdbId } from "@/lib/vidzy";
import { vidzySources } from "@/lib/player-sources";
import { resolvePartnerPlaybackSources } from "@/lib/partner-playback";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";

/**
 * Fiche & lecteur d'un animé du catalogue TMDB. `externalId` = identifiant
 * TMDB : la lecture Vidzy est résolue directement (grille saisons/épisodes
 * fournie par l'API Vidzy). Navigation par URL (?lang=&season=&ep=&host=).
 */

interface TmdbAnimePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: TmdbAnimePageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: TMDB_PROVIDER, externalId: id, contentType: { in: ["ANIME", "SERIES"] } },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Animé";
  const description = await fetchTmdbOverviewById(id, "tv").catch(() => null);
  return {
    title: `${title} – CinéMax`,
    description: description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function TmdbAnimePage({ params, searchParams }: TmdbAnimePageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: TMDB_PROVIDER, externalId: id, contentType: { in: ["ANIME", "SERIES"] } },
      select: { title: true, posterUrl: true, totalEpisodes: true, releaseYear: true },
    })
    .catch(() => null);

  const title = asset?.title ?? "Animé";

  const [overview, playback] = await Promise.all([
    fetchTmdbOverviewById(id, "tv"),
    resolvePlaybackByTmdbId(id, "tv"),
  ]);

  const seasons = playback?.seasons ?? [];
  const requestedSeason = sp.season ? Number.parseInt(sp.season, 10) : null;
  const activeSeason =
    requestedSeason !== null && seasons.some((s) => s.season === requestedSeason)
      ? requestedSeason
      : seasons.length > 0
        ? seasons[0].season
        : (requestedSeason ?? 1);

  // Le partenaire classe les animés comme des séries (fiche par saison) :
  // on ne récupère que la saison active, alignée sur la grille Vidzy.
  const partnerSources = await resolvePartnerPlaybackSources(
    title,
    "ANIME",
    asset?.releaseYear ?? null,
    activeSeason,
  ).catch(() => []);

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...partnerSources,
  ];

  if (sources.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <UnavailableNotice kind="anime" title={title} catalogHref="/animes" />
      </div>
    );
  }

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? playback?.year ?? null;
  const totalEpisodes = Math.max(
    asset?.totalEpisodes ?? 0,
    playback?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0,
  );

  let seasonDetail: TmdbSeason | null = null;
  let posterMap = new Map<number, string | null>();
  if (playback?.tmdbId) {
    const raw = await fetchTvSeasonsPosters(playback.tmdbId, seasons.map((s) => s.season)).catch(() => null);
    if (raw instanceof Map) posterMap = raw;
  }
  const seasonsWithPosters: { season: number; episodes: number[]; posterUrl: string | null }[] =
    seasons.map((s) => ({
      season: s.season,
      episodes: s.episodes,
      posterUrl: posterMap.get(s.season) ?? null,
    }));
  if (playback?.tmdbId && activeSeason) {
    seasonDetail = await fetchTvSeason(playback.tmdbId, activeSeason).catch(() => null);
  }

  const fallbackEpisodes = (seasonNumbers: number[]) =>
    seasonNumbers.map((epNum) => ({
      episode_number: epNum,
      name: `Épisode ${epNum}`,
      overview: null,
      still_path: null,
    }));

  const hrefFor = ({
    lang,
    season,
    episode,
    host,
  }: {
    lang?: string | null;
    season?: number | null;
    episode?: number | null;
    host?: string | null;
  }) => {
    const query = new URLSearchParams();
    if (lang) query.set("lang", lang);
    if (season) query.set("season", String(season));
    if (episode) query.set("ep", String(episode));
    if (host) query.set("host", host);
    const qs = query.toString();
    return `/animes/tmdb/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/animes"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Catalogue animés
      </Link>

      <SourcePlayer
        sources={sources}
        hrefFor={hrefFor}
        selection={{
          lang: sp.lang,
          season: activeSeason,
          episode: Number.parseInt(sp.ep ?? "", 10) || null,
          host: sp.host,
        }}
        title={title}
      />

      {/* Liste des épisodes de la saison active juste après le lecteur */}
      {seasonDetail && (
        <EpisodeList
          seasonNumber={activeSeason}
          episodes={
            seasonDetail.episodes?.length > 0
              ? seasonDetail.episodes
              : fallbackEpisodes(seasons.find((s) => s.season === activeSeason)?.episodes ?? [])
          }
          hrefFor={({ season, episode, lang: episodeLang }) =>
            hrefFor({
              lang: episodeLang ?? sp.lang ?? undefined,
              season,
              episode,
            })
          }
          lang={sp.lang ?? null}
        />
      )}

      <div className="mt-8 flex gap-5">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={title}
            className="hidden h-48 w-32 shrink-0 rounded-xl object-cover sm:block"
          />
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {year && <span>{year}</span>}
            {totalEpisodes > 0 && (
              <span className={year ? "border-l border-white/10 pl-3" : ""}>
                {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {overview && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">{overview}</p>
          )}

          {/* Sélecteur de saisons (grille avec couvertures) après la synopsis */}
          {playback?.seasons && playback.seasons.length > 0 && (
            <SeasonSelector
              seasons={seasonsWithPosters}
              currentSeason={activeSeason}
              seriesPoster={poster}
            />
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`tmdb-anime-${id}`} />
            <WishlistButton mediaSlug={`tmdb-anime-${id}`} />
            <ShareButton title={title} />
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Plusieurs sources sont proposées quand elles sont disponibles. La disponibilité et les
        droits de diffusion relèvent des fournisseurs.
      </p>
    </div>
  );
}