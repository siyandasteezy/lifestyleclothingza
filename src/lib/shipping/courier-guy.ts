// The Courier Guy shipping via the Shiplogic API (https://api.shiplogic.com).
// Falls back to the store's flat rate when no API key is configured, so
// checkout keeps working before the courier account is connected.

const API_BASE = "https://api.shiplogic.com/v2";

export const FREE_SHIPPING_THRESHOLD_CENTS = 50000;
export const FLAT_SHIPPING_CENTS = 9900;
const FLAT_METHOD = "Standard delivery (2–5 business days)";

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
    const res = await shiplogic("/rates", {
      collection_address: collectionAddress(),
      delivery_address: toShiplogicAddress(address),
      parcels: [DEFAULT_PARCEL],
      declared_value: subtotalCents / 100,
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
    const best = rates[0];
    return {
      cents: best.cents,
      method: `The Courier Guy — ${best.name}`,
      serviceLevelCode: best.code,
    };
  } catch {
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
    service_level_code: input.serviceLevelCode ?? "ECO",
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
