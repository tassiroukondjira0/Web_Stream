import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { PREMIUM_PLANS, isPremiumPlan, type CountryCode } from "@/lib/payments";
import { createPayPalOrder } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

const PAYPAL_AMOUNTS: Record<string, { MONTHLY: number; YEARLY: number; currency: string }> = {
  MA: { MONTHLY: 350, YEARLY: 3500, currency: "EUR" },
  FR: { MONTHLY: 350, YEARLY: 3500, currency: "EUR" },
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const plan = body?.plan;
    const country = body?.country as CountryCode;
    if (!isPremiumPlan(plan)) return NextResponse.json({ error: "Formule invalide." }, { status: 400 });
    if (!country || !(country in PAYPAL_AMOUNTS)) return NextResponse.json({ error: "Pays non supporté PayPal." }, { status: 400 });

    const cfg = PAYPAL_AMOUNTS[country];
    const amount = cfg[plan as "MONTHLY" | "YEARLY"];
    const currency = cfg.currency;
    const appUrl = getAppUrl();

    const { orderId, approvalUrl } = await createPayPalOrder({
      amount,
      currency,
      description: `Abonnement Premium ${plan === "MONTHLY" ? "Mensuel" : "Annuel"}`,
      returnUrl: `${appUrl}/premium/success?provider=paypal`,
      cancelUrl: `${appUrl}/premium/cancel`,
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: "PAYPAL",
        providerRef: orderId,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        plan,
        rawPayload: { orderId, plan, country, provider: "PAYPAL" },
      },
    });

    return NextResponse.json({ url: approvalUrl, orderId, provider: "PAYPAL" });
  } catch (error) {
    console.error("Erreur PayPal create-order :", error);
    const message = error instanceof Error ? error.message : "Impossible d'initier le paiement PayPal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}