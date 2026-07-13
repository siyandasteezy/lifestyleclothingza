import { AdminHeading } from "@/components/admin/ui";
import { ArticleEditForm } from "@/components/admin/ArticleEditForm";

export const dynamic = "force-dynamic";

export default function AdminArticleNew() {
  return (
    <>
      <AdminHeading title="New article" />
      <ArticleEditForm
        article={{
          id: null,
          handle: "",
          title: "",
          author: "",
          excerpt: "",
          bodyHtml: "",
          heroImage: null,
          status: "DRAFT",
          metaTitle: null,
          metaDescription: null,
        }}
      />
    </>
  );
}
