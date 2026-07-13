import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <>
      <AdminHeading title="Orders" />
      <AdminCard className="overflow-x-auto p-0">
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-sm text-stone">
            No orders yet. Orders placed at checkout will appear here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-bone">
                  <td className="px-5 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-clay hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.createdAt.toLocaleDateString("en-ZA")}</td>
                  <td className="px-5 py-3">{o.email}</td>
                  <td className="px-5 py-3">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="px-5 py-3">{formatMoney(o.totalCents)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </>
  );
}
