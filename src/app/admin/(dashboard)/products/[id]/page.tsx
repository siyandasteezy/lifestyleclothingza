import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminHeading } from "@/components/admin/ui";
import { ProductEditForm } from "@/components/admin/ProductEditForm";

export const dynamic = "force-dynamic";

async function loadSuggestions() {
  const products = await prisma.product.findMany({
    select: { vendor: true, productType: true, tags: true },
  });
  const uniq = (values: string[]) =>
    Array.from(new Set(values.filter((v) => v && v.trim().length > 0))).sort((a, b) =>
      a.localeCompare(b),
    );
  return {
    vendors: uniq(products.map((p) => p.vendor)),
    productTypes: uniq(products.map((p) => p.productType)),
    tags: uniq(products.flatMap((p) => p.tags)),
  };
}

export default async function AdminProductEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, suggestions] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
      },
    }),
    loadSuggestions(),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminHeading title={product.title} />
      <ProductEditForm
        suggestions={suggestions}
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
