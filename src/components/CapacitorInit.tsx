"use client";

import { useEffect } from "react";

/**
 * Initialise les plugins Capacitor natifs lorsque l'app tourne dans un
 * conteneur mobile (iOS / Android). Sur le web classique, les imports
 * échouent silencieusement et le composant ne fait rien.
 *
 * Ce composant ne rend rien visuellement — il suffit de le monter une
 * seule fois dans le layout racine.
 */
export function CapacitorInit() {
  useEffect(() => {
    async function init() {
      try {
        // Détecte si on est dans un environnement Capacitor natif
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // ── Barre d'état transparente ────────────────────────────────
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#09090b" });

        // ── Cacher le splash screen après chargement ─────────────────
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();

        // ── Gérer le bouton retour Android ───────────────────────────
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch {
        // Pas dans un environnement Capacitor — rien à faire
      }
    }

    init();
  }, []);

  return null;
}
