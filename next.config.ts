import type { NextConfig } from "next";
import { COLLECTION_RENAMES, PRODUCT_RENAMES } from "./src/lib/handle-renames";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Shopify CDN allowed during transition, in case any content still references it.
    remotePatterns: [
      { protocol: "https", hostname: "lifestyleclothingza.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      // Admin image uploads (Vercel Blob)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async redirects() {
    return [
      // Slugs that shipped from staging with "copy"/"untitled" in them, plus the
      // two beanies whose slugs were transposed and the collection URLs that
      // contradicted their own H1. Generated from the same map the rename script
      // uses, so a redirect can never go missing for a handle that moved.
      // These come first: they match a single segment, ahead of the broader
      // trailing-filter rule below.
      ...Object.entries(PRODUCT_RENAMES).map(([from, to]) => ({
        source: `/products/${from}`,
        destination: `/products/${to}`,
        permanent: true,
      })),
      ...Object.entries(COLLECTION_RENAMES).flatMap(([from, to]) => [
        {
          source: `/collections/${from}`,
          destination: `/collections/${to}`,
          permanent: true,
        },
        // The old Shopify filter suffix (/collections/<old>/<filter>) has to be
        // caught here too, or it would fall through to the generic rule below
        // and land on the now-dead collection handle.
        {
          source: `/collections/${from}/:filter((?!products).*)`,
          destination: `/collections/${to}`,
          permanent: true,
        },
      ]),
      // Legacy Shopify nav linked collections with a trailing filter segment
      // (e.g. /collections/5-panel-caps/Panel-Cap). Preserve link equity with 301s.
      {
        source: "/collections/:handle/:filter((?!products).*)",
        destination: "/collections/:handle",
        permanent: true,
      },
      // Shopify account/policy paths that no longer exist
      { source: "/policies/refund-policy", destination: "/pages/refund-policy", permanent: true },
      { source: "/policies/privacy-policy", destination: "/pages/privacy-policy", permanent: true },
      { source: "/blogs/news/tagged/:tag", destination: "/blogs/news", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
