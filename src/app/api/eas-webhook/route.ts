import { NextResponse } from "next/server";

/**
 * Webhook EAS Build — reçoit les notifications après chaque build.
 *
 * Quand un build Android est terminé avec succès, EAS envoie un POST vers cette URL.
 * Le payload contient le `buildId` et l'`artifactUrl`. On stocke le buildId dans un
 * fichier JSON public que le bandeau AndroidAppBanner lit côté client.
 *
 * Configuration EAS :
 *   npx eas-cli webhook create --event BUILD --url https://web-stream-mncx.onrender.com/api/eas-webhook --secret <SECRET>
 *
 * Le secret doit être stocké dans la variable d'environnement `EAS_WEBHOOK_SECRET`.
 */

const BUILD_INFO_PATH = "./public/build-info.json";

export async function POST(request: Request) {
  try {
    const fs = await import("fs");
    const path = await import("path");

    // Lire le body une seule fois
    const bodyText = await request.text();
    const payload = JSON.parse(bodyText);

    // Vérifier la signature du webhook
    const signature = request.headers.get("expo-signature");
    const secret = process.env.EAS_WEBHOOK_SECRET;

    if (secret && signature) {
      const crypto = await import("crypto");
      const expected = crypto
        .createHmac("sha1", secret)
        .update(bodyText)
        .digest("hex");

      if (expected !== signature.replace("sha1=", "")) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Extraire les informations du build
    const {
      id: buildId,
      status,
      platform,
      artifactUrl,
    } = payload;

    // Ne traiter que les builds Android terminés avec succès
    if (status !== "finished" || platform !== "android") {
      return NextResponse.json(
        {
          message: `Ignored: status=${status}, platform=${platform}`,
        },
        { status: 200 }
      );
    }

    // Construire l'URL du build EAS
    const buildUrl = `https://expo.dev/accounts/tassirou/projects/cinemax-mobile/builds/${buildId}`;

    // Écrire les informations dans le fichier JSON public
    const buildInfo = {
      buildId,
      buildUrl,
      artifactUrl,
      platform,
      updatedAt: new Date().toISOString(),
    };

    const fullPath = path.resolve(process.cwd(), BUILD_INFO_PATH);
    fs.writeFileSync(fullPath, JSON.stringify(buildInfo, null, 2), "utf-8");

    console.log("[EAS Webhook] Build info updated:", buildInfo);

    return NextResponse.json(
      {
        success: true,
        message: "Build info updated successfully",
        buildUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[EAS Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
