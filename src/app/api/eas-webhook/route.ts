import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook EAS Build — reçoit les notifications après chaque build.
 *
 * Quand un build Android est terminé avec succès, EAS envoie un POST vers cette URL.
 * Le payload contient le `buildId` et les `artifacts`. On stocke les informations
 * dans la base de données (table `build_info`) que l'endpoint `/api/build-info`
 * sert au composant AndroidAppBanner.
 *
 * Configuration EAS :
 *   npx eas-cli webhook create --event BUILD --url https://web-stream-mncx.onrender.com/api/eas-webhook --secret <SECRET>
 *
 * Le secret doit être stocké dans la variable d'environnement `EAS_WEBHOOK_SECRET`.
 */

export async function POST(request: Request) {
  try {
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
    // Le payload EAS contient :
    // - id: le build ID
    // - status: "new", "in_progress", "finished", "errored"
    // - platform: "android" ou "ios"
    // - artifacts.applicationUrl: URL directe de l'APK/IPA
    // - artifacts.buildUrl: URL de la page de détails du build
    const {
      id: buildId,
      status,
      platform,
      artifacts,
    } = payload;

    // Ne traiter que les builds Android terminés avec succès
    // EAS peut envoyer "finished" ou "FINISHED" selon les versions
    const isFinished = status.toLowerCase() === "finished";
    const isAndroid = platform.toLowerCase() === "android";
    
    if (!isFinished || !isAndroid) {
      return NextResponse.json(
        {
          message: `Ignored: status=${status}, platform=${platform}`,
        },
        { status: 200 }
      );
    }

    // Extraire l'URL de l'APK depuis artifacts
    const artifactUrl = artifacts?.applicationUrl || artifacts?.buildUrl;
    if (!artifactUrl) {
      console.error("[EAS Webhook] No artifact URL found in payload");
      return NextResponse.json(
        { error: "No artifact URL in payload" },
        { status: 500 }
      );
    }

    // Construire l'URL du build EAS
    const buildUrl = `https://expo.dev/accounts/tassirou/projects/cinemax-mobile/builds/${buildId}`;

    // Stocker les informations dans la base de données
    // On utilise upsert pour mettre à jour si un enregistrement avec ce buildId existe déjà
    await prisma.buildInfo.upsert({
      where: { buildId },
      update: {
        buildUrl,
        artifactUrl,
        platform,
      },
      create: {
        buildId,
        buildUrl,
        artifactUrl,
        platform,
      },
    });

    console.log("[EAS Webhook] Build info saved to database:", { buildId, artifactUrl });

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
