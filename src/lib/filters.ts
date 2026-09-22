// Price bands for collection pages.
//
// Fixed bands rather than a free range, for two reasons: they are drawn from
// the catalogue's actual spread (R100–R800), and an open range would mint an
// unbounded number of filtered URLs for crawlers to find.
//
// Price filtering runs in the browser and only syncs a query parameter, so
// collection pages stay statically prerendered. That is deliberate: a
// price-filtered view is not a page anyone should land on from search — it is
// the same products in a different order of usefulness — whereas SIZE facets
// (the plus-size wedge) do want real, indexable URLs of their own and should be
// built as routes, not query parameters.

import type { ProductVM } from "@/lib/types";

export interface PriceBand {
  /** Query-parameter value; part of a shareable URL, so keep it readable. */
  id: string;
  label: string;
  minCents: number;
  /** Exclusive upper bound. Infinity for the open-ended top band. */
  maxCents: number;
}

export const PRICE_BANDS: PriceBand[] = [
  { id: "under-200", label: "Under R200", minCents: 0, maxCents: 20000 },
  { id: "200-350", label: "R200 – R350", minCents: 20000, maxCents: 35000 },
  { id: "350-500", label: "R350 – R500", minCents: 35000, maxCents: 50000 },
  { id: "over-500", label: "R500+", minCents: 50000, maxCents: Infinity },
];

export function bandById(id: string | null | undefined): PriceBand | null {
  if (!id) return null;
  return PRICE_BANDS.find((b) => b.id === id) ?? null;
}

/**
 * A product matches when its cheapest variant falls in the band.
 *
 * Cheapest rather than any variant: the grid shows the "from" price, so
 * matching on anything else would show a product whose advertised price sits
 * outside the band the shopper picked.
 */
export function matchesBand(product: ProductVM, band: PriceBand | null): boolean {
  if (!band) return true;
  return product.minPriceCents >= band.minCents && product.minPriceCents < band.maxCents;
}

export function filterByBand(products: ProductVM[], band: PriceBand | null): ProductVM[] {
  if (!band) return products;
  return products.filter((p) => matchesBand(p, band));
}

/** How many of these products fall in each band — used to disable empty ones. */
export function countsByBand(products: ProductVM[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const band of PRICE_BANDS) {
    counts[band.id] = products.filter((p) => matchesBand(p, band)).length;
  }
  return counts;
}
