// Verifies the slug migration against a running site.
//
// Renaming slugs on a live store is the one change in the SEO plan that can
// make rankings actively worse, so nothing here is assumed:
//
//   1. every OLD url returns a PERMANENT redirect pointing at its new url.
//      Next.js emits 308 rather than 301 for `permanent: true`, deliberately,
//      so the request method is preserved; Google treats 308 and 301 the same
//      for passing ranking signals. A 307/302 would NOT pass them, so the
//      distinction that matters here is permanent vs temporary, not 301 vs 308.
//   2. every NEW url returns 200
//   3. no old handle is still referenced anywhere in the content archive
//   4. the sitemap lists the new urls and none of the old ones
//
// Exits non-zero on any failure, so it can gate a deploy.
//
//   npx tsx scripts/verify-redirects.ts                       # localhost:3000
//   npx tsx scripts/verify-redirects.ts https://lifestyleclothingza.com

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COLLECTION_RENAMES, PRODUCT_RENAMES } from "../src/lib/handle-renames";

/** Both are permanent and both pass ranking signals; Next.js emits 308. */
const PERMANENT = new Set([301, 308]);

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

let failures = 0;
const ok = (msg: string) => console.log(`  PASS  ${msg}`);
const bad = (msg: string) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};

async function head(path: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function checkRedirects(prefix: string, map: Record<string, string>) {
  for (const [from, to] of Object.entries(map)) {
    const oldPath = `${prefix}/${from}`;
    const newPath = `${prefix}/${to}`;
    const { status, location } = await head(oldPath);
    if (!PERMANENT.has(status)) {
      bad(`${oldPath} -> expected a permanent redirect (301/308), got ${status}`);
    } else if (!location || new URL(location, base).pathname !== newPath) {
      bad(`${oldPath} -> ${status} to ${location}, expected ${newPath}`);
    } else {
      ok(`${oldPath} ${status}-> ${newPath}`);
    }

    const dest = await head(newPath);
    if (dest.status !== 200) bad(`${newPath} -> expected 200, got ${dest.status}`);
  }
}

function checkArchive() {
  const files = ["products.json", "collections.json", "site.json", "homepage.json"];
  const stale = [...Object.keys(PRODUCT_RENAMES), ...Object.keys(COLLECTION_RENAMES)];
  for (const file of files) {
    const raw = readFileSync(join(process.cwd(), "content", file), "utf8");
    for (const handle of stale) {
      // Quoted or path-delimited, so a handle that is a prefix of another
      // (e.g. unisex-beanie-hat) does not raise a false positive.
      if (new RegExp(`["/]${handle}["/]`).test(raw)) {
        bad(`content/${file} still references "${handle}"`);
      }
    }
  }
  ok("content archive has no stale handles");
}

/**
 * Handles are hardcoded in application code too — the homepage looks up its
 * collection tiles by handle. A rename that misses one of those does not fail
 * the build or the type check; it throws at render and 500s the page. Catch it
 * here instead.
 */
function checkSource() {
  const stale = [...Object.keys(PRODUCT_RENAMES), ...Object.keys(COLLECTION_RENAMES)];
  const out = execSync(
    `grep -rn ${stale.map((h) => `-e "${h}"`).join(" ")} src/ || true`,
    { encoding: "utf8" },
  );
  const hits = out
    .split("\n")
    .filter(Boolean)
    // handle-renames.ts is the map itself; it is meant to name the old handles.
    .filter((line) => !line.startsWith("src/lib/handle-renames.ts"));
  if (hits.length) {
    for (const hit of hits) bad(`source still references a renamed handle: ${hit.trim()}`);
  } else {
    ok("no renamed handles hardcoded in src/");
  }
}

async function checkSitemap() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  for (const [from, to] of Object.entries(PRODUCT_RENAMES)) {
    if (xml.includes(`/products/${from}<`)) bad(`sitemap still lists /products/${from}`);
    if (!xml.includes(`/products/${to}<`)) bad(`sitemap missing /products/${to}`);
  }
  for (const [from, to] of Object.entries(COLLECTION_RENAMES)) {
    if (xml.includes(`/collections/${from}<`)) bad(`sitemap still lists /collections/${from}`);
    if (!xml.includes(`/collections/${to}<`)) bad(`sitemap missing /collections/${to}`);
  }
  ok("sitemap lists new urls only");
}

async function main() {
  console.log(`Verifying slug migration against ${base}\n`);
  console.log("Products:");
  await checkRedirects("/products", PRODUCT_RENAMES);
  console.log("Collections:");
  await checkRedirects("/collections", COLLECTION_RENAMES);
  console.log("Legacy Shopify filter suffix:");
  for (const [from, to] of Object.entries(COLLECTION_RENAMES)) {
    const { status, location } = await head(`/collections/${from}/Panel-Cap`);
    const dest = location ? new URL(location, base).pathname : null;
    if (PERMANENT.has(status) && dest === `/collections/${to}`) {
      ok(`/collections/${from}/Panel-Cap ${status}-> ${dest}`);
    } else {
      bad(`/collections/${from}/Panel-Cap -> ${status} ${dest ?? ""}, expected a permanent redirect to /collections/${to}`);
    }
  }
  console.log("Archive:");
  checkArchive();
  console.log("Source:");
  checkSource();
  console.log("Sitemap:");
  await checkSitemap();

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
