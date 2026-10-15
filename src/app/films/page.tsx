import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getPartnerMovies, providerItemHref } from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { Film, Play, ShieldCheck, Filter } from "lucide-react";

export const metadata: Metadata = {
  title: "Catalogue Films en Streaming Légal",
  description:
    "Explorez notre sélection complète de films en haute définition. Visionnage gratuit et titres exclusifs avec le pass Premium.",
};

interface FilmsPageProps {
  searchParams: Promise<{ categorie?: string; acces?: string; page?: string }>;
}

async function FilmsContent({ searchParams }: FilmsPageProps) {
  const { categorie, acces, page } = await searchParams;
  const allMedias = await getAllMedias();

  // Filtrage
  const films = allMedias
    .filter((m) => m.type === "MOVIE")
    .filter((m) => {
      if (categorie && !m.categories.some((c) => c.slug === categorie)) return false;
      if (acces === "gratuit" && m.accessLevel !== "FREE") return false;
      if (acces === "premium" && m.accessLevel !== "PREMIUM") return false;
      return true;
    });

  const categories = [
    { label: "Tous les genres", slug: "" },
    { label: "Animation", slug: "animation" },
    { label: "Science-Fiction", slug: "science-fiction" },
    { label: "Action", slug: "action" },
    { label: "Comédie", slug: "comedie" },
  ];

  // Catalogue partenaire — lu depuis la base synchronisée (CDC §4.7 :
  // grilles depuis ProviderAsset, pagination côté serveur). Le local
  // (Media) et l'externe coexistent sans se mélanger (§4.6).
  const partnerPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const partner = await getPartnerMovies(partnerPage, 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Catalogue des Films
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Regardez des films complets légalement et en haute qualité.
        </p>

        {/* Filtres par Catégorie */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-2">
            <Filter className="h-3.5 w-3.5" />
            Filtres :
          </span>
          {categories.map((cat) => {
            const isActive = (categorie || "") === cat.slug;
            const queryParams = new URLSearchParams();
            if (cat.slug) queryParams.set("categorie", cat.slug);
            if (acces) queryParams.set("acces", acces);

            return (
              <Link
                key={cat.slug}
                href={`/films${queryParams.toString() ? `?${queryParams.toString()}` : ""}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white font-semibold shadow-md shadow-violet-600/30"
                    : "bg-zinc-900 border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grille de résultats */}
      {films.length === 0 ? (
        <div className="py-24 text-center">
          <Film className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-medium text-white">Aucun film trouvé</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Aucun titre ne correspond à ces critères de recherche.
          </p>
          <Link
            href="/films"
            className="mt-4 inline-flex items-center rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {films.map((film) => (
            <Link
              key={film.slug}
              href={`/films/${film.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/50"
            >
              {/* Badge Freemium */}
              <div className="absolute top-2.5 right-2.5 z-10">
                {film.accessLevel === "PREMIUM" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-md">
                    <ShieldCheck className="h-3 w-3" />
                    PREMIUM
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-md">
                    GRATUIT
                  </span>
                )}
              </div>

              {/* Affiche */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                <img
                  src={film.posterUrl}
                  alt={film.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    <Play className="h-3 w-3 fill-white" />
                    Regarder
                  </span>
                </div>
              </div>

              {/* Infos */}
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>{film.releaseYear}</span>
                  {film.durationMinutes && (
                    <>
                      <span>•</span>
                      <span>{film.durationMinutes} min</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 text-sm font-semibold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
                  {film.title}
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {film.categories.map((c) => c.name).join(" • ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Catalogue partenaire — films récents, paginés depuis la base */}
      {partner.items.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">
              Films du catalogue
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
                  href={`/films${buildPartnerPageHref(partnerPage - 1, categorie, acces)}`}
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
                  href={`/films${buildPartnerPageHref(partnerPage + 1, categorie, acces)}`}
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

export default function FilmsCatalogPage({ searchParams }: FilmsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement du catalogue...
        </div>
      }
    >
      <FilmsContent searchParams={searchParams} />
    </Suspense>
  );
}

/** Conserve les filtres (categorie, acces) lors de la navigation partenaire. */
function buildPartnerPageHref(targetPage: number, categorie?: string, acces?: string): string {
  const q = new URLSearchParams();
  if (categorie) q.set("categorie", categorie);
  if (acces) q.set("acces", acces);
  if (targetPage > 1) q.set("page", String(targetPage));
  const s = q.toString();
  return s ? `?${s}` : "";
}
