"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ListPlus, Sparkles, AlertCircle, X } from "lucide-react";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN";
}

export default function FavorisPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
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
    if (!user) return;
    fetch("/api/bookmarks", {
      credentials: "include",
    }).then((r) => (r.ok ? r.json() : { bookmarks: [] })).then((data) => {
      setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    });
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
    router.refresh();
  };

  const removeBookmark = async (slug: string) => {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaSlug: slug }),
    });
    if (res.ok) setBookmarks((prev) => prev.filter((s) => s !== slug));
  };

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
            S'inscrire
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
            const title = prettyTitle(slug);
            const posterUrl = getPosterUrl(slug);

            return (
              <ProviderPosterCard
                key={slug}
                href={href}
                posterUrl={posterUrl}
                title={title}
                year={extractYear(slug)}
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
  const m = slug.match(/^(partner|frenchmanga|tmdb)-(movie|series|anime)-(.+)$/);
  if (m) {
    const [, provider, kind, id] = m;
    // FrenchManga : lecteur dédié (films d'animation comme séries, épisode unique).
    // Les animés sont classés dans la section « Animes », pas dans « Séries ».
    if (kind === "anime") {
      return `/animes/${provider}/${id}`;
    }
    if (provider === "frenchmanga") {
      return `/series/frenchmanga/${id}`;
    }
    const isSeries = kind === "series";
    if (provider === "tmdb") {
      return isSeries ? `/series/tmdb/${id}` : `/films/tmdb/${id}`;
    }
    return isSeries ? `/series/partner/${id}` : `/films/partner/${id}`;
  }
  return `/films/${slug}`;
}

/** Libellé lisible à partir d'un slug (sans appel réseau). */
function prettyTitle(slug: string): string {
  const m = slug.match(/^(partner|frenchmanga|tmdb)-(movie|series|anime)-(.+)$/);
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

/** Obtient l'ID TMDB depuis un slug (pour les slugs tmdb-*). */
function getTmdbId(slug: string): string | null {
  /** Patterns de slugs TMDB supportés (multiples formats possibles) */
  const TMDB_PATTERNS = [
    // Format standard: tmdb-movie-550, tmdb-series-123, tmdb-anime-gintama
    /^tmdb-(movie|series|anime)-(.+)$/,
    // Format alternatif: tmdb-550, tmdb-123 (ID seul après tmdb-)
    /^tmdb-([0-9]+)$/,
    // Format avec underscore: tmdb_movie_550, tmdb_series_123
    /^tmdb_[_-](.+)$/,
    // Format court: juste l'ID TMDB sans préfixe (si stocké tel quel)
    /^[0-9]{3,8}$/,
  ];

  for (const pattern of TMDB_PATTERNS) {
    const m = slug.match(pattern);
    if (m) {
      // Extraire l'ID du motif capturé
      let id: string | undefined;

      if (pattern.source.includes("(movie|series|anime)")) {
        // Format tmdb-movie-550 -> ID est le 3e groupe
        id = m[2];
      } else if (pattern.source.includes("([0-9]+)"))) {
        // Format tmdb-550 -> ID est le 2e groupe
        id = m[1];
      } else if (pattern.source.includes("tmdb_[_-]")) {
        // Format tmdb_movie_550 -> ID est le 2e groupe
        id = m[1];
      } else {
        // Format ID brut
        id = m[0];
      }

      // Nettoyer l'ID - enlever espaces, caractères spéciaux, mais garder les chiffres
      const cleanedId = id?.replace(/[^0-9]/g, "") ?? "";

      if (cleanedId && cleanedId.length >= 3) {
        return cleanedId;
      }

      // Si l'ID nettoyé est trop court ou vide, essayer le slug original
      const originalId = (id || slug).replace("tmdb-", "").replace("tmdb_", "").replace(/-/g, "").replace(/_/g, "").trim();
      if (originalId && /^[0-9]+$/.test(originalId)) {
        return originalId;
      }
    }
  }

  return null;
}

/** Obtient l'URL de l'affiche TMDB pour un slug. */
function getPosterUrl(slug: string): string | null {
  const tmdbId = getTmdbId(slug);
  if (!tmdbId) {
    console.debug(`[getPosterUrl] Aucun TMDB ID trouvé pour le slug: ${slug}`);
    return null;
  }

  // Utiliser la variable d'environnement si définie, sinon fallback CDN TMDB
  const TMDB_IMG = process.env.NEXT_PUBLIC_TMDB_IMG || "https://image.tmdb.org/t/p";

  // Construire l'URL avec w500 (taille moyenne)
  // Format: https://image.tmdb.org/t/p/w500/{id}.jpg
  const posterUrl = `${TMDB_IMG}/w500/${tmdbId}.jpg`;

  // Log de debug pour aider au débogage
  console.debug(`[getPosterUrl] URL générée: ${posterUrl} (ID: ${tmdbId})`);

  // Retourne l'URL - si l'image n'existe pas, le composant ProviderPosterCard
  // affichera automatiquement le placeholder par défaut
  return posterUrl;
}

/** Vérifie si un slug est au format TMDB */
function isTmdbSlug(slug: string): boolean {
  return /^tmdb-/i.test(slug);
}