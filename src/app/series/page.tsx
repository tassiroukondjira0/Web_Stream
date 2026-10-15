import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getAllMedias } from "@/lib/catalog";
import { getPartnerSeries, providerItemHref } from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { Tv, Play, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Séries & Documentaires en Streaming",
  description: "Découvrez nos séries et documentaires par épisodes en haute définition.",
};

interface SeriesPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function SeriesContent({ searchParams }: SeriesPageProps) {
  const { page } = await searchParams;
  const allMedias = await getAllMedias();
  const seriesList = allMedias.filter((m) => m.type === "SERIES");

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

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {seriesList.map((serie) => (
          <Link
            key={serie.slug}
            href={`/series/${serie.slug}`}
            className="group overflow-hidden rounded-2xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
              <img
                src={serie.backdropUrl || serie.posterUrl}
                alt={serie.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  <Play className="h-3 w-3 fill-white" />
                  Voir les épisodes
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Tv className="h-3 w-3 text-violet-500" />
                  Série
                </span>
                <span>•</span>
                <span>{serie.releaseYear}</span>
              </div>
              <h2 className="mt-1 text-base font-bold text-white group-hover:text-violet-400 transition-colors">
                {serie.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {serie.synopsis}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Catalogue partenaire — épisodes récents, paginés depuis la base */}
      {partner.items.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">
              Séries &amp; épisodes récents
            </h2>
            <span className="text-xs text-zinc-500">
              {partner.totalItems} titres — page {partner.page} / {partner.totalPages}
            </span>
          </div>
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

          {/* Pagination côté serveur */}
          {partner.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {partnerPage > 1 && (
                <Link
                  href={
                    partnerPage - 1 > 1
                      ? `/series?page=${partnerPage - 1}`
                      : "/series"
                  }
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
      )}
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
