import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminPages() {
  const pages = await prisma.page.findMany({ orderBy: { title: "asc" } });

  return (
    <>
      <AdminHeading title="Pages" />
      <AdminCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bone">
                <td className="px-5 py-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium text-clay hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-stone">/pages/{p.handle}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </>
  );
}
