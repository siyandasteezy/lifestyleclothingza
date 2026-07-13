// JSON content-archive data source. Reads the Shopify migration snapshot in /content.
// Used when DATA_SOURCE=content or as a fallback before the database is seeded.
import { promises as fs } from "fs";
import path from "path";
import { parsePriceToCents } from "@/lib/money";
import type {
  ArticleVM,
  CollectionVM,
  PageVM,
  ProductVM,
} from "@/lib/types";
import type { DataSource } from "./source";

const CONTENT_DIR = path.join(process.cwd(), "content");

/* eslint-disable @typescript-eslint/no-explicit-any */
async function readJson<T = any>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(CONTENT_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

function toProductVM(p: any): ProductVM {
  const variants = (p.variants as any[]).map((v) => ({
    key: String(v.position),
    title: v.title,
    sku: v.sku ?? "",
    priceCents: parsePriceToCents(v.price),
    compareAtCents: v.compareAtPrice ? parsePriceToCents(v.compareAtPrice) : null,
    option1: v.option1 ?? null,
    option2: v.option2 ?? null,
    option3: v.option3 ?? null,
    available: v.available !== false,
    position: v.position,
  }));
  const prices = variants.map((v) => v.priceCents);
  return {
    handle: p.handle,
    title: p.title,
    bodyHtml: p.bodyHtml ?? "",
    vendor: p.vendor ?? "",
    productType: p.productType ?? "",
    tags: p.tags ?? [],
    publishedAt: p.publishedAt ?? null,
    options: p.options ?? [],
    variants,
    images: (p.images as any[]).map((i) => ({
      src: i.src,
      alt: i.alt ?? p.title,
      width: i.width ?? null,
      height: i.height ?? null,
      position: i.position,
    })),
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
  };
}

export const contentSource: DataSource = {
  async getProducts() {
    const raw = await readJson<any[]>("products.json");
    return raw.map(toProductVM);
  },

  async getProduct(handle) {
    const all = await this.getProducts();
    return all.find((p) => p.handle === handle) ?? null;
  },

  async getCollections() {
    const raw = await readJson<any[]>("collections.json");
    return raw.map(
      (c): CollectionVM => ({
        handle: c.handle,
        title: c.title,
        descriptionHtml: c.descriptionHtml ?? "",
        image: c.image ?? null,
        productHandles: c.productHandles ?? [],
      }),
    );
  },

  async getCollection(handle) {
    const all = await this.getCollections();
    return all.find((c) => c.handle === handle) ?? null;
  },

  async getCollectionProducts(handle) {
    const products = await this.getProducts();
    if (handle === "all") return products;
    const collection = await this.getCollection(handle);
    if (!collection) return [];
    const byHandle = new Map(products.map((p) => [p.handle, p]));
    return collection.productHandles
      .map((h) => byHandle.get(h))
      .filter((p): p is ProductVM => Boolean(p));
  },

  async getPages() {
    const raw = await readJson<any[]>("pages.json");
    return raw.map(
      (p): PageVM => ({
        handle: p.handle,
        title: p.title,
        bodyHtml: p.bodyHtml ?? "",
        metaDescription: p.metaDescription ?? null,
      }),
    );
  },

  async getPage(handle) {
    const all = await this.getPages();
    return all.find((p) => p.handle === handle) ?? null;
  },

  async getArticles(blogHandle) {
    const raw = await readJson<any[]>("articles.json");
    return raw
      .filter((a) => !blogHandle || a.blogHandle === blogHandle)
      .map(
        (a): ArticleVM => ({
          blogHandle: a.blogHandle,
          blogTitle: a.blogTitle ?? "News",
          handle: a.handle,
          title: a.title,
          author: a.author ?? "",
          excerpt: a.excerpt ?? "",
          bodyHtml: a.bodyHtml ?? "",
          heroImage: a.heroImage ?? null,
          publishedAt: a.publishedAt ?? null,
        }),
      );
  },

  async getArticle(blogHandle, handle) {
    const all = await this.getArticles(blogHandle);
    return all.find((a) => a.handle === handle) ?? null;
  },
};
