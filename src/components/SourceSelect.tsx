"use client";

import { useRouter } from "next/navigation";

/**
 * Sélecteur sous forme de menu déroulant (pour lecteur, langue, épisode).
 *
 * Chaque option porte l'URL complète de la page pour cette sélection : le
 * changement navigue via le routeur sans rechargement complet de la page
 * ni saut de scroll.
 */

export interface SourceOption {
  /** URL de la page pour cette option (valeur portée par le DOM). */
  value: string;
  /** Libellé affiché (« Épisode 1 », « VF », « Vidzy · VF »). */
  label: string;
}

export function SourceSelect({
  options,
  value,
  ariaLabel = "Sélection",
  className,
}: {
  options: SourceOption[];
  value: string;
  ariaLabel?: string;
  className?: string;
}) {
  const router = useRouter();

  if (options.length === 0) return null;

  // Assure une valeur sélectionnée valide correspondant aux options
  const selectedValue = options.some((o) => o.value === value)
    ? value
    : (options[0]?.value ?? "");

  return (
    <select
      value={selectedValue}
      aria-label={ariaLabel}
      onChange={(event) => router.push(event.target.value, { scroll: false })}
      className={
        className ??
        "cursor-pointer rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 outline-none transition-colors hover:bg-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-zinc-900 text-zinc-200">
          {option.label}
        </option>
      ))}
    </select>
  );
}
