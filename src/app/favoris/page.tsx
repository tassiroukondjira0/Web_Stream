"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  LogOut,
  Film,
  Clock,
  Bookmark,
  ListPlus,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";

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
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ShieldCheck className="h-4 w-4" /> Déconnexion
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="mx-auto max-w-md px-4 py-12 text-center text-zinc-500">
          <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun favori pour le moment.</p>
          <p className="mt-2 text-sm">
            Ajoutez des médias à vos favoris depuis les fiches de film, série ou animé.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((slug) => {
            const href = slugToHref(slug);
            return (
              <li
                key={slug}
                className="group rounded-xl border border-white/5 bg-black/30 overflow-hidden hover:border-violet-500/50 transition-colors"
              >
                <a
                  href={href}
                  className="block aspect-w-16 aspect-h-24 bg-zinc-800 overflow-hidden group-hover:opacity-90"
                >
                  <div
                  className="w-full h-full bg-zinc-700"
                  style={{ backgroundImage: `url("${getPosterUrl(slug) || "/placeholder.svg?height=200&width=300"}")` }}
                />
                </a>
                <div className="p-3">
                  <Link
                    href={href}
                    className="text-xs font-medium text-zinc-200 hover:text-white transition-colors"
                  >
                    {prettyTitle(slug)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeBookmark(slug)}
                    className="mt-2 w-full rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400 text-xs"
                    title="Retirer de la liste"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
  const m = slug.match(/^tmdb-(movie|series|anime)-(.+)$/);
  return m ? m[2] : null;
}

/** Obtient l'URL de l'affiche TMDB pour un slug. */
function getPosterUrl(slug: string): string | null {
  const tmdbId = getTmdbId(slug);
  if (!tmdbId) return null;
  // Utilise l'image CDN TMDB avec un placeholder par défaut
  const TMDB_IMG = process.env.NEXT_PUBLIC_TMDB_IMG || "https://image.tmdb.org/t/p";
  return `${TMDB_IMG}/w500/placeholder.svg`;
}