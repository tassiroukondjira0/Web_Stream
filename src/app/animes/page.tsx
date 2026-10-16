import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  getPartnerAnimes,
  providerItemHref,
  filterByCategory,
  getAllCatalogCategories,
} from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Mangas & Animés en Streaming",
  description:
    "Découvrez notre sélection de mangas, animés et films d'animation en haute définition. Studios Ghibli, shonen et classiques.",
};

interface AnimesPageProps {
  searchParams: Promise<{ page?: string; categorie?: string }>;
}

async function AnimesContent({ searchParams }: AnimesPageProps) {
  const { page, categorie } = await searchParams;

  // Catalogue partenaire — animés lus depuis la base synchronisée (§4.7),
  // pagination côté serveur. Le local (Media) et l'externe coexistent (§4.6).
  const partnerPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const partner = await getPartnerAnimes(partnerPage, 24);

  // Filtrage par catégorie côté client.
  const categories = getAllCatalogCategories();
  const activeCategory = categorie ? categories.find((c) => c.slug === categorie) : null;
  const filteredItems = activeCategory ? filterByCategory(partner.items, categorie) : partner.items;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-600/30">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Mangas & Animés
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Studios légendaires, shonen d'action et classiques intemporels.
            </p>
          </div>
        </div>
      </div>

      {/* Filtre par catégorie */}
      <CategoryFilter currentSlug={categorie ?? null} label="Catégorie" />

      {/* Catalogue partenaire — animés récents, paginés depuis la base */}
      {partner.items.length === 0 ? (
        <div className="py-24 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-medium text-white">Aucun animé disponible</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Le catalogue partenaire n'a pas encore été synchronisé.
          </p>
        </div>
      ) : (
        <section className="mt-8">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">
              Mangas & animés du catalogue{activeCategory ? ` — ${activeCategory.name}` : ""}
            </h2>
            <span className="text-xs text-zinc-500">
              {partner.totalItems} titres — page {partner.page} / {partner.totalPages}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
            {filteredItems.map((item) => (
              <ProviderPosterCard
                key={`partner-anime-${item.externalId}`}
                href={providerItemHref(item)}
                posterUrl={item.posterUrl}
                title={item.title}
                year={item.releaseYear ? String(item.releaseYear) : null}
                badge={item.sourceType === "tv" ? "Série" : "Film"}
                badgeTone={item.sourceType === "tv" ? "sky" : "fuchsia"}
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
                      ? `/animes?page=${partnerPage - 1}${categorie ? `&categorie=${categorie}` : ""}`
                      : categorie
                      ? `/animes?categorie=${categorie}`
                      : "/animes"
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
                  href={`/animes?page=${partnerPage + 1}${categorie ? `&categorie=${categorie}` : ""}`}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                >
                  Suivant →
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      <p className="mt-10 rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-[11px] leading-relaxed text-zinc-500">
        Animés ou mangas provenant du catalogue partenaire. La disponibilité et les droits
        relèvent du fournisseur.
      </p>
    </div>
  );
}

export default function AnimesCatalogPage({ searchParams }: AnimesPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement des animés...
        </div>
      }
    >
      <AnimesContent searchParams={searchParams} />
    </Suspense>
  );
}
