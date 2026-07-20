import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductForm } from "@/components/product/ProductForm";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollections, getPage, getProduct, getProducts } from "@/lib/data";
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

  // Size & fit guidance rendered at the point of decision
  const sizeFit = await getPage("faqs-on-size-fit");

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
        <nav aria-label="Breadcrumb" className="mb-8 text-xs tracking-[0.08em] text-stone">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-clay">
                Home
              </Link>
            </li>
            {home && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/collections/${home.handle}`} className="hover:text-clay">
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

          {/* Buy column stays in view while the gallery scrolls */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h1 className="font-display text-display-md leading-[1.1] text-balance">
              {product.title}
            </h1>
            {product.vendor && (
              <p className="mt-2 font-display text-[10px] tracking-[0.25em] text-stone uppercase">
                {product.vendor}
              </p>
            )}
            <div className="mt-6">
              <ProductForm product={product} />
            </div>

            <p className="mt-5 border-t border-line pt-4 text-xs tracking-[0.06em] text-stone">
              Yoco secure checkout · Delivery by The Courier Guy · 2–5 business days
            </p>

            {sizeFit && (
              <details className="group mt-4 border-t border-line pt-4">
                <summary className="cursor-pointer list-none font-display text-[11px] tracking-[0.2em] text-ink uppercase hover:text-clay [&::-webkit-details-marker]:hidden">
                  Size &amp; fit
                  <span aria-hidden className="ml-2 inline-block transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div
                  className="prose mt-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: sizeFit.bodyHtml }}
                />
              </details>
            )}

            {product.bodyHtml && (
              <details className="group mt-4 border-t border-b border-line py-4" open>
                <summary className="cursor-pointer list-none font-display text-[11px] tracking-[0.2em] text-ink uppercase hover:text-clay [&::-webkit-details-marker]:hidden">
                  Details &amp; care
                  <span aria-hidden className="ml-2 inline-block transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div
                  className="prose mt-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: product.bodyHtml }}
                />
              </details>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-24">
            <div className="mb-10 flex items-baseline gap-4 border-b border-line pb-4">
              <h2
                id="related-heading"
                className="font-display text-[10px] tracking-[0.3em] text-stone uppercase"
              >
                You may also like
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
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
