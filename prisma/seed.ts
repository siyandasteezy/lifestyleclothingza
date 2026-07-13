// Seeds PostgreSQL from the Shopify content archive in /content.
// Idempotent: upserts by handle, so it can be re-run safely.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

const prisma = new PrismaClient();
const CONTENT_DIR = path.join(process.cwd(), "content");

/* eslint-disable @typescript-eslint/no-explicit-any */
async function readJson(file: string): Promise<any> {
  return JSON.parse(await fs.readFile(path.join(CONTENT_DIR, file), "utf-8"));
}

const cents = (price: string | number) =>
  Math.round((typeof price === "number" ? price : parseFloat(price)) * 100);

async function seedProducts() {
  const products = await readJson("products.json");
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { handle: p.handle },
      create: {
        shopifyId: BigInt(p.shopifyId),
        handle: p.handle,
        title: p.title,
        bodyHtml: p.bodyHtml ?? "",
        vendor: p.vendor ?? "",
        productType: p.productType ?? "",
        tags: p.tags ?? [],
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
      },
      update: {
        title: p.title,
        bodyHtml: p.bodyHtml ?? "",
        vendor: p.vendor ?? "",
        productType: p.productType ?? "",
        tags: p.tags ?? [],
      },
    });
    await prisma.productOption.deleteMany({ where: { productId: product.id } });
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productOption.createMany({
      data: (p.options ?? []).map((o: any) => ({
        productId: product.id,
        name: o.name,
        position: o.position,
        values: o.values ?? [],
      })),
    });
    await prisma.productVariant.createMany({
      data: p.variants.map((v: any) => ({
        shopifyId: BigInt(v.shopifyId),
        productId: product.id,
        title: v.title,
        sku: v.sku ?? "",
        priceCents: cents(v.price),
        compareAtCents: v.compareAtPrice ? cents(v.compareAtPrice) : null,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        available: v.available !== false,
        position: v.position,
      })),
    });
    await prisma.productImage.createMany({
      data: p.images.map((i: any) => ({
        productId: product.id,
        src: i.src,
        alt: i.alt ?? p.title,
        width: i.width,
        height: i.height,
        position: i.position,
      })),
    });
  }
  console.log(`✓ ${products.length} products`);
}

async function seedCollections() {
  const collections = await readJson("collections.json");
  for (const c of collections) {
    const collection = await prisma.collection.upsert({
      where: { handle: c.handle },
      create: {
        shopifyId: BigInt(c.shopifyId),
        handle: c.handle,
        title: c.title,
        descriptionHtml: c.descriptionHtml ?? "",
        image: c.image,
        publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
      },
      update: {
        title: c.title,
        descriptionHtml: c.descriptionHtml ?? "",
        image: c.image,
      },
    });
    await prisma.collectionProduct.deleteMany({ where: { collectionId: collection.id } });
    for (const [i, handle] of (c.productHandles ?? []).entries()) {
      const product = await prisma.product.findUnique({ where: { handle } });
      if (product) {
        await prisma.collectionProduct.create({
          data: { collectionId: collection.id, productId: product.id, position: i },
        });
      }
    }
  }
  console.log(`✓ ${collections.length} collections`);
}

async function seedPages() {
  const pages = await readJson("pages.json");
  for (const p of pages) {
    await prisma.page.upsert({
      where: { handle: p.handle },
      create: {
        handle: p.handle,
        title: p.title,
        bodyHtml: p.bodyHtml ?? "",
        metaDescription: p.metaDescription || null,
      },
      update: { title: p.title, bodyHtml: p.bodyHtml ?? "" },
    });
  }
  console.log(`✓ ${pages.length} pages`);
}

async function seedArticles() {
  const articles = await readJson("articles.json");
  for (const a of articles) {
    await prisma.article.upsert({
      where: { handle: a.handle },
      create: {
        blogHandle: a.blogHandle ?? "news",
        blogTitle: a.blogTitle ?? "News",
        handle: a.handle,
        title: a.title,
        author: a.author ?? "",
        bodyHtml: a.bodyHtml ?? "",
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      },
      update: { title: a.title, bodyHtml: a.bodyHtml ?? "" },
    });
  }
  console.log(`✓ ${articles.length} articles`);
}

async function seedMedia() {
  const roots = ["images/home", "images/products", "images/collections", "images/articles"];
  let count = 0;
  for (const root of roots) {
    const dir = path.join(process.cwd(), "public", root);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      const stat = await fs.stat(path.join(dir, file));
      await prisma.mediaAsset.upsert({
        where: { path: `/${root}/${file}` },
        create: { path: `/${root}/${file}`, bytes: stat.size },
        update: { bytes: stat.size },
      });
      count++;
    }
  }
  console.log(`✓ ${count} media assets`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("– skipped admin user (set ADMIN_EMAIL / ADMIN_PASSWORD)");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: "Store Owner", passwordHash, role: "OWNER" },
    update: {},
  });
  console.log(`✓ admin user ${email}`);
}

async function main() {
  await seedProducts();
  await seedCollections();
  await seedPages();
  await seedArticles();
  await seedMedia();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
