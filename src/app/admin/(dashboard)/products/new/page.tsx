import { prisma } from "@/lib/db";
import { AdminHeading } from "@/components/admin/ui";
import { ProductCreateForm } from "@/components/admin/ProductCreateForm";

export const dynamic = "force-dynamic";

/** Collect existing vendors, product types, tags, and option names to power the
 *  datalist suggestions — so the owner sees what's already in the catalog while
 *  still being able to type in a brand-new value. */
async function loadSuggestions() {
  const [products, options] = await Promise.all([
    prisma.product.findMany({ select: { vendor: true, productType: true, tags: true } }),
    prisma.productOption.findMany({ select: { name: true } }),
  ]);
  const uniq = (values: string[]) =>
    Array.from(new Set(values.filter((v) => v && v.trim().length > 0))).sort((a, b) =>
      a.localeCompare(b),
    );
  return {
    vendors: uniq(products.map((p) => p.vendor)),
    productTypes: uniq(products.map((p) => p.productType)),
    tags: uniq(products.flatMap((p) => p.tags)),
    optionNames: uniq(options.map((o) => o.name)),
  };
}

export default async function AdminProductNew() {
  const suggestions = await loadSuggestions();
  return (
    <>
      <AdminHeading title="New product" />
      <ProductCreateForm suggestions={suggestions} />
    </>
  );
}
