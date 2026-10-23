import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ChevronLeft, Film, Play, Search, Calendar } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { SourcePlayer } from "@/components/SourcePlayer";
import { prisma } from "@/lib/prisma";
import { fetchTmdbOverviewByTitle } from "@/lib/tmdb";
import { resolveCatalogPlayback } from "@/lib/vidzy";
import { providerSources, vidzySources } from "@/lib/player-sources";
import {
  fetchMovieEmbeds,
  PARTNER_PROVIDER,
} from "@/modules/providers/partner/partner.client";

/**
 * Fiche & lecteur d'un film partenaire. Lecteur multi-sources : notre flux
 * Vidzy (identifiant TMDB résolu depuis le titre) complété par les iframes du
 * fournisseur exposés dans le HTML. Navigation par URL (?lang=&host=).
 */

interface PartnerMoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; host?: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: PartnerMoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id },
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

export default async function PartnerMoviePage({
  params,
  searchParams,
}: PartnerMoviePageProps) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;

  const asset = await prisma.providerAsset
    .findFirst({
      where: { provider: PARTNER_PROVIDER, externalId: id },
      select: { title: true, posterUrl: true, releaseYear: true, contentType: true },
    })
    .catch(() => null);

  // Le partenaire classe parfois les animés dans ses films : une fois
  // reclassée, la fiche appartient à la section « Animes ».
  if (asset?.contentType === "ANIME") {
    const query = new URLSearchParams();
    if (sp.lang) query.set("lang", sp.lang);
    if (sp.host) query.set("host", sp.host);
    const qs = query.toString();
    redirect(`/animes/partner/${id}${qs ? `?${qs}` : ""}`);
  }

  const title = asset?.title ?? "Film";

  const [overview, playback, embeds] = await Promise.all([
    fetchTmdbOverviewByTitle(title),
    resolveCatalogPlayback(title, "MOVIE", asset?.releaseYear ?? null),
    fetchMovieEmbeds(id).catch(() => []),
  ]);

  const sources = [
    ...(playback?.available ? vidzySources(playback) : []),
    ...providerSources(
      embeds.map(({ host, url }) => ({ lang: "vf", episode: 1, host, url })),
      1,
      "frenchstream",
    ),
  ];

  const poster = asset?.posterUrl ?? playback?.poster ?? null;
  const year = asset?.releaseYear ?? playback?.year ?? null;

  const hrefFor = ({ lang, host }: { lang?: string | null; host?: string | null }) => {
    const query = new URLSearchParams();
    if (lang) query.set("lang", lang);
    if (host) query.set("host", host);
    const qs = query.toString();
    return `/films/partner/${id}${qs ? `?${qs}` : ""}`;
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
          mediaSlug={`partner-movie-${id}`}
        />
      ) : (
        <div className="mt-4 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black px-6 text-center text-sm text-zinc-400">
          <Film className="h-10 w-10 text-zinc-600" />
          <p>
            Flux indisponible pour ce film pour le moment. Nos sources sont
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-white/10 px-2.5 py-1 font-semibold text-zinc-200 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                {year}
              </span>
            </div>
          )}
          {overview && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{overview}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={`partner-movie-${id}`} />
            <WishlistButton mediaSlug={`partner-movie-${id}`} />
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
