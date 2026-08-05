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
// Two targets, because the archive is no longer the whole catalogue:
//
//   --content  rewrites content/products.json (the migrated 34)
//   --db       normalises the live database, including products created in the
//              admin, which never passed through the archive at all and so
//              still carry "Small" / "Large" while the rest use "S" / "L"
//
// The database pass matters on its own: SEED_IF_EMPTY means content/*.json no
// longer reaches a live store, and a product added through the admin can
// introduce an unnormalised size at any time.
//
// Re-runnable and idempotent.
//   npx tsx scripts/normalize-options.ts --content
//   DATABASE_URL="<prod>" npx tsx scripts/normalize-options.ts --db

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

/**
 * Normalises one product in place and reports what changed.
 *
 * Shared by both targets so the archive and the database can never end up with
 * different ideas of what a canonical size is.
 */
function normaliseProduct(
  product: Product,
  changes: string[],
  collisions: string[],
): void {
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
  const seen = new Set<string>();
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
      if (seen.has(title)) {
        collisions.push(`${product.handle}: duplicate variant "${title}"`);
      }
      seen.add(title);
    }
  }
}

function report(target: string, changes: string[], collisions: string[]): void {
  console.log(`${target}: ${changes.length} change(s)`);
  for (const change of changes) console.log(`  ${change}`);
  if (collisions.length) {
    console.log(`\n⚠ ${collisions.length} variant collision(s) — resolve by hand:`);
    for (const collision of collisions) console.log(`  ${collision}`);
  } else {
    console.log("  no variant collisions");
  }
}

function normaliseContent(): void {
  const products: Product[] = JSON.parse(readFileSync(PRODUCTS_PATH, "utf8"));
  const changes: string[] = [];
  const collisions: string[] = [];
  for (const product of products) normaliseProduct(product, changes, collisions);

  // 1-space indent matches how the archive was written at migration time, so the
  // diff stays limited to the values that actually changed.
  writeFileSync(PRODUCTS_PATH, `${JSON.stringify(products, null, 1)}\n`);
  report("content/products.json", changes, collisions);
}

async function normaliseDb(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const changes: string[] = [];
  const collisions: string[] = [];

  try {
    const rows = await prisma.product.findMany({
      include: { options: { orderBy: { position: "asc" } }, variants: true },
    });

    for (const row of rows) {
      // Work on a copy so nothing is written when a product turns out to collide.
      const before = {
        vendor: row.vendor,
        options: row.options.map((o) => ({ name: o.name, position: o.position, values: [...o.values] })),
        variants: row.variants.map((v) => ({
          title: v.title,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
        })),
      };
      const draft: Product = {
        handle: row.handle,
        vendor: row.vendor,
        options: before.options.map((o) => ({ ...o, values: [...o.values] })),
        variants: before.variants.map((v) => ({ ...v })),
      };

      const productChanges: string[] = [];
      const productCollisions: string[] = [];
      normaliseProduct(draft, productChanges, productCollisions);

      if (productCollisions.length) {
        // Merging two real SKUs is not this script's call to make.
        collisions.push(...productCollisions);
        changes.push(`${row.handle}: SKIPPED, would collide`);
        continue;
      }
      if (productChanges.length === 0) continue;

      await prisma.$transaction(async (tx) => {
        if (draft.vendor !== row.vendor) {
          await tx.product.update({ where: { id: row.id }, data: { vendor: draft.vendor } });
        }
        for (const option of draft.options ?? []) {
          const original = row.options.find((o) => o.position === option.position);
          if (!original || JSON.stringify(original.values) === JSON.stringify(option.values)) continue;
          await tx.productOption.update({
            where: { productId_position: { productId: row.id, position: option.position } },
            data: { values: option.values },
          });
        }
        for (const [i, variant] of (draft.variants ?? []).entries()) {
          const original = row.variants[i];
          if (
            original.title === variant.title &&
            original.option1 === variant.option1 &&
            original.option2 === variant.option2 &&
            original.option3 === variant.option3
          ) {
            continue;
          }
          await tx.productVariant.update({
            where: { id: original.id },
            data: {
              title: variant.title,
              option1: variant.option1 as string | null,
              option2: variant.option2 as string | null,
              option3: variant.option3 as string | null,
            },
          });
        }
      });
      changes.push(...productChanges);
    }
  } finally {
    await prisma.$disconnect();
  }

  report("database", changes, collisions);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // Default to --content so the original invocation keeps working.
  if (args.includes("--content") || args.length === 0) normaliseContent();
  if (args.includes("--db")) await normaliseDb();
}

main();
