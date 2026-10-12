import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { maxDurationSeconds = 7200 } = await request.json().catch(() => ({}));

    // En environnement de production avec credentials Cloudflare configurés :
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN) {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxDurationSeconds,
            requireSignedURLs: true,
          }),
        }
      );

      const cfData = await cfRes.json();
      if (cfData.success) {
        return NextResponse.json({
          uploadUrl: cfData.result.uploadURL,
          videoUid: cfData.result.uid,
        });
      }
    }

    // Fallback environnement local de développement
    const mockUid = `stream-${Date.now()}`;
    return NextResponse.json({
      success: true,
      videoUid: mockUid,
      uploadUrl: `https://upload.videodemo.local/tus/${mockUid}`,
      message: "Session de téléversement direct initialisée.",
    });
  } catch (error) {
    console.error("Erreur direct upload :", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
