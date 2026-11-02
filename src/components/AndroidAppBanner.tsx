"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

/**
 * URL de l'API qui retourne les informations du dernier build EAS.
 * Le webhook `/api/eas-webhook` met à jour automatiquement `public/build-info.json`
 * après chaque build réussi.
 */
const BUILD_INFO_URL = "/build-info.json";

/** URL de fallback si le fetch échoue (dernier build connu). */
const FALLBACK_ANDROID_URL = "https://expo.dev/artifacts/eas/fPiBCc5g-YXQRKR-OAZuQb-58surUssd64dL-1eagEs.apk";

/**
 * Lien d'installation iOS via EAS Build.
 * Après le build iOS, mettez à jour cette URL.
 */
const IOS_INSTALL_URL = "https://expo.dev/accounts/your-account/projects/cinemax-mobile/builds/your-build-id";

/** Clé localStorage pour retenir que l'utilisateur a fermé le bandeau. */
const DISMISS_KEY = "cinemax-app-banner-dismissed";

/** Durée avant de ré-afficher le bandeau après fermeture (7 jours). */
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Récupère dynamiquement le lien de téléchargement Android depuis le fichier
 * build-info.json mis à jour automatiquement par le webhook EAS.
 */
async function fetchAndroidDownloadUrl(): Promise<string> {
  try {
    const res = await fetch(BUILD_INFO_URL, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      // Prioriser l'URL directe de l'APK (artifactUrl) pour le téléchargement direct
      // Si artifactUrl n'est pas disponible, utiliser buildUrl (page EAS) comme fallback
      return data.artifactUrl || data.buildUrl || FALLBACK_ANDROID_URL;
    }
  } catch {
    // Ignore — on utilise le fallback
  }
  return FALLBACK_ANDROID_URL;
}

/**
 * Bandeau intelligent de téléchargement de l'app CinéMax.
 *
 * Affiché uniquement lorsque :
 * - L'utilisateur navigue depuis un navigateur Android ou iOS
 * - L'utilisateur n'a pas fermé le bandeau récemment
 *
 * Détecte automatiquement la plateforme et propose le bon téléchargement.
 * Le lien Android est récupéré dynamiquement depuis le dernier build EAS.
 */
export function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [androidUrl, setAndroidUrl] = useState(FALLBACK_ANDROID_URL);

  useEffect(() => {
    // Ne rien afficher côté serveur
    if (typeof window === "undefined") return;

    // Détecte la plateforme via User-Agent
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid) {
      setPlatform("android");
      // Récupérer le dernier lien de build Android
      fetchAndroidDownloadUrl().then(setAndroidUrl);
    } else if (isIOS) {
      setPlatform("ios");
    } else {
      return; // Desktop ou autre — on n'affiche rien
    }

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

    const timer = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible || !platform) return null;

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore
    }
  }

  const isAndroid = platform === "android";
  const downloadUrl = isAndroid ? androidUrl : IOS_INSTALL_URL;
  const downloadLabel = isAndroid ? "APK" : "iOS";
  const platformLabel = isAndroid ? "Android" : "iOS";

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
          Téléchargez l&apos;application {platformLabel} pour une meilleure expérience.
        </p>
      </div>

      {/* Bouton de téléchargement */}
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 sm:px-4 sm:py-2 sm:text-sm"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Télécharger</span>
        <span className="sm:hidden">{downloadLabel}</span>
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
