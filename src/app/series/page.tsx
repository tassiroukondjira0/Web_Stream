import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getPartnerSeries, providerItemHref } from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { Tv } from "lucide-react";

export const metadata: Metadata = {
  title: "Séries & Documentaires en Streaming",
  description: "Découvrez nos séries et documentaires par épisodes en haute définition.",
};

interface SeriesPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function SeriesContent({ searchParams }: SeriesPageProps) {
  const { page } = await searchParams;

  // Catalogue partenaire — lu depuis la base synchronisée (CDC §4.7 :
  // grilles depuis ProviderAsset, pagination côté serveur).
  const partnerPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const partner = await getPartnerSeries(partnerPage, 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Séries & Épisodes
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Suivez vos séries originales, documentaires et programmes par saisons.
        </p>
      </div>

      {/* Catalogue partenaire — épisodes récents, paginés depuis la base */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">Séries &amp; épisodes récents</h2>
          {partner.totalItems > 0 && (
            <span className="text-xs text-zinc-500">
              {partner.totalItems} titres — page {partner.page} / {partner.totalPages}
            </span>
          )}
        </div>

        {partner.items.length === 0 ? (
          <div className="py-24 text-center">
            <Tv className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-lg font-medium text-white">Aucune série disponible</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Le catalogue est en cours de mise à jour. Revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
            {partner.items.map((item) => (
              <ProviderPosterCard
                key={`fs-${item.contentType}-${item.externalId}`}
                href={providerItemHref(item)}
                posterUrl={item.posterUrl}
                title={item.title}
                year={item.releaseYear ? String(item.releaseYear) : null}
              />
            ))}
          </div>
        )}

        {/* Pagination côté serveur */}
        {partner.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {partnerPage > 1 && (
              <Link
                href={partnerPage - 1 > 1 ? `/series?page=${partnerPage - 1}` : "/series"}
                className="rounded-lg bg-zinc-800 border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                ← Précédent
              </Link>
            )}
            <span className="text-xs text-zinc-500">
              {partner.page} / {partner.totalPages}
            </span>
            {partnerPage < partner.totalPages && (
              <Link
                href={`/series?page=${partnerPage + 1}`}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function SeriesCatalogPage({ searchParams }: SeriesPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement des séries...
        </div>
      }
    >
      <SeriesContent searchParams={searchParams} />
    </Suspense>
  );
}
