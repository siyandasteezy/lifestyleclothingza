import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminHeading } from "@/components/admin/ui";
import { ProductEditForm } from "@/components/admin/ProductEditForm";

export const dynamic = "force-dynamic";

export default async function AdminProductEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!product) notFound();

  return (
    <>
      <AdminHeading title={product.title} />
      <ProductEditForm
        product={{
          id: product.id,
          handle: product.handle,
          title: product.title,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          status: product.status,
          bodyHtml: product.bodyHtml,
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
          variants: product.variants.map((v) => ({
            id: v.id,
            title: v.title,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            available: v.available,
            inventoryQty: v.inventoryQty,
          })),
          images: product.images.map((i) => ({ id: i.id, src: i.src, alt: i.alt })),
        }}
      />
    </>
  );
}
