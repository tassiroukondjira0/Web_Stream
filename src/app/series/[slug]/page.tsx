import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMediaBySlug } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { Tv, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ ep?: string }>;
}

// Pas de generateStaticParams : le catalogue est lu à la requête (base vide au
// build). Les paramètres sont donc des données runtime, résolues dans le
// <Suspense> de SeriesPage.
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
      number: ep.episodeNumber,
      title: ep.title,
      duration: ep.durationMinutes ? `${ep.durationMinutes} min` : "",
      synopsis: ep.synopsis || "",
      access: ep.accessLevel as "FREE" | "PREMIUM",
    }))
  );

  const activeEpisode =
    episodes.find((e) => e.number === currentEpNum) || episodes[0] || null;

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
          <VideoPlayer
            poster={serie.backdropUrl}
            title={`${serie.title} - Épisode ${activeEpisode.number}: ${activeEpisode.title}`}
            isPremium={activeEpisode.access === "PREMIUM"}
            hasAccess={activeEpisode.access === "FREE" || hasFullAccess}
          />
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
              Saison 1
            </span>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {serie.releaseYear}
            </span>
            <span className="flex items-center gap-1">
              <Tv className="h-4 w-4" /> {episodes.length} épisodes
            </span>
          </div>

          <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{serie.synopsis}</p>

          <div className="mt-6 flex gap-3">
            <BookmarkButton mediaSlug={serie.slug} />
            <WishlistButton mediaSlug={serie.slug} />
            <ShareButton title={serie.title} />
          </div>

          {/* Liste des épisodes */}
          <div className="mt-10 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white mb-4">Épisodes</h2>
            <div className="space-y-3">
              {episodes.map((ep) => {
                const isSelected = activeEpisode?.number === ep.number;
                return (
                  <Link
                    key={ep.number}
                    href={`/series/${serie.slug}?ep=${ep.number}`}
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-violet-500/50 bg-violet-600/10"
                        : "border-white/5 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-500">
                          Épisode {ep.number}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{ep.title}</h3>
                        {ep.access === "PREMIUM" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{ep.synopsis}</p>
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
