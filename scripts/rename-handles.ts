// Renames product and collection handles that shipped from staging.
//
// Four production URLs contain "copy" or "untitled", and two beanie slugs are
// transposed — /products/unisex-beanie-hat-faux-pearls-copy is the plain beanie
// while /products/unisex-beanie-hat-cozy-stylish-stretchy is the faux-pearl one.
// The URL is a primary relevance signal, so both point at the wrong product.
//
// Handles live in two places and BOTH must be updated together:
//
//   --content  rewrites content/*.json (the archive the seed reads)
//   --db       renames the rows in the database
//
// The database step is not optional. prisma/seed.ts upserts on handle, so a
// handle that only changed in JSON matches nothing, and the seed CREATES a
// second product while the old row stays live — duplicating the catalogue
// instead of renaming it. Vercel runs the seed on every deploy, so run --db
// against production before deploying the content change.
//
// Idempotent: rows or entries already renamed are reported and skipped.
//
//   npx tsx scripts/rename-handles.ts --content
//   DATABASE_URL="<prod>" npx tsx scripts/rename-handles.ts --db
//
// --db runs as part of `vercel-build`, between the schema push and the Next
// build, so the rename lands with the deploy that expects it rather than
// depending on someone running it at the right moment. It is idempotent and
// reports "already renamed" / "NOT FOUND" instead of failing, so it is safe on
// every later deploy and on a fresh, empty database. Once a deploy has applied
// it, the step can be dropped from vercel-build.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  COLLECTION_COPY_FIXES,
  COLLECTION_MERGES,
  COLLECTION_RENAMES,
  COLLECTION_TITLES,
  PRODUCT_RENAMES,
} from "../src/lib/handle-renames";

const CONTENT_DIR = join(process.cwd(), "content");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
}

/**
 * Writes back using the file's own indentation. The archive is not uniform —
 * products.json and collections.json are 1-space, site.json and homepage.json
 * are 2-space — and normalising them would bury a handful of real handle
 * changes under a whole-file reformat.
 */
function writeJson(file: string, data: unknown): void {
  const path = join(CONTENT_DIR, file);
  const secondLine = readFileSync(path, "utf8").split("\n")[1] ?? "";
  const indent = (secondLine.match(/^ +/)?.[0] ?? " ").length;
  writeFileSync(path, `${JSON.stringify(data, null, indent)}\n`);
}

/**
 * Rewrites every hand-written link in a config blob. Nav items and homepage
 * tiles reference collections by URL or by bare handle, so they move with the
 * rename or they 301-bounce on every click.
 *
 * Used for both content/*.json and the admin's homepage override in the
 * database, which is the same shape.
 */
function rewriteLinks(value: unknown, changes: string[]): unknown {
  if (Array.isArray(value)) return value.map((v) => rewriteLinks(v, changes));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // "handle" is the collection handle on a homepage collection tile;
      // bare handles and /collections/<h> paths are both covered below.
      if ((k === "href" || k === "collectionHandle" || k === "handle") && typeof v === "string") {
        const before = v;
        let after = v;
        for (const [from, to] of Object.entries(COLLECTION_RENAMES)) {
          after = after === from ? to : after.replace(`/collections/${from}`, `/collections/${to}`);
        }
        for (const [from, to] of Object.entries(PRODUCT_RENAMES)) {
          after = after === from ? to : after.replace(`/products/${from}`, `/products/${to}`);
        }
        if (after !== before) changes.push(`  link ${before} -> ${after}`);
        out[k] = after;
      } else {
        out[k] = rewriteLinks(v, changes);
      }
    }
    return out;
  }
  return value;
}

/**
 * Rewrites collection/product references in a config file's raw text, leaving
 * every byte of its formatting alone. Covers both forms these files use: a URL
 * path in "href", and a bare handle in "handle" / "collectionHandle".
 */
function rewriteLinksInText(file: string, changes: string[]): void {
  const path = join(CONTENT_DIR, file);
  let text = readFileSync(path, "utf8");

  const sub = (pattern: RegExp, replacement: string, label: string) => {
    const before = text;
    text = text.replace(pattern, replacement);
    if (text !== before) changes.push(`  ${file}: ${label}`);
  };

  for (const [from, to] of Object.entries(COLLECTION_RENAMES)) {
    sub(new RegExp(`/collections/${from}(?=["/])`, "g"), `/collections/${to}`, `/collections/${from} -> ${to}`);
    sub(
      new RegExp(`("(?:collectionHandle|handle)"\\s*:\\s*)"${from}"`, "g"),
      `$1"${to}"`,
      `handle "${from}" -> "${to}"`,
    );
  }
  for (const [from, to] of Object.entries(PRODUCT_RENAMES)) {
    sub(new RegExp(`/products/${from}(?=["/])`, "g"), `/products/${to}`, `/products/${from} -> ${to}`);
  }

  writeFileSync(path, text);
}

function renameContent(): void {
  const changes: string[] = [];

  const products = readJson<{ handle: string; title: string }[]>("products.json");
  for (const product of products) {
    const next = PRODUCT_RENAMES[product.handle];
    if (next) {
      changes.push(`product  ${product.handle} -> ${next}  (${product.title})`);
      product.handle = next;
    }
  }

  const collections = readJson<{ handle: string; title: string; productHandles: string[] }[]>(
    "collections.json",
  );
  for (const collection of collections) {
    // Title corrections are keyed by the ORIGINAL handle, so apply them before
    // the handle itself moves.
    const title = COLLECTION_TITLES[collection.handle];
    if (title && collection.title !== title) {
      changes.push(`collection ${collection.handle} title "${collection.title}" -> "${title}"`);
      collection.title = title;
    }
    for (const [find, replace] of COLLECTION_COPY_FIXES[collection.handle] ?? []) {
      const record = collection as unknown as { descriptionHtml?: string };
      if (!record.descriptionHtml?.includes(find)) continue;
      record.descriptionHtml = record.descriptionHtml.split(find).join(replace);
      changes.push(`collection ${collection.handle} copy: "${find}" -> "${replace}"`);
    }
    const next = COLLECTION_RENAMES[collection.handle];
    if (next) {
      changes.push(`collection ${collection.handle} -> ${next}  (${collection.title})`);
      collection.handle = next;
    }
    // Membership lists reference products by handle.
    collection.productHandles = collection.productHandles.map((h) => {
      const renamed = PRODUCT_RENAMES[h];
      if (renamed) changes.push(`  ref in ${collection.handle}: ${h} -> ${renamed}`);
      return renamed ?? h;
    });
  }

  writeJson("products.json", products);
  writeJson("collections.json", collections);
  // site.json and homepage.json keep hand-written compact objects
  // ({ "label": "Home", "href": "/" } on one line) that a JSON round-trip would
  // expand, burying a few real handle changes under a whole-file reformat. Edit
  // their text directly instead.
  rewriteLinksInText("site.json", changes);
  rewriteLinksInText("homepage.json", changes);

  console.log(changes.length ? changes.map((c) => `  ${c}`).join("\n") : "  nothing to rename");
  console.log(`\n${changes.length} content change(s).`);
}

async function renameDb(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // Merges first: they move products onto a surviving collection and delete
    // the source, so everything after this sees the final set of collections.
    for (const [from, into] of Object.entries(COLLECTION_MERGES)) {
      const source = await prisma.collection.findUnique({
        where: { handle: from },
        include: { products: { orderBy: { position: "asc" } } },
      });
      if (!source) {
        console.log(`  merge ${from} -> ${into}: source gone, already merged`);
        continue;
      }
      const target = await prisma.collection.findUnique({
        where: { handle: into },
        include: { products: true },
      });
      if (!target) {
        console.log(`  merge ${from} -> ${into}: TARGET NOT FOUND, skipped`);
        continue;
      }

      const already = new Set(target.products.map((p) => p.productId));
      let position = target.products.reduce((max, p) => Math.max(max, p.position), -1);
      let moved = 0;
      for (const link of source.products) {
        // A product in both collections keeps its place in the target rather
        // than being added twice.
        if (already.has(link.productId)) continue;
        position += 1;
        await prisma.collectionProduct.create({
          data: { collectionId: target.id, productId: link.productId, position },
        });
        moved += 1;
      }

      // Deleting cascades the source's own join rows; the products themselves
      // are never touched.
      await prisma.collection.delete({ where: { id: source.id } });
      console.log(
        `  merge ${from} -> ${into}: moved ${moved} product(s)` +
          `${source.products.length - moved ? `, ${source.products.length - moved} already there` : ""}, source deleted`,
      );
    }

    // Titles next: they are keyed by the original handle, which the rename
    // below is about to change.
    for (const [handle, title] of Object.entries(COLLECTION_TITLES)) {
      const row = await prisma.collection.findUnique({ where: { handle } });
      if (!row) {
        console.log(`  collection ${handle} title: NOT FOUND`);
      } else if (row.title === title) {
        console.log(`  collection ${handle} title: already "${title}"`);
      } else {
        await prisma.collection.update({ where: { handle }, data: { title } });
        console.log(`  collection ${handle} title: "${row.title}" -> "${title}"`);
      }
    }

    // Description wording corrections, also keyed by the original handle.
    for (const [handle, fixes] of Object.entries(COLLECTION_COPY_FIXES)) {
      const row = await prisma.collection.findUnique({ where: { handle } });
      if (!row) {
        console.log(`  collection ${handle} copy: NOT FOUND`);
        continue;
      }
      let html = row.descriptionHtml;
      const applied: string[] = [];
      for (const [find, replace] of fixes) {
        if (!html.includes(find)) continue;
        html = html.split(find).join(replace);
        applied.push(`"${find}" -> "${replace}"`);
      }
      if (applied.length === 0) {
        console.log(`  collection ${handle} copy: nothing to fix`);
      } else {
        await prisma.collection.update({ where: { handle }, data: { descriptionHtml: html } });
        console.log(`  collection ${handle} copy: ${applied.join(", ")}`);
      }
    }

    for (const [model, map] of [
      ["product", PRODUCT_RENAMES],
      ["collection", COLLECTION_RENAMES],
    ] as const) {
      for (const [from, to] of Object.entries(map)) {
        const delegate = model === "product" ? prisma.product : prisma.collection;
        // @ts-expect-error — both delegates share the handle-based shape used here.
        const existing = await delegate.findUnique({ where: { handle: from } });
        if (!existing) {
          // @ts-expect-error — see above.
          const already = await delegate.findUnique({ where: { handle: to } });
          console.log(`  ${model} ${from}: ${already ? "already renamed" : "NOT FOUND"}`);
          continue;
        }
        // @ts-expect-error — see above.
        const clash = await delegate.findUnique({ where: { handle: to } });
        if (clash) {
          console.log(`  ${model} ${from} -> ${to}: TARGET ALREADY EXISTS, skipped`);
          continue;
        }
        // @ts-expect-error — see above.
        await delegate.update({ where: { handle: from }, data: { handle: to } });
        console.log(`  ${model} ${from} -> ${to}: renamed`);
      }
    }

    // Once the owner edits the homepage in the admin, Setting["homepage"]
    // shadows content/homepage.json — so its tiles and CTAs hold their own copy
    // of the old handles and have to be rewritten too.
    const row = await prisma.setting.findUnique({ where: { key: "homepage" } });
    if (!row) {
      console.log("  homepage override: none stored, nothing to rewrite");
    } else {
      const changes: string[] = [];
      const next = rewriteLinks(row.value, changes);
      if (changes.length === 0) {
        console.log("  homepage override: no stale handles");
      } else {
        await prisma.setting.update({
          where: { key: "homepage" },
          data: { value: next as object },
        });
        console.log(`  homepage override: rewrote ${changes.length} link(s)`);
        for (const c of changes) console.log(`  ${c}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--content")) {
    console.log("Rewriting content/*.json:");
    renameContent();
  }
  if (args.includes("--db")) {
    console.log("Renaming database rows:");
    await renameDb();
  }
  if (!args.includes("--content") && !args.includes("--db")) {
    console.log("Pass --content and/or --db. See the header comment.");
    process.exitCode = 1;
  }
}

main();
