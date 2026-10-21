import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, Play } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SourcePlayer } from "@/components/SourcePlayer";
import { UnavailableNotice } from "@/components/UnavailableNotice";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import { providerSources, vidzySources } from "@/lib/player-sources";
import {
  FSTREAMTV_PROVIDER,
  fetchMovieEmbeds,
} from "@/modules/providers/fstreamtv/fstreamtv.client";

/**
 * Fiche & lecteur d'un film `french-streaming.tv`. Lecteur multi-sources :
 * notre flux Vidzy (résolu par titre) complété par les embeds du fournisseur.
 */

interface FStreamTvMoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: FStreamTvMoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: FSTREAMTV_PROVIDER, externalId: id, contentType: "MOVIE" },
      select: { title: true },
    })
    .catch(() => null);
  const title = asset?.title ?? "Film";
  const description = await fetchTmdbOverviewByTitle(title).catch(() => null);
  return {
    title: `${title} — CinéMax`,
    description: description?.slice(0, 160) ?? undefined,
    robots: { index: false },
  };
}

export default async function FStreamTvMoviePage({ params, searchParams }: FStreamTvMoviePageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: FSTREAMTV_PROVIDER, externalId: id, contentType: "MOVIE" },
      select: { title: true, posterUrl: true, releaseYear: true },
    })
    .catch(() => null);

  const title = asset?.title ?? "Film";

  const [overview, playback, providerEmbeds] = await Promise.all([
    fetchTmdbOverviewByTitle(title),
    resolveCatalogPlayback(title, "MOVIE", asset?.releaseYear ?? null),
    fetchMovieEmbeds(id).catch(() => []),
  ]);

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...providerSources(
      providerEmbeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
      1,
      "fstreamtv",
    ),
  ];

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? playback?.year ?? null;

  const hrefFor = ({ lang, host }: { lang?: string | null; host?: string | null }) => {
    const query = new URLSearchParams();
    if (lang) query.set("lang", lang);
    if (host) query.set("host", host);
    const qs = query.toString();
    return `/films/fstreamtv/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/films"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Catalogue films
      </Link>

      {sources.length > 0 ? (
        <SourcePlayer
          sources={sources}
          hrefFor={hrefFor}
          selection={{ lang: sp.lang, host: sp.host, season: 1, episode: 1 }}
          title={title}
        />
      ) : (
        <UnavailableNotice kind="movie" title={title} catalogHref="/films" />
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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-white sm:text-2xl lg:text-3xl">{title}</h1>
          {year && (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>{year}</span>
            </div>
          )}
          {overview && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{overview}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`fstreamtv-movie-${id}`} />
            <WishlistButton mediaSlug={`fstreamtv-movie-${id}`} />
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
