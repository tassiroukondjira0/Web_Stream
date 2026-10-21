import { redirect } from "next/navigation";

/**
 * Les mangas French-Manga appartiennent à la section « Animes ». Cette route
 * conservée pour les liens hérités redirige vers la fiche animé correspondante.
 */

// Redirection à la demande : la route est dynamique, jamais pré-rendue.
export const instant = false;

export default async function LegacySeriesMangaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; season?: string; ep?: string; host?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.lang) query.set("lang", sp.lang);
  if (sp.season) query.set("season", sp.season);
  if (sp.ep) query.set("ep", sp.ep);
  if (sp.host) query.set("host", sp.host);
  const qs = query.toString();

  redirect(`/animes/frenchmanga/${id}${qs ? `?${qs}` : ""}`);
}
