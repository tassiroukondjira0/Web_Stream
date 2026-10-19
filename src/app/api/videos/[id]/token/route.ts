import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMediaBySlug } from "@/lib/catalog";
import { generateCloudflareSignedToken, buildPlaybackUrl } from "@/lib/cloudflare-stream";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { id: slug } = await params;
    const media = await getMediaBySlug(slug);

    if (!media) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Média introuvable." }, { status: 404 });
    }

    // 1. Vérification des droits d'exploitation (Section 13 : Une œuvre expirée ne peut plus être visionnée)
    if (media.rightsValidUntil && new Date(media.rightsValidUntil) < new Date()) {
      return NextResponse.json(
        { error: "RIGHTS_EXPIRED", message: "Les droits de diffusion de cette œuvre ont expiré." },
        { status: 403 }
      );
    }

    // 2. Vérification des accès Freemium
    const user = await getCurrentUser();

    if (media.accessLevel === "PREMIUM") {
      if (!user) {
        return NextResponse.json(
          { error: "AUTH_REQUIRED", message: "Vous devez être connecté pour visionner ce contenu exclusif." },
          { status: 401 }
        );
      }

      if (user.role !== "SUBSCRIBER" && user.role !== "ADMIN") {
        return NextResponse.json(
          {
            error: "SUBSCRIPTION_REQUIRED",
            message: "Ce film fait partie du catalogue Premium. Veuillez souscrire au pass pour y accéder.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Délivrance de l'autorisation de lecture.
    //    Le catalogue est servi par un lecteur externe : on retourne
    //    simplement la videoUrl associée au média.
    // 3. Délivrance de l'URL de lecture.
    //    Résout le manifest HLS Cloudflare Stream à partir de l'UID
    //    vidéo (videoStreamId) via un jeton signé, conformément au
    //    pipeline Cloudflare Stream (SPECIFICATION_TECHNIQUE.md).
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

    return NextResponse.json({
      success: true,
      videoStreamId: media.videoStreamId,
      playbackUrl,
    });
  } catch (error) {
    console.error("Erreur délivrance token :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Erreur serveur." }, { status: 500 });
  }
}
