/**
 * Lecture locale — source Vidzy unique (titres, séries ET animes).
 *
 * Le catalogue local (Media) ne stocke aucune vidéo : la lecture est
 * résolue à la demande par titre + année via TMDB puis Vidzy
 * (`resolveCatalogPlayback`), exactement comme les pages partner/tmdb.
 * Films, séries et animes utilisent le même pipeline — aucune clé requise.
 */

import {
  resolveCatalogPlayback,
  type CatalogPlayback,
} from "./vidzy";
import {
  vidzySources,
  providerSources,
  type PlayerSource,
  type PlayerSelection,
} from "./player-sources";
import { prisma } from "./prisma";

export type LocalContentType = "MOVIE" | "SERIES" | "ANIME";

export interface LocalPlaybackResult {
  playback: CatalogPlayback | null;
  sources: PlayerSource[];
}

/**
 * Résout les sources de lecture Vidzy d'un titre local.
 * Retourne `{ playback: null, sources: [] }` si indisponible (jamais d'exception).
 */
export async function resolveLocalPlayback(
  title: string,
  contentType: LocalContentType,
  year?: number | null
): Promise<LocalPlaybackResult> {
  try {
    const playback = await resolveCatalogPlayback(title, contentType, year ?? null);
    if (!playback || !playback.available) {
      return { playback, sources: [] };
    }
    return { playback, sources: vidzySources(playback) };
  } catch {
    return { playback: null, sources: [] };
  }
}

/**
 * Sources d'un épisode précis : Vidzy + éventuels flux `videoUrl`
 * renseignés par l'admin sur les épisodes de la base (repli).
 */
export async function episodeExtraSources(
  mediaSlug: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<PlayerSource[]> {
  try {
    if (process.env.DATABASE_READY !== "true") return [];
    const media = await prisma.media.findUnique({
      where: { slug: mediaSlug },
      include: {
        seasons: {
          where: { seasonNumber },
          include: { episodes: { where: { episodeNumber } } },
        },
      },
    });
    const ep = media?.seasons?.[0]?.episodes?.[0] as
      | { videoUrl?: string | null }
      | undefined;
    const url = ep?.videoUrl?.trim();
    if (!url) return [];
    return providerSources(
      [{ lang: "vf", episode: episodeNumber, host: "admin", url }],
      seasonNumber
    );
  } catch {
    return [];
  }
}

export type { CatalogPlayback, PlayerSource, PlayerSelection };
