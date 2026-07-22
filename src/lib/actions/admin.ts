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
