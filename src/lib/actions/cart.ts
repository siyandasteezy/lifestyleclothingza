"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readCartLines, writeCartLines } from "@/lib/cart";
import { getProduct } from "@/lib/data";

const lineSchema = z.object({
  productHandle: z.string().min(1),
  variantKey: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

export interface CartActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function addToCart(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = lineSchema.safeParse({
    productHandle: formData.get("productHandle"),
    variantKey: formData.get("variantKey"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) return { status: "error", message: "Please select an option." };

  const { productHandle, variantKey, quantity } = parsed.data;
  const product = await getProduct(productHandle);
  const variant = product?.variants.find((v) => v.key === variantKey);
  if (!product || !variant) return { status: "error", message: "Product unavailable." };
  if (!variant.available) return { status: "error", message: "This option is sold out." };

  const lines = await readCartLines();
  const existing = lines.find(
    (l) => l.productHandle === productHandle && l.variantKey === variantKey,
  );
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, 99);
  else lines.push({ productHandle, variantKey, quantity });

  await writeCartLines(lines);
  revalidatePath("/cart");
  return { status: "success", message: "Added to cart." };
}

export async function updateCartLine(formData: FormData): Promise<void> {
  const productHandle = String(formData.get("productHandle") ?? "");
  const variantKey = String(formData.get("variantKey") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);

  let lines = await readCartLines();
  if (quantity <= 0) {
    lines = lines.filter(
      (l) => !(l.productHandle === productHandle && l.variantKey === variantKey),
    );
  } else {
    const line = lines.find(
      (l) => l.productHandle === productHandle && l.variantKey === variantKey,
    );
    if (line) line.quantity = Math.min(Math.trunc(quantity), 99);
  }
  await writeCartLines(lines);
  revalidatePath("/cart");
}

export async function clearCart(): Promise<void> {
  await writeCartLines([]);
  revalidatePath("/cart");
}
