// PayFast integration (redirect flow + ITN webhook verification).
// Docs: https://developers.payfast.co.za/docs — signature is an MD5 of the
// non-empty fields in documented order, PHP-urlencoded, plus optional passphrase.
import { createHash } from "crypto";
import { absoluteUrl } from "@/lib/site";

export function payfastConfigured(): boolean {
  return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

export function payfastHost(): string {
  return process.env.PAYFAST_MODE === "live"
    ? "https://www.payfast.co.za"
    : "https://sandbox.payfast.co.za";
}

export function payfastProcessUrl(): string {
  return `${payfastHost()}/eng/process`;
}

/** PHP urlencode(): space → '+', uppercase hex, everything outside [A-Za-z0-9-_.] encoded. */
function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/** Signature over ordered [key, value] pairs; empty values are skipped. */
export function payfastSignature(pairs: [string, string][]): string {
  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();
  let paramString = pairs
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${phpUrlEncode(v.trim())}`)
    .join("&");
  if (passphrase) paramString += `&passphrase=${phpUrlEncode(passphrase)}`;
  return md5(paramString);
}

export interface PayfastOrderInput {
  id: string;
  number: number;
  email: string;
  shippingName: string | null;
  totalCents: number;
}

/**
 * Builds the signed field set for the PayFast payment form.
 * Field order matters — it must follow the attribute order in the PayFast docs.
 */
export function buildPayfastFields(order: PayfastOrderInput): [string, string][] {
  const [firstName, ...rest] = (order.shippingName ?? "").split(" ");
  const pairs: [string, string][] = [
    ["merchant_id", process.env.PAYFAST_MERCHANT_ID ?? ""],
    ["merchant_key", process.env.PAYFAST_MERCHANT_KEY ?? ""],
    ["return_url", absoluteUrl(`/checkout/confirmation?order=${order.number}`)],
    ["cancel_url", absoluteUrl(`/checkout/cancelled?order=${order.id}`)],
    ["notify_url", absoluteUrl("/api/payfast/notify")],
    ["name_first", firstName ?? ""],
    ["name_last", rest.join(" ")],
    ["email_address", order.email],
    ["m_payment_id", order.id],
    ["amount", (order.totalCents / 100).toFixed(2)],
    ["item_name", `Order #${order.number} — Lifestyle Clothing ZA`],
  ];
  pairs.push(["signature", payfastSignature(pairs)]);
  return pairs;
}

/** Recomputes the ITN signature from the params in the order PayFast sent them. */
export function verifyItnSignature(rawBody: string): boolean {
  const pairs: [string, string][] = [];
  let received = "";
  for (const part of rawBody.split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
    if (key === "signature") received = value;
    else pairs.push([key, value]);
  }
  if (!received) return false;
  return payfastSignature(pairs) === received;
}

/** Server-to-server confirmation: PayFast echoes VALID for genuine notifications. */
export async function confirmItnWithPayfast(rawBody: string): Promise<boolean> {
  try {
    const res = await fetch(`${payfastHost()}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
      signal: AbortSignal.timeout(10_000),
    });
    return (await res.text()).trim() === "VALID";
  } catch {
    return false;
  }
}
