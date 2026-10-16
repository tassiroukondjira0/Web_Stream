/**
 * Clé de déduplication d'un titre de catalogue.
 *
 * Deux fournisseurs nomment rarement un même titre à l'identique : suffixes de
 * saison, de langue, de qualité, année entre parenthèses, accents, ponctuation.
 * `normalizeTitleKey` ramène un titre à une forme canonique comparable pour
 * détecter les doublons entre catalogues (voir modules/providers/tmdb/dedupe.ts).
 */

export function normalizeTitleKey(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/\s*[-–—]\s*saison\s*\d+.*$/i, "")
    .replace(/\s*\(?\bsaison\s*\d+\b\)?.*$/i, "")
    .replace(/\s*[-–—]\s*(vf|vostfr|vo|truefrench|french|multi|hd|fhd|4k|1080p|720p)\b.*$/i, "")
    .replace(/\s*[(\[]((?:19|20)\d{2})[)\]]\s*$/i, "")
    .replace(/\s+\b(?:19|20)\d{2}\s*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
