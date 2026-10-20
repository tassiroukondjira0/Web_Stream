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

/** Libellé lisible d'un hébergeur : son slug partenaire capitalisé, sinon son domaine. */
function hostLabel(host: string, url: string): string {
  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  // Slugs sémantiques du partenaire (« premium », « voe », « uqload »…) : on
  // affiche le nom plutôt que le domaine. Le slug « vidzy » devient son
  // domaine pour le distinguer de notre lecteur Vidzy hébergé (« Vidzy »).
  if (!host.includes(".")) {
    if (host.toLowerCase().startsWith("vidzy")) return hostname ?? "Vidzy";
    return host.charAt(0).toUpperCase() + host.slice(1);
  }
  return hostname ?? host;
}

/** Sources Vidzy (TMDB) : une entrée par langue × saison × épisode.
 *
 * Les URLs passent par notre proxy `/api/embed` qui injecte le token `gk`
 * (obtenu côté serveur avec des param whitelistés) dans le HTML d'embed.
 * Sans ce token, le CDN Vidzy rejette les segments HLS après ~90 s de grâce
 * et la lecture stalle. */
export function vidzySources(playback: CatalogPlayback): PlayerSource[] {
  const langs = playback.languages.length > 0 ? playback.languages : ["vf"];

  if (playback.kind === "movie") {
    return langs.map((lang) => ({
      host: VIDZY_HOST,
      label: "Vidzy",
      lang,
      season: 1,
      episode: 1,
      url: proxiedVidzyUrl(vidzyMovieUrl(playback.tmdbId, { lang })),
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
          url: proxiedVidzyUrl(
            vidzySeriesUrl(playback.tmdbId, s.season, episode, { lang, autonext: true }),
          ),
        });
      }
    }
  }
  return sources;
}

/**
 * Enveloppe une URL wrapper Vidzy dans notre proxy `/api/embed?src=…`.
 * Le proxy récupère le HTML d'embed et y injecte le token `gk`.
 */
function proxiedVidzyUrl(wrapperUrl: string): string {
  return `/api/embed?src=${encodeURIComponent(wrapperUrl)}`;
}

/** Sources du fournisseur (iframes bruts) → une entrée par flux.
 *
 * Les embeds Vidzy exposés par le partenaire (vidzy.cc, vidzy.live…) subissent
 * le même problème de token `gk` : ils passent aussi par `/api/embed`. */
export function providerSources(
  streams: { lang: string; episode: number; host: string; url: string }[],
  season = 1,
  provider?: "frenchstream" | "frenchmanga",
): PlayerSource[] {
  return streams.map((s) => ({
    host: `ext:${provider ? `${provider}:` : ""}${s.host}`,
    label: hostLabel(s.host, s.url),
    lang: s.lang,
    season,
    episode: s.episode > 0 ? s.episode : 1,
    url: isVidzyUrl(s.url) ? proxiedVidzyUrl(s.url) : s.url,
  }));
}

/** Vrai si l'URL pointe vers un domaine Vidzy (vidzy.org, vidzy.cc…). */
function isVidzyUrl(url: string): boolean {
  try {
    return /(^|\.)vidzy\./i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
