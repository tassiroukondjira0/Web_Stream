/**
 * Catalogue local — point d'entrée unifié.
 *
 * Les types sont dans `catalog.types.ts` (sûrs pour les composants client-side).
 * Les requêtes base de données sont dans `catalog.server.ts` (réservé au serveur).
 */

// Types — sûrs pour le client
export type { MediaItem } from "./catalog.types";

// Fonctions de requête base de données — serveur uniquement
export { getAllMedias, getMediaBySlug, getSimilarMedias } from "./catalog.server";
