import { cookies } from "next/headers";
import { getProduct } from "@/lib/data";
import type { CartLine, ResolvedCartLine } from "@/lib/types";

const CART_COOKIE = "cart";
const COUNT_COOKIE = "cart_count";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function readCartLines(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.productHandle === "string" &&
        typeof l?.variantKey === "string" &&
        Number.isInteger(l?.quantity) &&
        l.quantity > 0,
    );
  } catch {
    return [];
  }
}

export async function writeCartLines(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  jar.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  // Readable by the client for the header badge — contains only a number.
  jar.set(COUNT_COOKIE, String(count), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function resolveCart(): Promise<{
  lines: ResolvedCartLine[];
  subtotalCents: number;
  count: number;
}> {
  const lines = await readCartLines();
  const resolved: ResolvedCartLine[] = [];
  for (const line of lines) {
    const product = await getProduct(line.productHandle);
    const variant = product?.variants.find((v) => v.key === line.variantKey);
    if (!product || !variant) continue; // product removed since it was added
    resolved.push({
      ...line,
      product,
      variant,
      lineTotalCents: variant.priceCents * line.quantity,
    });
  }
  const subtotalCents = resolved.reduce((n, l) => n + l.lineTotalCents, 0);
  const count = resolved.reduce((n, l) => n + l.quantity, 0);
  return { lines: resolved, subtotalCents, count };
}
