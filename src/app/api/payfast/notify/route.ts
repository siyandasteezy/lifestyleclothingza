// PayFast ITN (Instant Transaction Notification) webhook.
// PayFast POSTs here after every payment event; we verify the signature,
// confirm the notification with PayFast's validate endpoint, check the
// amount, and then update the order. Always answer 200 so PayFast stops
// retrying — a rejected notification is logged, not errored.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmItnWithPayfast, payfastConfigured, verifyItnSignature } from "@/lib/payments/payfast";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = () => new NextResponse("OK", { status: 200 });

  if (!payfastConfigured()) return ok();

  const params = new URLSearchParams(rawBody);
  const orderId = params.get("m_payment_id");
  const label = `payfast itn order=${orderId ?? "?"}`;

  if (!verifyItnSignature(rawBody)) {
    console.warn(`${label}: signature mismatch — ignored`);
    return ok();
  }
  if (!(await confirmItnWithPayfast(rawBody))) {
    console.warn(`${label}: validate endpoint rejected — ignored`);
    return ok();
  }

  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : null;
  if (!order) {
    console.warn(`${label}: unknown order — ignored`);
    return ok();
  }

  const amountGross = Math.round(parseFloat(params.get("amount_gross") ?? "0") * 100);
  if (Math.abs(amountGross - order.totalCents) > 1) {
    console.warn(
      `${label}: amount mismatch (got ${amountGross}, expected ${order.totalCents}) — ignored`,
    );
    return ok();
  }

  const paymentStatus = params.get("payment_status");
  if (paymentStatus === "COMPLETE" && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentId: params.get("pf_payment_id"),
        paymentMethod: "payfast",
      },
    });
    console.log(`${label}: marked PAID (pf ${params.get("pf_payment_id")})`);
  } else if (paymentStatus === "CANCELLED" && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    console.log(`${label}: marked CANCELLED`);
  }

  return ok();
}
