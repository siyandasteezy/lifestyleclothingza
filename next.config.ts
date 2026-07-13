import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Shopify CDN allowed during transition, in case any content still references it.
    remotePatterns: [
      { protocol: "https", hostname: "lifestyleclothingza.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  async redirects() {
    return [
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
