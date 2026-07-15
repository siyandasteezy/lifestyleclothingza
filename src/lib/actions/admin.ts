"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";

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

  revalidateStorefront();
  return { status: "success", message: "Product saved." };
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

// ---------- Shipments (The Courier Guy) ----------

export async function bookCourierShipment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.trackingReference) return;

  const address = order.shippingAddress as Record<string, string> | null;
  if (!address) return;

  const { bookShipment } = await import("@/lib/shipping/courier-guy");
  const shipment = await bookShipment({
    address: {
      name: order.shippingName ?? "",
      address1: address.address1 ?? "",
      address2: address.address2,
      city: address.city ?? "",
      province: address.province ?? "",
      postalCode: address.postalCode ?? "",
      phone: order.phone ?? undefined,
      email: order.email,
    },
    orderNumber: order.number,
    serviceLevelCode: address.serviceLevelCode || undefined,
    declaredValueCents: order.subtotalCents,
  });
  await prisma.order.update({
    where: { id },
    data: {
      shipmentId: shipment.shipmentId,
      trackingReference: shipment.trackingReference,
      status: order.status === "PAID" ? "FULFILLED" : order.status,
    },
  });
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
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadMedia(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file to upload." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { status: "error", message: "Only JPEG, PNG, WebP, AVIF, or GIF images." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "Max file size is 10 MB." };
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", UPLOAD_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const publicPath = `/${UPLOAD_DIR}/${filename}`;
  await prisma.mediaAsset.create({
    data: { path: publicPath, alt: String(formData.get("alt") ?? ""), bytes: file.size },
  });
  revalidatePath("/admin/media");
  return { status: "success", message: `Uploaded ${publicPath}` };
}

export async function deleteMedia(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (asset) {
    await prisma.mediaAsset.delete({ where: { id } });
    // Only uploaded files are removed from disk; migrated catalog images stay.
    if (asset.path.startsWith(`/${UPLOAD_DIR}/`)) {
      await fs.rm(path.join(process.cwd(), "public", asset.path), { force: true });
    }
  }
  revalidatePath("/admin/media");
}
