import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { getCheckoutClient, getPaymentCurrency, isPremiumPlan, PREMIUM_PLANS, toAscii } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Initiation du paiement du Pass Premium (MeSomb Checkout).
 *
 * Crée une session de paiement hébergée puis enregistre un `Payment` en attente.
 * La validation n'intervient qu'après confirmation du prestataire (webhook ou
 * vérification serveur) — jamais sur le simple retour navigateur.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const plan = body?.plan;

    if (!isPremiumPlan(plan)) {
      return NextResponse.json({ error: "Formule d'abonnement invalide." }, { status: 400 });
    }

    const { amount, label } = PREMIUM_PLANS[plan];
    const currency = getPaymentCurrency();
    const appUrl = getAppUrl();

    const [firstName, ...lastNameParts] = (user.name || "").trim().split(/\s+/);
    const firstNameAscii = toAscii(firstName || "");
    const lastNameAscii = toAscii(lastNameParts.join(" "));

    const client = getCheckoutClient();
    const session = await client.create({
      amount,
      currency,
      // Le pays/devise du compte MeSomb peut différer de la devise d'affichage
      // (ex. compte XAF, collecte XOF à parité) : on autorise la conversion.
      conversion: true,
      description: toAscii(`${label} - acces integral au catalogue`),
      success_url: `${appUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/premium/cancel`,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      call_to_action: "subscribe",
      customer: {
        email: user.email,
        first_name: firstNameAscii || undefined,
        last_name: lastNameAscii || undefined,
      },
    });

    if (!session.url) {
      console.error("MeSomb : session de paiement sans URL", session.getData());
      return NextResponse.json(
        { error: "Le prestataire n'a pas retourné de lien de paiement." },
        { status: 502 }
      );
    }

    // Trace locale en attente : le webhook retrouvera la ligne via providerRef.
    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: "MESOMB",
        providerRef: session.id,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        plan,
        rawPayload: { sessionId: session.id, plan, status: session.status },
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id, provider: "MESOMB" });
  } catch (error) {
    console.error("Erreur initiation paiement MeSomb :", error);
    return NextResponse.json(
      { error: "Impossible d'initier le paiement. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
