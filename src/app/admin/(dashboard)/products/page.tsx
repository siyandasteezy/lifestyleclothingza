import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <AdminHeading title="Products" />
      <AdminCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Variants</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const min = Math.min(...p.variants.map((v) => v.priceCents));
              return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bone">
                  <td className="px-5 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded-md bg-bone">
                        {p.images[0] && (
                          <Image src={p.images[0].src} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </span>
                      <span className="font-medium text-ink hover:text-clay">{p.title}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3">{formatMoney(min)}</td>
                  <td className="px-5 py-3">{p.variants.length}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminCard>
    </>
  );
}
