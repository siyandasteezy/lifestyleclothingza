const CURRENCY_SYMBOL = "R";

export function parsePriceToCents(price: string | number): number {
  const n = typeof price === "number" ? price : parseFloat(price);
  return Math.round(n * 100);
}

/** Formats cents as the storefront price string, e.g. "R 600.00" */
export function formatMoney(cents: number): string {
  return `${CURRENCY_SYMBOL} ${(cents / 100).toFixed(2)}`;
}
