"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CATEGORIES, type Category } from "@/lib/categories";

interface CategoryFilterProps {
  /** Slug de la catégorie actuellement sélectionnée (optionnel). */
  currentSlug?: string | null;
  /** Label affiché avant la liste. */
  label?: string;
}

export function CategoryFilter({ currentSlug, label = "Catégorie" }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const active = currentSlug ?? searchParams.get("categorie") ?? null;

  const setCategory = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) {
        params.set("categorie", slug);
      } else {
        params.delete("categorie");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{label}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={active ? `${pathname}?${new URLSearchParams(searchParams.toString()).toString().replace(/categorie=[^&]*/, "")}` : pathname}
          onClick={(e) => {
            e.preventDefault();
            setCategory(null);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !active
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          Tous
        </Link>
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          const params = new URLSearchParams(searchParams.toString());
          params.set("categorie", cat.slug);
          return (
            <Link
              key={cat.slug}
              href={`${pathname}?${params.toString()}`}
              onClick={(e) => {
                e.preventDefault();
                setCategory(cat.slug);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
