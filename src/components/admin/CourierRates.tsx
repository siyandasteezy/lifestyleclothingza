"use client";

import { useActionState } from "react";
import {
  bookCourierShipment,
  getCourierRates,
  type CourierRatesState,
} from "@/lib/actions/admin";
import { formatMoney } from "@/lib/money";

const initial: CourierRatesState = { status: "idle" };

/**
 * "Get rates" then book, on the admin order page.
 *
 * Booking used to be a single blind button: it always took the cheapest service
 * the route offered, and the only shipping figure on the page was what the
 * customer paid at checkout. Those differ — most sharply on free-shipping
 * orders, where the customer pays nothing and the store still pays the courier.
 */
export function CourierRates({
  orderId,
  chargedCents,
}: {
  orderId: string;
  /** Shipping the customer actually paid, for comparison against live rates. */
  chargedCents: number;
}) {
  const [state, formAction, pending] = useActionState(
    getCourierRates.bind(null, orderId),
    initial,
  );
  const rates = state.rates ?? [];
  const cheapest = rates.length ? Math.min(...rates.map((r) => r.cents)) : null;

  return (
    <div className="mt-4 space-y-3">
      {state.status !== "loaded" && (
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-full border border-ink px-5 text-sm font-semibold text-ink hover:bg-ink hover:text-bone disabled:opacity-50"
          >
            {pending ? "Getting rates…" : "Get Courier Guy rates"}
          </button>
        </form>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-xs text-clay">
          {state.message}
        </p>
      )}

      {state.status === "loaded" && (
        <form action={bookCourierShipment} className="space-y-3">
          <input type="hidden" name="id" value={orderId} />

          <div className="flex items-baseline justify-between text-xs text-stone">
            <span>Live rates for this address</span>
            <span>
              customer paid {chargedCents === 0 ? "R0.00 (free)" : formatMoney(chargedCents)}
            </span>
          </div>

          <ul className="space-y-1.5">
            {rates.map((rate, i) => (
              <li key={rate.code}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:border-ink has-checked:border-ink has-checked:bg-bone">
                  <input
                    type="radio"
                    name="serviceLevelCode"
                    value={rate.code}
                    defaultChecked={i === 0}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="min-w-0 flex-1 truncate">{rate.name}</span>
                  <span className="font-medium">{formatMoney(rate.cents)}</span>
                </label>
              </li>
            ))}
          </ul>

          {/* The gap the customer's payment does not cover. Worth seeing before
              booking, not after — it is the whole cost of a free-shipping order. */}
          {cheapest !== null && cheapest > chargedCents && (
            <p className="text-xs text-clay">
              Cheapest option costs {formatMoney(cheapest - chargedCents)} more than the
              customer paid.
            </p>
          )}

          <button
            type="submit"
            className="h-10 w-full rounded-full bg-ink px-5 text-sm font-semibold text-bone hover:bg-clay"
          >
            Book selected shipment
          </button>
        </form>
      )}
    </div>
  );
}
