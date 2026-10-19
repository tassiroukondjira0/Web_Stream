import { notFound } from "next/navigation";
import { getMediaBySlug } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HlsVideo } from "@/components/HlsVideo";

// Cette page sert de player dans une iframe : elle dépend de données runtime
// (base de données + session). `instant: false` autorise le rendu bloquant
// (dynamic rendering) et évite le prerendering statique. Compatible avec
// `cacheComponents: true` dans next.config.ts.
export const instant = false;

export default async function VideoEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ episode?: string; season?: string }>;
}) {
  const { slug } = await params;
  const { episode: episodeParam, season: seasonParam } = (await searchParams) ?? {};
  const media = await getMediaBySlug(slug);

  if (!media) {
    notFound();
  }

  // 1. Droits expirés
  if (media.rightsValidUntil && new Date(media.rightsValidUntil) < new Date()) {
    return (
      <div
        style={{
          margin: 0,
          background: "#000",
          color: "#fff",
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          textAlign: "center",
          padding: "16px",
        }}
      >
        Les droits de diffusion de cette œuvre ont expiré.
      </div>
    );
  }

  const episodeNumber = Number.parseInt(episodeParam ?? "", 10);
  const seasonNumber = Number.parseInt(seasonParam ?? "", 10);
  const episode =
    Number.isSafeInteger(episodeNumber) && episodeNumber > 0
      ? await prisma.episode.findFirst({
          where: {
            episodeNumber,
            season: {
              mediaId: media.id,
              ...(Number.isSafeInteger(seasonNumber) && seasonNumber > 0
                ? { seasonNumber }
                : {}),
            },
          },
          select: { videoUrl: true, accessLevel: true },
        })
      : null;

  // 2. Contrôle d'accès Premium
  const user = await getCurrentUser().catch(() => null);
  if (
    (media.accessLevel === "PREMIUM" || episode?.accessLevel === "PREMIUM") &&
    (!user || (user.role !== "SUBSCRIBER" && user.role !== "ADMIN"))
  ) {
    return (
      <div
        style={{
          margin: 0,
          background: "#000",
          color: "#fff",
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          textAlign: "center",
          padding: "16px",
        }}
      >
        Accès Premium requis pour visionner ce contenu.
      </div>
    );
  }

  // Une URL d'épisode est obligatoire dès qu'un épisode est sélectionné :
  // ne pas démarrer accidentellement la vidéo d'un autre contenu.
  const playbackUrl = episodeParam
    ? episode?.videoUrl || ""
    : media.videoUrl || "";

  if (!playbackUrl) {
    return (
      <div
        style={{
          margin: 0,
          background: "#000",
          color: "#fff",
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          textAlign: "center",
          padding: "16px",
        }}
      >
        Aucune URL de lecture disponible.
      </div>
    );
  }

  return (
    <div
      style={{
        margin: 0,
        background: "#000",
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <HlsVideo src={playbackUrl} poster={media.posterUrl || undefined} title={media.title} />
    </div>
  );
}
