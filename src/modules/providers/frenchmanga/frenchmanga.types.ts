/**
 * Types du fournisseur French-Manga (site DLE `french-manga.net`, la source
 * mangas référencée par french-stream). Contenu synchronisé en base
 * (ProviderAsset, provider « FRENCHMANGA », contentType ANIME) ; la fiche et
 * la lecture interrogent l'API JSON du site à la demande.
 */

/** Élément du catalogue (une vignette `.short` de la catégorie mangas). */
export interface FrenchMangaItem {
  /** Identifiant DLE du titre (`?newsid=ID`). */
  externalId: string;
  title: string;
  posterUrl: string | null;
  /** Version affichée : « VF », « VOSTFR », … (facultatif). */
  version: string | null;
  /** Nombre total d'épisodes annoncé par la vignette (« 1 / 13 »). */
  totalEpisodes: number | null;
}

/** Un flux de lecture (langue + épisode + hôte + URL d'embed). */
export interface FrenchMangaStream {
  /** Langue normalisée : « vf » ou « vostfr ». */
  lang: string;
  episode: number;
  /** Slug de l'hébergeur (vidzy, luvid, …). */
  host: string;
  /** URL d'embed (iframe) — jamais un flux vidéo direct. */
  url: string;
}

/** Détail d'un titre : flux de lecture regroupés + titres alternatifs. */
export interface FrenchMangaDetail {
  externalId: string;
  title: string;
  altTitles: Record<string, string>;
  streams: FrenchMangaStream[];
}
