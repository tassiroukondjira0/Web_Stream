export type MediaContentType = "MOVIE" | "SERIES" | "ANIME";
export type PlaybackMediaType = "movie" | "tv";

export function normalizeMediaContentType(rawType: string | null): MediaContentType {
  const type = (rawType || "movie").trim().toUpperCase();
  if (type === "ANIME") return "ANIME";
  return type === "SERIES" || type === "TV" ? "SERIES" : "MOVIE";
}

export function isEpisodicContentType(type: MediaContentType): boolean {
  return type !== "MOVIE";
}

export function toPlaybackMediaType(type: MediaContentType): PlaybackMediaType {
  return isEpisodicContentType(type) ? "tv" : "movie";
}