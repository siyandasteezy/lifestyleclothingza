import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteArticle } from "@/lib/actions/admin";
import { AdminHeading } from "@/components/admin/ui";
import { ArticleEditForm } from "@/components/admin/ArticleEditForm";

export const dynamic = "force-dynamic";

export default async function AdminArticleEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <>
      <AdminHeading title={article.title}>
        <form action={deleteArticle}>
          <input type="hidden" name="id" value={article.id} />
          <button type="submit" className="text-sm text-clay underline underline-offset-2 hover:text-clay-deep">
            Delete article
          </button>
        </form>
      </AdminHeading>
      <ArticleEditForm
        article={{
          id: article.id,
          handle: article.handle,
          title: article.title,
          author: article.author,
          excerpt: article.excerpt,
          bodyHtml: article.bodyHtml,
          heroImage: article.heroImage,
          status: article.status,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
        }}
      />
    </>
  );
}
