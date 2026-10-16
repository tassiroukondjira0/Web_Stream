import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  getPartnerMovies,
  providerItemHref,
} from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { AdvancedFilter } from "@/components/AdvancedFilter";
import { Film } from "lucide-react";

export const metadata: Metadata = {
  title: "Catalogue Films en Streaming Légal",
  description:
    "Explorez notre sélection complète de films en haute définition. Visionnage gratuit et titres exclusifs avec le pass Premium.",
};

interface FilmsPageProps {
  searchParams: Promise<{
    page?: string;
    categorie?: string;
    language?: string;
    theme?: string;
    year?: string;
  }>;
}

async function FilmsContent({ searchParams }: FilmsPageProps) {
  const { page, categorie, language, theme, year } = await searchParams;

  const partnerPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const releaseYear = year ? Number.parseInt(year, 10) : undefined;

  const partner = await getPartnerMovies(partnerPage, 24, {
    categorySlug: categorie ?? undefined,
    language: language ?? undefined,
    theme: theme ?? undefined,
    releaseYear,
  });

  // Années disponibles pour le filtre (extraites des items de la page courante)
  const availableYears = partner.items
    .map((i) => i.releaseYear)
    .filter((y): y is number => Boolean(y));

  const activeFilters = {
    categorie: categorie ?? null,
    language: language ?? null,
    theme: theme ?? null,
    year: year ?? null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Catalogue des Films
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Regardez des films complets légalement et en haute qualité.
        </p>
      </div>

      <AdvancedFilter
        current={activeFilters}
        availableYears={availableYears}
        label="Filtres"
      />

      <section className="mt-8">
        <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">
            Films du catalogue
          </h2>
          {partner.totalItems > 0 && (
            <span className="text-xs text-zinc-500">
              {partner.totalItems} titres — page {partner.page} / {partner.totalPages}
            </span>
          )}
        </div>

        {partner.items.length === 0 ? (
          <div className="py-24 text-center">
            <Film className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-lg font-medium text-white">
              Aucun film disponible
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Le catalogue est en cours de mise à jour. Revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
            {partner.items.map((item) => (
              <ProviderPosterCard
                key={`partner-${item.contentType}-${item.externalId}`}
                href={providerItemHref(item)}
                posterUrl={item.posterUrl}
                title={item.title}
                year={item.releaseYear ? String(item.releaseYear) : null}
              />
            ))}
          </div>
        )}

        {partner.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {partnerPage > 1 && (
              <Link
                href={
                  partnerPage - 1 > 1
                    ? `/films?page=${partnerPage - 1}${buildQueryString({ categorie, language, theme, year })}`
                    : `/films${buildQueryString({ categorie, language, theme, year })}`
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
                href={`/films?page=${partnerPage + 1}${buildQueryString({ categorie, language, theme, year })}`}
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

function buildQueryString(params: {
  categorie?: string | null;
  language?: string | null;
  theme?: string | null;
  year?: string | null;
}): string {
  const qs = new URLSearchParams();
  if (params.categorie) qs.set("categorie", params.categorie);
  if (params.language) qs.set("language", params.language);
  if (params.theme) qs.set("theme", params.theme);
  if (params.year) qs.set("year", params.year);
  return qs.toString() ? `?${qs.toString()}` : "";
}

export default function FilmsCatalogPage({ searchParams }: FilmsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement du catalogue…
        </div>
      }
    >
      <FilmsContent searchParams={searchParams} />
    </Suspense>
  );
}
