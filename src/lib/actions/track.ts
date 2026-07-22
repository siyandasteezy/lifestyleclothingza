"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { trackShipment, trackingUrl, type TrackingEvent } from "@/lib/shipping/courier-guy";

export interface OrderTracking {
  number: number;
  status: string; // PENDING | PAID | FULFILLED | CANCELLED | REFUNDED
  placedAt: string;
  totalLabel: string;
  itemCount: number;
  items: { title: string; variantTitle: string; quantity: number; image: string | null }[];
  shippingMethod: string | null;
  trackingReference: string | null;
  trackingUrl: string | null;
  courierStatus: string | null;
  courierEvents: TrackingEvent[];
  estimatedDelivery: string | null;
}

export interface TrackState {
  status: "idle" | "found" | "error";
  message?: string;
  order?: OrderTracking;
}

const schema = z.object({
  number: z.coerce.number().int().positive(),
  email: z.string().email(),
});

/**
 * Looks up an order by number + email. The email must match the order, so a
 * bare order number can't reveal someone else's details. Adds live courier
 * events when the shipment has been booked.
 */
export async function lookupOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const parsed = schema.safeParse({
    number: String(formData.get("number") ?? "").replace(/[^0-9]/g, ""),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter your order number and the email you used." };
  }

  let order;
  try {
    order = await prisma.order.findUnique({
      where: { number: parsed.data.number },
      include: { items: true },
    });
  } catch {
    return { status: "error", message: "We couldn't reach our system. Please try again shortly." };
  }

  // Uniform response whether the order is missing or the email doesn't match —
  // never confirm an order number exists to someone who can't authenticate it.
  if (!order || order.email.toLowerCase() !== parsed.data.email.trim().toLowerCase()) {
    return {
      status: "error",
      message: "We couldn't find an order with that number and email. Check both and try again.",
    };
  }

  const courier = order.trackingReference
    ? await trackShipment(order.trackingReference)
    : null;

  return {
    status: "found",
    order: {
      number: order.number,
      status: order.status,
      placedAt: order.createdAt.toISOString(),
      totalLabel: formatMoney(order.totalCents),
      itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
      items: order.items.map((i) => ({
        title: i.title,
        variantTitle: i.variantTitle,
        quantity: i.quantity,
        image: i.image,
      })),
      shippingMethod: order.shippingMethod,
      trackingReference: order.trackingReference,
      trackingUrl: order.trackingReference ? trackingUrl(order.trackingReference) : null,
      courierStatus: courier?.status ?? null,
      courierEvents: courier?.events ?? [],
      estimatedDelivery: courier?.estimatedDelivery ?? null,
    },
  };
}
