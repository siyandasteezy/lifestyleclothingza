"use client";

import { useActionState } from "react";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";

const initialState: CheckoutState = { status: "idle" };

const inputClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-[15px] text-ink placeholder:font-light placeholder:text-stone transition-colors focus:border-clay focus:outline-none";

function Field({
  label,
  name,
  error,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={`field-${name}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`field-${name}`}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `error-${name}` : undefined}
        className={inputClass}
        {...rest}
      />
      {error && (
        <p id={`error-${name}`} className="mt-1 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ payfastEnabled = false }: { payfastEnabled?: boolean }) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-lg">Contact</legend>
        <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
        <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={errors.phone} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-lg">Delivery</legend>
        <Field label="Full name" name="name" required autoComplete="name" error={errors.name} />
        <Field label="Address" name="address1" required autoComplete="address-line1" error={errors.address1} />
        <Field label="Apartment, suite, etc. (optional)" name="address2" autoComplete="address-line2" error={errors.address2} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" required autoComplete="address-level2" error={errors.city} />
          <Field label="Province" name="province" required autoComplete="address-level1" error={errors.province} />
          <Field label="Postal code" name="postalCode" required autoComplete="postal-code" error={errors.postalCode} />
        </div>
        <Field label="Country" name="country" defaultValue="South Africa" required autoComplete="country-name" error={errors.country} />
        <div>
          <label htmlFor="field-note" className="mb-1.5 block text-sm font-medium">
            Order note (optional)
          </label>
          <textarea id="field-note" name="note" rows={3} className={inputClass} />
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="h-14 w-full border border-ink bg-ink px-10 font-display text-xs tracking-[0.2em] uppercase text-bone transition-colors duration-350 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        >
          {pending
            ? "Placing order…"
            : payfastEnabled
              ? "Continue to payment"
              : "Place order"}
        </button>
        <p className="mt-3 text-xs text-stone">
          {payfastEnabled
            ? "You'll be redirected to PayFast to pay securely by card, EFT, or SnapScan. Delivery by The Courier Guy."
            : "Payment is settled via EFT / payment link after your order is confirmed."}
        </p>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-clay">
          {state.status === "error" && state.message}
        </p>
      </div>
    </form>
  );
}
