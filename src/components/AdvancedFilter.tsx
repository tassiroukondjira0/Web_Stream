"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  CATALOG_LANGUAGES,
  CATALOG_PLATFORMS,
  CATALOG_THEMES,
} from "@/lib/provider-catalog";
import { type Category, getAllCategories } from "@/lib/categories";

interface AdvancedFilterProps {
  availableYears?: number[];
  label?: string;
  /** Afficher le filtre « Plateforme » (masqué là où les titres ne sont pas tagués). */
  showPlatforms?: boolean;
}

export function AdvancedFilter({
  availableYears = [],
  label = "Filtres",
  showPlatforms = true,
}: AdvancedFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const categories: Category[] = useMemo(() => getAllCategories(), []);
  const langs = CATALOG_LANGUAGES;
  const themes = CATALOG_THEMES;
  const platforms = CATALOG_PLATFORMS;

  const cat = searchParams.get("categorie") ?? "";
  const lang = searchParams.get("language") ?? "";
  const theme = searchParams.get("theme") ?? "";
  const year = searchParams.get("year") ?? "";
  const platform = searchParams.get("plateforme") ?? "";

  const hasActive = Boolean(cat || lang || theme || year || platform);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </h3>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline"
          >
            Effacer tout
          </button>
        )}
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
          showPlatforms ? "lg:grid-cols-5" : "lg:grid-cols-4"
        }`}
      >
        {/* Genre — menu déroulant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Genre
          </label>
          <select
            value={cat}
            onChange={(e) => setFilter("categorie", e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer"
          >
            <option value="">Tous les genres</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Langue — menu déroulant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Langue
          </label>
          <select
            value={lang}
            onChange={(e) => setFilter("language", e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer"
          >
            <option value="">Toutes les langues</option>
            {langs.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Thème — menu déroulant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Thème
          </label>
          <select
            value={theme}
            onChange={(e) => setFilter("theme", e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer"
          >
            <option value="">Tous les thèmes</option>
            {themes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Plateforme — menu déroulant */}
        {showPlatforms && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Plateforme
            </label>
            <select
              value={platform}
              onChange={(e) => setFilter("plateforme", e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer"
            >
              <option value="">Toutes les plateformes</option>
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Année — menu déroulant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Année
          </label>
          <select
            value={year}
            onChange={(e) => setFilter("year", e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors cursor-pointer"
          >
            <option value="">Toutes les années</option>
            {availableYears
              .slice()
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        {cat && (
          <span className="bg-zinc-800/50 rounded px-2 py-1">
            Genre :{" "}
            {categories.find((c) => c.slug === cat)?.name ?? cat}
          </span>
        )}
        {lang && (
          <span className="bg-zinc-800/50 rounded px-2 py-1">
            Langue : {langs.find((l) => l.value === lang)?.label ?? lang}
          </span>
        )}
        {theme && (
          <span className="bg-zinc-800/50 rounded px-2 py-1">
            Thème : {themes.find((t) => t.value === theme)?.label ?? theme}
          </span>
        )}
        {year && <span className="bg-zinc-800/50 rounded px-2 py-1">Année : {year}</span>}
        {platform && showPlatforms && (
          <span className="bg-zinc-800/50 rounded px-2 py-1">
            Plateforme : {platforms.find((p) => p.value === platform)?.label ?? platform}
          </span>
        )}
      </div>
    </section>
  );
}
