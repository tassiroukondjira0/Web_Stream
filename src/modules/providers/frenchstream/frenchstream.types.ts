/**
 * Types du fournisseur FrenchStream (french-stream.net).
 *
 * Films : un seul lecteur (embed) exposé sur la fiche (`data-url`).
 * Séries : épisodes × langues × hôtes via `/ep-data.php?id=`.
 */

export interface FrenchStreamItem {
  externalId: string;
  title: string;
  posterUrl: string | null;
  /** Version affichée (VF, VOSTFR, French…). */
  version: string | null;
  /** Nombre d'épisodes si annoncé par la vignette. */
  totalEpisodes: number | null;
}

export interface FrenchStreamStream {
  /** Langue normalisée : « vf », « vostfr », « vo ». */
  lang: string;
  episode: number;
  /** Slug de l'hébergeur (vidzy, uqload, netu, voe, premium…). */
  host: string;
  /** URL d'embed (iframe). */
  url: string;
}

export interface FrenchStreamEpisodeInfo {
  title: string | null;
  synopsis: string | null;
  poster: string | null;
}

export interface FrenchStreamDetail {
  externalId: string;
  streams: FrenchStreamStream[];
  /** Métadonnées par numéro d'épisode. */
  info: Record<number, FrenchStreamEpisodeInfo>;
}
