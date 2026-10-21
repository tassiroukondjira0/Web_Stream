import Link from "next/link";
import { Search, ArrowLeft, Clapperboard, Tv, Sparkles } from "lucide-react";

/**
 * Écran affiché quand aucune source de lecture n'est disponible pour un titre.
 *
 * Un cul-de-sac n'aide personne : au lieu d'un simple « indisponible », on
 * propose une recherche du titre (pour tomber sur une fiche équivalente ou
 * un doublon) et un retour au catalogue correspondant.
 */

interface UnavailableNoticeProps {
  kind: "movie" | "series" | "anime";
  title: string;
  /** URL du catalogue parent (« /films », « /series », « /animes »). */
  catalogHref: string;
}

const LABELS: Record<
  UnavailableNoticeProps["kind"],
  { heading: string; catalog: string; phrase: string; Icon: typeof Tv }
> = {
  movie: { heading: "Flux indisponible pour ce film", catalog: "Retour aux films", phrase: "ce film", Icon: Clapperboard },
  series: { heading: "Série indisponible", catalog: "Retour aux séries", phrase: "cette série", Icon: Tv },
  anime: { heading: "Animé indisponible", catalog: "Retour aux animés", phrase: "cet animé", Icon: Sparkles },
};

export function UnavailableNotice({ kind, title, catalogHref }: UnavailableNoticeProps) {
  const { heading, catalog, phrase, Icon } = LABELS[kind];
  const query = encodeURIComponent(title);

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <Icon className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
      <h1 className="text-xl font-bold text-white">{heading}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Aucun flux n&apos;est disponible pour {phrase} pour le moment. Nos sources sont
        régulièrement mises à jour&nbsp;: revenez plus tard ou cherchez un titre équivalent.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/recherche?q=${query}`}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          <Search className="h-4 w-4" />
          Chercher un autre titre
        </Link>
        <Link
          href={catalogHref}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {catalog}
        </Link>
      </div>
    </div>
  );
}
