import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminCard, AdminHeading } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminCollections() {
  const collections = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <AdminHeading title="Collections" />
      <p className="mb-5 text-sm text-stone">
        Collections are created from a product page — under Collections, type a name that does
        not exist yet. Edit the copy, image and SEO for each one here.
      </p>
      <AdminCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3">Products</th>
              <th className="px-5 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bone">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/collections/${c.id}`}
                    className="font-medium text-clay hover:underline"
                  >
                    {c.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-stone">/collections/{c.handle}</td>
                <td className="px-5 py-3">
                  {/* An empty collection still has a live, indexable page. */}
                  <span className={c._count.products === 0 ? "text-clay" : ""}>
                    {c._count.products}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {c.descriptionHtml.trim() ? (
                    <span className="text-stone">Yes</span>
                  ) : (
                    <span className="text-clay">Missing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </>
  );
}
