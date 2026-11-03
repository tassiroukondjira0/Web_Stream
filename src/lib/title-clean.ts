/**
 * Nettoie un titre d'affichage en supprimant les préfixes/suffixes de type
 * (Film, Série, Animé, Movie, Series, Anime…) et les marqueurs de saison/épisode
 * ou de qualité/langue (VF, VOSTFR, HD…).
 *
 * Exemples :
 *   "Film - Inception" → "Inception"
 *   "Série - Breaking Bad - Saison 1" → "Breaking Bad"
 *   "Animé - Naruto - Épisode 5" → "Naruto"
 *   "Inception - VF" → "Inception"
 *   null/undefined → ""
 */
export function cleanTitle(title: string | null | undefined): string {
  if (!title) return '';

  let cleaned = title.trim();

  // Préfixes de type : "Film - ", "Série - ", "Animé - ", "Movie: ", etc.
  cleaned = cleaned.replace(
    /^(film|movie|série|serie|sér|anime|animé)\s*[-:–—]\s*/i,
    ''
  );

  // Suffixes de saison : " - Saison 1", " - Saison 2", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*saison\s*\d+.*$/i, '');

  // Suffixes d'épisode : " - Épisode 5", " - Episode 5", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*épisode\s*\d+.*$/i, '');
  cleaned = cleaned.replace(/\s*[-–—]\s*episode\s*\d+.*$/i, '');

  // Suffixes de qualité / langue : " - VF", " - VOSTFR", " - HD", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*(vf|vostfr|hd|french|vo)\s*$/i, '');

  return cleaned.trim();
}

/**
 * Convertit un slug de favori en titre lisible quand le titleMap ne fournit pas de titre.
 * Exemple : "tmdb-movie-15139014" → "15139014" (fallback, mieux que le slug brut)
 */
export function slugToFallbackTitle(slug: string): string {
  const m = slug.match(/^(?:partner|frenchmanga|tmdb|fstreamtv)-(?:movie|series|anime)-(.+)$/i);
  if (m) {
    return m[1].replace(/[-_]/g, ' ').trim();
  }
  return slug;
}