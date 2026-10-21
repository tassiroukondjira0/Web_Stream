import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { SourcePlayer } from "@/components/SourcePlayer";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SeasonSelector } from "@/components/SeasonSelector";
import { EpisodeList } from "@/components/EpisodeList";
import { prisma } from "@/lib/prisma";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import { vidzySources } from "@/lib/player-sources";
import { resolvePartnerPlaybackSources } from "@/lib/partner-playback";
import {
  fetchTvDetails,
  fetchTvSeasonsPosters,
  fetchTvSeason,
  type TmdbEpisode,
} from "@/lib/tmdb";
import { PARTNER_PROVIDER } from "@/modules/providers/partner/partner.client";

interface PartnerAnimePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: PartnerAnimePageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Animé";
  return { title: `${title} – CinéMax`, robots: { index: false } };
}

/** Query string de navigation (langue, saison, épisode, hébergeur). */
function selectionQuery(sp: {
  lang?: string;
  season?: string;
  ep?: string;
  host?: string;
}): string {
  const query = new URLSearchParams();
  if (sp.lang) query.set("lang", sp.lang);
  if (sp.season) query.set("season", sp.season);
  if (sp.ep) query.set("ep", sp.ep);
  if (sp.host) query.set("host", sp.host);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function PartnerAnimePage({
  params,
  searchParams,
}: PartnerAnimePageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id },
      select: {
        title: true,
        posterUrl: true,
        totalEpisodes: true,
        releaseYear: true,
        contentType: true,
      },
    })
    .catch(() => null);

  // Fiche pas encore reclassée en animé : on renvoie vers la section Séries.
  if (asset?.contentType === "SERIES") {
    redirect(`/series/partner/${id}${selectionQuery(sp)}`);
  }

  const title = asset?.title ?? "Animé";
  const year = asset?.releaseYear ?? null;
  const posterUrl = asset?.posterUrl ?? null;
  const totalEpisodes = asset?.totalEpisodes ?? 0;

  const playback = await resolveCatalogPlayback(title, "ANIME", year).catch(() => null);

  const requestedSeason = sp.season ? Number.parseInt(sp.season, 10) : null;
  const playbackSeasons = playback?.seasons ?? [];
  const activeSeason =
    requestedSeason !== null && playbackSeasons.some((s) => s.season === requestedSeason)
      ? requestedSeason
      : (playbackSeasons[0]?.season ?? requestedSeason ?? 1);
  const activeEpisode = Number.parseInt(sp.ep ?? "", 10) || 1;

  // Le partenaire publie une fiche par saison : on résout les flux de la
  // saison active (et non systématiquement ceux de la saison 1).
  const providerSrcs = await resolvePartnerPlaybackSources(
    title,
    "ANIME",
    year,
    activeSeason,
  ).catch(() => []);

  const vidzySrcs = playback?.available ? vidzySources(playback) : [];
  const sources = [...vidzySrcs, ...providerSrcs];

  let seasonCards: { season: number; episodes: number[]; posterUrl?: string | null }[] = [];
  let currentEpisodes: TmdbEpisode[] = [];
  let seriesOverview: string | null = null;
  let seasonsPosterMap = new Map<number, string | null>();

  // L'identifiant TMDB vient de la résolution Vidzy (par titre) : l'identifiant
  // du partenaire (`newsid`) n'est PAS un identifiant TMDB.
  const tmdbId = playback?.tmdbId ?? null;
  if (tmdbId) {
    const details = await fetchTvDetails(tmdbId).catch(() => null);
    seriesOverview = details?.overview ?? null;

    const seasonNumbers = Array.from(
      { length: details?.number_of_seasons ?? 0 },
      (_, i) => i + 1,
    );
    seasonsPosterMap = await fetchTvSeasonsPosters(tmdbId, seasonNumbers).catch(() => new Map());

    const seasonDetail =
      (await fetchTvSeason(tmdbId, activeSeason).catch(() => null)) ?? null;

    if (seasonDetail?.episodes.length) {
      currentEpisodes = seasonDetail.episodes;
    }

    seasonCards = seasonNumbers.map((n) => ({
      season: n,
      episodes: Array.from(
        { length: details?.number_of_episodes ?? 0 },
        (_, i) => i + 1,
      ),
      posterUrl: seasonsPosterMap.get(n) ?? null,
    }));
  }

  const quality = "HD 1080p";
  const langLabel = (sp.lang ?? "vf").toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/animes"
        className="mb-4 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Catalogue animés
      </Link>

      {/* Lecteur en haut, large */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-black overflow-hidden">
        {sources.length > 0 ? (
          <SourcePlayer
            sources={sources}
            hrefFor={({ season, episode, lang, host }) => {
              const query = new URLSearchParams();
              query.set("season", String(season));
              query.set("ep", String(episode));
              if (lang) query.set("lang", lang);
              if (host) query.set("host", host);
              const qs = query.toString();
              return `/animes/partner/${id}${qs ? `?${qs}` : ""}`;
            }}
            selection={{
              season: activeSeason,
              episode: activeEpisode,
              lang: sp.lang,
              host: sp.host,
            }}
            title={title}
          />
        ) : (
          <div className="flex h-[400px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-zinc-400 bg-zinc-900">
            <p>
              Aucun lecteur disponible pour cet animé pour le moment. Nos sources sont
              régulièrement mises à jour — revenez plus tard ou cherchez un titre équivalent.
            </p>
            <Link
              href={`/recherche?q=${encodeURIComponent(title)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Search className="h-4 w-4" />
              Chercher un autre titre
            </Link>
          </div>
        )}
      </div>

      {/* Ligne info : badges + boutons d'action */}
      <div className="flex flex-col lg:flex-row gap-4 items-start justify-between mb-6">
        <div className="flex flex-wrap gap-3 items-baseline">
          <span className="inline-flex items-center rounded-full bg-zinc-900 border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
            {quality}
          </span>
          <span className="inline-flex items-center rounded-full bg-violet-900/40 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-300">
            {langLabel}
          </span>
          {year && (
            <span className="inline-flex items-center rounded-full bg-zinc-900 border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
              {year}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-zinc-900 border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
            {totalEpisodes} épisode{totalEpisodes > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <BookmarkButton mediaSlug={id} />
          <WishlistButton mediaSlug={id} />
          <ShareButton title={title} />
        </div>
      </div>

      {/* Synopsis */}
      {seriesOverview && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-2">Synopsis</h2>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
            {seriesOverview}
          </p>
        </div>
      )}

      {/* Sélecteur de saison */}
      {seasonCards.length > 0 && (
        <SeasonSelector
          seasons={seasonCards}
          currentSeason={activeSeason}
          seriesPoster={posterUrl}
        />
      )}

      {/* Liste des épisodes */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">
          Épisode {activeEpisode} — Saison {activeSeason}
        </h2>
        <EpisodeList
          seasonNumber={activeSeason}
          episodes={currentEpisodes}
          hrefFor={({ season, episode }) => {
            const query = new URLSearchParams();
            query.set("season", String(season));
            query.set("ep", String(episode));
            if (sp.lang) query.set("lang", sp.lang);
            if (sp.host) query.set("host", sp.host);
            const qs = query.toString();
            return `/animes/partner/${id}${qs ? `?${qs}` : ""}`;
          }}
        />
      </div>
    </div>
  );
}
