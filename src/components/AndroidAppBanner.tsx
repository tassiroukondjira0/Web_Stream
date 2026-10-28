"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

/**
 * Chemin vers le fichier APK dans le dossier public.
 * Placez votre APK signé à : public/downloads/cinemax.apk
 */
const APK_DOWNLOAD_URL = "/downloads/cinemax.apk";

/** Clé localStorage pour retenir que l'utilisateur a fermé le bandeau. */
const DISMISS_KEY = "cinemax-app-banner-dismissed";

/** Durée avant de ré-afficher le bandeau après fermeture (7 jours). */
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Bandeau intelligent de téléchargement de l'app Android.
 *
 * Affiché uniquement lorsque :
 * - L'utilisateur navigue depuis un navigateur Android
 * - L'app ne tourne PAS dans le conteneur Capacitor natif
 * - L'utilisateur n'a pas fermé le bandeau récemment
 *
 * Invisible sur desktop, iOS (pas d'APK sideloading simple) et dans l'app.
 */
export function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ne rien afficher côté serveur ni dans Capacitor
    if (typeof window === "undefined") return;

    // Détecte si on est dans l'app Capacitor native
    const isCapacitor =
      "Capacitor" in window &&
      typeof (window as Record<string, unknown>).Capacitor === "object" &&
      (
        (window as Record<string, unknown>).Capacitor as Record<string, unknown>
      )?.isNativePlatform === true;
    if (isCapacitor) return;

    // Détecte Android via User-Agent
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    if (!isAndroid) return;

    // Vérifie si l'utilisateur a fermé le bandeau récemment
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
      }
    } catch {
      // localStorage indisponible — on affiche quand même
    }

    setVisible(true);
  }, []);

  if (!visible) return null;

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore
    }
  }

  return (
    <div className="relative z-[60] flex items-center gap-3 border-b border-emerald-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-emerald-950/30 px-4 py-2.5 sm:px-6">
      {/* Icône */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-600/30">
        <Smartphone className="h-4 w-4 text-white" />
      </span>

      {/* Texte */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">
          CinéMax est disponible en app !
        </p>
        <p className="text-xs text-zinc-400 hidden sm:block">
          Téléchargez l&apos;application Android pour une meilleure expérience.
        </p>
      </div>

      {/* Bouton de téléchargement */}
      <a
        href={APK_DOWNLOAD_URL}
        download="CineMax.apk"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 sm:px-4 sm:py-2 sm:text-sm"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Télécharger</span>
        <span className="sm:hidden">APK</span>
      </a>

      {/* Bouton fermer */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer le bandeau"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
