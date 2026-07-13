"use client";

import { useActionState, useMemo, useState } from "react";
import { addToCart, type CartActionState } from "@/lib/actions/cart";
import { Price } from "@/components/ui/Price";
import type { ProductVM } from "@/lib/types";

const initialState: CartActionState = { status: "idle" };

/** Variant selection + add to cart. Options render as accessible radio groups. */
export function ProductForm({ product }: { product: ProductVM }) {
  const hasOptions =
    product.options.length > 0 &&
    !(product.options.length === 1 && product.variants.length === 1);

  const [selection, setSelection] = useState<string[]>(() => {
    const first = product.variants.find((v) => v.available) ?? product.variants[0];
    return [first?.option1 ?? "", first?.option2 ?? "", first?.option3 ?? ""];
  });

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
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="productHandle" value={product.handle} />
      <input type="hidden" name="variantKey" value={selected?.key ?? ""} />

      <div className="text-xl font-semibold">
        {selected ? (
          <Price cents={selected.priceCents} compareAtCents={selected.compareAtCents} />
        ) : (
          <Price cents={product.minPriceCents} maxCents={product.maxPriceCents} />
        )}
      </div>

      {hasOptions &&
        product.options.map((option, optionIndex) => (
          <fieldset key={option.name} className="mt-6">
            <legend className="mb-2 text-sm font-semibold tracking-wide">{option.name}</legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selection[optionIndex] === value;
                // A value is unavailable when no in-stock variant matches it
                // combined with the other currently selected options.
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
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition ${
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

      <div className="mt-6 flex items-center gap-3">
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
          className="h-12 w-20 rounded-full border border-line bg-paper px-4 text-center text-sm font-medium focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !selected || !selected.available}
          className="h-12 flex-1 rounded-full bg-ink px-8 text-sm font-semibold tracking-wide text-bone transition hover:bg-clay disabled:pointer-events-none disabled:opacity-50"
        >
          {pending
            ? "Adding…"
            : selected && !selected.available
              ? "Sold out"
              : "Add to cart"}
        </button>
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {state.status === "success" && <span className="text-moss">✓ {state.message}</span>}
        {state.status === "error" && <span className="text-clay">{state.message}</span>}
      </p>
    </form>
  );
}
