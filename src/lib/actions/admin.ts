"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { saveUpload, UploadError } from "@/lib/media";
import { canDeleteVariant, planVariant } from "@/lib/variants";

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
  sizeChartHtml: z.string(),
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
      sizeChartHtml: d.sizeChartHtml,
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

/**
 * Adds a variant to an existing product.
 *
 * Option values are constrained to the values already declared on the product's
 * options, so variants and options cannot drift apart — introducing a new value
 * is an option edit, not a variant edit.
 */
export async function addProductVariant(
  productId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { options: { orderBy: { position: "asc" } }, variants: true },
  });
  if (!product) return { status: "error", message: "Product not found." };

  const optionValues: Record<number, string> = {};
  for (const option of product.options) {
    optionValues[option.position] = String(formData.get(`option-${option.position}`) ?? "");
  }

  const plan = planVariant(product.options, product.variants, {
    optionValues,
    price: String(formData.get("price") ?? ""),
    compareAt: String(formData.get("compareAt") ?? ""),
    inventory: String(formData.get("inventory") ?? "0"),
    sku: String(formData.get("sku") ?? ""),
  });
  if (!plan.ok) return { status: "error", message: plan.error };

  // One transaction: a variant referencing an option value the product does not
  // declare would render a size the storefront cannot offer.
  await prisma.$transaction(async (tx) => {
    for (const added of plan.newValues) {
      await tx.productOption.update({
        where: { productId_position: { productId, position: added.position } },
        data: { values: added.values },
      });
    }
    await tx.productVariant.create({ data: { productId, available: true, ...plan.draft } });
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
  const added = plan.newValues.length
    ? ` New option value added, so the storefront now offers it.`
    : "";
  return { status: "success", message: `Added "${plan.draft.title}".${added}` };
}

/**
 * Deletes a variant. Past orders keep their own snapshot of the title, price and
 * image, and OrderItem.variantId is nullable with onDelete: SetNull, so order
 * history survives — but a product must always keep at least one variant or it
 * cannot be bought at all.
 */
export async function deleteProductVariant(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  // The id rides on the clicked button's value, so one form serves every row.
  const variantId = String(formData.get("variantId") ?? "");
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return { status: "error", message: "Variant not found." };

  const remaining = await prisma.productVariant.count({
    where: { productId: variant.productId },
  });
  if (!canDeleteVariant(remaining)) {
    return {
      status: "error",
      message: "A product needs at least one variant. Add another before deleting this one.",
    };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });

  revalidatePath(`/admin/products/${variant.productId}`);
  revalidateStorefront();
  return { status: "success", message: `Deleted "${variant.title}".` };
}

/**
 * Files a product under a collection, creating the collection when the name is
 * a new one.
 *
 * Until now nothing in the admin touched collection membership, so a product
 * added here landed in no category at all: absent from the nav, from every
 * category page, and from its own "you may also like" block, reachable only
 * through /collections/all and the sitemap.
 */
export async function addProductToCollection(
  productId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const raw = String(formData.get("collection") ?? "").trim();
  if (!raw) return { status: "error", message: "Pick a collection or type a new name." };
  if (raw.length > 80) return { status: "error", message: "That name is too long." };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { status: "error", message: "Product not found." };

  // The field is one box for both jobs, so the typed value may be an existing
  // collection's title, its handle, or the name of one that does not exist yet.
  const handle = slugify(raw);
  let collection = await prisma.collection.findFirst({
    where: {
      OR: [{ handle }, { handle: raw }, { title: { equals: raw, mode: "insensitive" } }],
    },
  });

  const isNew = !collection;
  if (!collection) {
    if (!handle) {
      return { status: "error", message: "That name doesn't produce a usable URL." };
    }
    collection = await prisma.collection.create({
      data: { handle, title: raw, publishedAt: new Date() },
    });
  }

  const already = await prisma.collectionProduct.findUnique({
    where: { collectionId_productId: { collectionId: collection.id, productId } },
  });
  if (already) {
    return { status: "error", message: `Already in "${collection.title}".` };
  }

  // Append rather than reuse a gap: collection pages order by position.
  const last = await prisma.collectionProduct.aggregate({
    where: { collectionId: collection.id },
    _max: { position: true },
  });
  await prisma.collectionProduct.create({
    data: {
      collectionId: collection.id,
      productId,
      position: (last._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
  return {
    status: "success",
    message: isNew
      ? `Created "${collection.title}" at /collections/${collection.handle} and added this product.`
      : `Added to "${collection.title}".`,
  };
}

/** Removes a product from one collection. The collection itself is left alone. */
export async function removeProductFromCollection(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();
  const productId = String(formData.get("productId") ?? "");
  // The collection id rides on the clicked button's value, so one form serves
  // every row.
  const collectionId = String(formData.get("collectionId") ?? "");

  const link = await prisma.collectionProduct.findUnique({
    where: { collectionId_productId: { collectionId, productId } },
    include: { collection: { select: { title: true } } },
  });
  if (!link) return { status: "error", message: "Not in that collection." };

  await prisma.collectionProduct.delete({
    where: { collectionId_productId: { collectionId, productId } },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
  return { status: "success", message: `Removed from "${link.collection.title}".` };
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
    .enum(["PENDING", "PAID", "FULFILLED", "DELIVERED", "CANCELLED", "REFUNDED"])
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

/**
 * Turns a raw courier API error into something the store owner can act on.
 * The underlying detail is kept — it is what makes a support call useful — but
 * the known cases lead with the actual remedy.
 */
function bookingErrorMessage(raw: string): string {
  const detail = raw.replace(/^Shiplogic shipment failed:\s*/, "");
  if (/insufficient funds/i.test(detail)) {
    return `The Courier Guy account has insufficient funds, so the waybill was not created. Top the account up in the Courier Guy portal and book again. (${detail})`;
  }
  if (/service level/i.test(detail)) {
    return `The Courier Guy has no service covering this delivery address. Check the address, or book this one manually in the portal. (${detail})`;
  }
  if (/unauthor|forbidden|401|403/i.test(detail)) {
    return `The Courier Guy rejected our API key. Check COURIER_GUY_API_KEY. (${detail})`;
  }
  return detail;
}

export interface CourierRatesState {
  status: "idle" | "loaded" | "error";
  rates?: { code: string; name: string; cents: number }[];
  message?: string;
}

/**
 * Live courier prices for an order, fetched on demand from the admin order page.
 * Deliberately a button rather than a page-load fetch: it costs a round trip to
 * the courier, and only matters when you are about to book.
 */
// Neither trailing argument is used — the order id is bound — but
// useActionState requires the (prevState, formData) shape.
export async function getCourierRates(
  orderId: string,
  _prev: CourierRatesState,
  _formData: FormData,
): Promise<CourierRatesState> {
  await assertAdmin();
  const { ratesForOrder } = await import("@/lib/shipping/courier-guy");
  const result = await ratesForOrder(orderId);
  if (!result.ok) {
    console.error(`[admin] rate lookup failed for order ${orderId}: ${result.error}`);
    return { status: "error", message: result.error };
  }
  return { status: "loaded", rates: result.rates };
}

export async function bookCourierShipment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  // Empty when booking straight from the button without checking rates first.
  const serviceLevelCode = String(formData.get("serviceLevelCode") ?? "").trim() || undefined;
  const { bookForOrder } = await import("@/lib/shipping/courier-guy");

  // A booking failure must not take the order page down with it — the owner
  // needs to read the reason and still see the order. Errors are logged with
  // the order id for the function logs, then shown on the page.
  let message: string | null = null;
  try {
    const result = await bookForOrder(id, serviceLevelCode);
    if (!result.booked) message = `Not booked: ${result.reason}`;
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error(`[admin] Courier Guy booking failed for order ${id}:`, raw);
    message = bookingErrorMessage(raw);
  }

  revalidatePath(`/admin/orders/${id}`);
  // redirect() signals via a thrown control-flow error, so it must sit outside
  // the try/catch above or it would be swallowed as a booking failure.
  if (message) redirect(`/admin/orders/${id}?bookingError=${encodeURIComponent(message)}`);
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
