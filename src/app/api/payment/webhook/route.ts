import crypto from "crypto";
import { NextResponse } from "next/server";
import { activatePremium, confirmInvoice, getPaydunyaHash, PREMIUM_PLANS, isPremiumPlan } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { readRequestBodyLimited } from "@/lib/request-body";

/**
 * IPN de paiement PayDunya (CDC §13).
 *
 * Critère : "Une transaction n'est validée qu'après confirmation du prestataire".
 *
 * Sécurité :
 *  - PayDunya POSTe un corps `application/x-www-form-urlencoded` contenant un
 *    champ `data` (JSON). Le champ `hash` vaut SHA-512 du Master Key : il prouve
 *    l'origine mais ne lie PAS le contenu (valeur statique). On ne s'y fie donc
 *    jamais pour le statut : l'IPN ne sert que de déclencheur.
 *  - Le statut autoritatif est TOUJOURS reconfirmé via `checkout-invoice/confirm`.
 *  - Idempotence via `PaymentEvent.eventRef` (unique).
 */

const SUCCESS_STATUS = "COMPLETED";

/** Extrait la facture (token + statut éventuel) du corps de l'IPN. */
function parseNotification(rawBody: string): Record<string, unknown> | null {
  // Cas standard PayDunya : form-urlencoded avec un champ `data` = JSON.
  const params = new URLSearchParams(rawBody);
  const dataField = params.get("data");
  if (dataField) {
    try {
      return JSON.parse(dataField) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  // Repli : certains environnements transmettent directement du JSON.
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Contrôle d'intégrité (facultatif) : le hash doit valoir SHA-512 du Master Key. */
function isAuthenticHash(hash: unknown, expected: string): boolean {
  if (typeof hash !== "string" || !/^[a-f0-9]{128}$/i.test(hash)) return false;
  const received = Buffer.from(hash.toLowerCase(), "ascii");
  const expectedBytes = Buffer.from(expected.toLowerCase(), "ascii");
  return received.length === expectedBytes.length && crypto.timingSafeEqual(received, expectedBytes);
}

export async function POST(request: Request) {
  try {
    const body = await readRequestBodyLimited(request, 32 * 1024);
    if (!body) return NextResponse.json({ error: "Notification trop volumineuse." }, { status: 413 });
    const rawBody = new TextDecoder().decode(body);
    const payload = parseNotification(rawBody);

    if (!payload) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const invoice = (payload.invoice ?? {}) as Record<string, unknown>;
    const token = typeof invoice.token === "string" ? invoice.token : undefined;

    if (!token) {
      return NextResponse.json({ error: "Facture introuvable dans la notification." }, { status: 400 });
    }

    // Contrôle d'origine (le statut reste reconfirmé ci-dessous).
    const masterKey = process.env.PAYDUNYA_MASTER_KEY?.trim();
    if (!masterKey) {
      console.error("PAYDUNYA_MASTER_KEY manquant : IPN refusé.");
      return NextResponse.json({ error: "Configuration de paiement incomplète." }, { status: 500 });
    }
    let expected = "";
    try {
      expected = getPaydunyaHash();
    } catch {
      expected = "";
    }
    if (!expected || !isAuthenticHash(payload.hash, expected)) {
      return NextResponse.json({ error: "Hash de notification invalide." }, { status: 401 });
    }

    // Statut autoritatif : on ne fait jamais confiance au corps de l'IPN.
    const confirmed = await confirmInvoice(token);

    if (confirmed.status !== SUCCESS_STATUS) {
      return NextResponse.json(
        { received: true, status: "ignored", message: "Paiement non finalisé ignoré." },
        { status: 200 }
      );
    }

    // Retrouve la ligne en attente créée à l'initiation.
    const payment = await prisma.payment.findUnique({ where: { providerRef: token } });

    if (!payment || payment.provider !== "PAYDUNYA" || !payment.userId) {
      return NextResponse.json(
        { error: "Aucun paiement PayDunya initié ne correspond à cette facture." },
        { status: 409 }
      );
    }
    if (!isPremiumPlan(payment.plan) || !["PENDING", "PAID"].includes(payment.status)) {
      return NextResponse.json({ error: "État du paiement non valide." }, { status: 409 });
    }
    const userId = payment.userId;
    const planCandidate = payment.plan;
    const expectedAmount = PREMIUM_PLANS[payment.plan].amount;
    if (
      confirmed.token !== token ||
      confirmed.amount == null ||
      payment.amount !== expectedAmount ||
      confirmed.amount !== expectedAmount ||
      confirmed.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      console.error("PayDunya invoice does not match the locally initiated payment.", { providerRef: token });
      return NextResponse.json({ error: "Montant ou devise du paiement invalide." }, { status: 409 });
    }

    const { activated, alreadyProcessed } = await activatePremium({
      providerRef: token,
      eventRef: `paydunya_${token}`,
      eventType: "invoice.completed",
      userId: payment.userId,
      plan: payment.plan,
      amount: confirmed.amount,
      currency: confirmed.currency,
      provider: "PAYDUNYA",
      rawPayload: confirmed.raw,
    });

    console.log(
      `💳 [PAYDUNYA] invoice.completed — user ${userId} (${planCandidate}) — ${
        activated ? "ACTIVÉ" : alreadyProcessed ? "déjà traité" : "ignoré"
      }`
    );

    return NextResponse.json({
      received: true,
      status: activated ? "ACTIVATED" : alreadyProcessed ? "ALREADY_PROCESSED" : "OK",
    });
  } catch (error) {
    console.error("Erreur IPN paiement PayDunya :", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
