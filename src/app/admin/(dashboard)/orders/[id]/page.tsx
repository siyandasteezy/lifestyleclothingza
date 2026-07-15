import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { bookCourierShipment, updateOrderStatus } from "@/lib/actions/admin";
import { courierGuyConfigured, trackingUrl } from "@/lib/shipping/courier-guy";
import { adminInput, AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const;

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();

  const address = order.shippingAddress as Record<string, string> | null;

  return (
    <>
      <AdminHeading title={`Order #${order.number}`}>
        <StatusBadge status={order.status} />
      </AdminHeading>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <AdminCard className="p-0">
          <h2 className="border-b border-line px-5 py-3 font-display text-base font-bold">Items</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded-md bg-bone">
                  {item.image && (
                    <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.title}</span>
                  {item.variantTitle && item.variantTitle !== "Default Title" && (
                    <span className="block text-sm text-stone">{item.variantTitle}</span>
                  )}
                </span>
                <span className="text-sm text-stone">× {item.quantity}</span>
                <span className="font-medium">{formatMoney(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone">Subtotal</dt>
              <dd>{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone">Shipping</dt>
              <dd>{order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
        </AdminCard>

        <div className="space-y-5">
          <AdminCard>
            <h2 className="mb-3 font-display text-base font-bold">Update status</h2>
            <form action={updateOrderStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={order.id} />
              <label className="sr-only" htmlFor="order-status">
                Order status
              </label>
              <select id="order-status" name="status" defaultValue={order.status} className={adminInput}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-bone hover:bg-clay"
              >
                Save
              </button>
            </form>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 font-display text-base font-bold">Payment & delivery</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-stone">Payment</dt>
                <dd>{order.paymentMethod === "payfast" ? "PayFast" : "Manual / EFT"}</dd>
              </div>
              {order.paymentId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-stone">PayFast ID</dt>
                  <dd className="font-mono text-xs">{order.paymentId}</dd>
                </div>
              )}
              {order.shippingMethod && (
                <div className="flex justify-between gap-3">
                  <dt className="text-stone">Shipping</dt>
                  <dd className="text-right">{order.shippingMethod}</dd>
                </div>
              )}
            </dl>
            {order.trackingReference ? (
              <p className="mt-3 text-sm">
                Tracking:{" "}
                <a
                  href={trackingUrl(order.trackingReference)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-clay underline underline-offset-2"
                >
                  {order.trackingReference}
                </a>
              </p>
            ) : courierGuyConfigured() ? (
              <form action={bookCourierShipment} className="mt-4">
                <input type="hidden" name="id" value={order.id} />
                <button
                  type="submit"
                  className="h-10 w-full rounded-full bg-ink px-5 text-sm font-semibold text-bone hover:bg-clay"
                >
                  Book Courier Guy shipment
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-stone">
                Connect The Courier Guy (set COURIER_GUY_API_KEY) to book shipments from here.
              </p>
            )}
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 font-display text-base font-bold">Customer</h2>
            <p className="text-sm">{order.email}</p>
            {order.phone && <p className="text-sm">{order.phone}</p>}
            {address && (
              <address className="mt-3 text-sm text-ink-soft not-italic">
                {order.shippingName}
                <br />
                {address.address1}
                {address.address2 && (
                  <>
                    <br />
                    {address.address2}
                  </>
                )}
                <br />
                {address.city}, {address.province} {address.postalCode}
                <br />
                {address.country}
              </address>
            )}
            {order.note && (
              <p className="mt-3 rounded-lg bg-bone p-3 text-sm text-ink-soft">“{order.note}”</p>
            )}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
