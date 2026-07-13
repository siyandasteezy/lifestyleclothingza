// PostgreSQL data source (Prisma). The production path once `npm run db:seed` has run.
import { prisma } from "@/lib/db";
import type { ArticleVM, CollectionVM, PageVM, ProductVM } from "@/lib/types";
import type { DataSource } from "./source";
import type { Prisma } from "@prisma/client";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { options: true; variants: true; images: true };
}>;

function toProductVM(p: ProductWithRelations): ProductVM {
  const variants = [...p.variants]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      key: String(v.position),
      title: v.title,
      sku: v.sku,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      available: v.available,
      position: v.position,
    }));
  const prices = variants.map((v) => v.priceCents);
  return {
    handle: p.handle,
    title: p.title,
    bodyHtml: p.bodyHtml,
    vendor: p.vendor,
    productType: p.productType,
    tags: p.tags,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    options: [...p.options]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ name: o.name, position: o.position, values: o.values })),
    variants,
    images: [...p.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        src: i.src,
        alt: i.alt || p.title,
        width: i.width,
        height: i.height,
        position: i.position,
      })),
    minPriceCents: prices.length ? Math.min(...prices) : 0,
    maxPriceCents: prices.length ? Math.max(...prices) : 0,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
  };
}

const productInclude = { options: true, variants: true, images: true } as const;

export const dbSource: DataSource = {
  async getProducts() {
    const rows = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: productInclude,
      orderBy: { publishedAt: "desc" },
    });
    return rows.map(toProductVM);
  },

  async getProduct(handle) {
    const row = await prisma.product.findUnique({
      where: { handle },
      include: productInclude,
    });
    return row && row.status === "ACTIVE" ? toProductVM(row) : null;
  },

  async getCollections() {
    const rows = await prisma.collection.findMany({
      include: { products: { orderBy: { position: "asc" }, include: { product: true } } },
      orderBy: { title: "asc" },
    });
    return rows.map(
      (c): CollectionVM => ({
        handle: c.handle,
        title: c.title,
        descriptionHtml: c.descriptionHtml,
        image: c.image,
        productHandles: c.products.map((cp) => cp.product.handle),
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
      }),
    );
  },

  async getCollection(handle) {
    const c = await prisma.collection.findUnique({
      where: { handle },
      include: { products: { orderBy: { position: "asc" }, include: { product: true } } },
    });
    if (!c) return null;
    return {
      handle: c.handle,
      title: c.title,
      descriptionHtml: c.descriptionHtml,
      image: c.image,
      productHandles: c.products.map((cp) => cp.product.handle),
      metaTitle: c.metaTitle,
      metaDescription: c.metaDescription,
    };
  },

  async getCollectionProducts(handle) {
    if (handle === "all") return this.getProducts();
    const c = await prisma.collection.findUnique({
      where: { handle },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { product: { include: productInclude } },
        },
      },
    });
    if (!c) return [];
    return c.products
      .filter((cp) => cp.product.status === "ACTIVE")
      .map((cp) => toProductVM(cp.product));
  },

  async getPages() {
    const rows = await prisma.page.findMany({ where: { status: "PUBLISHED" } });
    return rows.map(
      (p): PageVM => ({
        handle: p.handle,
        title: p.title,
        bodyHtml: p.bodyHtml,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
      }),
    );
  },

  async getPage(handle) {
    const p = await prisma.page.findUnique({ where: { handle } });
    if (!p || p.status !== "PUBLISHED") return null;
    return {
      handle: p.handle,
      title: p.title,
      bodyHtml: p.bodyHtml,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
    };
  },

  async getArticles(blogHandle) {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", ...(blogHandle ? { blogHandle } : {}) },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map(
      (a): ArticleVM => ({
        blogHandle: a.blogHandle,
        blogTitle: a.blogTitle,
        handle: a.handle,
        title: a.title,
        author: a.author,
        excerpt: a.excerpt,
        bodyHtml: a.bodyHtml,
        heroImage: a.heroImage,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        metaTitle: a.metaTitle,
        metaDescription: a.metaDescription,
      }),
    );
  },

  async getArticle(blogHandle, handle) {
    const a = await prisma.article.findUnique({ where: { handle } });
    if (!a || a.status !== "PUBLISHED" || a.blogHandle !== blogHandle) return null;
    return {
      blogHandle: a.blogHandle,
      blogTitle: a.blogTitle,
      handle: a.handle,
      title: a.title,
      author: a.author,
      excerpt: a.excerpt,
      bodyHtml: a.bodyHtml,
      heroImage: a.heroImage,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      metaTitle: a.metaTitle,
      metaDescription: a.metaDescription,
    };
  },
};
