"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Sparkles } from "lucide-react";

interface AdBannerProps {
  /** Format de l'emplacement : "leaderboard" (horizontal), "rectangle" (moyen), ou "in-content" */
  format?: "leaderboard" | "rectangle" | "in-content";
  className?: string;
}

/**
 * Composant d'encart publicitaire intelligent :
 * - Masqué à 100% pour les membres Premium (`SUBSCRIBER`, `ADMIN`, `SUPER_ADMIN`).
 * - Affiché pour les utilisateurs gratuits ou visiteurs non connectés.
 * - Incite gentiment à passer à l'abonnement Premium pour supprimer les annonces.
 *
 * Pour brancher votre régie (PropellerAds, Monetag, Adsterra) :
 * Insérez simplement le script fourni par votre régie dans le conteneur ad-zone.
 */
export function AdBanner({ format = "leaderboard", className = "" }: AdBannerProps) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        const premium = role === "SUBSCRIBER" || role === "ADMIN" || role === "SUPER_ADMIN";
        setIsPremium(premium);
      })
      .catch(() => {
        setIsPremium(false);
      });
  }, []);

  // Pendant la détection ou si l'utilisateur est Premium, on n'affiche rien
  if (isPremium === null || isPremium === true) {
    return null;
  }

  return (
    <div className={`my-6 flex flex-col items-center justify-center ${className}`}>
      {/* Encart publicitaire */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-center shadow-lg">
        {/* Petit libellé transparent légal */}
        <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>PUBLICITÉ SPONSORISÉE</span>
          <Link
            href="/premium"
            className="inline-flex items-center gap-1 text-amber-400/90 transition-colors hover:text-amber-300"
          >
            <Sparkles className="h-3 w-3" />
            Supprimer les pubs avec Premium
          </Link>
        </div>

        {/* Zone où le script de votre régie (PropellerAds / Monetag / Adsterra) injecte sa bannière */}
        <div
          id={`ad-zone-${format}`}
          className="flex min-h-[90px] w-full items-center justify-center rounded-lg border border-dashed border-white/5 bg-zinc-950/40 p-3"
        >
          {/* Bannière de démonstration interne avant l'ajout de vos scripts de régie */}
          <div className="flex flex-col items-center justify-center gap-1 py-2 text-center">
            <span className="text-sm font-semibold text-zinc-300">
              Profitez du streaming en Haute Définition sans interruption
            </span>
            <p className="text-xs text-zinc-400">
              Débloquez l&apos;accès VIP illimité, le catalogue 4K et dites adieu aux publicités.
            </p>
            <Link
              href="/premium"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black shadow-md shadow-amber-500/10 transition-colors hover:bg-amber-400"
            >
              Découvrir le Pass Premium
            </Link>
          </div>
        </div>
      <Script
        id="vignette-ad-banner"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(s){s.dataset.zone='12152322',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
        }}
      />
    </div>
  );
}