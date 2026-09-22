import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProducts } from "@/lib/data";
import { breadcrumbJsonLd, buildMetadata, collectionJsonLd } from "@/lib/seo";
import { formatMoney } from "@/lib/money";
import {
  eligibleSizes,
  fromPriceCents,
  isPlusSize,
  productsInSize,
  sizeFromSlug,
  sizeSlug,
} from "@/lib/sizes";

export const revalidate = 300;

interface Props {
  params: Promise<{ size: string }>;
}

/**
 * Only sizes that clear the product threshold get a route at all. A size nobody
 * stocks 404s rather than serving an empty page.
 */
export async function generateStaticParams() {
  const products = await getProducts();
  return eligibleSizes(products).map((size) => ({ size: sizeSlug(size) }));
}

/** What the page says about itself, derived from stock rather than invented. */
async function load(slug: string) {
  const size = sizeFromSlug(slug);
  if (!size) return null;
  const all = await getProducts();
  if (!eligibleSizes(all).includes(size)) return null;
  const products = productsInSize(all, size);
  return { size, products, from: fromPriceCents(products) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { size: slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const { size, products, from } = data;

  const title = isPlusSize(size)
    ? `Plus Size Streetwear in ${size}`
    : `Streetwear in Size ${size}`;
  const priced = from ? ` from ${formatMoney(from)}` : "";

  return buildMetadata({
    title,
    description: `${products.length} pieces available in ${size}${priced}. Hoodies, tees and more, delivered across South Africa.`,
    path: `/shop/${sizeSlug(size)}`,
    image: products[0]?.images[0]?.src,
    // Every product offering S also offers 4XL, so the straight-size facets are
    // the same list of products under a different heading. They stay crawlable
    // and followed — links from them still count — but only the plus sizes,
    // which answer a real query and carry the positioning, go in the index.
    noIndex: !isPlusSize(size),
  });
}

export default async function SizePage({ params }: Props) {
  const { size: slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { size, products, from } = data;

  const allProducts = await getProducts();
  const siblings = eligibleSizes(allProducts);
  const heading = isPlusSize(size)
    ? `Plus Size Streetwear in ${size}`
    : `Streetwear in Size ${size}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop by size", path: `/shop/${sizeSlug(size)}` },
            { name: size, path: `/shop/${sizeSlug(size)}` },
          ]),
          collectionJsonLd(
            { handle: `shop/${sizeSlug(size)}`, title: heading, descriptionHtml: "" },
            products,
          ),
        ]}
      />
      <Container className="py-12 md:py-16">
        <header className="mb-10 max-w-3xl">
          <p className="folio text-lg text-stone">
            {String(products.length).padStart(2, "0")}
            <span className="ml-2 font-display text-[10px] tracking-[0.25em] uppercase not-italic">
              piece{products.length === 1 ? "" : "s"}
            </span>
          </p>
          <h1 className="mt-3 font-display text-display-lg leading-[1.05] text-balance uppercase">
            {heading}
          </h1>
          {/* Stated from stock, not claimed. The longer piece of copy each of
              these pages needs to rank is a writing job, not a rendering one. */}
          <p className="prose mt-6 font-light">
            {products.length} {products.length === 1 ? "piece" : "pieces"} in our range come in{" "}
            {size}
            {from ? `, from ${formatMoney(from)}` : ""}.{" "}
            {isPlusSize(size)
              ? "Cut for real bodies, not scaled up from a smaller pattern."
              : "Same cuts, same fabrics, across the full size range."}{" "}
            Delivered anywhere in South Africa by The Courier Guy.
          </p>
        </header>

        <nav aria-label="Shop by size" className="mb-10 border-y border-line py-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="font-display text-[10px] tracking-[0.25em] text-stone uppercase">
              Shop by size
            </span>
            {siblings.map((s) => (
              <Link
                key={s}
                href={`/shop/${sizeSlug(s)}`}
                aria-current={s === size ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs tracking-[0.06em] transition sm:min-h-8 ${
                  s === size
                    ? "border-ink bg-ink text-bone"
                    : "border-line text-ink hover:border-ink"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </nav>

        <ProductGrid products={products} priorityCount={4} editorial />
      </Container>
    </>
  );
}
