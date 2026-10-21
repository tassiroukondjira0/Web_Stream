import { Clapperboard } from "lucide-react";

/** Palette de dégradés utilisée pour l'affiche de remplacement. */
const GRADIENTS = [
  "from-violet-600/40 to-indigo-900/60",
  "from-sky-600/40 to-cyan-900/60",
  "from-rose-600/40 to-pink-900/60",
  "from-amber-600/40 to-orange-900/60",
  "from-emerald-600/40 to-teal-900/60",
  "from-fuchsia-600/40 to-purple-900/60",
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Affiche de remplacement pour les fiches sans poster : dégradé déterministe
 * (stable par titre) + initiales, plutôt qu'une case vide.
 */
export function PosterPlaceholder({ title }: { title: string }) {
  const gradient = GRADIENTS[hashString(title) % GRADIENTS.length];

  return (
    <div
      className={`flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${gradient}`}
    >
      <Clapperboard className="h-7 w-7 text-white/40" />
      <span className="text-2xl font-extrabold tracking-wide text-white/80">
        {initials(title)}
      </span>
      <span className="line-clamp-2 px-3 text-center text-[11px] font-medium text-white/60">
        {title}
      </span>
    </div>
  );
}
