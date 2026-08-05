// Old-to-new handle map for the slugs that shipped from staging.
//
// Single source of truth, imported by BOTH next.config.ts (to emit the 301s)
// and scripts/rename-handles.ts (to rewrite the content archive and the
// database). Keeping one map is the point: a rename without its redirect
// discards the URL's accumulated ranking, and a redirect without its rename
// points at a 404.
//
// Plain data only — no imports — because next.config.ts loads this at config
// time, outside the app runtime.

/** Product handles: /products/<old> -> /products/<new> */
export const PRODUCT_RENAMES: Record<string, string> = {
  // Staging artefacts: "copy" / "untitled" in a live production URL.
  "lifestyle-premium-tee-copy": "faith-motion-graphic-tee",
  "copy-lifstl-motorsports": "lifstl-biker-tshirt",
  "untitled-21apr_20-51": "silky-scarf",
  // Transposed pair — the two beanies had each other's slugs. They swap, and
  // neither target is occupied at any point, so the order here is safe.
  "unisex-beanie-hat-faux-pearls-copy": "unisex-beanie-hat",
  "unisex-beanie-hat-cozy-stylish-stretchy": "unisex-beanie-hat-faux-pearls",
};

/** Collection handles: /collections/<old> -> /collections/<new> */
export const COLLECTION_RENAMES: Record<string, string> = {
  "5-panel-caps": "headwear", // titled "Headwear"
  "slouchy-hats": "winter-hats", // titled "Winter Hats"
  // Owner confirmed this is a broad accessories collection, not a jewellery
  // one — its own copy already covers bags, belts, scarves and socks — so the
  // narrow slug is what was wrong, and the "Accessories" title stays.
  jewellery: "accessories",
};

/**
 * Collection titles that contradicted their URL, where the URL was right.
 *
 * These are not renames, so they need no redirect — but they do need applying,
 * because there is no collections editor in the admin and the deploy-time seed
 * is guarded by SEED_IF_EMPTY, so content/collections.json no longer reaches a
 * live database on its own.
 */
export const COLLECTION_TITLES: Record<string, string> = {
  // Owner confirmed the garment is a Maxi Dress, so /dresses was right all
  // along and the "Lifestyle Skirts" title was the error.
  dresses: "Dresses",
};

/**
 * Owner-approved wording corrections to collection descriptions, as
 * find → replace pairs per handle.
 *
 * Descriptions are owner copy and normally off limits, but the same problem as
 * COLLECTION_TITLES applies: there is no collections editor, so a correction the
 * owner has asked for has no other route to a live database. Kept as an exact
 * find/replace rather than a whole rewritten description so the change is
 * auditable and cannot quietly restyle the rest of the copy.
 */
export const COLLECTION_COPY_FIXES: Record<string, [find: string, replace: string][]> = {
  // The collection holds a "Maxi Dress" and sits at /dresses; only the
  // description still called it a skirt. Owner confirmed: it is a dress.
  dresses: [["Lifestyle Maxi Skirt", "Lifestyle Maxi Dress"]],
};
