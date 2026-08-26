// Google Merchant Center feed at /feed.xml — the URL to hand to Merchant
// Center as a scheduled fetch.
//
// Served from the same data layer as the storefront, so the feed can never
// advertise a price or an availability the product page does not show.

import { getCollections, getProducts } from "@/lib/data";
import { buildFeedItems, feedToXml } from "@/lib/feed";

// Revalidated rather than static: prices and stock change in the admin, and a
// feed Merchant Center refetches daily must not serve a build-time snapshot.
export const revalidate = 3600;

export async function GET() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);

  // First collection a product belongs to, used to infer a Google category for
  // the twenty products that carry no productType.
  const collectionOf = new Map<string, string>();
  for (const collection of collections) {
    for (const handle of collection.productHandles) {
      if (!collectionOf.has(handle)) collectionOf.set(handle, collection.handle);
    }
  }

  const xml = feedToXml(buildFeedItems(products, collectionOf));

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
