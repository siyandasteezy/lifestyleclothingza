// Google Merchant Center product feed (RSS 2.0 with the g: namespace).
//
// One entry per VARIANT, not per product. Sizes to 5XL are the store's whole
// differentiator, so each size has to be separately addressable in Shopping —
// grouped back together by item_group_id, which is the product handle.
//
// Ids match the sku emitted in Product schema and the item_id sent to GA4, so
// structured data, analytics and the feed all name the same thing.

import { absoluteUrl, site } from "@/lib/site";
import { itemId } from "@/lib/analytics";
import type { ProductVM, ProductVariantVM } from "@/lib/types";

export const FEED_CURRENCY = "ZAR";

/**
 * Google product taxonomy paths, by product type and then by collection.
 *
 * Paths rather than numeric ids: a wrong number is silently wrong, whereas a
 * wrong path is rejected and visible. Twenty of the migrated products have no
 * productType at all, so collection membership is the fallback signal.
 *
 * VERIFY against Google's published taxonomy before the first submission —
 * these are the categories the catalogue appears to fall into, not a mapping
 * confirmed against the official list.
 */
const CATEGORY_BY_TYPE: Record<string, string> = {
  cap: "Apparel & Accessories > Clothing Accessories > Hats",
  beanie: "Apparel & Accessories > Clothing Accessories > Hats",
  tshirt: "Apparel & Accessories > Clothing > Shirts & Tops",
  hoodie: "Apparel & Accessories > Clothing > Shirts & Tops",
  shorts: "Apparel & Accessories > Clothing > Shorts",
  "wind-breaker": "Apparel & Accessories > Clothing > Outerwear",
  jewellery: "Apparel & Accessories > Jewelry",
};

const CATEGORY_BY_COLLECTION: Record<string, string> = {
  headwear: "Apparel & Accessories > Clothing Accessories > Hats",
  "winter-hats": "Apparel & Accessories > Clothing Accessories > Hats",
  "hoodie-collection": "Apparel & Accessories > Clothing > Shirts & Tops",
  "short-sleeve-t-shirts": "Apparel & Accessories > Clothing > Shirts & Tops",
  "croppie-tee": "Apparel & Accessories > Clothing > Shirts & Tops",
  dresses: "Apparel & Accessories > Clothing > Dresses",
  shorts: "Apparel & Accessories > Clothing > Shorts",
  "summer-silky-scarfs": "Apparel & Accessories > Clothing Accessories > Scarves & Shawls",
  "everyday-summer-socks": "Apparel & Accessories > Clothing > Underwear & Socks > Socks",
  accessories: "Apparel & Accessories",
};

/**
 * Last resort before the generic category: read the product's own name.
 *
 * Two thirds of the migrated catalogue carries no productType, and a product
 * added through the admin need not have one either, so without this a "Ladies
 * Puffy Jacket" would be filed as unspecified clothing. Ordered, first match
 * wins — "puffy jacket" must reach outerwear before anything broader.
 */
const CATEGORY_BY_KEYWORD: [RegExp, string][] = [
  [/beanie|\bcap\b|\bhat\b|bucket/i, "Apparel & Accessories > Clothing Accessories > Hats"],
  [/jacket|coat|puffer|puffy|windbreaker|wind-breaker/i, "Apparel & Accessories > Clothing > Outerwear"],
  [/\bsock/i, "Apparel & Accessories > Clothing > Underwear & Socks > Socks"],
  [/scarf|scarves/i, "Apparel & Accessories > Clothing Accessories > Scarves & Shawls"],
  [/pendant|necklace|chain|jewel/i, "Apparel & Accessories > Jewelry"],
  [/dress\b/i, "Apparel & Accessories > Clothing > Dresses"],
  [/short/i, "Apparel & Accessories > Clothing > Shorts"],
  [/tee|t-shirt|tshirt|shirt|hoodie|sweat|croppie|crop\b|jersey|top\b/i, "Apparel & Accessories > Clothing > Shirts & Tops"],
];

const DEFAULT_CATEGORY = "Apparel & Accessories > Clothing";

export interface FeedItem {
  id: string;
  item_group_id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  additional_image_link: string[];
  availability: "in_stock" | "out_of_stock";
  price: string;
  sale_price?: string;
  brand: string;
  condition: "new";
  identifier_exists: "no";
  google_product_category: string;
  product_type?: string;
  size?: string;
  color?: string;
  gender: "male" | "female" | "unisex";
  age_group: "adult";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Value of the option whose name matches, for this variant. */
function optionValue(product: ProductVM, variant: ProductVariantVM, pattern: RegExp): string | null {
  const option = product.options.find((o) => pattern.test(o.name));
  if (!option) return null;
  const value = [variant.option1, variant.option2, variant.option3][option.position - 1];
  return value && value !== "Default Title" ? value : null;
}

function genderOf(product: ProductVM, variant: ProductVariantVM): FeedItem["gender"] {
  const value = optionValue(product, variant, /gender/i)?.toLowerCase();
  if (value === "female" || value === "women" || value === "womens") return "female";
  if (value === "male" || value === "men" || value === "mens") return "male";
  // Google requires gender on apparel and the catalogue is largely unisex by
  // design, so unisex is the honest default rather than a guess at male.
  return "unisex";
}

function categoryOf(product: ProductVM, collectionHandle: string | undefined): string {
  const byType = CATEGORY_BY_TYPE[product.productType.trim().toLowerCase()];
  if (byType) return byType;
  if (collectionHandle && CATEGORY_BY_COLLECTION[collectionHandle]) {
    return CATEGORY_BY_COLLECTION[collectionHandle];
  }
  const name = `${product.title} ${product.handle}`;
  for (const [pattern, category] of CATEGORY_BY_KEYWORD) {
    if (pattern.test(name)) return category;
  }
  return DEFAULT_CATEGORY;
}

const money = (cents: number) => `${(cents / 100).toFixed(2)} ${FEED_CURRENCY}`;

/**
 * Builds one feed entry per variant.
 *
 * Products with no image are skipped: Merchant Center disapproves them, and a
 * disapproved item is silent lost revenue rather than a visible error.
 */
export function buildFeedItems(
  products: ProductVM[],
  collectionOf: Map<string, string>,
): FeedItem[] {
  const items: FeedItem[] = [];

  for (const product of products) {
    const image = product.images[0];
    if (!image) continue;

    const description = stripHtml(product.bodyHtml) || product.title;
    const category = categoryOf(product, collectionOf.get(product.handle));
    const brand = product.vendor || site.name;

    for (const variant of product.variants) {
      const size = optionValue(product, variant, /size/i);
      const colour = optionValue(product, variant, /colou?r/i);

      // Variant title carries colour and size, which is what Shopping matches
      // on — the page title tag is a separate thing and stays as it is.
      const suffix = [colour, size].filter(Boolean).join(", ");
      const title = suffix ? `${product.title} — ${suffix}` : product.title;

      // compareAtCents is the "was" price, so it becomes price and the current
      // one becomes sale_price. Reversing these advertises the wrong number.
      const onSale = variant.compareAtCents != null && variant.compareAtCents > variant.priceCents;

      items.push({
        id: itemId(product.handle, variant),
        item_group_id: product.handle,
        title,
        description,
        link: absoluteUrl(`/products/${product.handle}`),
        image_link: absoluteUrl(image.src),
        additional_image_link: product.images.slice(1, 11).map((i) => absoluteUrl(i.src)),
        availability: variant.available ? "in_stock" : "out_of_stock",
        price: money(onSale ? variant.compareAtCents! : variant.priceCents),
        ...(onSale ? { sale_price: money(variant.priceCents) } : {}),
        brand,
        condition: "new",
        // No GTINs or MPNs on this catalogue. Without this flag Merchant Center
        // disapproves the items for a missing unique identifier.
        identifier_exists: "no",
        google_product_category: category,
        ...(product.productType ? { product_type: product.productType } : {}),
        ...(size ? { size } : {}),
        ...(colour ? { color: colour } : {}),
        gender: genderOf(product, variant),
        age_group: "adult",
      });
    }
  }

  return items;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string): string {
  return `      <g:${name}>${escapeXml(value)}</g:${name}>`;
}

export function feedToXml(items: FeedItem[]): string {
  const entries = items
    .map((item) => {
      const lines = [
        tag("id", item.id),
        tag("item_group_id", item.item_group_id),
        `      <title>${escapeXml(item.title)}</title>`,
        `      <description>${escapeXml(item.description)}</description>`,
        `      <link>${escapeXml(item.link)}</link>`,
        tag("image_link", item.image_link),
        ...item.additional_image_link.map((url) => tag("additional_image_link", url)),
        tag("availability", item.availability),
        tag("price", item.price),
        ...(item.sale_price ? [tag("sale_price", item.sale_price)] : []),
        tag("brand", item.brand),
        tag("condition", item.condition),
        tag("identifier_exists", item.identifier_exists),
        tag("google_product_category", item.google_product_category),
        ...(item.product_type ? [tag("product_type", item.product_type)] : []),
        ...(item.size ? [tag("size", item.size)] : []),
        ...(item.color ? [tag("color", item.color)] : []),
        tag("gender", item.gender),
        tag("age_group", item.age_group),
      ];
      return `    <item>\n${lines.join("\n")}\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml(site.metaDescription)}</description>
${entries}
  </channel>
</rss>
`;
}
