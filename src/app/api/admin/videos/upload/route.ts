import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBunnyUploadSession } from "@/lib/bunny-stream";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { title = "Sans titre", fileSizeBytes = 0 } = body as {
      title?: string;
      fileSizeBytes?: number;
    };

    // ── Bunny.net Stream : création de la vidéo + session d'upload TUS ──────
    if (process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY) {
      try {
        const session = await createBunnyUploadSession(title, fileSizeBytes);
        return NextResponse.json({
          success: true,
          provider: "bunny",
          videoId: session.videoId,          // → à stocker dans media.videoStreamId
          uploadUrl: session.uploadUrl,       // → URL TUS à utiliser côté client
          // Headers TUS requis côté client (à inclure dans toutes les requêtes TUS) :
          tusHeaders: {
            "Tus-Resumable": "1.0.0",
            "Content-Type": "application/offset+octet-stream",
          },
          // Pour l'upload TUS Bunny, le client doit aussi envoyer dans chaque requête :
          // AuthorizationSignature, AuthorizationExpire, VideoId, LibraryId
          // Ces valeurs sont à récupérer séparément ou calculées côté client.
          message: "Session de téléversement Bunny.net initialisée.",
        });
      } catch (bunnyError) {
        console.error("Erreur création vidéo Bunny :", bunnyError);
        // On passe au fallback si Bunny échoue
      }
    }

    // ── Fallback développement local ─────────────────────────────────────────
    const mockId = `bunny-mock-${Date.now()}`;
    return NextResponse.json({
      success: true,
      provider: "mock",
      videoId: mockId,
      uploadUrl: `https://video.bunnycdn.com/tusupload`,
      message: "Mode développement : configurez BUNNY_STREAM_LIBRARY_ID et BUNNY_STREAM_API_KEY dans .env",
    });
  } catch (error) {
    console.error("Erreur direct upload :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
