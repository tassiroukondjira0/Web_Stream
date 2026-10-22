import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMediaBySlug } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import { VidzyPlayer } from "@/components/VidzyPlayer";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { Tv, Calendar, Lock, Play } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const serie = await getMediaBySlug(slug);

  if (!serie) {
    return { title: "Série non trouvée | CinéMax" };
  }

  const appUrl = getAppUrl();
  return {
    title: `${serie.title} — Série Complète en Streaming HD`,
    description: serie.synopsis.slice(0, 160),
    openGraph: {
      title: serie.title,
      description: serie.synopsis,
      url: `${appUrl}/series/${serie.slug}`,
      type: "video.tv_show",
      images: [{ url: serie.backdropUrl || serie.posterUrl }],
    },
  };
}

async function SeriesContent({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const serie = await getMediaBySlug(slug);

  if (!serie) {
    notFound();
  }

  const sp = searchParams ? await searchParams : {};
  const currentSeasonNum = Number(sp.season) || 1;
  const currentEpNum = Number(sp.ep) || 1;

  // L'ADMIN accède à tout le catalogue sans pass Premium.
  const currentUser = await getCurrentUser().catch(() => null);
  const hasFullAccess = currentUser ? hasPremiumAccess(currentUser.role) : false;

  // Saisons et épisodes issus de la base : aucun contenu de démonstration.
  const dbMedia = await prisma.media.findUnique({
    where: { slug: serie.slug },
    include: {
      seasons: {
        orderBy: { seasonNumber: "asc" },
        include: { episodes: { orderBy: { episodeNumber: "asc" } } },
      },
    },
  });

  const episodes = (dbMedia?.seasons ?? []).flatMap((season) =>
    season.episodes.map((ep) => ({
      seasonNumber: season.seasonNumber,
      number: ep.episodeNumber,
      title: ep.title,
      duration: ep.durationMinutes ? `${ep.durationMinutes} min` : "",
      synopsis: ep.synopsis || "",
      access: ep.accessLevel as "FREE" | "PREMIUM",
      videoUrl: ep.videoUrl || "",
    }))
  );

  const activeEpisode =
    episodes.find(
      (e) => e.number === currentEpNum && e.seasonNumber === currentSeasonNum
    ) || episodes[0] || null;

  // Réordonner pour mettre l'épisode en cours au top
  const sortedEpisodes = activeEpisode
    ? [
        activeEpisode,
        ...episodes.filter(
          (e) =>
            !(e.number === activeEpisode.number && e.seasonNumber === activeEpisode.seasonNumber)
        ),
      ]
    : episodes;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: serie.title,
    description: serie.synopsis,
    image: serie.posterUrl,
    numberOfEpisodes: episodes.length,
    inLanguage: "fr",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <Link href="/" className="hover:text-white">Accueil</Link>
        <span>/</span>
        <Link href="/series" className="hover:text-white">Séries</Link>
        <span>/</span>
        <span className="min-w-0 flex-1 truncate text-zinc-200 sm:flex-none">{serie.title}</span>
      </nav>

      {/* Lecteur de l'épisode sélectionné */}
      <div className="mb-8">
        {activeEpisode ? (
          (serie.accessLevel === "FREE" && activeEpisode.access === "FREE") || hasFullAccess ? (
            <VidzyPlayer
              basePath="/series"
              slug={serie.slug}
              title={`${serie.title} - Épisode ${activeEpisode.number}: ${activeEpisode.title}`}
              contentType="SERIES"
              year={serie.releaseYear}
              searchParams={{
                lang: sp.lang,
                season: String(activeEpisode.seasonNumber),
                ep: String(activeEpisode.number),
                host: sp.host,
              }}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-zinc-950 p-6 text-center">
              <Lock className="mb-4 h-10 w-10 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Accès Premium requis</h2>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                Cet épisode est réservé aux membres Premium.
              </p>
              <Link
                href="/premium"
                className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400"
              >
                Découvrir Premium
              </Link>
            </div>
          )
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-sm text-zinc-500">
            Aucun épisode disponible pour cette série.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 flex-1 text-2xl font-extrabold text-white sm:text-3xl">{serie.title}</h1>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              Saison {activeEpisode?.seasonNumber ?? 1}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {serie.releaseYear && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-white/10 px-2.5 py-1 font-semibold text-zinc-200 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                {serie.releaseYear}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-white/10 px-2.5 py-1 font-semibold text-zinc-200 shadow-sm">
              <Tv className="h-3.5 w-3.5 text-amber-400" />
              {episodes.length} épisode{episodes.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Synopsis */}
          <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{serie.synopsis}</p>

          <div className="mt-6 flex gap-3">
            <BookmarkButton mediaSlug={serie.slug} />
            <WishlistButton mediaSlug={serie.slug} />
            <ShareButton title={serie.title} />
          </div>

          {/* Liste des épisodes avec l'épisode en cours au top */}
          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Épisodes</h2>
              {activeEpisode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-bold text-violet-300">
                  <Play className="h-3 w-3 fill-violet-400" />
                  S{activeEpisode.seasonNumber}E{activeEpisode.number} au top
                </span>
              )}
            </div>

            <div className="space-y-3">
              {sortedEpisodes.map((ep) => {
                const isSelected =
                  activeEpisode?.number === ep.number &&
                  activeEpisode?.seasonNumber === ep.seasonNumber;
                return (
                  <Link
                    key={`${ep.seasonNumber}-${ep.number}`}
                    href={`/series/${serie.slug}?season=${ep.seasonNumber}&ep=${ep.number}`}
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-600/15 ring-1 ring-violet-500/50 shadow-lg shadow-violet-600/10"
                        : "border-white/5 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-400">
                          S{ep.seasonNumber}E{ep.number}
                        </span>
                        {isSelected && (
                          <span className="rounded bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            En cours de lecture
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-white">{ep.title}</h3>
                        {ep.access === "PREMIUM" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      {ep.synopsis && <p className="mt-1 text-xs text-zinc-400">{ep.synopsis}</p>}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono flex-shrink-0 ml-4">
                      {ep.duration}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Détails légaux & Droits */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 h-fit">
          <h3 className="text-sm font-bold text-white mb-3">Informations de Diffusion</h3>
          <ul className="space-y-3 text-xs text-zinc-400">
            <li>
              <span className="text-zinc-500 block">Licence :</span>
              Création sous licence de distribution autorisée
            </li>
            <li>
              <span className="text-zinc-500 block">Validité des droits :</span>
              Jusqu&apos;au 31 Décembre 2032
            </li>
            <li>
              <span className="text-zinc-500 block">Format vidéo :</span>
              HLS Adaptatif 1080p Stéréo
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SeriesDetailsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement de la série...
        </div>
      }
    >
      <SeriesContent {...props} />
    </Suspense>
  );
}
