import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollection, getCollectionProducts, getCollections } from "@/lib/data";
import { breadcrumbJsonLd, buildMetadata, descriptionFromHtml } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateStaticParams() {
  const collections = await getCollections();
  return [{ handle: "all" }, ...collections.map((c) => ({ handle: c.handle }))];
}

async function loadCollection(handle: string) {
  if (handle === "all") {
    return {
      handle: "all",
      title: "Products",
      descriptionHtml: "",
      image: null,
      metaTitle: "Products",
      metaDescription: `Shop the full catalog from Lifestyle Clothing ZA.`,
    };
  }
  return getCollection(handle);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const collection = await loadCollection(handle);
  if (!collection) return {};
  return buildMetadata({
    title: collection.metaTitle ?? collection.title,
    description:
      collection.metaDescription ??
      descriptionFromHtml(collection.descriptionHtml, collection.title),
    path: `/collections/${handle}`,
    image: collection.image,
  });
}

export default async function CollectionPage({ params }: Props) {
  const { handle } = await params;
  const collection = await loadCollection(handle);
  if (!collection) notFound();
  const products = await getCollectionProducts(handle);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: collection.title, path: `/collections/${handle}` },
        ])}
      />
      <Container className="py-10 md:py-14">
        <header className="mb-10 max-w-3xl">
          <h1 className="font-display text-display-lg leading-[1.05] text-balance">
            {collection.title}
          </h1>
          {collection.descriptionHtml && (
            <div
              className="prose mt-4"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          )}
        </header>
        <ProductGrid products={products} priorityCount={4} />
      </Container>
    </>
  );
}
