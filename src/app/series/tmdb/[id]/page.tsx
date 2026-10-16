import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Play, Tv } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SourcePlayer } from "@/components/SourcePlayer";
import { SeasonSelector } from "@/components/SeasonSelector";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewById, fetchTvSeasonsPosters } from "@/lib/tmdb";
import { resolvePlaybackByTmdbId } from "@/lib/vidzy";
import { vidzySources } from "@/lib/player-sources";
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
      where: { provider: TMDB_PROVIDER, externalId: id, contentType: "SERIES" },
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
      where: { provider: TMDB_PROVIDER, externalId: id, contentType: "SERIES" },
      select: { title: true, posterUrl: true, totalEpisodes: true, releaseYear: true },
    })
    .catch(() => null);

  const title = asset?.title ?? "Série";

  const [overview, playback] = await Promise.all([
    fetchTmdbOverviewById(id, "tv"),
    resolvePlaybackByTmdbId(id, "tv"),
  ]);

  const sources = playback?.available ? vidzySources(playback) : [];

  if (sources.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Tv className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
        <h1 className="text-xl font-bold text-white">Série indisponible</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Aucun flux de lecture n&apos;est disponible pour cette série pour le moment.
        </p>
        <Link
          href="/series"
          className="mt-6 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Retour aux séries
        </Link>
      </div>
    );
  }

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? playback?.year ?? null;
  const totalEpisodes = Math.max(
    asset?.totalEpisodes ?? 0,
    playback?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0,
  );

  const currentSeason = sp.season ? Number.parseInt(sp.season, 10) : null;

  // Affiches de saison depuis TMDB (fallback silencieux si pas de credentials)
  const seasonPosters = playback?.tmdbId
    ? await fetchTvSeasonsPosters(
        playback.tmdbId,
        playback.seasons.map((s) => s.season),
      ).catch(() => new Map())
    : new Map();

  const seasonsWithPosters = (playback?.seasons ?? []).map((s) => ({
    ...s,
    posterUrl: seasonPosters.get(s.season) ?? null,
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
          season: Number.parseInt(sp.season ?? "", 10) || null,
          episode: Number.parseInt(sp.ep ?? "", 10) || null,
          host: sp.host,
        }}
        title={title}
      />

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
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`tmdb-series-${id}`} />
            <WishlistButton mediaSlug={`tmdb-series-${id}`} />
            <ShareButton title={title} />
          </div>
        </div>
      </div>

      {/* Sélecteur de saisons (grille avec couvertures) */}
      {playback?.seasons && playback.seasons.length > 0 && (
        <SeasonSelector
          seasons={seasonsWithPosters}
          currentSeason={currentSeason}
          seriesPoster={poster}
        />
      )}

      {/* Liste des épisodes */}
      {playback?.seasons && playback.seasons.length > 0 && (
        <section className="mt-12 border-t border-white/10 pt-8">
          <h2 className="text-xl font-bold text-white mb-6">
            {currentSeason === null ? "Saisons & épisodes" : `Saison ${currentSeason}`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {playback.seasons
              .filter((s) => currentSeason === null || s.season === currentSeason)
              .flatMap((season) =>
                season.episodes.map((epNum) => (
                  <Link
                    key={epNum}
                    href={hrefFor({
                      season: season.season,
                      episode: epNum,
                      lang: sp.lang ?? "vf",
                    })}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-3 text-xs transition-all hover:border-white/30 hover:bg-zinc-800"
                  >
                    <Play className="h-4 w-4 text-zinc-500 group-hover:text-violet-400" />
                    <span className="font-medium text-zinc-200 leading-none">
                      S{season.season}E{epNum}
                    </span>
                  </Link>
                ))
              )}
          </div>
        </section>
      )}

      <p className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
        <Play className="h-4 w-4 text-violet-500" />
        Plusieurs sources sont proposées quand elles sont disponibles. La disponibilité et les
        droits de diffusion relèvent des fournisseurs.
      </p>
    </div>
  );
}
