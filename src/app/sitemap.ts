import type { MetadataRoute } from "next";
import { getArticles, getCollections, getPages, getProducts } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, pages, articles] = await Promise.all([
    getProducts(),
    getCollections(),
    getPages(),
    getArticles(),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/collections"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/collections/all"), changeFrequency: "daily", priority: 0.9 },
    ...collections.map((c) => ({
      url: absoluteUrl(`/collections/${c.handle}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.handle}`),
      lastModified: p.publishedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...[...new Set(articles.map((a) => a.blogHandle))].map((blog) => ({
      url: absoluteUrl(`/blogs/${blog}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/blogs/${a.blogHandle}/${a.handle}`),
      lastModified: a.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...pages.map((p) => ({
      url: absoluteUrl(`/pages/${p.handle}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
