/**
 * Catalogue externe synchronisé — point d'entrée unifié.
 *
 * Les types, constantes et fonctions pures sont dans `provider-catalog.types.ts`
 * (sûrs pour les composants client-side).
 * Les requêtes base de données sont dans `provider-catalog.server.ts`
 * (réservé au serveur).
 *
 * Ce fichier réexporte tout pour la rétrocompatibilité.
 */

// Types, constantes et fonctions pures — sûrs pour le client
export type {
  ProviderCatalogItem,
  ProviderCatalogPage,
  AssetFilters,
  FeaturedSelection,
} from "./provider-catalog.types";
export {
  providerItemHref,
  providerSlugHref,
  FEATURED_PERIOD_DAYS,
  getFeaturedPeriodIndex,
  seededShuffle,
  getAllCatalogCategories,
  resolveCategorySlug,
  CATALOG_LANGUAGES,
  CATALOG_THEMES,
  CATALOG_PLATFORMS,
} from "./provider-catalog.types";

// Fonctions de requête base de données — serveur uniquement
export {
  getPartnerMovies,
  getPartnerSeries,
  getPartnerAnimes,
  getLatestPartnerAssets,
  getTrendingPartnerMovies,
  getFeaturedPartner,
  searchPartnerAssets,
  getPartnerAssetById,
} from "./provider-catalog.server";
