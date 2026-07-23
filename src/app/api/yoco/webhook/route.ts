// Yoco webhook. Yoco POSTs here after payment events; we verify the signature,
// map the event to an order via metadata, and update its status. Always answer
// 200 so Yoco stops retrying — a rejected event is logged, not errored.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyYocoWebhook, yocoConfigured, type YocoWebhookEvent } from "@/lib/payments/yoco";
import { getStoreSettings } from "@/lib/settings";
import { bookForOrder } from "@/lib/shipping/courier-guy";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = () => new NextResponse("OK", { status: 200 });

  if (!yocoConfigured() || !process.env.YOCO_WEBHOOK_SECRET) return ok();

  const valid = verifyYocoWebhook(rawBody, {
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  });
  if (!valid) {
    console.warn("yoco webhook: signature/replay check failed — ignored");
    return ok();
  }

  let event: YocoWebhookEvent;
  try {
    event = JSON.parse(rawBody) as YocoWebhookEvent;
  } catch {
    return ok();
  }

  const orderId = event.payload?.metadata?.orderId;
  const label = `yoco webhook ${event.type} order=${orderId ?? "?"}`;
  if (!orderId) {
    console.warn(`${label}: no orderId in metadata — ignored`);
    return ok();
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.warn(`${label}: unknown order — ignored`);
    return ok();
  }

  // Guard against amount tampering: the event amount must match the order total.
  if (typeof event.payload.amount === "number" && Math.abs(event.payload.amount - order.totalCents) > 1) {
    console.warn(
      `${label}: amount mismatch (got ${event.payload.amount}, expected ${order.totalCents}) — ignored`,
    );
    return ok();
  }

  if (event.type === "payment.succeeded" && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentMethod: "yoco", paymentId: event.payload.id },
    });
    console.log(`${label}: marked PAID (payment ${event.payload.id})`);

    // Auto-book the courier if the store owner has opted in. A failure here
    // must NOT roll the order back to PENDING — payment was real. The order
    // stays PAID so the manual "Book shipment" button can retry, and the
    // owner sees the error in Vercel logs.
    const settings = await getStoreSettings();
    if (settings.autoBookCourier) {
      try {
        const result = await bookForOrder(order.id);
        if (result.booked) {
          console.log(
            `${label}: auto-booked shipment ${result.trackingReference} → FULFILLED`,
          );
        } else {
          console.log(`${label}: auto-book skipped — ${result.reason}`);
        }
      } catch (err) {
        console.error(
          `${label}: auto-book failed, order left PAID for manual retry:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  } else if (event.type === "payment.failed" && order.status === "PENDING") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    console.log(`${label}: marked CANCELLED`);
  }

  return ok();
}
