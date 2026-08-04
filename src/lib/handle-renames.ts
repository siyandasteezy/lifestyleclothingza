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
  // NOT renamed, pending an owner decision:
  //   dresses    — titled "Lifestyle Skirts", holds a "Maxi Dress", and its own
  //                copy says "Maxi Skirt". Which of the three is wrong is not
  //                knowable without seeing the garment.
  //   jewellery  — titled "Accessories", with a description covering bags,
  //                belts and scarves. The slug may be the narrow one.
};
