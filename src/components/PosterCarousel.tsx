"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { shouldOptimizeImage } from "@/lib/image";
import { PosterPlaceholder } from "./PosterPlaceholder";

/** Carte de catalogue générique (affiche l'affiche ou un placeholder). */
function PosterCard({
  href,
  posterUrl,
  title,
  year,
  badge,
  badgeTone,
}: {
  href: string;
  posterUrl?: string | null;
  title: string;
  year?: string | null;
  badge?: string;
  badgeTone?: "sky" | "fuchsia";
}) {
  const imgSrc = posterUrl || undefined;

  return (
    <a href={href} className="group relative block overflow-hidden rounded-xl bg-zinc-800/60">
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={title}
          width={300}
          height={450}
          unoptimized={!shouldOptimizeImage(imgSrc)}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <PosterPlaceholder title={title} />
      )}
      {badge && (
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            badgeTone === "sky" ? "bg-sky-500/15 text-sky-300" : "bg-fuchsia-500/15 text-fuchsia-300"
          }`}
        >
          {badge}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white">
        {title}
        {year && <span className="ml-1">({year})</span>}
      </div>
    </a>
  );
}

/**
 * Rangée horizontale « glissable » de cartes catalogue.
 *
 * Permet de parcourir une sélection éditoriale (ex. « À la une ») en défilant
 * horizontalement, avec défilement magnétique (snap) et flèches de navigation.
 * Purement présentationnel : les données proviennent d'un composant serveur.
 */
export interface PosterCarouselItem {
  key: string;
  href: string;
  title: string;
  posterUrl?: string | null;
  year?: string | null;
  badge?: string;
  badgeTone?: "sky" | "fuchsia";
}

/** Tailles de cartes du carrousel. "lg" est réservé à la section « À la une ». */
const CARD_WIDTH: Record<"sm" | "lg", string> = {
  sm: "w-[120px] sm:w-[150px] lg:w-[176px]",
  lg: "w-[150px] sm:w-[190px] lg:w-[248px]",
};

export function PosterCarousel({
  items,
  size = "sm",
}: {
  items: PosterCarouselItem[];
  size?: "sm" | "lg";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, items.length]);

  function scrollByPage(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className="group/carousel relative w-full min-w-0 overflow-hidden">
      <div
        ref={scroller}
        className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={item.key} className={`${CARD_WIDTH[size]} shrink-0 snap-start`}>
            <PosterCard
              href={item.href}
              posterUrl={item.posterUrl}
              title={item.title}
              year={item.year}
              badge={item.badge}
              badgeTone={item.badgeTone}
            />
          </div>
        ))}
      </div>

      {canLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Précédent"
          className="absolute left-0 top-[38%] z-20 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-lg backdrop-blur transition-opacity hover:bg-black sm:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="absolute right-0 top-[38%] z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-md backdrop-blur transition-colors hover:bg-zinc-800 sm:h-10 sm:w-10"
          aria-label="Faire défiler vers la droite"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
