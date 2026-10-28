"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Script MultiTag PropellerAds (Zone 12142561).
 *
 * Règle de monétisation :
 * - Chargé UNIQUEMENT pour les visiteurs non connectés ou les utilisateurs gratuits (`USER`).
 * - STRICTEMENT DÉSACTIVÉ pour les abonnés Premium (`SUBSCRIBER`), `ADMIN` et `SUPER_ADMIN`.
 */
export function PropellerAdsTag() {
  const [shouldLoadAds, setShouldLoadAds] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        const isPremium = role === "SUBSCRIBER" || role === "ADMIN" || role === "SUPER_ADMIN";
        // On n'active la pub que si l'utilisateur n'est PAS premium
        setShouldLoadAds(!isPremium);
      })
      .catch(() => {
        // En cas d'erreur ou visiteur non connecté : activer la pub
        setShouldLoadAds(true);
      });
  }, []);

  if (!shouldLoadAds) {
    return null;
  }

  return (
    <Script
      src="https://quge5.com/88/tag.min.js"
      data-zone="303060"
      async
      data-cfasync="false"
      strategy="afterInteractive"
    />
  );
}
