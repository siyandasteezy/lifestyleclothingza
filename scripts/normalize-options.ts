// Normalises product option values and vendor names in the content archive.
//
// The Shopify migration left the same size expressed several ways ("L" and
// "Large", "XXL" and "2XL"), plus a couple of colour typos. Anything that reads
// the size field — the Merchant Center feed, per-variant Offer schema, size
// facet pages — fragments on those duplicates, so they are normalised at the
// source rather than patched at each read site.
//
// Vendor gets the same treatment: it is the `brand` in Product schema and in the
// feed, and it arrived as three different strings including Shopify's "My Store"
// placeholder.
//
// Re-runnable and idempotent. Run with: npx tsx scripts/normalize-options.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCTS_PATH = join(process.cwd(), "content", "products.json");

/** Canonical size ladder. Keys are lowercased for lookup. */
const SIZE_MAP: Record<string, string> = {
  xsmall: "XS",
  "x-small": "XS",
  "extra small": "XS",
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
  "x-large": "XL",
  "extra large": "XL",
  xxl: "2XL",
  xxxl: "3XL",
  xxxxl: "4XL",
  xxxxxl: "5XL",
};

const COLOUR_MAP: Record<string, string> = {
  siliver: "Silver",
  grey: "Gray",
};

/** Sort order for sizes so option lists read XS → 5XL rather than alphabetically. */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

interface Option {
  name: string;
  position: number;
  values: string[];
}

interface Variant {
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  [key: string]: unknown;
}

interface Product {
  handle: string;
  vendor?: string;
  options?: Option[];
  variants?: Variant[];
  [key: string]: unknown;
}

/** The one canonical brand string, matching content/site.json `name`. */
const BRAND = "Lifestyle Clothing ZA";

type Kind = "size" | "colour" | null;

function kindOf(optionName: string): Kind {
  const n = optionName.toLowerCase();
  if (n.includes("size")) return "size";
  if (n.includes("color") || n.includes("colour")) return "colour";
  return null;
}

function normalise(value: string, kind: Kind): string {
  const trimmed = value.trim();
  if (!kind) return trimmed;
  const map = kind === "size" ? SIZE_MAP : COLOUR_MAP;
  const mapped = map[trimmed.toLowerCase()];
  if (mapped) return mapped;
  // Already canonical sizes are uppercased so "2xl" and "2XL" collapse together.
  if (kind === "size" && SIZE_ORDER.includes(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function sortSizes(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const products: Product[] = JSON.parse(readFileSync(PRODUCTS_PATH, "utf8"));

const changes: string[] = [];
const collisions: string[] = [];

for (const product of products) {
  // Every product is our own brand; the variation is migration noise, not data.
  if (product.vendor !== BRAND) {
    changes.push(`${product.handle} · vendor: "${product.vendor}" → "${BRAND}"`);
    product.vendor = BRAND;
  }

  // Option position N maps to variant.optionN, so remember each position's kind.
  const kindByPosition = new Map<number, Kind>();

  for (const option of product.options ?? []) {
    const kind = kindOf(option.name);
    kindByPosition.set(option.position, kind);
    if (!kind) continue;

    const before = option.values;
    const mapped = before.map((v) => normalise(v, kind));
    const deduped = [...new Set(mapped)];
    const next = kind === "size" ? sortSizes(deduped) : deduped;

    if (JSON.stringify(before) !== JSON.stringify(next)) {
      changes.push(`${product.handle} · ${option.name}: [${before}] → [${next}]`);
      option.values = next;
    }
  }

  // Rewrite variant option values, then rebuild the variant title from them so
  // the displayed label ("White / Large") cannot drift from the option values.
  const seen = new Map<string, string>();
  for (const variant of product.variants ?? []) {
    const parts: string[] = [];
    for (const position of [1, 2, 3] as const) {
      const key = `option${position}` as const;
      const raw = variant[key];
      if (raw == null) continue;
      const next = normalise(raw, kindByPosition.get(position) ?? null);
      if (next !== raw) variant[key] = next;
      parts.push(next);
    }

    if (parts.length) {
      const title = parts.join(" / ");
      if (variant.title !== title && variant.title !== "Default Title") {
        variant.title = title;
      }
      // Two variants collapsing to one label means the product genuinely had
      // e.g. both an "L" and a "Large" SKU. Never merge those silently.
      const previous = seen.get(title);
      if (previous) {
        collisions.push(`${product.handle}: duplicate variant "${title}"`);
      }
      seen.set(title, title);
      void previous;
    }
  }
}

// 1-space indent matches how the archive was written at migration time, so the
// diff stays limited to the values that actually changed.
writeFileSync(PRODUCTS_PATH, `${JSON.stringify(products, null, 1)}\n`);

console.log(`${changes.length} option value change(s):`);
for (const change of changes) console.log(`  ${change}`);

if (collisions.length) {
  console.log(`\n⚠ ${collisions.length} variant collision(s) — resolve by hand:`);
  for (const collision of collisions) console.log(`  ${collision}`);
} else {
  console.log("\nNo variant collisions.");
}
