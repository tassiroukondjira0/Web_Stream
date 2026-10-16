/**
 * Sources de lecture — modèle unifié du « multi-lecteur ».
 *
 * Une fiche peut proposer plusieurs sources pour un même épisode : notre
 * lecteur Vidzy (résolu par identifiant TMDB) **et** les iframes bruts exposés
 * par le fournisseur (vidzy.live, luluvido, uqload, voe…). On les normalise en
 * une liste plate de `PlayerSource` puis le composant `SourcePlayer` laisse
 * l'utilisateur choisir langue / saison / épisode / hébergeur.
 */

import { vidzyMovieUrl, vidzySeriesUrl, type CatalogPlayback } from "./vidzy";

/** Identifiant d'hébergeur de notre lecteur TMDB (distinct des slugs fournisseur). */
export const VIDZY_HOST = "vidzy-org";

/** Une source lisible : un iframe précis pour un couple (langue, saison, épisode). */
export interface PlayerSource {
  /** Identifiant stable de l'hébergeur (« vidzy-org », « ext:luluvid »…). */
  host: string;
  /** Libellé affiché (nom de domaine de l'hébergeur, ou « Vidzy »). */
  label: string;
  /** Langue normalisée : « vf », « vostfr », « vo »… */
  lang: string;
  /** Saison (≥ 1). Les catalogues « à plat » du fournisseur sont ramenés à 1. */
  season: number;
  /** Épisode (≥ 1). */
  episode: number;
  /** URL d'embed (iframe). */
  url: string;
}

/** Sélection de lecture courante, portée par l'URL. */
export interface PlayerSelection {
  host?: string | null;
  lang?: string | null;
  season?: number | null;
  episode?: number | null;
}

/** Libellé lisible d'un hébergeur : son domaine, sinon son slug. */
function hostLabel(host: string, url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return host;
  }
}

/** Sources Vidzy (TMDB) : une entrée par langue × saison × épisode. */
export function vidzySources(playback: CatalogPlayback): PlayerSource[] {
  const langs = playback.languages.length > 0 ? playback.languages : ["vf"];

  if (playback.kind === "movie") {
    return langs.map((lang) => ({
      host: VIDZY_HOST,
      label: "Vidzy",
      lang,
      season: 1,
      episode: 1,
      url: vidzyMovieUrl(playback.tmdbId, { lang }),
    }));
  }

  const seasons = playback.seasons.length > 0 ? playback.seasons : [{ season: 1, episodes: [1] }];
  const sources: PlayerSource[] = [];
  for (const s of seasons) {
    const episodes = s.episodes.length > 0 ? s.episodes : [1];
    for (const lang of langs) {
      for (const episode of episodes) {
        sources.push({
          host: VIDZY_HOST,
          label: "Vidzy",
          lang,
          season: s.season,
          episode,
          url: vidzySeriesUrl(playback.tmdbId, s.season, episode, { lang, autonext: true }),
        });
      }
    }
  }
  return sources;
}

/** Sources du fournisseur (iframes bruts) → une entrée par flux. */
export function providerSources(
  streams: { lang: string; episode: number; host: string; url: string }[],
  season = 1,
): PlayerSource[] {
  return streams.map((s) => ({
    host: `ext:${s.host}`,
    label: hostLabel(s.host, s.url),
    lang: s.lang,
    season,
    episode: s.episode > 0 ? s.episode : 1,
    url: s.url,
  }));
}
