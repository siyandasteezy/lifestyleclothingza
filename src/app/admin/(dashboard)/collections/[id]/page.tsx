import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminHeading } from "@/components/admin/ui";
import { CollectionEditForm } from "@/components/admin/CollectionEditForm";

export const dynamic = "force-dynamic";

export default async function AdminCollectionEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: { product: { select: { id: true, handle: true, title: true } } },
      },
    },
  });
  if (!collection) notFound();

  return (
    <>
      <AdminHeading title={collection.title} />
      <CollectionEditForm
        collection={{
          id: collection.id,
          handle: collection.handle,
          title: collection.title,
          descriptionHtml: collection.descriptionHtml,
          image: collection.image,
          metaTitle: collection.metaTitle,
          metaDescription: collection.metaDescription,
          products: collection.products.map((p) => p.product),
        }}
      />
    </>
  );
}
