/**
 * Types du fournisseur partenaire (catalogue externe).
 *
 * Films : embeds exposés sur la fiche (`data-url`).
 * Séries : épisodes × langues × hôtes via l'API JSON du fournisseur.
 */

export interface PartnerItem {
  externalId: string;
  title: string;
  posterUrl: string | null;
  /** Version affichée (VF, VOSTFR, French…). */
  version: string | null;
  /** Nombre d'épisodes si annoncé par la vignette. */
  totalEpisodes: number | null;
}

export interface PartnerStream {
  /** Langue normalisée : « vf », « vostfr », « vo ». */
  lang: string;
  episode: number;
  /** Slug de l'hébergeur (vidzy, uqload, netu, voe, premium…). */
  host: string;
  /** URL d'embed (iframe). */
  url: string;
}

export interface PartnerMovieEmbed {
  /** Nom d'hôte déduit de l'URL d'embed fournie par le partenaire. */
  host: string;
  /** URL d'embed. */
  url: string;
}

export interface PartnerEpisodeInfo {
  title: string | null;
  synopsis: string | null;
  poster: string | null;
}

export interface PartnerDetail {
  externalId: string;
  streams: PartnerStream[];
  /** Métadonnées par numéro d'épisode. */
  info: Record<number, PartnerEpisodeInfo>;
}
