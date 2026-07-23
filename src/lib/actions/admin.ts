"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { saveUpload, UploadError } from "@/lib/media";

async function assertAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

export interface AdminActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

function revalidateStorefront() {
  revalidatePath("/", "layout"); // refresh every cached storefront page
}

// ---------- Products ----------

const productSchema = z.object({
  title: z.string().min(1),
  vendor: z.string(),
  productType: z.string(),
  tags: z.string(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  bodyHtml: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
});

export async function updateProduct(
  id: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid product data." };
  const d = parsed.data;
  await prisma.product.update({
    where: { id },
    data: {
      title: d.title,
      vendor: d.vendor,
      productType: d.productType,
      tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: d.status,
      bodyHtml: d.bodyHtml,
      metaTitle: d.metaTitle || null,
      metaDescription: d.metaDescription || null,
    },
  });

  // Variant rows arrive as variant-<id>-price / -compareAt / -available / -inventory
  const variants = await prisma.productVariant.findMany({ where: { productId: id } });
  for (const v of variants) {
    const price = formData.get(`variant-${v.id}-price`);
    if (price === null) continue;
    const compareAt = String(formData.get(`variant-${v.id}-compareAt`) ?? "");
    const inventory = String(formData.get(`variant-${v.id}-inventory`) ?? "0");
    await prisma.productVariant.update({
      where: { id: v.id },
      data: {
        priceCents: Math.round(parseFloat(String(price)) * 100) || v.priceCents,
        compareAtCents: compareAt ? Math.round(parseFloat(compareAt) * 100) : null,
        available: formData.get(`variant-${v.id}-available`) === "on",
        inventoryQty: parseInt(inventory, 10) || 0,
      },
    });
  }

  // Images arrive as image-0, image-1, … in display order. Reconcile by
  // replacing the set (nothing else references ProductImage; order snapshots
  // store their own image URL, so recreating rows is safe).
  const imageUrls: string[] = [];
  for (let i = 0; formData.has(`image-${i}`); i++) {
    const url = String(formData.get(`image-${i}`) ?? "").trim();
    if (url) imageUrls.push(url);
  }
  if (formData.has("image-0") || imageUrls.length > 0) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    if (imageUrls.length > 0) {
      await prisma.productImage.createMany({
        data: imageUrls.map((src, i) => ({ productId: id, src, alt: d.title, position: i + 1 })),
      });
    }
  }

  revalidateStorefront();
  return { status: "success", message: "Product saved." };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const createProductSchema = z.object({
  title: z.string().min(1, "Title is required."),
  handle: z.string(),
  bodyHtml: z.string(),
  vendor: z.string(),
  productType: z.string(),
  tags: z.string(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  defaultPrice: z.string(),
  defaultInventory: z.string(),
});

/**
 * Creates a new product with options → variants generated from the cross-product
 * of option values. If no options are supplied, one "Default Title" variant is
 * created. Redirects to the edit page on success.
 */
export async function createProduct(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid product data." };
  }
  const d = parsed.data;

  // Handle: use the user's if provided, else slugify the title. Must be unique.
  const handle = d.handle.trim() || slugify(d.title);
  if (!handle) return { status: "error", message: "Couldn't derive a URL slug from the title." };
  if (!/^[a-z0-9-]+$/.test(handle)) {
    return {
      status: "error",
      message: "URL slug can only contain lowercase letters, numbers, and dashes.",
    };
  }
  if (await prisma.product.findUnique({ where: { handle } })) {
    return {
      status: "error",
      message: `A product with the URL "/products/${handle}" already exists. Pick a different title or slug.`,
    };
  }

  // Collect options: up to 3, positions 1..3. Values arrive comma-separated.
  const options: { name: string; position: number; values: string[] }[] = [];
  for (let i = 0; i < 3; i++) {
    const name = String(formData.get(`option-${i}-name`) ?? "").trim();
    const rawValues = String(formData.get(`option-${i}-values`) ?? "");
    const values = rawValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (name && values.length > 0) {
      options.push({ name, position: options.length + 1, values });
    }
  }

  // Variants: cross-product of option values, or one default variant if no options.
  const defaultPriceCents = Math.max(0, Math.round(parseFloat(d.defaultPrice || "0") * 100)) || 0;
  const defaultInventory = Math.max(0, parseInt(d.defaultInventory || "0", 10) || 0);

  type VariantInput = {
    title: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    priceCents: number;
    available: boolean;
    inventoryQty: number;
    position: number;
  };
  const variants: VariantInput[] = [];
  if (options.length === 0) {
    variants.push({
      title: "Default Title",
      option1: null,
      option2: null,
      option3: null,
      priceCents: defaultPriceCents,
      available: true,
      inventoryQty: defaultInventory,
      position: 1,
    });
  } else {
    // Recursive cross-product keeps this readable and works for 1–3 options.
    const combos: string[][] = [[]];
    for (const opt of options) {
      const next: string[][] = [];
      for (const combo of combos) {
        for (const value of opt.values) next.push([...combo, value]);
      }
      combos.splice(0, combos.length, ...next);
    }
    for (const [i, combo] of combos.entries()) {
      variants.push({
        title: combo.join(" / "),
        option1: combo[0] ?? null,
        option2: combo[1] ?? null,
        option3: combo[2] ?? null,
        priceCents: defaultPriceCents,
        available: true,
        inventoryQty: defaultInventory,
        position: i + 1,
      });
    }
  }

  // Images: submitted as image-0, image-1, … by ProductImagesField.
  const imageUrls: string[] = [];
  for (let i = 0; formData.has(`image-${i}`); i++) {
    const url = String(formData.get(`image-${i}`) ?? "").trim();
    if (url) imageUrls.push(url);
  }

  // Everything in one transaction so a mid-flight failure never leaves an
  // orphan Product without its options/variants.
  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        handle,
        title: d.title,
        bodyHtml: d.bodyHtml,
        vendor: d.vendor,
        productType: d.productType,
        tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: d.status,
        publishedAt: d.status === "ACTIVE" ? new Date() : null,
      },
    });
    if (options.length > 0) {
      await tx.productOption.createMany({
        data: options.map((o) => ({ productId: product.id, ...o })),
      });
    }
    await tx.productVariant.createMany({
      data: variants.map((v) => ({ productId: product.id, ...v })),
    });
    if (imageUrls.length > 0) {
      await tx.productImage.createMany({
        data: imageUrls.map((src, i) => ({
          productId: product.id,
          src,
          alt: d.title,
          position: i + 1,
        })),
      });
    }
    return product;
  });

  revalidateStorefront();
  revalidatePath("/admin/products");
  redirect(`/admin/products/${created.id}`);
}

// ---------- Orders ----------

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const status = z
    .enum(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"])
    .parse(formData.get("status"));
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
}

// ---------- Homepage ----------

export async function updateHomepage(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  let config: unknown;
  try {
    config = JSON.parse(String(formData.get("config") ?? ""));
  } catch {
    return { status: "error", message: "Couldn't read the homepage content." };
  }
  if (
    !config ||
    typeof config !== "object" ||
    !Array.isArray((config as { sections?: unknown }).sections)
  ) {
    return { status: "error", message: "Invalid homepage content." };
  }
  await prisma.setting.upsert({
    where: { key: "homepage" },
    create: { key: "homepage", value: config as object },
    update: { value: config as object },
  });
  revalidateStorefront();
  return { status: "success", message: "Homepage saved." };
}

/** Reverts the homepage to the originally-migrated content. */
export async function resetHomepage(): Promise<void> {
  await assertAdmin();
  await prisma.setting.deleteMany({ where: { key: "homepage" } });
  revalidateStorefront();
  redirect("/admin/homepage");
}

// ---------- Store settings ----------

export async function updateStoreSettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const { updateStoreSettings } = await import("@/lib/settings");
  await updateStoreSettings({
    // Unchecked checkboxes don't submit at all; presence == on.
    autoBookCourier: formData.get("autoBookCourier") === "on",
  });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Settings saved." };
}

// ---------- Shipments (The Courier Guy) ----------

export async function bookCourierShipment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const { bookForOrder } = await import("@/lib/shipping/courier-guy");
  await bookForOrder(id);
  revalidatePath(`/admin/orders/${id}`);
}

// ---------- Articles ----------

const articleSchema = z.object({
  title: z.string().min(1),
  handle: z.string().min(1).regex(/^[a-z0-9-]+$/, "Handle: lowercase letters, numbers, dashes."),
  author: z.string(),
  excerpt: z.string(),
  bodyHtml: z.string(),
  heroImage: z.string(),
  status: z.enum(["PUBLISHED", "DRAFT"]),
  metaTitle: z.string(),
  metaDescription: z.string(),
});

export async function upsertArticle(
  id: string | null,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const d = parsed.data;
  const data = {
    title: d.title,
    handle: d.handle,
    author: d.author,
    excerpt: d.excerpt,
    bodyHtml: d.bodyHtml,
    heroImage: d.heroImage || null,
    status: d.status,
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || null,
  };
  let articleId = id;
  if (id) {
    await prisma.article.update({ where: { id }, data });
  } else {
    const created = await prisma.article.create({
      data: { ...data, publishedAt: d.status === "PUBLISHED" ? new Date() : null },
    });
    articleId = created.id;
  }
  revalidateStorefront();
  if (!id) redirect(`/admin/articles/${articleId}`);
  return { status: "success", message: "Article saved." };
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await assertAdmin();
  await prisma.article.delete({ where: { id: String(formData.get("id")) } });
  revalidateStorefront();
  redirect("/admin/articles");
}

// ---------- Pages ----------

const pageSchema = z.object({
  title: z.string().min(1),
  bodyHtml: z.string(),
  status: z.enum(["PUBLISHED", "DRAFT"]),
  metaTitle: z.string(),
  metaDescription: z.string(),
});

export async function updatePage(
  id: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const parsed = pageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid page data." };
  const d = parsed.data;
  await prisma.page.update({
    where: { id },
    data: {
      title: d.title,
      bodyHtml: d.bodyHtml,
      status: d.status,
      metaTitle: d.metaTitle || null,
      metaDescription: d.metaDescription || null,
    },
  });
  revalidateStorefront();
  return { status: "success", message: "Page saved." };
}

// ---------- Media ----------

const UPLOAD_DIR = "images/uploads";

export async function uploadMedia(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: "Choose a file to upload." };
  }
  try {
    const { url } = await saveUpload(file, String(formData.get("alt") ?? ""));
    revalidatePath("/admin/media");
    return { status: "success", message: `Uploaded ${url}` };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof UploadError ? err.message : "Upload failed. Please try again.",
    };
  }
}

export async function deleteMedia(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (asset) {
    await prisma.mediaAsset.delete({ where: { id } });
    if (asset.path.startsWith("https://") && asset.path.includes("blob.vercel-storage.com")) {
      // Uploaded to Vercel Blob — remove it there.
      const { del } = await import("@vercel/blob");
      await del(asset.path).catch(() => {});
    } else if (asset.path.startsWith(`/${UPLOAD_DIR}/`)) {
      // Local dev upload — remove from disk. Migrated catalog images stay.
      await fs.rm(path.join(process.cwd(), "public", asset.path), { force: true });
    }
  }
  revalidatePath("/admin/media");
}
