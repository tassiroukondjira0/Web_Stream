"use client";

import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";

interface VideoPlayerProps {
  src?: string;
  /** Slug du média, utilisé pour résoudre l'URL de lecture via l'API de token quand `src` est absent. */
  slug?: string;
  poster?: string;
  title: string;
  isPremium?: boolean;
  hasAccess?: boolean; // false si l'utilisateur doit souscrire au pass Premium
}

export function VideoPlayer({
  src,
  slug,
  poster,
  title,
  isPremium = false,
  hasAccess = true,
}: VideoPlayerProps) {
  // URL de l'iframe de lecture : slug prioritaire (résolution côté serveur via /video/embed/[slug]),
  // sinon src directe si fournie.
  const embedUrl = slug ? `/video/embed/${slug}` : src;

  // Verrouillage Freemium
  if (isPremium && !hasAccess) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 border border-amber-500/30 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <div className="relative z-10 max-w-md flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
            <Lock className="h-7 w-7" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Contenu Réservé aux Membres Premium
          </span>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Ce titre fait partie du catalogue exclusif haute définition. Abonnez-vous dès maintenant pour un accès illimité sans publicité.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/premium"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all hover:scale-105"
            >
              Débloquer avec le Pass Premium
            </Link>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {poster && (
          <img
            src={poster}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm pointer-events-none"
          />
        )}
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 text-sm">
        Aucune source de lecture disponible.
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="w-full h-full"
        loading="lazy"
      />
      {poster && (
        <img
          src={poster}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm pointer-events-none"
        />
      )}
    </div>
  );
}
