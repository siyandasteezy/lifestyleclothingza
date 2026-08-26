// GA4 ecommerce events.
//
// The store had Google Analytics loaded but sent nothing except pageviews — no
// purchase, no add_to_cart, no begin_checkout — so no revenue could be
// attributed to a channel. These helpers build the item-level payloads GA4
// expects and keep every money value in rand, since the database stores cents
// and sending 35000 instead of 350.00 would silently inflate revenue 100x.

import type { ProductVM, ProductVariantVM, ResolvedCartLine } from "@/lib/types";

export const CURRENCY = "ZAR";

/**
 * Queues a GA4 event.
 *
 * Deliberately not @next/third-parties' sendGAEvent: that no-ops with a console
 * warning until its GoogleAnalytics component has initialised, and gtag.js loads
 * after hydration — so on a static page the event fires first and is dropped.
 * Verified: a view_item sent that way never reached the dataLayer.
 *
 * Pushing straight onto dataLayer is Google's own gtag() shim. Anything queued
 * before gtag.js arrives is replayed when it loads, so nothing is lost to the
 * race. With no NEXT_PUBLIC_GA_ID the array simply accumulates unread.
 */
export function trackEvent(name: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  function gtag(..._args: unknown[]) {
    // The arguments object, not the rest array: gtag.js reads its command queue
    // as arguments-shaped entries, which is what Google's own snippet pushes.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  }
  gtag("event", name, params);
}

/** GA4 ecommerce item. Field names are GA4's, not ours. */
export interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_brand?: string;
  item_variant?: string;
  item_category?: string;
}

/** Cents to rand, rounded to 2dp — GA4 wants a decimal, the database holds cents. */
export function toRand(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Stable per-variant id. Matches the sku used in Product schema and the id a
 * Merchant Center feed will use, so GA4, the feed and the structured data all
 * describe the same thing.
 */
export function itemId(productHandle: string, variant?: { sku: string; position: number } | null): string {
  if (!variant) return productHandle;
  return variant.sku || `${productHandle}-${variant.position}`;
}

export function itemFromProduct(
  product: ProductVM,
  variant?: ProductVariantVM | null,
  quantity = 1,
): GaItem {
  return {
    item_id: itemId(product.handle, variant),
    item_name: product.title,
    price: toRand(variant ? variant.priceCents : product.minPriceCents),
    quantity,
    ...(product.vendor ? { item_brand: product.vendor } : {}),
    ...(variant && variant.title !== "Default Title" ? { item_variant: variant.title } : {}),
    ...(product.productType ? { item_category: product.productType } : {}),
  };
}

export function itemsFromCart(lines: ResolvedCartLine[]): GaItem[] {
  return lines.map((line) => itemFromProduct(line.product, line.variant, line.quantity));
}

/** Order line as stored on the order — a snapshot, not a live product. */
export interface OrderItemLike {
  title: string;
  variantTitle: string;
  quantity: number;
  priceCents: number;
}

export function itemsFromOrder(items: OrderItemLike[]): GaItem[] {
  return items.map((item) => ({
    // Orders snapshot their lines, and the variant they referenced may since
    // have been deleted, so fall back to the stored title.
    item_id: item.title,
    item_name: item.title,
    price: toRand(item.priceCents),
    quantity: item.quantity,
    ...(item.variantTitle && item.variantTitle !== "Default Title"
      ? { item_variant: item.variantTitle }
      : {}),
  }));
}
