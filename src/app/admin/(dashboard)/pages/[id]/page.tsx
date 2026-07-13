import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminHeading } from "@/components/admin/ui";
import { PageEditForm } from "@/components/admin/PageEditForm";

export const dynamic = "force-dynamic";

export default async function AdminPageEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <>
      <AdminHeading title={page.title} />
      <PageEditForm
        page={{
          id: page.id,
          handle: page.handle,
          title: page.title,
          bodyHtml: page.bodyHtml,
          status: page.status,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
        }}
      />
    </>
  );
}
