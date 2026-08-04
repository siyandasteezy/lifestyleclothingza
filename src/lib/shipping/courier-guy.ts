// The Courier Guy shipping via the Shiplogic API.
// Falls back to the store's flat rate when no API key is configured, so
// checkout keeps working before the courier account is connected.
//
// The API moved from api.shiplogic.com to api.portal.thecourierguy.co.za; the
// old host was retired on 2026-07-31. Kept in an env var so a future cutover is
// a dashboard change rather than a redeploy.
// `||` not `??` — an unset var in .env is an empty string, not undefined, and
// that must fall through to the default rather than blanking the host.
const API_BASE =
  process.env.COURIER_GUY_API_BASE?.trim() || "https://api.portal.thecourierguy.co.za/v2";

export const FREE_SHIPPING_THRESHOLD_CENTS = 50000;
export const FLAT_SHIPPING_CENTS = 9900;
const FLAT_METHOD = "Standard delivery (2–5 business days)";

// Delivery window published on the PDP and in Offer shippingDetails schema.
// Transit is the courier's quoted 2–5 business days; handling is how long we
// take to get the parcel to the courier, confirmed by the owner as 2–3 days.
export const TRANSIT_DAYS = { min: 2, max: 5 } as const;
export const HANDLING_DAYS = { min: 2, max: 3 } as const;

export function courierGuyConfigured(): boolean {
  return Boolean(process.env.COURIER_GUY_API_KEY);
}

export interface DeliveryAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  phone?: string;
  email?: string;
}

interface ShiplogicAddress {
  type: string;
  company?: string;
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  country: "ZA";
  code: string;
}

// Store pickup address — override via COURIER_GUY_COLLECTION_* env vars.
function collectionAddress(): ShiplogicAddress {
  return {
    type: "business",
    company: "Lifestyle Clothing ZA",
    street_address: process.env.COURIER_GUY_COLLECTION_STREET ?? "",
    local_area: process.env.COURIER_GUY_COLLECTION_SUBURB ?? "",
    city: process.env.COURIER_GUY_COLLECTION_CITY ?? "",
    zone: process.env.COURIER_GUY_COLLECTION_PROVINCE ?? "Gauteng",
    country: "ZA",
    code: process.env.COURIER_GUY_COLLECTION_POSTAL_CODE ?? "",
  };
}

function toShiplogicAddress(a: DeliveryAddress): ShiplogicAddress {
  return {
    type: "residential",
    street_address: [a.address1, a.address2].filter(Boolean).join(", "),
    local_area: a.city,
    city: a.city,
    zone: a.province,
    country: "ZA",
    code: a.postalCode,
  };
}

// Default flyer bag for apparel orders.
const DEFAULT_PARCEL = {
  submitted_length_cm: 40,
  submitted_width_cm: 30,
  submitted_height_cm: 10,
  submitted_weight_kg: 2,
};

async function shiplogic(path: string, body: object): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COURIER_GUY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

export interface ShippingQuote {
  cents: number;
  method: string;
  serviceLevelCode?: string;
}

interface CourierRate {
  cents: number;
  code: string | undefined;
  name: string;
}

/**
 * Live rates for an address, cheapest first. Throws when the API errors or
 * returns nothing usable, so callers decide what to do about it.
 *
 * Service level codes are route-dependent: metro destinations quote ECO/OVN,
 * regional ones quote ECOR/OVNR. Nothing may assume a fixed code.
 */
async function fetchRates(
  address: DeliveryAddress,
  declaredValueCents: number,
): Promise<CourierRate[]> {
  const res = await shiplogic("/rates", {
    collection_address: collectionAddress(),
    delivery_address: toShiplogicAddress(address),
    parcels: [DEFAULT_PARCEL],
    declared_value: declaredValueCents / 100,
  });
  if (!res.ok) throw new Error(`rates ${res.status}`);
  const data = (await res.json()) as {
    rates?: { rate: number | string; service_level?: { code?: string; name?: string } }[];
  };
  const rates = (data.rates ?? [])
    .map((r) => ({
      cents: Math.round(parseFloat(String(r.rate)) * 100),
      code: r.service_level?.code,
      name: r.service_level?.name ?? "Courier",
    }))
    .filter((r) => Number.isFinite(r.cents) && r.cents > 0)
    .sort((a, b) => a.cents - b.cents);
  if (rates.length === 0) throw new Error("no rates");
  return rates;
}

/**
 * Chooses the service level to book: the preferred code when the route actually
 * offers it, otherwise the cheapest one it does offer. Throws when there is
 * nothing to choose from, since booking a guessed code fails at the API.
 *
 * Exported for testing — the only other way to exercise it is to book a real
 * shipment, which dispatches a real courier collection.
 */
export function pickServiceLevel(
  preferred: string | undefined,
  rates: { code: string | undefined }[],
): string {
  const codes = rates.map((r) => r.code).filter((c): c is string => Boolean(c));
  if (preferred && codes.includes(preferred)) return preferred;
  const cheapest = codes[0];
  if (!cheapest) throw new Error("no service levels returned");
  return cheapest;
}

/**
 * Cheapest Courier Guy rate for the address; the flat store rate when the
 * API is not configured, the API errors, or the order qualifies for free shipping.
 */
export async function quoteShipping(
  address: DeliveryAddress,
  subtotalCents: number,
): Promise<ShippingQuote> {
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return { cents: 0, method: "Free shipping (orders over R500)" };
  }
  if (!courierGuyConfigured()) {
    return { cents: FLAT_SHIPPING_CENTS, method: FLAT_METHOD };
  }
  try {
    const best = (await fetchRates(address, subtotalCents))[0];
    return {
      cents: best.cents,
      method: `The Courier Guy — ${best.name}`,
      serviceLevelCode: best.code,
    };
  } catch (error) {
    // Falling back is deliberate — a courier outage must never block checkout.
    // But it silently charges the flat rate instead of a live quote, so log it:
    // an unnoticed fallback looks exactly like normal operation from outside.
    console.error(
      `[courier-guy] rate quote failed against ${API_BASE}, using flat rate:`,
      error instanceof Error ? error.message : error,
    );
    return { cents: FLAT_SHIPPING_CENTS, method: FLAT_METHOD };
  }
}

export interface BookedShipment {
  shipmentId: string;
  trackingReference: string;
}

/** Books a Courier Guy shipment for a paid order (admin action). */
export async function bookShipment(input: {
  address: DeliveryAddress;
  orderNumber: number;
  serviceLevelCode?: string;
  declaredValueCents: number;
}): Promise<BookedShipment> {
  if (!courierGuyConfigured()) {
    throw new Error("COURIER_GUY_API_KEY is not configured");
  }

  // Service level codes vary by route — metro quotes ECO/OVN, regional quotes
  // ECOR/OVNR — so the code captured at checkout cannot be trusted or defaulted.
  // It is missing entirely for free-shipping orders (which skip the rate call)
  // and for any order that fell back to the flat rate. Booking a code the route
  // doesn't offer fails with "could not find rates for the requested service
  // level code", so re-quote and only use a code the route actually returned.
  let serviceLevelCode = input.serviceLevelCode;
  try {
    const rates = await fetchRates(input.address, input.declaredValueCents);
    const resolved = pickServiceLevel(serviceLevelCode, rates);
    if (resolved !== serviceLevelCode) {
      console.warn(
        `[courier-guy] order #${input.orderNumber}: service level ${
          serviceLevelCode ? `"${serviceLevelCode}" unavailable` : "missing"
        }, using "${resolved}" (available: ${rates.map((r) => r.code).join(", ")})`,
      );
      serviceLevelCode = resolved;
    }
  } catch (error) {
    // Re-quoting is a best-effort improvement. If it fails, fall through with
    // whatever we had rather than blocking a booking that might still succeed.
    console.error(
      `[courier-guy] order #${input.orderNumber}: could not re-quote service levels:`,
      error instanceof Error ? error.message : error,
    );
  }

  const res = await shiplogic("/shipments", {
    collection_address: collectionAddress(),
    collection_contact: {
      name: "Lifestyle Clothing ZA",
      email: "support@lifestyleclothingza.com",
    },
    delivery_address: toShiplogicAddress(input.address),
    delivery_contact: {
      name: input.address.name,
      mobile_number: input.address.phone ?? "",
      email: input.address.email ?? "",
    },
    parcels: [DEFAULT_PARCEL],
    declared_value: input.declaredValueCents / 100,
    customer_reference: `Order #${input.orderNumber}`,
    service_level_code: serviceLevelCode ?? "ECO",
  });
  if (!res.ok) {
    throw new Error(`Shiplogic shipment failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    id?: number | string;
    short_tracking_reference?: string;
    tracking_reference?: string;
  };
  return {
    shipmentId: String(data.id ?? ""),
    trackingReference: data.short_tracking_reference ?? data.tracking_reference ?? "",
  };
}

export function trackingUrl(reference: string): string {
  return `https://portal.thecourierguy.co.za/track?ref=${encodeURIComponent(reference)}`;
}

/**
 * Books a shipment for a stored Order row and updates it in place. Idempotent —
 * skips work if the order already has a tracking reference or no address.
 * Used by both the manual "Book shipment" admin button and the webhook's
 * auto-book path, so the same guards live in one place.
 *
 * Returns whether a shipment was actually booked this call. Rethrows API
 * errors so callers can log a specific reason; caller state on failure is
 * whatever it was — the order isn't half-updated.
 */
/** Delivery address for an order row, or null when it has none stored. */
function orderAddress(order: {
  shippingName: string | null;
  shippingAddress: unknown;
  phone: string | null;
  email: string;
}): DeliveryAddress | null {
  const address = order.shippingAddress as Record<string, string> | null;
  if (!address) return null;
  return {
    name: order.shippingName ?? "",
    address1: address.address1 ?? "",
    address2: address.address2,
    city: address.city ?? "",
    province: address.province ?? "",
    postalCode: address.postalCode ?? "",
    phone: order.phone ?? undefined,
    email: order.email,
  };
}

export interface OrderRate {
  code: string;
  name: string;
  cents: number;
}

/**
 * Live courier prices for an order, so the admin can see what a booking costs
 * before committing to one. The same call already runs inside bookShipment to
 * resolve the service level; this surfaces it instead of discarding the price.
 */
export async function ratesForOrder(
  orderId: string,
): Promise<{ ok: true; rates: OrderRate[] } | { ok: false; error: string }> {
  const { prisma } = await import("@/lib/db");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if (!courierGuyConfigured()) return { ok: false, error: "COURIER_GUY_API_KEY is not set." };
  const address = orderAddress(order);
  if (!address) return { ok: false, error: "This order has no shipping address." };

  try {
    const rates = await fetchRates(address, order.subtotalCents);
    return {
      ok: true,
      rates: rates
        .filter((r): r is typeof r & { code: string } => Boolean(r.code))
        .map((r) => ({ code: r.code, name: r.name, cents: r.cents })),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Couldn't get rates: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function bookForOrder(
  orderId: string,
  /** Service level chosen by the admin. Falls back to the cheapest available. */
  serviceLevelCode?: string,
): Promise<
  { booked: false; reason: string } | { booked: true; shipmentId: string; trackingReference: string }
> {
  // Lazy import to keep this module free of the Prisma dep for edge callers.
  const { prisma } = await import("@/lib/db");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { booked: false, reason: "order not found" };
  if (order.trackingReference) return { booked: false, reason: "already booked" };
  const address = order.shippingAddress as Record<string, string> | null;
  if (!address) return { booked: false, reason: "no shipping address" };
  if (!courierGuyConfigured()) return { booked: false, reason: "courier not configured" };

  const shipment = await bookShipment({
    address: {
      name: order.shippingName ?? "",
      address1: address.address1 ?? "",
      address2: address.address2,
      city: address.city ?? "",
      province: address.province ?? "",
      postalCode: address.postalCode ?? "",
      phone: order.phone ?? undefined,
      email: order.email,
    },
    orderNumber: order.number,
    // The admin's pick wins over the code captured at checkout; bookShipment
    // validates either against the route's live rates before sending it.
    serviceLevelCode: serviceLevelCode || address.serviceLevelCode || undefined,
    declaredValueCents: order.subtotalCents,
  });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      shipmentId: shipment.shipmentId,
      trackingReference: shipment.trackingReference,
      // Only advance to FULFILLED when the order was already PAID; other states
      // (like PENDING) shouldn't be pushed forward just because a booking succeeded.
      status: order.status === "PAID" ? "FULFILLED" : order.status,
    },
  });
  return {
    booked: true,
    shipmentId: shipment.shipmentId,
    trackingReference: shipment.trackingReference,
  };
}

export interface TrackingEvent {
  status: string;
  message: string;
  date: string | null;
}

export interface TrackingResult {
  status: string;
  events: TrackingEvent[];
  estimatedDelivery: string | null;
}

/**
 * Live tracking for a booked shipment. Returns null when the courier isn't
 * configured, the reference is unknown, or the API errors — callers fall back
 * to the order's own status. Parsed defensively against field-name drift.
 */
export async function trackShipment(reference: string): Promise<TrackingResult | null> {
  if (!courierGuyConfigured() || !reference) return null;
  try {
    const res = await fetch(
      `${API_BASE}/tracking/shipments?tracking_reference=${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.COURIER_GUY_API_KEY}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return null;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data: any = await res.json();
    const shipment = Array.isArray(data?.shipments) ? data.shipments[0] : data;
    if (!shipment) return null;

    const rawEvents: any[] =
      shipment.tracking_events ?? shipment.events ?? data.tracking_events ?? [];
    const events: TrackingEvent[] = rawEvents
      .map((e) => ({
        status: String(e.status ?? e.state ?? "").trim(),
        message: String(e.message ?? e.description ?? e.status ?? "").trim(),
        date: e.date ?? e.timestamp ?? e.created_at ?? null,
      }))
      .filter((e) => e.status || e.message);

    return {
      status: String(shipment.status ?? shipment.state ?? events[0]?.status ?? "").trim(),
      events,
      estimatedDelivery:
        shipment.estimated_delivery_to ?? shipment.estimated_delivery_from ?? null,
    };
  } catch {
    return null;
  }
}
