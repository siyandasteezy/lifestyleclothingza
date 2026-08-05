// Variant planning: the rules for adding or removing a product variant.
//
// Kept out of the "use server" action module for two reasons: that module may
// only export async functions, and these rules are worth testing directly. The
// only other way to exercise them is by driving the admin UI behind a login.

export interface VariantOption {
  name: string;
  position: number;
  values: string[];
}

export interface ExistingVariant {
  option1: string | null;
  option2: string | null;
  option3: string | null;
  position: number;
}

export interface VariantDraft {
  title: string;
  sku: string;
  priceCents: number;
  compareAtCents: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventoryQty: number;
  position: number;
}

/** An option value the product did not declare yet, to be added alongside the variant. */
export interface NewOptionValue {
  position: number;
  /** The option's full value list with the new value in its proper place. */
  values: string[];
}

export type VariantPlan =
  | { ok: true; draft: VariantDraft; newValues: NewOptionValue[] }
  | { ok: false; error: string };

/**
 * Canonical size ladder, matching scripts/normalize-options.ts. The product page
 * renders its size buttons in the option's stored order, so a size added from
 * the admin has to land in its right place rather than on the end — otherwise
 * the storefront shows "S · 5XL · M".
 */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

/** Adds `value` to an option's values, keeping sizes in ladder order. */
export function withOptionValue(option: VariantOption, value: string): string[] {
  if (option.values.includes(value)) return option.values;
  const next = [...option.values, value];
  // Only reorder when every value is a known size; anything else (colours,
  // one-off labels) keeps the order the owner chose.
  if (next.every((v) => SIZE_ORDER.includes(v))) {
    return next.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  }
  return next;
}

export interface VariantFormValues {
  /** Chosen value per option position, keyed by position (1-3). */
  optionValues: Record<number, string>;
  price: string;
  compareAt: string;
  inventory: string;
  sku: string;
}

/**
 * Validates a proposed variant against the product's declared options and its
 * existing variants, returning either the row to create or the reason not to.
 */
export function planVariant(
  options: VariantOption[],
  existing: ExistingVariant[],
  form: VariantFormValues,
): VariantPlan {
  const values: (string | null)[] = [null, null, null];
  const newValues: NewOptionValue[] = [];

  for (const option of options) {
    const value = (form.optionValues[option.position] ?? "").trim();
    if (!value) return { ok: false, error: `Pick or enter a ${option.name}.` };
    if (value.length > 40) {
      return { ok: false, error: `That ${option.name} is too long.` };
    }
    // A value the product does not stock yet is allowed: it is how a new size
    // gets added. The option grows to include it, so options and variants stay
    // in step rather than drifting apart.
    if (!option.values.includes(value)) {
      newValues.push({ position: option.position, values: withOptionValue(option, value) });
    }
    values[option.position - 1] = value;
  }

  const title = values.filter(Boolean).join(" / ") || "Default Title";

  const duplicate = existing.some(
    (v) => v.option1 === values[0] && v.option2 === values[1] && v.option3 === values[2],
  );
  if (duplicate) return { ok: false, error: `"${title}" already exists.` };

  const price = parseFloat(form.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a price of 0 or more." };
  }

  const compareAtRaw = form.compareAt.trim();
  let compareAtCents: number | null = null;
  if (compareAtRaw) {
    const compareAt = parseFloat(compareAtRaw);
    if (!Number.isFinite(compareAt) || compareAt < 0) {
      return { ok: false, error: "Compare-at price must be a number of 0 or more." };
    }
    compareAtCents = Math.round(compareAt * 100);
  }

  return {
    ok: true,
    newValues,
    draft: {
      title,
      sku: form.sku.trim(),
      priceCents: Math.round(price * 100),
      compareAtCents,
      option1: values[0],
      option2: values[1],
      option3: values[2],
      inventoryQty: Math.max(0, parseInt(form.inventory, 10) || 0),
      position: nextVariantPosition(existing),
    },
  };
}

/**
 * Positions are never reused. The storefront cart keys its lines by variant
 * position, so filling a gap left by a deleted variant would let a cart that
 * was built before the deletion resolve to a different product entirely.
 */
export function nextVariantPosition(existing: ExistingVariant[]): number {
  return Math.max(0, ...existing.map((v) => v.position)) + 1;
}

/** A product with no variants cannot be bought, so the last one is protected. */
export function canDeleteVariant(remainingCount: number): boolean {
  return remainingCount > 1;
}
