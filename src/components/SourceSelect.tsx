"use client";

import { useRouter } from "next/navigation";

/**
 * Sélecteur de source (hébergeur) sous forme de menu déroulant.
 *
 * Chaque option porte l'URL complète de la page pour cette source : le
 * changement navigue via le routeur, la sélection reste portée par l'URL
 * (pas d'état local), comme les autres sélecteurs du lecteur.
 */

export interface SourceOption {
  /** URL de la page pour cette source (valeur portée par le DOM). */
  value: string;
  /** Libellé affiché (« Premium · VF »). */
  label: string;
}

export function SourceSelect({
  options,
  value,
  ariaLabel = "Source de lecture",
}: {
  options: SourceOption[];
  value: string;
  ariaLabel?: string;
}) {
  const router = useRouter();

  if (options.length === 0) return null;

  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => router.push(event.target.value)}
      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 outline-none transition-colors hover:bg-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
