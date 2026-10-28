"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Bookmark, Sparkles } from "lucide-react";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { providerSlugHref } from "@/lib/provider-catalog";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

export default function FavorisPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [posterMap, setPosterMap] = useState<Record<string, string | null>>({});
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Charger les favoris si l'utilisateur est connecté
    if (!user) return;
    fetch("/api/bookmarks", {
      credentials: "include",
    }).then((r) => (r.ok ? r.json() : { bookmarks: [] })).then((data) => {
      setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
      // Extraire le posterMap de la réponse
      setPosterMap(data.posterMap || {});
       setTitleMap(data.titleMap || {});
    }).catch(() => {
      setBookmarks([]);
      setPosterMap({});
       setTitleMap({});
    });
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center text-sm text-zinc-400">
        Chargement de votre compte...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-zinc-400 mb-4">
          <User className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Non connecté</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connectez-vous pour consulter vos favoris.
        </p>
        <div className="mt-6 flex justify-center space-x-4">
          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">
          <Bookmark className="h-6 w-6 inline-block align-middle mr-2" /> Mes favoris
        </h1>
        <button
          onClick={() => router.push("/nouveautes")}
          className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        >
          <Sparkles className="h-4 w-4" /> Nouveautés
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Aucun favori pour le moment. Ajoutez des médias à vos favoris depuis les fiches de film, série ou animé.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {bookmarks.map((slug) => {
            const href = slugToHref(slug);
            // Utiliser l'affiche locale si disponible, sinon fallback TMDB, puis placeholder
            const localPoster = posterMap[slug];
            const posterUrl = localPoster || getPosterUrl(slug);
            // Vérifier si ce média est en favoris (déjà dans la liste bookmarks)
            // C'est redundant ici car on affiche seulement les favoris, mais on ajoute
            // un marqueur pour la visibilité
            const isFavorited = bookmarks.includes(slug);

            return (
              <ProviderPosterCard
                key={slug}
                href={href}
                posterUrl={posterUrl}
                title={titleMap[slug] || prettyTitle(slug)}
                year={extractYear(slug)}
                // Ajout d'un badge pour indiquer le statut favori
                badge={isFavorited ? "♥" : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Extract year from slug if possible */
function extractYear(slug: string): string | null {
  const yearMatch = slug.match(/(19|20)\d{2}/);
  if (yearMatch) {
    return yearMatch[0];
  }
  return null;
}

/** Route de fiche correspondant à un slug (local ou partenaire externe). */
function slugToHref(slug: string): string {
  return providerSlugHref(slug);
}

/** Libellé lisible à partir d'un slug (sans appel réseau). */
function prettyTitle(slug: string): string {
  const m = slug.match(/^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/);
  if (m) {
    const [, , kind, id] = m;
    return `${humanize(id)} ${kind === "movie" ? "· Film" : kind === "series" ? "· Série" : "· Animé"}`;
  }
  return humanize(slug);
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Obtient l'ID TMDB depuis un slug (pour les slugs tmdb-*) */
function getTmdbId(slug: string): string | null {
  // Essaye d'abord le format tmdb-movie-550
  const m = slug.match(/^tmdb-(movie|series|anime)-(.+)$/);
  if (m) {
    return m[2];
  }
  // Essayer le format bare number (juste un numéro TMDB comme 15128240)
  const numMatch = slug.match(/^(\d+)$/);
  if (numMatch) {
    return numMatch[1];
  }
  return null;
}

/** Obtient l'URL de l'affiche avec priorité : locale > TMDB > placeholder */
function getPosterUrl(slug: string): string | null {
  // 1. Essayer d'abord l'affiche locale depuis la base de données
  // (Cette vérification est faite dans la page avant d'appeler cette fonction)
  
  // 2. Fallback vers TMDB (prend en charge tmdb-movie-550 et 15128240)
  const tmdbId = getTmdbId(slug);
  if (!tmdbId) return null;
  // Utilise l'image CDN TMDB avec un fallback local
  const TMDB_IMG = process.env.NEXT_PUBLIC_TMDB_IMG || "https://image.tmdb.org/t/p";
  return `${TMDB_IMG}/w500/${tmdbId}.jpg`;
}
