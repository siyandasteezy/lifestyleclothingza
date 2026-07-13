import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [products, orders, articles, subscribers, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.article.count(),
    prisma.newsletterSubscriber.count(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
  ]);

  const stats = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Orders", value: orders, href: "/admin/orders" },
    { label: "Articles", value: articles, href: "/admin/articles" },
    { label: "Subscribers", value: subscribers, href: "/admin" },
  ];

  return (
    <>
      <AdminHeading title="Overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <AdminCard className="transition hover:shadow-card">
              <p className="text-sm text-stone">{s.label}</p>
              <p className="mt-1 font-display text-3xl font-bold">{s.value}</p>
            </AdminCard>
          </Link>
        ))}
      </div>

      <AdminCard className="mt-6 overflow-x-auto p-0">
        <h2 className="border-b border-line px-5 py-4 font-display text-lg font-bold">
          Recent orders
        </h2>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-bone">
                  <td className="px-5 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-clay hover:underline">
                      #{o.number}
                    </Link>
                  </td>
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
