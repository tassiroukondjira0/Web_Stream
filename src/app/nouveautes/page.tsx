import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getLatestPartnerAssets, providerItemHref } from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Nouveautés & Sorties Récentes — Streaming Vidéo",
  description: "Découvrez les dernières nouveautés ajoutées au catalogue de streaming légal.",
};

function badgeFor(item: {
  contentType: "MOVIE" | "SERIES" | "ANIME";
  sourceType: "movie" | "tv" | null;
}) {
  if (item.contentType === "SERIES") return { badge: "Série", badgeTone: "sky" as const };
  if (item.contentType === "ANIME") return { badge: "Animé", badgeTone: "fuchsia" as const };
  return { badge: "Film", badgeTone: "fuchsia" as const };
}

async function NouveautesContent() {
  // Vrai catalogue synchronisé (ProviderAsset) — plus les titres de démonstration.
  const items = await getLatestPartnerAssets(48);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Calendrier des sorties
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Derniers ajouts au catalogue
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Les films, séries et animés les plus récemment ajoutés, vérifiés et autorisés pour la diffusion.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-medium text-white">Aucune nouveauté pour le moment</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Le catalogue sera bientôt enrichi de nouveaux titres.
          </p>
          <Link
            href="/films"
            className="mt-4 inline-flex items-center rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
          {items.map((item) => {
            const { badge, badgeTone } = badgeFor(item);
            return (
              <ProviderPosterCard
                key={`${item.provider}-${item.contentType}-${item.externalId}`}
                href={providerItemHref(item)}
                posterUrl={item.posterUrl}
                title={item.title}
                year={item.releaseYear ? String(item.releaseYear) : null}
                badge={badge}
                badgeTone={badgeTone}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NouveautesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement des nouveautés...
        </div>
      }
    >
      <NouveautesContent />
    </Suspense>
  );
}
