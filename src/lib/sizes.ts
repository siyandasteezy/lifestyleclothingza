// Size facet pages — /shop/5xl and friends.
//
// The wedge strategy needs URLs a search engine can reach and rank: a filter
// that only exists in JavaScript has nothing to rank. So every size a shopper
// can filter by is a real, server-rendered route.
//
// Indexing them all would be a mistake, though. Every product that offers S
// also offers 4XL, so those facets list an identical set of products — seven
// pages of the same thing. Only the plus sizes are both commercially distinct
// ("5XL hoodie south africa" is a real query; "size medium streetwear" is not)
// and the reason the positioning exists at all. The rest are crawlable and
// followed, so they pass equity and stay usable, but are kept out of the index.

import type { ProductVM } from "@/lib/types";

/** Canonical ladder, matching scripts/normalize-options.ts. */
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;
export type SizeLabel = (typeof SIZE_ORDER)[number];

/**
 * Below this a facet is a liability rather than an asset — a page that exists
 * to show two products invites a thin-content judgement on the whole set.
 */
export const MIN_PRODUCTS_PER_FACET = 3;

/** Sizes worth putting in the index. Everything else is noindex, follow. */
const INDEXABLE: readonly string[] = ["2XL", "3XL", "4XL", "5XL"];

export function isPlusSize(size: string): boolean {
  return INDEXABLE.includes(size);
}

export function sizeSlug(size: string): string {
  return size.toLowerCase();
}

/** Resolves a URL segment back to a canonical size, or null if it is not one. */
export function sizeFromSlug(slug: string): SizeLabel | null {
  const match = SIZE_ORDER.find((s) => sizeSlug(s) === slug.toLowerCase());
  return match ?? null;
}

/** Products offering this size, judged by the product's declared size option. */
export function productsInSize(products: ProductVM[], size: string): ProductVM[] {
  return products.filter((p) =>
    p.options.some((o) => /size/i.test(o.name) && o.values.includes(size)),
  );
}

/**
 * Sizes with enough products to deserve a page, in ladder order.
 *
 * This is the guardrail: a size nobody stocks, or stocks barely, gets no URL at
 * all rather than an empty one.
 */
export function eligibleSizes(products: ProductVM[]): SizeLabel[] {
  return SIZE_ORDER.filter(
    (size) => productsInSize(products, size).length >= MIN_PRODUCTS_PER_FACET,
  );
}

/** Cheapest price across the products in a size, for honest derived copy. */
export function fromPriceCents(products: ProductVM[]): number | null {
  const prices = products.map((p) => p.minPriceCents).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Distinct product types in the set, for naming what is actually available. */
export function categoriesIn(products: ProductVM[]): string[] {
  const seen = new Set<string>();
  for (const p of products) {
    const type = p.productType.trim();
    if (type) seen.add(type.toLowerCase());
  }
  return [...seen].sort();
}
