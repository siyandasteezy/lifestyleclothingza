// Yoco integration — hosted Checkout (redirect flow) + webhook verification.
// Docs: https://developer.yoco.com/online/
//
// Flow: create a checkout server-side → redirect the shopper to the returned
// redirectUrl → Yoco calls our webhook with payment.succeeded → we mark the
// order PAID. The success redirect is UX only; the webhook is the source of truth.
import { createHmac, timingSafeEqual } from "crypto";
import { absoluteUrl } from "@/lib/site";

const API_BASE = "https://payments.yoco.com/api";

export function yocoConfigured(): boolean {
  return Boolean(process.env.YOCO_SECRET_KEY);
}

/** True when running against Yoco test keys (sk_test_…) rather than live. */
export function yocoIsTest(): boolean {
  return (process.env.YOCO_SECRET_KEY ?? "").startsWith("sk_test");
}

export interface YocoCheckout {
  id: string;
  redirectUrl: string;
  status: string;
}

export interface CreateCheckoutInput {
  orderId: string;
  orderNumber: number;
  /** Order total in integer cents — Yoco's amount unit. */
  amountCents: number;
}

/** Creates a hosted checkout and returns the URL to send the shopper to. */
export async function createYocoCheckout(input: CreateCheckoutInput): Promise<YocoCheckout> {
  const res = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
      "Content-Type": "application/json",
      // Guards against double-charging if the order action is retried.
      "Idempotency-Key": `order-${input.orderId}`,
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: "ZAR",
      successUrl: absoluteUrl(`/checkout/confirmation?order=${input.orderNumber}`),
      cancelUrl: absoluteUrl(`/checkout/cancelled?order=${input.orderId}`),
      failureUrl: absoluteUrl(`/checkout/cancelled?order=${input.orderId}&failed=1`),
      // Metadata propagates to the webhook payload — how we map back to the order.
      metadata: {
        orderId: input.orderId,
        orderNumber: String(input.orderNumber),
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Yoco checkout failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as YocoCheckout;
  if (!data.redirectUrl) throw new Error("Yoco checkout returned no redirectUrl");
  return data;
}

// ---------- Webhook verification (Svix-style signing) ----------

const REPLAY_TOLERANCE_SECONDS = 180; // 3 minutes, per Yoco docs

export interface YocoWebhookEvent {
  id: string;
  type: string; // e.g. "payment.succeeded", "payment.failed"
  payload: {
    id: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    [key: string]: unknown;
  };
}

/**
 * Verifies a Yoco webhook per their spec:
 *   signedContent = `${webhook-id}.${webhook-timestamp}.${rawBody}`
 *   expected      = base64( HMAC-SHA256( base64decode(secret without whsec_), signedContent ) )
 * The webhook-signature header is a space-separated list of `v1,<sig>` entries;
 * a match against any entry passes. Also enforces the replay window.
 */
export function verifyYocoWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;

  // Replay protection
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > REPLAY_TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return headers.signature.split(" ").some((entry) => {
    const sig = entry.includes(",") ? entry.slice(entry.indexOf(",") + 1) : entry;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
