import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductForm } from "@/components/product/ProductForm";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollections, getProduct, getProducts } from "@/lib/data";
import { breadcrumbJsonLd, buildMetadata, descriptionFromHtml, productJsonLd } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};
  return buildMetadata({
    title: product.metaTitle ?? product.title,
    description:
      product.metaDescription ?? descriptionFromHtml(product.bodyHtml, product.title),
    path: `/products/${product.handle}`,
    image: product.images[0]?.src,
  });
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  // Related products: same collection, excluding this one
  const collections = await getCollections();
  const home = collections.find((c) => c.productHandles.includes(product.handle));
  const all = await getProducts();
  const related = home
    ? home.productHandles
        .filter((h) => h !== product.handle)
        .map((h) => all.find((p) => p.handle === h))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 4)
    : [];

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            ...(home ? [{ name: home.title, path: `/collections/${home.handle}` }] : []),
            { name: product.title, path: `/products/${product.handle}` },
          ]),
        ]}
      />
      <Container className="py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink hover:underline">
                Home
              </Link>
            </li>
            {home && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/collections/${home.handle}`} className="hover:text-ink hover:underline">
                    {home.title}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {product.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} title={product.title} />
          <div>
            <h1 className="font-display text-display-md leading-[1.1] text-balance">
              {product.title}
            </h1>
            {product.vendor && (
              <p className="mt-2 text-sm tracking-wide text-stone uppercase">{product.vendor}</p>
            )}
            <div className="mt-5">
              <ProductForm product={product} />
            </div>
            {product.bodyHtml && (
              <div
                className="prose mt-8 border-t border-line pt-8"
                dangerouslySetInnerHTML={{ __html: product.bodyHtml }}
              />
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-20">
            <h2 id="related-heading" className="mb-8 font-display text-display-sm">
              You may also like
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
