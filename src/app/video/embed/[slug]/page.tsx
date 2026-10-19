import { notFound } from "next/navigation";
import { getMediaBySlug } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { generateCloudflareSignedToken, buildPlaybackUrl } from "@/lib/cloudflare-stream";

// Cette page sert de player dans une iframe : elle dépend de données runtime
// (base de données + session). `instant: false` autorise le rendu bloquant
// (dynamic rendering) et évite le prerendering statique. Compatible avec
// `cacheComponents: true` dans next.config.ts.
export const instant = false;

export default async function VideoEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  // 2. Contrôle d'accès Premium
  const user = await getCurrentUser().catch(() => null);
  if (
    media.accessLevel === "PREMIUM" &&
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

  // 3. Résolution de l'URL de lecture
  let playbackUrl = "";
  if (media.videoStreamId) {
    try {
      const token = await generateCloudflareSignedToken({
        videoUid: media.videoStreamId,
        userId: user?.id ?? "anonymous",
      });
      playbackUrl = buildPlaybackUrl(media.videoStreamId, token);
    } catch {
      // Cloudflare Stream non configuré : repli sur videoUrl si renseignée.
      playbackUrl = media.videoUrl || "";
    }
  } else {
    playbackUrl = media.videoUrl || "";
  }

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
      <video
        controls
        playsInline
        src={playbackUrl}
        poster={media.posterUrl || undefined}
        title={media.title}
        style={{ maxWidth: "100%", maxHeight: "100%", outline: "none" }}
      />
    </div>
  );
}
