import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Container } from "@/components/ui/Container";
import { getProducts } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: "Search the Lifestyle Clothing ZA catalog.",
  path: "/search",
  noIndex: true,
});

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const all = await getProducts();
  const results = query
    ? all.filter((p) =>
        [p.title, p.productType, p.vendor, ...p.tags]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : [];

  return (
    <Container className="py-10 md:py-14">
      <h1 className="font-display text-display-md">Search our site</h1>
      <form action="/search" method="get" role="search" className="mt-6 max-w-xl">
        <label htmlFor="search-input" className="sr-only">
          Search products
        </label>
        <div className="flex overflow-hidden border border-line bg-paper focus-within:border-ink">
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="w-full bg-transparent px-5 py-3 text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 bg-ink px-6 font-display text-[11px] tracking-[0.2em] uppercase text-bone transition hover:bg-clay"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mt-10">
        {query ? (
          <>
            <p className="mb-6 text-sm text-stone" aria-live="polite">
              {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
            </p>
            <ProductGrid products={results} />
          </>
        ) : (
          <p className="text-stone">Type something to search the catalog.</p>
        )}
      </div>
    </Container>
  );
}
