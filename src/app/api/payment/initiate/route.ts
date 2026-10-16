import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import {
  createPremiumInvoice,
  getChannelsForSelection,
  getCurrencyForCountry,
  getPaymentCurrency,
  isPremiumPlan,
  PAYMENT_CHANNELS_BY_COUNTRY,
  PREMIUM_PLANS,
  type CountryCode,
  type PaymentMethod,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";

/**
 * Initiation du paiement du Pass Premium (PayDunya Checkout hébergé).
 *
 * Crée une facture de paiement hébergée puis enregistre un `Payment` en attente.
 * La validation n'intervient qu'après confirmation du prestataire (IPN ou
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
    const country = body?.country;
    const paymentMethod = body?.paymentMethod;

    if (!isPremiumPlan(plan)) {
      return NextResponse.json({ error: "Formule d'abonnement invalide." }, { status: 400 });
    }

    // Validation optionnelle du pays : si fourni, doit être un code supporté.
    const countryCode = country ? (country as CountryCode) : undefined;
    if (countryCode && !(countryCode in PAYMENT_CHANNELS_BY_COUNTRY)) {
      return NextResponse.json({ error: "Pays non supporté pour le paiement." }, { status: 400 });
    }

    const { amount, label } = PREMIUM_PLANS[plan];
    const currency = countryCode ? getCurrencyForCountry(countryCode) : getPaymentCurrency();
    const appUrl = getAppUrl();

    // Canaux PayDunya à forcer sur la facture selon le pays et le moyen choisi.
    // Quand aucun moyen n'est précisé, tous les canaux disponibles pour le pays sont transmis.
    let channels =
      countryCode && paymentMethod
        ? getChannelsForSelection(countryCode, paymentMethod as PaymentMethod)
        : countryCode
          ? getChannelsForSelection(countryCode)
          : undefined;

    // Ne jamais envoyer un tableau vide à PayDunya (cela pourrait faire échouer la création).
    if (channels?.length === 0) {
      channels = undefined;
    }

    const invoice = await createPremiumInvoice({
      amount,
      description: `${label} - acces integral au catalogue`,
      returnUrl: `${appUrl}/premium/success`,
      cancelUrl: `${appUrl}/premium/cancel`,
      callbackUrl: `${appUrl}/api/payment/webhook`,
      customData: { userId: user.id, plan, country: countryCode, paymentMethod },
      channels,
      customer: {
        name: user.name || undefined,
        email: user.email,
      },
    });

    // Trace locale en attente : l'IPN (ou la vérification) retrouvera la ligne
    // via providerRef (token de facture PayDunya).
    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: "PAYDUNYA",
        providerRef: invoice.token,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        plan,
        rawPayload: {
          token: invoice.token,
          plan,
          provider: "PAYDUNYA",
          country: countryCode,
          paymentMethod,
          channels,
        },
      },
    });

    return NextResponse.json({ url: invoice.url, sessionId: invoice.token, provider: "PAYDUNYA", country: countryCode, paymentMethod });
  } catch (error) {
    console.error("Erreur initiation paiement PayDunya :", error);
    return NextResponse.json(
      { error: "Impossible d'initier le paiement. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
