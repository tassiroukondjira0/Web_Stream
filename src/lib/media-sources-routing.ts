export function shouldResolveTmdbSources(id: string, provider: string): boolean {
  return provider.toUpperCase() === "TMDB" && id.trim().length > 0;
}