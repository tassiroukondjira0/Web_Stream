/**
 * Types du catalogue local.
 * Ce fichier est sûr pour les composants client-side ("use client").
 */

export interface MediaItem {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  type: "MOVIE" | "SERIES";
  accessLevel: "FREE" | "PREMIUM";
  releaseYear: number;
  durationMinutes: number | null;
  posterUrl: string;
  backdropUrl: string;
  videoUrl?: string;
  episodeSources?: {
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    videoUrl: string;
  }[];
  isPublished: boolean;
  rightsValidUntil: string;
  categories: { name: string; slug: string }[];
}
