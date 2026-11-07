"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Result = { title: string; href: string; type: string; posterUrl: string };

export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || !query.trim()) return;
    const updateTop = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownTop(rect.bottom + 8);
      }
    };
    updateTop();
    window.addEventListener("resize", updateTop);
    window.addEventListener("scroll", updateTop, { passive: true });
    return () => {
      window.removeEventListener("resize", updateTop);
      window.removeEventListener("scroll", updateTop);
    };
  }, [open, query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la recherche"
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        action="/recherche"
        method="GET"
        className="flex max-w-[46vw] items-center gap-1 rounded-full border border-white/10 bg-zinc-900 pl-3 pr-1 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/40"
        onSubmit={() => setOpen(false)}
      >
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Rechercher…"
          aria-label="Rechercher un film ou une série"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          className="w-24 min-w-0 bg-transparent py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none sm:w-48"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          aria-label="Fermer la recherche"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </form>

      {query.trim() && (
        <div className="fixed left-0 right-0 max-h-[520px] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-2xl z-50" style={{ top: dropdownTop }}>
          {loading && (
            <div className="px-4 py-3 text-xs text-zinc-400">Recherche…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-zinc-400">Aucun résultat</div>
          )}
          <div className="grid grid-cols-4 gap-2 p-2 sm:grid-cols-6 sm:gap-3 md:grid-cols-8 lg:grid-cols-8">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(r.href);
                }}
                className="group flex flex-col overflow-hidden rounded-lg bg-zinc-800 text-left hover:ring-1 hover:ring-violet-500"
              >
                <div className="relative aspect-[2/3] w-full bg-zinc-700">
                  {r.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.posterUrl}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="px-1.5 py-1">
                  <p className="line-clamp-2 text-[11px] leading-snug font-medium text-white">{r.title}</p>
                  <p className="text-[9px] text-zinc-500">{r.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

