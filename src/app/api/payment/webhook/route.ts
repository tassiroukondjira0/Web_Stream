import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPaymentCurrency, isPremiumPlan, activatePremium } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Webhook de paiement MeSomb (CDC §13).
 *
 * Critère : "Une transaction n'est validée qu'après confirmation du prestataire".
 *
 * Sécurité :
 *  - vérification de la signature `X-MeSomb-Webhook-Signature` (HMAC-SHA256 du
 *    corps brut préfixé de l'horodatage, comparaison à temps constant) ;
 *  - rejet des horodatages trop anciens (anti-rejeu) ;
 *  - idempotence via `PaymentEvent.eventRef` (unique).
 */

const TIMESTAMP_TOLERANCE_SECONDS = 300;

/** Vérifie la signature HMAC-SHA256 au format `t=<ts>,v1=<hex>`. */
function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signaturePart = parts.find((part) => part.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const received = signaturePart.slice(3);
  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

/** Un événement est finalisé s'il signale un succès de paiement. */
function isSuccessfulEvent(eventType: string, status: string): boolean {
  const normalizedType = eventType.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus) {
    if (["succeeded", "success", "completed", "complete", "paid"].includes(normalizedStatus)) {
      return true;
    }
    if (["pending", "processing", "failed", "canceled", "cancelled", "expired"].includes(normalizedStatus)) {
      return false;
    }
  }

  return (
    normalizedType.includes("succeeded") ||
    normalizedType.includes("success") ||
    normalizedType.includes("completed")
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const secret = process.env.MESOMB_WEBHOOK_SECRET?.trim();
    const signatureHeader = request.headers.get("x-mesomb-webhook-signature");

    if (secret) {
      if (!signatureHeader || !verifySignature(rawBody, signatureHeader, secret)) {
        return NextResponse.json({ error: "Signature de webhook invalide." }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("MESOMB_WEBHOOK_SECRET manquant : webhook refusé en production.");
      return NextResponse.json({ error: "Configuration de paiement incomplète." }, { status: 500 });
    } else {
      console.warn("⚠️ MESOMB_WEBHOOK_SECRET absent : signature non vérifiée (développement).");
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const eventId = (request.headers.get("x-mesomb-webhook-event-id") || payload.id) as string | undefined;
    const eventType = String(payload.event_type || payload.type || "");
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const object = (data.object ?? {}) as Record<string, unknown>;
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;

    const status = String(object.status || payload.status || "");
    const providerRef = String(object.id || object.reference || "");
    const currency = (object.currency as string | undefined) || getPaymentCurrency();
    const amount =
      typeof object.amount === "number" ? object.amount : object.amount ? Number(object.amount) : null;

    if (!isSuccessfulEvent(eventType, status)) {
      return NextResponse.json(
        { received: true, status: "ignored", message: "Événement non finalisé ignoré." },
        { status: 200 }
      );
    }

    // Retrouve la ligne en attente créée à l'initiation.
    const payment = providerRef
      ? await prisma.payment.findUnique({ where: { providerRef } })
      : null;

    const userId = payment?.userId || (metadata.userId as string | undefined) || (object.client_reference_id as string | undefined);
    const planCandidate = payment?.plan || metadata.plan;

    if (!userId || !isPremiumPlan(planCandidate)) {
      return NextResponse.json(
        { error: "Paiement non reconnu (utilisateur ou formule introuvable)." },
        { status: 400 }
      );
    }

    const { activated, alreadyProcessed } = await activatePremium({
      providerRef: payment?.providerRef || providerRef || `mesomb_${eventId}`,
      eventRef: eventId || `mesomb_${providerRef}`,
      eventType: eventType || "payment.succeeded",
      userId,
      plan: planCandidate,
      amount,
      currency,
      rawPayload: object,
    });

    console.log(
      `💳 [MESOMB] ${eventType} — user ${userId} (${planCandidate}) — ${
        activated ? "ACTIVÉ" : alreadyProcessed ? "déjà traité" : "ignoré"
      }`
    );

    return NextResponse.json({
      received: true,
      status: activated ? "ACTIVATED" : alreadyProcessed ? "ALREADY_PROCESSED" : "OK",
    });
  } catch (error) {
    console.error("Erreur webhook paiement :", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
