import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminArticles() {
  const articles = await prisma.article.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <>
      <AdminHeading title="Articles">
        <Link
          href="/admin/articles/new"
          className="h-10 rounded-full bg-ink px-5 text-sm leading-10 font-semibold text-bone hover:bg-clay"
        >
          + New article
        </Link>
      </AdminHeading>
      <AdminCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">Published</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0 hover:bg-bone">
                <td className="px-5 py-3">
                  <Link href={`/admin/articles/${a.id}`} className="font-medium text-clay hover:underline">
                    {a.title}
                  </Link>
                </td>
                <td className="px-5 py-3">{a.author}</td>
                <td className="px-5 py-3">
                  {a.publishedAt ? a.publishedAt.toLocaleDateString("en-ZA") : "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </>
  );
}
