"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { CATALOG_LANGUAGES, CATALOG_THEMES } from "@/lib/provider-catalog";
import { type Category, getAllCategories } from "@/lib/categories";

interface AdvancedFilterProps {
  current?: {
    categorie?: string | null;
    language?: string | null;
    theme?: string | null;
    year?: string | null;
  };
  availableYears?: number[];
  label?: string;
}

export function AdvancedFilter({
  current,
  availableYears = [],
  label = "Filtres",
}: AdvancedFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const categories: Category[] = useMemo(() => getAllCategories(), []);
  const langs = CATALOG_LANGUAGES;
  const themes = CATALOG_THEMES;

  const cat = current?.categorie ?? searchParams.get("categorie") ?? undefined;
  const lang = current?.language ?? searchParams.get("language") ?? undefined;
  const theme = current?.theme ?? searchParams.get("theme") ?? undefined;
  const year = current?.year ?? searchParams.get("year") ?? undefined;

  const buildURL = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  const hasActive = Boolean(cat || lang || theme || year);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Genre */}
        <div className="col-span-full sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => buildURL({ categorie: null })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !cat ? "bg-violet-600 text-white" : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Tous genres
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => buildURL({ categorie: c.slug })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  cat === c.slug
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Langue */}
        <div className="col-span-full sm:col-span-1">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => buildURL({ language: null })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !lang ? "bg-violet-600 text-white" : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Toutes langues
            </button>
            {langs.map((l) => (
              <button
                key={l.value}
                onClick={() => buildURL({ language: l.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  lang === l.value
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thème */}
        <div className="col-span-full sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => buildURL({ theme: null })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !theme ? "bg-violet-600 text-white" : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Tous thèmes
            </button>
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => buildURL({ theme: t.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  theme === t.value
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Année */}
        <div className="col-span-full sm:col-span-1">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => buildURL({ year: null })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !year ? "bg-violet-600 text-white" : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Toutes années
            </button>
            {availableYears.slice().sort((a, b) => b - a).map((y) => (
              <button
                key={y}
                onClick={() => buildURL({ year: String(y) })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  year === String(y)
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        {cat && <span className="bg-zinc-800/50 rounded px-2 py-1">Genre : {categories.find((c) => c.slug === cat)?.name ?? cat}</span>}
        {lang && <span className="bg-zinc-800/50 rounded px-2 py-1">Langue : {langs.find((l) => l.value === lang)?.label ?? lang}</span>}
        {theme && <span className="bg-zinc-800/50 rounded px-2 py-1">Thème : {themes.find((t) => t.value === theme)?.label ?? theme}</span>}
        {year && <span className="bg-zinc-800/50 rounded px-2 py-1">Année : {year}</span>}
      </div>
    </section>
  );
}
