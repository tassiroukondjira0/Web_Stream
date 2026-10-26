import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { shouldOptimizeImage } from "@/lib/image";
import { getMediaBySlug, getSimilarMedias } from "@/lib/catalog";
import { getAppUrl } from "@/lib/env";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import { VidzyPlayer } from "@/components/VidzyPlayer";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { ShieldCheck, Film, Calendar, Clock, Lock } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}

// Pas de generateStaticParams : le catalogue est lu à la requête (base vide au
// build). Les paramètres sont donc des données runtime, résolues dans le
// <Suspense> de FilmPage.
// 12.1 SEO : Titres et descriptions uniques + OpenGraph pour chaque fiche
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const film = await getMediaBySlug(slug);

  if (!film) {
    return {
      title: "Film non trouvé | CinéMax",
    };
  }

  const appUrl = getAppUrl();
  const canonicalUrl = `${appUrl}/films/${film.slug}`;

  return {
    title: `${film.title} (${film.releaseYear}) — Regarder en Streaming HD`,
    description: film.synopsis.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${film.title} | CinéMax`,
      description: film.synopsis,
      url: canonicalUrl,
      type: "video.movie",
      images: [
        {
          url: film.backdropUrl || film.posterUrl,
          width: 1200,
          height: 630,
          alt: `Affiche du film ${film.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: film.title,
      description: film.synopsis.slice(0, 160),
      images: [film.backdropUrl || film.posterUrl],
    },
  };
}

async function FilmContent({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const film = await getMediaBySlug(slug);

  if (!film) {
    notFound();
  }

  const similarFilms = await getSimilarMedias(film.slug, film.categories[0]?.slug);
  const appUrl = getAppUrl();
  // L'ADMIN accède à tout le catalogue sans pass Premium.
  const currentUser = await getCurrentUser().catch(() => null);
  const hasAccess =
    film.accessLevel === "FREE" ||
    (currentUser ? hasPremiumAccess(currentUser.role) : false);

  // Données structurées JSON-LD adaptées aux films (Schema.org / Google Rich Results)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: film.title,
    description: film.synopsis,
    image: film.posterUrl,
    datePublished: `${film.releaseYear}-01-01`,
    duration: film.durationMinutes ? `PT${film.durationMinutes}M` : undefined,
    inLanguage: "fr",
    genre: film.categories.map((c) => c.name),
    potentialAction: {
      "@type": "WatchAction",
      target: `${appUrl}/films/${film.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Script SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Fil d'Ariane */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <Link href="/" className="hover:text-white transition-colors">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/films" className="hover:text-white transition-colors">
          Films
        </Link>
        <span>/</span>
        <span className="min-w-0 flex-1 truncate text-zinc-200 sm:flex-none">{film.title}</span>
      </nav>

      {/* Lecteur Vidéo Principal */}
      <div className="mb-8">
        {hasAccess ? (
          <VidzyPlayer
            basePath="/films"
            slug={film.slug}
            title={film.title}
            contentType="MOVIE"
            year={film.releaseYear}
            searchParams={{ lang: sp.lang, season: sp.season, ep: sp.ep, host: sp.host }}
          />
        ) : (
          <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950 p-6 text-center">
            <Lock className="mb-4 h-10 w-10 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Accès Premium requis</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Ce film est réservé aux membres Premium. Connectez-vous avec un abonnement actif pour le regarder.
            </p>
            <div className="mt-5 flex gap-3">
              <Link
                href="/premium"
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400"
              >
                Découvrir Premium
              </Link>
              <Link
                href="/connexion"
                className="rounded-xl border border-white/10 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Fiche descriptive et Métadonnées */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* En-tête */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {film.title}
            </h1>
            {film.accessLevel === "PREMIUM" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                PREMIUM
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                GRATUIT
              </span>
            )}
          </div>

          {/* Badges d'informations */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-zinc-500" />
              {film.releaseYear}
            </span>
            {film.durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-zinc-500" />
                {film.durationMinutes} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Film className="h-4 w-4 text-zinc-500" />
              Full HD 1080p
            </span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
              Droits certifiés jusqu&apos;en 2030
            </span>
          </div>

          {/* Catégories */}
          <div className="mt-4 flex flex-wrap gap-2">
            {film.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/films?categorie=${cat.slug}`}
                className="rounded-full bg-zinc-900 border border-white/10 px-3 py-1 text-xs font-medium text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Synopsis complet */}
          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="text-lg font-semibold text-white">Synopsis</h2>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed sm:text-base">
              {film.synopsis}
            </p>
          </div>

          {/* Boutons d'interaction */}
          <div className="mt-8 flex flex-wrap gap-3">
            <BookmarkButton mediaSlug={film.slug} />
            <WishlistButton mediaSlug={film.slug} />
            <ShareButton title={film.title} />
          </div>
        </div>

        {/* Colonne latérale : Films similaires */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h3 className="text-base font-bold text-white mb-4">Dans la même catégorie</h3>
          <div className="flex flex-col gap-4">
            {similarFilms.map((sim) => (
              <Link
                key={sim.slug}
                href={`/films/${sim.slug}`}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
              >
                <Image
                  src={sim.posterUrl}
                  alt={sim.title}
                  width={48}
                  height={64}
                  unoptimized={!shouldOptimizeImage(sim.posterUrl)}
                  className="h-16 w-12 rounded-md object-cover bg-zinc-800 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                    {sim.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {sim.releaseYear} • {sim.durationMinutes} min
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-zinc-400">
                    {sim.accessLevel === "FREE" ? "Gratuit" : "Premium"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FilmPage({ params, searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement de la fiche film...
        </div>
      }
    >
      <FilmContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
