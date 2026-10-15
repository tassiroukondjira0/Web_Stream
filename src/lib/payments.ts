import { CheckoutSessionOperation } from "@hachther/mesomb";
import { PaymentStatus, Prisma, Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Paiements du Pass Premium via MeSomb (agrégateur Mobile Money :
 * Wave, Orange Money, MTN MoMo, Moov, Airtel...).
 *
 * Principe (CDC §13) : une transaction n'est validée qu'après confirmation du
 * prestataire. La confirmation arrive par webhook signé (`/api/payment/webhook`)
 * ou, à défaut, par vérification serveur du statut de la session
 * (`/api/payment/verify`). Jamais depuis le retour navigateur seul.
 */

export type PremiumPlan = "MONTHLY" | "YEARLY";

/** Tarifs du Pass Premium (montants en unités mineures XOF, exposant 0). */
export const PREMIUM_PLANS: Record<PremiumPlan, { amount: number; label: string; months: number }> = {
  MONTHLY: { amount: 2500, label: "Abonnement Mensuel", months: 1 },
  YEARLY: { amount: 25000, label: "Abonnement Annuel", months: 12 },
};

export function isPremiumPlan(value: unknown): value is PremiumPlan {
  return value === "MONTHLY" || value === "YEARLY";
}

/**
 * MeSomb n'accepte que de l'ASCII dans le corps signé du Checkout.
 *
 * Le prestataire (Django) recalcule le hash du payload sur une forme ré-encodée
 * en ASCII ; tout caractère non-ASCII (accents, tiret cadratin « — », apostrophes
 * typographiques…) fait diverger la signature et renvoie « Mauvaise signature ».
 * On translittère donc toute chaîne envoyée dans le corps de la requête.
 */
export function toAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} est requis pour les paiements MeSomb. Renseignez-le dans .env (voir business.mesomb.com).`
    );
  }
  return value.trim();
}

/** Devise de collecte configurée pour le compte MeSomb. */
export function getPaymentCurrency(): string {
  return process.env.MESOMB_CURRENCY?.trim() || "XOF";
}

/**
 * Client MeSomb pour les sessions de paiement hébergées (Checkout).
 * Le SDK gère la signature HMAC de chaque requête.
 */
export function getCheckoutClient(): CheckoutSessionOperation {
  return new CheckoutSessionOperation({
    applicationKey: requireEnv("MESOMB_APPLICATION_KEY"),
    accessKey: requireEnv("MESOMB_ACCESS_KEY"),
    secretKey: requireEnv("MESOMB_SECRET_KEY"),
    language: "fr",
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

export interface ActivationInput {
  /** Référence unique côté prestataire (id de la session de paiement). */
  providerRef: string;
  /** Référence unique de l'événement, clé d'idempotence. */
  eventRef: string;
  eventType: string;
  userId: string;
  plan: PremiumPlan;
  amount?: number | null;
  currency?: string | null;
  rawPayload?: unknown;
}

export interface ActivationResult {
  activated: boolean;
  alreadyProcessed: boolean;
}

/**
 * Active le Pass Premium de façon idempotente.
 *
 * - `Payment.providerRef` (unique) bloque un double débit.
 * - `PaymentEvent.eventRef` (unique) bloque un rejeu de webhook.
 *
 * Dans une seule transaction : passage de l'utilisateur en SUBSCRIBER,
 * création de l'abonnement, validation du paiement, journalisation de l'événement.
 */
export async function activatePremium(input: ActivationInput): Promise<ActivationResult> {
  const { providerRef, eventRef, eventType, userId, plan } = input;
  const amount = input.amount ?? PREMIUM_PLANS[plan].amount;
  const currency = input.currency || getPaymentCurrency();
  const rawPayload = toJson(input.rawPayload);

  return prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({ where: { providerRef } });

    // Déjà validé (webhook rejoué, ou webhook + vérification success_url).
    if (existingPayment?.status === PaymentStatus.PAID) {
      await tx.paymentEvent.upsert({
        where: { eventRef },
        update: { processed: true },
        create: {
          paymentId: existingPayment.id,
          provider: "MESOMB",
          eventType,
          eventRef,
          processed: true,
          rawPayload,
        },
      });
      return { activated: false, alreadyProcessed: true };
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + PREMIUM_PLANS[plan].months);

    await tx.user.update({
      where: { id: userId },
      data: { role: Role.SUBSCRIBER },
    });

    const subscription = await tx.subscription.create({
      data: {
        userId,
        plan: plan as SubscriptionPlan,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd,
      },
    });

    const payment = await tx.payment.upsert({
      where: { providerRef },
      update: {
        userId,
        subscriptionId: subscription.id,
        provider: "MESOMB",
        amount,
        currency,
        status: PaymentStatus.PAID,
        plan: plan as SubscriptionPlan,
        rawPayload,
      },
      create: {
        userId,
        subscriptionId: subscription.id,
        provider: "MESOMB",
        providerRef,
        amount,
        currency,
        status: PaymentStatus.PAID,
        plan: plan as SubscriptionPlan,
        rawPayload,
      },
    });

    await tx.paymentEvent.upsert({
      where: { eventRef },
      update: { paymentId: payment.id, processed: true, rawPayload },
      create: {
        paymentId: payment.id,
        provider: "MESOMB",
        eventType,
        eventRef,
        processed: true,
        rawPayload,
      },
    });

    return { activated: true, alreadyProcessed: false };
  });
}
