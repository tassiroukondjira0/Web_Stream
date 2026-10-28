const PAYPAL_API_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants.");
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.error_description || "Échec authentification PayPal");
      }
      return data.access_token as string;
    });
}

export interface CreatePayPalOrderInput {
  amount: number; // en unités mineures (centimes) pour EUR/MAD
  currency: string; // "EUR" ou "MAD"
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(input: CreatePayPalOrderInput): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getPayPalAccessToken();
  const value = (input.amount / 100).toFixed(2);
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: input.currency, value },
          description: input.description,
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    console.error("PayPal create order error:", JSON.stringify(data, null, 2));
    throw new Error(data.message || "Création commande PayPal échouée");
  }
  const approvalUrl = data.links?.find((l: { rel?: string; href?: string }) => l.rel === "approve")?.href;
  if (!approvalUrl) throw new Error("URL d'approbation PayPal introuvable");
  return { orderId: data.id, approvalUrl };
}

export async function capturePayPalOrder(orderId: string): Promise<{ status: string; captureId: string; amount: number; currency: string }> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Capture PayPal échouée");
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id || "",
    amount: Math.round(parseFloat(capture?.amount?.value || "0") * 100),
    currency: capture?.amount?.currency_code || "",
  };
}

export async function verifyPayPalWebhook(headers: Headers, body: string): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
    return false;
  }

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return false;
  }

  try {
    const token = await getPayPalAccessToken();
    const res = await fetch(PAYPAL_API_BASE + "/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
