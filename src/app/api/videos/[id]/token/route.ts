import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMediaBySlug } from "@/lib/catalog";

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

    return NextResponse.json({
      success: true,
      playbackUrl: media.videoUrl || "",
    });
  } catch (error) {
    console.error("Erreur délivrance token :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Erreur serveur." }, { status: 500 });
  }
}
