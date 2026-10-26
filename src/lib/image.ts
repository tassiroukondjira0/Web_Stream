/** Optimize local assets and TMDB posters; keep arbitrary catalog URLs direct. */
export function shouldOptimizeImage(src: string): boolean {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname === "image.tmdb.org" &&
      url.pathname.startsWith("/t/p/")
    );
  } catch {
    return false;
  }
}
