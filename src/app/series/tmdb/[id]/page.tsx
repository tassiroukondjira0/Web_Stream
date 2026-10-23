import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ChevronLeft, Play, Calendar, Tv } from "lucide-react";
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
  fetchTvDetails,
  fetchTvSeason,
  fetchTvSeasonsPosters,
  type TmdbSeason,
} from "@/lib/tmdb";
import { resolvePlaybackByTmdbId } from "@/lib/vidzy";
import { vidzySources } from "@/lib/player-sources";
import {
  episodeNumbersForSeason,
  pickActiveSeason,
  resolveDisplayedEpisodes,
} from "@/lib/episode-list";
import {
  resolveFStreamTvPlaybackSources,
  resolvePartnerPlaybackSources,
} from "@/lib/partner-playback";
import { TMDB_PROVIDER } from "@/modules/providers/tmdb/tmdb.client";

/**
 * Fiche & lecteur d'une série du catalogue TMDB. `externalId` = identifiant
 * TMDB : la lecture Vidzy est résolue directement (grille saisons/épisodes
 * fournie par l'API Vidzy). Navigation par URL (?lang=&season=&ep=&host=).
 */

interface TmdbSeriesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: TmdbSeriesPageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: TMDB_PROVIDER, externalId: id },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Série";
  const description = await fetchTmdbOverviewById(id, "tv").catch(() => null);
  return {
    title: `${title} — CinéMax`,
    description: description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function TmdbSeriesPage({ params, searchParams }: TmdbSeriesPageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: TMDB_PROVIDER, externalId: id },
      select: {
        title: true,
        posterUrl: true,
        totalEpisodes: true,
        releaseYear: true,
        contentType: true,
      },
    })
    .catch(() => null);

  // Une série TV animée (genre Animation) appartient à la section « Animes ».
  if (asset?.contentType === "ANIME") {
    const query = new URLSearchParams();
    if (sp.lang) query.set("lang", sp.lang);
    if (sp.season) query.set("season", sp.season);
    if (sp.ep) query.set("ep", sp.ep);
    if (sp.host) query.set("host", sp.host);
    const qs = query.toString();
    redirect(`/animes/tmdb/${id}${qs ? `?${qs}` : ""}`);
  }

  const title = asset?.title ?? "Série";

  const [details, playback] = await Promise.all([
    fetchTvDetails(Number(id)).catch(() => null),
    resolvePlaybackByTmdbId(id, "tv"),
  ]);
  const overview = details?.overview?.trim() || null;

  const allSeasons = playback?.seasons ?? [];
  const availableSeasons =
    allSeasons.length > 0
      ? allSeasons.map((season) => season.season)
      : details
        ? Array.from({ length: details.number_of_seasons }, (_, index) => index + 1)
        : [];

  // Saison active : celle demandée par l'URL, sinon la première saison réelle
  // (les spéciaux TMDB « saison 0 » ne doivent pas être choisis par défaut).
  const requestedSeason = sp.season ? Number.parseInt(sp.season, 10) : null;
  const activeSeason = pickActiveSeason(requestedSeason, availableSeasons);

  // Épisode actif
  const requestedEpisode = sp.ep ? Number.parseInt(sp.ep, 10) : null;
  const activeEpisode = requestedEpisode ?? 1;

  // Sources partenaire : le partenaire publie une fiche PAR saison, on ne
  // récupère donc que celle de la saison active (après la grille Vidzy).
  const partnerSources = await resolvePartnerPlaybackSources(
    title,
    "SERIES",
    asset?.releaseYear ?? null,
    activeSeason,
  ).catch(() => []);

  // Repli : fournisseur secondaire si le partenaire n'expose aucune source.
  const fallbackSources =
    partnerSources.length > 0
      ? []
      : await resolveFStreamTvPlaybackSources(
          title,
          "SERIES",
          asset?.releaseYear ?? null,
          activeSeason,
        ).catch(() => []);

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...partnerSources,
    ...fallbackSources,
  ];

  if (sources.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <UnavailableNotice kind="series" title={title} catalogHref="/series" />
      </div>
    );
  }

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? playback?.year ?? null;
  const totalEpisodes = Math.max(
    asset?.totalEpisodes ?? 0,
    details?.number_of_episodes ?? 0,
    playback?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0,
  );

  const tmdbId = playback?.tmdbId ?? details?.id ?? Number(id);

  // Affiches de saison depuis TMDB (fallback silencieux si pas de credentials)
  const seasonPosters =
    allSeasons.length > 0
      ? await fetchTvSeasonsPosters(
          tmdbId,
          allSeasons.map((season) => season.season),
        ).catch(() => new Map())
      : new Map();

  const seasonsWithPosters = allSeasons.map((s) => ({
    ...s,
    posterUrl: seasonPosters.get(s.season) ?? null,
  }));

  const seasonToShow = allSeasons.find((s) => s.season === activeSeason) ?? null;

  // Détails de la saison active depuis TMDB, même quand Vidzy ne fournit pas
  // de grille : c'est ce qui garantit la liste d'épisodes sur toutes les fiches.
  const seasonDetail: TmdbSeason | null = await fetchTvSeason(tmdbId, activeSeason).catch(
    () => null,
  );

  const listSeason = activeSeason;
  const displayedEpisodes = resolveDisplayedEpisodes({
    tmdbEpisodes: seasonDetail?.episodes,
    gridEpisodes: seasonToShow?.episodes ?? [],
    sourceEpisodes: episodeNumbersForSeason(sources, listSeason),
  });

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
    return `/series/tmdb/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/series"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue séries
      </Link>

      <SourcePlayer
        sources={sources}
        hrefFor={hrefFor}
        selection={{
          lang: sp.lang,
          season: activeSeason,
          episode: activeEpisode,
          host: sp.host,
        }}
          title={title}
          mediaSlug={`tmdb-series-${id}`}
        />

      {/* Liste des épisodes de la saison active juste après le lecteur avec l'épisode en cours au top */}
      {displayedEpisodes.length > 0 && (
        <EpisodeList
          seasonNumber={listSeason}
          episodes={displayedEpisodes}
          activeEpisode={activeEpisode}
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
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {year && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-white/10 px-2.5 py-1 font-semibold text-zinc-200 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                {year}
              </span>
            )}
            {totalEpisodes > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-white/10 px-2.5 py-1 font-semibold text-zinc-200 shadow-sm">
                <Tv className="h-3.5 w-3.5 text-amber-400" />
                {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Synopsis avant les saisons */}
          {overview && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{overview}</p>
          )}

          {/* Sélecteur de saisons (grille avec couvertures et badges) positionné APRÈS la synopsis */}
          {playback?.seasons && playback.seasons.length > 0 && (
            <SeasonSelector
              seasons={seasonsWithPosters}
              currentSeason={activeSeason}
              seriesPoster={poster}
            />
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`tmdb-series-${id}`} />
            <WishlistButton mediaSlug={`tmdb-series-${id}`} />
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
