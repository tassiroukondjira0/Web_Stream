import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getAllMedias } from "@/lib/catalog";
import { searchPartnerAssets, providerItemHref } from "@/lib/provider-catalog";
import type { ProviderCatalogItem } from "@/lib/provider-catalog";
import { ProviderPosterCard } from "@/components/ProviderPosterCard";
import { Search as SearchIcon, Film, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Rechercher un Film ou une Série",
  description: "Trouvez rapidement vos films et séries favoris sur CinéMax.",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = (q || "").trim().toLowerCase();
  const allMedias = await getAllMedias();

  const results = query
    ? allMedias.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.synopsis.toLowerCase().includes(query) ||
          m.categories.some((c) => c.name.toLowerCase().includes(query))
      )
    : [];

  // Recherche dans le catalogue partenaire synchronisé (CDC §4.7 : grilles
  // et recherche depuis ProviderAsset — locale, instantanée, sans quota API).
  // Films, séries ET animés : les animés sont routés vers le bon lecteur via
  // `sourceType` (film ou série).
  let partnerResults: ProviderCatalogItem[] = [];
  if (query) {
    try {
      partnerResults = await searchPartnerAssets(q!.trim(), 12);
    } catch {
      partnerResults = [];
    }
  }

  const totalCount = results.length + partnerResults.length;
  const hasResults = results.length > 0 || partnerResults.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Formulaire de recherche */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Moteur de Recherche
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Recherchez par titre, réalisateur, mot-clé ou univers.
        </p>

        <form action="/recherche" method="GET" className="mt-6 relative">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-4 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Ex: Sintel, animation, action..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-900/90 py-3.5 pl-12 pr-28 text-sm text-white placeholder-zinc-500 shadow-xl focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="submit"
              className="absolute right-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Rechercher
            </button>
          </div>
        </form>
      </div>

      {/* Affichage des résultats */}
      <div className="mt-12">
        {query ? (
          <div>
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-semibold text-white">
                Résultats pour &laquo; <span className="text-violet-400">{q}</span> &raquo;
              </h2>
              <span className="text-xs text-zinc-400">
                {totalCount} résultat{totalCount > 1 ? "s" : ""}
              </span>
            </div>

            {!hasResults && (
              <div className="py-16 text-center">
                <Film className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
                <p className="text-base font-medium text-white">Aucun résultat trouvé</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Essayez avec un mot-clé plus générique ou vérifiez l&apos;orthographe.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
                {results.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/films/${item.slug}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900/60 border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
                  >
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {item.accessLevel === "PREMIUM" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                          <ShieldCheck className="h-3 w-3" />
                          PREMIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                          GRATUIT
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                      <div className="text-[11px] text-zinc-400">
                        {item.releaseYear} • {item.durationMinutes} min
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-white line-clamp-1 group-hover:text-violet-400">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {item.categories.map((c) => c.name).join(" • ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Résultats du catalogue partenaire */}
            {partnerResults.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-baseline justify-between border-b border-white/10 pb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Catalogue partenaire
                  </h2>
                  <span className="text-xs text-zinc-500">
                    {partnerResults.length} résultat
                    {partnerResults.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
                  {partnerResults.map((item) => (
                    <ProviderPosterCard
                      key={`fs-${item.contentType}-${item.externalId}`}
                      href={providerItemHref(item)}
                      posterUrl={item.posterUrl}
                      title={item.title}
                      year={item.releaseYear ? String(item.releaseYear) : null}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-zinc-500">
            Saisissez un mot-clé ci-dessus pour lancer la recherche.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-zinc-400">
          Chargement de la recherche...
        </div>
      }
    >
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}
