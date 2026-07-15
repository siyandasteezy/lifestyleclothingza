"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { addToCart, type CartActionState } from "@/lib/actions/cart";
import { Price } from "@/components/ui/Price";
import type { ProductVM } from "@/lib/types";

const initialState: CartActionState = { status: "idle" };

/** Variant selection + add to cart. The CTA row pins to the thumb zone on mobile. */
export function ProductForm({ product }: { product: ProductVM }) {
  const hasOptions =
    product.options.length > 0 &&
    !(product.options.length === 1 && product.variants.length === 1);

  const [selection, setSelection] = useState<string[]>(() => {
    const first = product.variants.find((v) => v.available) ?? product.variants[0];
    return [first?.option1 ?? "", first?.option2 ?? "", first?.option3 ?? ""];
  });
  const [toast, setToast] = useState(false);

  const selected = useMemo(
    () =>
      product.variants.find(
        (v) =>
          (v.option1 ?? "") === selection[0] &&
          (v.option2 ?? "") === selection[1] &&
          (v.option3 ?? "") === selection[2],
      ) ?? null,
    [product.variants, selection],
  );

  const [state, formAction, pending] = useActionState(
    async (prev: CartActionState, formData: FormData) => {
      const result = await addToCart(prev, formData);
      if (result.status === "success") {
        window.dispatchEvent(new Event("cart:updated"));
        setToast(true);
      }
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="productHandle" value={product.handle} />
      <input type="hidden" name="variantKey" value={selected?.key ?? ""} />

      <div className="text-xl">
        {selected ? (
          <Price cents={selected.priceCents} compareAtCents={selected.compareAtCents} />
        ) : (
          <Price cents={product.minPriceCents} maxCents={product.maxPriceCents} />
        )}
      </div>

      {hasOptions &&
        product.options.map((option, optionIndex) => (
          <fieldset key={option.name} className="mt-6">
            <legend className="mb-3 font-display text-[11px] tracking-[0.2em] uppercase">
              {option.name}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selection[optionIndex] === value;
                const candidate = product.variants.find((v) => {
                  const opts = [v.option1 ?? "", v.option2 ?? "", v.option3 ?? ""];
                  return selection.every((sel, i) =>
                    i === optionIndex ? opts[i] === value : opts[i] === sel,
                  );
                });
                const unavailable = candidate ? !candidate.available : true;
                return (
                  <label
                    key={value}
                    className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center border px-4 py-2 text-sm transition ${
                      isSelected
                        ? "border-ink bg-ink text-bone"
                        : "border-line bg-paper text-ink hover:border-ink"
                    } ${unavailable ? "opacity-45 line-through" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`option-${optionIndex}`}
                      value={value}
                      checked={isSelected}
                      onChange={() =>
                        setSelection((prev) => {
                          const next = [...prev];
                          next[optionIndex] = value;
                          return next;
                        })
                      }
                      className="sr-only"
                    />
                    {value}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

      {/* Pins to the thumb zone on small screens */}
      <div className="mt-6 flex items-center gap-3 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:-mx-4 max-lg:border-t max-lg:border-line max-lg:bg-bone/95 max-lg:p-3 max-lg:backdrop-blur">
        <label className="sr-only" htmlFor="quantity">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          name="quantity"
          min={1}
          max={99}
          defaultValue={1}
          className="h-14 w-20 border border-line bg-paper px-3 text-center text-sm focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !selected || !selected.available}
          className="h-14 flex-1 border border-ink bg-ink px-8 font-display text-xs tracking-[0.2em] text-bone uppercase transition-colors duration-350 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          {pending
            ? "Adding…"
            : selected && !selected.available
              ? "Sold out"
              : "Add to cart"}
        </button>
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {state.status === "error" && <span className="text-clay">{state.message}</span>}
      </p>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 border border-line bg-paper py-3 pr-4 pl-5 shadow-lift lg:bottom-8">
          <span className="text-sm">✓ Added to cart</span>
          <Link
            href="/cart"
            className="font-display text-[11px] tracking-[0.18em] text-ink uppercase underline underline-offset-4 hover:text-clay"
          >
            View bag
          </Link>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(false)}
            className="text-stone hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}
    </form>
  );
}
