import crypto from "crypto";
import { PaymentStatus, Prisma, Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Paiements du Pass Premium via PayDunya (agrégateur : carte bancaire
 * internationale + Mobile Money — Wave, Orange Money, Free Money…).
 *
 * Principe (CDC §13) : une transaction n'est validée qu'après confirmation du
 * prestataire. La confirmation arrive par IPN (`/api/payment/webhook`) ou, à
 * défaut, par vérification serveur du statut de la facture
 * (`/api/payment/verify`). Jamais depuis le retour navigateur seul.
 *
 * API v1 HTTP/JSON : https://developers.paydunya.com/doc/EN/http_json
 */

export type PremiumPlan = "MONTHLY" | "YEARLY";

/** Code pays ISO 3166-1 alpha-2 supportés pour le filtrage des moyens de paiement. */
export type CountryCode = "SN" | "CI" | "CM" | "NE" | "ML" | "BF" | "TG" | "BJ";

/** Moyen de paiement proposable sur le site avant redirection vers PayDunya. */
export type PaymentMethod = "CARD" | "WAVE" | "ORANGE_MONEY" | "FREE_MONEY" | "MTN_MONEY";

/** Tarifs du Pass Premium (montants en unités mineures XOF, exposant 0). */
export const PREMIUM_PLANS: Record<PremiumPlan, { amount: number; label: string; months: number }> = {
  MONTHLY: { amount: 1500, label: "Abonnement Mensuel", months: 1 },
  YEARLY: { amount: 15000, label: "Abonnement Annuel", months: 12 },
};

/**
 * Canaux PayDunya par pays.
 *
 * Ces codes correspondent aux identifiants de canaux attendus par l'API PayDunya
 * (paramètre `channels` de création de facture). Ils doivent être cohérents avec
 * les moyens activés sur le compte marchand PayDunya et avec la valeur de
 * `PAYDUNYA_CHANNELS` le cas échéant.
 *
 * Sources : https://developers.paydunya.com/doc/EN/http_json (checkout-invoice/create)
 *
 * @remarks Quand `channels` est omis ou vide, PayDunya affiche tous les moyens activés du compte.
 */
export const PAYMENT_CHANNELS_BY_COUNTRY: Record<CountryCode, Record<PaymentMethod, string[]>> = {
  SN: { // Sénégal (XOF)
    CARD: ["card"],
    WAVE: ["wave-senegal"],
    ORANGE_MONEY: ["orange-money-senegal"],
    FREE_MONEY: ["free-money"],
    MTN_MONEY: ["mtn-money-senegal"],
  },
  CI: { // Côte d'Ivoire (XOF)
    CARD: ["card"],
    WAVE: ["wave-ci"],
    ORANGE_MONEY: ["orange-money-ci"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-ci"],
  },
  CM: { // Cameroun (XAF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-cm"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-cm"],
  },
  NE: { // Niger (XOF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-ne"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-ne"],
  },
  ML: { // Mali (XOF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-ml"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-ml"],
  },
  BF: { // Burkina Faso (XOF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-bf"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-bf"],
  },
  TG: { // Togo (XOF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-tg"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-tg"],
  },
  BJ: { // Bénin (XOF)
    CARD: ["card"],
    WAVE: [],
    ORANGE_MONEY: ["orange-money-bj"],
    FREE_MONEY: [],
    MTN_MONEY: ["mtn-money-bj"],
  },
};

/** Libellé d'affichage pour chaque moyen de paiement. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Carte bancaire (Visa / Mastercard)",
  WAVE: "Wave (Mobile Money)",
  ORANGE_MONEY: "Orange Money",
  FREE_MONEY: "Free Money",
  MTN_MONEY: "MTN Money",
};

/** Libellé d'affichage pour chaque pays supporté. */
export const COUNTRY_LABELS: Record<CountryCode, string> = {
  SN: "Sénégal",
  CI: "Côte d'Ivoire",
  CM: "Cameroun",
  NE: "Niger",
  ML: "Mali",
  BF: "Burkina Faso",
  TG: "Togo",
  BJ: "Bénin",
};

/**
 * Retourne les canaux PayDunya à passer à la facture pour un pays et un moyen donnés.
 *
 * - Si `method` est "CARD", on force uniquement le canal carte.
 * - Si `method` est un Mobile Money, on force uniquement ce canal.
 * - Retourne un tableau vide si le moyen n'est pas disponible dans ce pays
 *   (l'UI doit alors empêcher ce choix).
 *
 * @param country Code pays ISO 3166-1 alpha-2.
 * @param method Moyen de paiement choisi par l'utilisateur (optionnel : undefined = tous les moyens du pays).
 */
export function getChannelsForSelection(country: CountryCode, method?: PaymentMethod): string[] {
  const byMethod = PAYMENT_CHANNELS_BY_COUNTRY[country];
  if (!byMethod) return [];

  if (!method) {
    // Tous les moyens disponibles pour ce pays (dédupliqués).
    return [...new Set(Object.values(byMethod).flat())];
  }

  const channels = byMethod[method];
  return channels ? [...channels] : [];
}

/** Détermine si un pays utilise le franc CFA (XOF) ou le franc CFA BEAC (XAF). */
export function getCurrencyForCountry(country: CountryCode): string {
  return country === "CM" ? "XAF" : "XOF";
}

export function isPremiumPlan(value: unknown): value is PremiumPlan {
  return value === "MONTHLY" || value === "YEARLY";
}

const PAYDUNYA_TEST_BASE = "https://app.paydunya.com/sandbox-api/v1";
const PAYDUNYA_LIVE_BASE = "https://app.paydunya.com/api/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} est requis pour les paiements PayDunya. Renseignez-le dans .env (voir paydunya.com → Integration API).`
    );
  }
  return value.trim();
}

/** Mode PayDunya : "test" (sandbox) par défaut, "live" en production. */
export function getPaydunyaMode(): "test" | "live" {
  return process.env.PAYDUNYA_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
}

function getPaydunyaBaseUrl(): string {
  const override = process.env.PAYDUNYA_BASE_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return getPaydunyaMode() === "live" ? PAYDUNYA_LIVE_BASE : PAYDUNYA_TEST_BASE;
}

/** En-têtes d'authentification de l'API PayDunya (serveur uniquement). */
function getPaydunyaHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": requireEnv("PAYDUNYA_MASTER_KEY"),
    "PAYDUNYA-PRIVATE-KEY": requireEnv("PAYDUNYA_PRIVATE_KEY"),
    "PAYDUNYA-TOKEN": requireEnv("PAYDUNYA_TOKEN"),
  };
}

/** Devise de facturation (le compte PayDunya détermine la devise réelle). */
export function getPaymentCurrency(): string {
  return process.env.PAYDUNYA_CURRENCY?.trim() || "XOF";
}

/**
 * Hash SHA-512 du Master Key : PayDunya l'inclut dans les IPN pour prouver
 * leur origine. Sert de contrôle d'intégrité, jamais de source de vérité
 * (le statut est toujours reconfirmé via l'endpoint `confirm`).
 */
export function getPaydunyaHash(): string {
  return crypto.createHash("sha512").update(requireEnv("PAYDUNYA_MASTER_KEY")).digest("hex");
}

/** Nom affiché du marchand sur la facture PayDunya. */
function getStoreName(): string {
  return (
    process.env.PAYDUNYA_STORE_NAME?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    "CinéMax"
  );
}

/** Canaux affichés au guichet (vide = tous les moyens activés du compte). */
function getPaydunyaChannels(): string[] {
  const raw = process.env.PAYDUNYA_CHANNELS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((channel) => channel.trim())
    .filter(Boolean);
}

export interface CreateInvoiceInput {
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  customData?: Record<string, unknown>;
  customer?: { name?: string; email?: string; phone?: string };
  /** Canaux PayDunya à forcer sur la facture (vide/omis = tous les moyens activés du compte). */
  channels?: string[];
}

export interface PaydunyaInvoice {
  /** Jeton de facture — identifiant unique côté PayDunya (clé d'idempotence). */
  token: string;
  /** URL du guichet hébergé vers lequel rediriger l'utilisateur. */
  url: string;
  raw: unknown;
}

/** Résout l'URL de redirection retournée par la création de facture. */
function resolveInvoiceUrl(data: Record<string, unknown>, token: string): string {
  const candidates = [data.invoice_url, data.response_text];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
      return candidate;
    }
  }
  const host = getPaydunyaMode() === "live" ? "checkout" : "sandbox-checkout";
  return `https://paydunya.com/${host}/invoice/${encodeURIComponent(token)}`;
}

/**
 * Crée une facture de checkout hébergée chez PayDunya.
 * L'utilisateur est ensuite redirigé vers `invoice.url` pour payer.
 */
export async function createPremiumInvoice(input: CreateInvoiceInput): Promise<PaydunyaInvoice> {
  const channels: string[] =
    input.channels && input.channels.length > 0 ? input.channels : getPaydunyaChannels();

  const body = {
    invoice: {
      total_amount: input.amount,
      description: input.description,
      items: {
        item_0: {
          name: input.description,
          quantity: 1,
          unit_price: String(input.amount),
          total_price: String(input.amount),
          description: "",
        },
      },
      ...(channels.length > 0 ? { channels } : {}),
      ...(input.customer
        ? {
            customer: {
              ...(input.customer.name ? { name: input.customer.name } : {}),
              ...(input.customer.email ? { email: input.customer.email } : {}),
              ...(input.customer.phone ? { phone: input.customer.phone } : {}),
            },
          }
        : {}),
    },
    store: { name: getStoreName() },
    custom_data: input.customData ?? {},
    actions: {
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      callback_url: input.callbackUrl,
    },
  };

  const response = await fetch(`${getPaydunyaBaseUrl()}/checkout-invoice/create`, {
    method: "POST",
    headers: getPaydunyaHeaders(),
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!data || data.response_code !== "00" || typeof data.token !== "string") {
    const message = typeof data?.response_text === "string" ? data.response_text : "création refusée";
    throw new Error(`PayDunya a refusé la création de la facture : ${message}`);
  }

  const token = data.token as string;
  return { token, url: resolveInvoiceUrl(data, token), raw: data };
}

export interface PaydunyaConfirm {
  /** Statut normalisé : COMPLETED | PENDING | CANCELLED | FAILED | "". */
  status: string;
  amount: number | null;
  currency: string;
  token: string;
  customData: Record<string, unknown>;
  raw: unknown;
}

/** Interroge le statut autoritatif d'une facture PayDunya. */
export async function confirmInvoice(token: string): Promise<PaydunyaConfirm> {
  const response = await fetch(
    `${getPaydunyaBaseUrl()}/checkout-invoice/confirm/${encodeURIComponent(token)}`,
    { method: "GET", headers: getPaydunyaHeaders() }
  );

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  const invoice = (data?.invoice ?? {}) as Record<string, unknown>;
  const amountRaw = invoice.total_amount;
  const amount = amountRaw != null && amountRaw !== "" ? Number(amountRaw) : null;
  const currencyValue = invoice.currency ?? data?.currency;

  return {
    status: String(data?.status ?? "").toUpperCase(),
    amount: amount != null && Number.isFinite(amount) ? amount : null,
    currency: typeof currencyValue === "string" && currencyValue.trim()
      ? currencyValue.trim().toUpperCase()
      : getPaymentCurrency().toUpperCase(),
    token: typeof invoice.token === "string" ? invoice.token : token,
    customData: (data?.custom_data as Record<string, unknown> | undefined) ?? {},
    raw: data,
  };
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

export interface ActivationInput {
  /** Référence unique côté prestataire (token de la facture PayDunya). */
  providerRef: string;
  /** Référence unique de l'événement, clé d'idempotence. */
  eventRef: string;
  eventType: string;
  userId: string;
  plan: PremiumPlan;
  amount?: number | null;
  currency?: string | null;
  provider?: string;
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
 * - `PaymentEvent.eventRef` (unique) bloque un rejeu d'IPN.
 *
 * Dans une seule transaction : passage de l'utilisateur en SUBSCRIBER,
 * création de l'abonnement, validation du paiement, journalisation de l'événement.
 */
export async function activatePremium(input: ActivationInput): Promise<ActivationResult> {
  const { providerRef, eventRef, eventType, userId, plan } = input;
  const provider = input.provider || "PAYDUNYA";
  if (input.amount == null || !input.currency) {
    throw new Error("La confirmation du paiement doit contenir le montant et la devise.");
  }
  const amount = input.amount;
  const currency = input.currency.toUpperCase();
  const rawPayload = toJson(input.rawPayload);

  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.paymentEvent.findUnique({ where: { eventRef } });
    if (existingEvent?.processed) {
      return { activated: false, alreadyProcessed: true };
    }

    const existingPayment = await tx.payment.findUnique({ where: { providerRef } });

    if (!existingPayment) {
      throw new Error("Aucun paiement initié ne correspond à cette facture.");
    }
    if (
      existingPayment.provider !== provider ||
      existingPayment.userId !== userId ||
      existingPayment.plan !== plan ||
      existingPayment.amount !== PREMIUM_PLANS[plan].amount ||
      amount !== existingPayment.amount ||
      currency !== existingPayment.currency.toUpperCase()
    ) {
      throw new Error("Les informations confirmées ne correspondent pas au paiement enregistré.");
    }
    if (existingPayment.status !== PaymentStatus.PENDING && existingPayment.status !== PaymentStatus.PAID) {
      throw new Error("Le paiement n'est pas dans un état activable.");
    }

    // Déjà validé (IPN rejoué, ou IPN + vérification return_url).
    if (existingPayment?.status === PaymentStatus.PAID) {
      await tx.paymentEvent.upsert({
        where: { eventRef },
        update: { processed: true },
        create: {
          paymentId: existingPayment.id,
          provider,
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

    const payment = await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        subscriptionId: subscription.id,
        status: PaymentStatus.PAID,
        rawPayload,
      },
    });

    await tx.paymentEvent.upsert({
      where: { eventRef },
      update: { paymentId: payment.id, processed: true, rawPayload },
      create: {
        paymentId: payment.id,
        provider,
        eventType,
        eventRef,
        processed: true,
        rawPayload,
      },
    });

    return { activated: true, alreadyProcessed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
