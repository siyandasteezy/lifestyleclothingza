"use client";

import Image from "next/image";
import { useActionState } from "react";
import { lookupOrder, type OrderTracking, type TrackState } from "@/lib/actions/track";
import { cn } from "@/lib/cn";

const initial: TrackState = { status: "idle" };

const inputClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-[15px] text-ink placeholder:font-light placeholder:text-stone transition-colors focus:border-clay focus:outline-none";

export function TrackForm() {
  const [state, formAction, pending] = useActionState(lookupOrder, initial);

  return (
    <div className="mx-auto max-w-2xl">
      <form action={formAction} className="grid gap-6 sm:grid-cols-[1fr_1.4fr] sm:items-end">
        <div>
          <label htmlFor="track-number" className="mb-1.5 block text-sm font-medium">
            Order number
          </label>
          <input
            id="track-number"
            name="number"
            inputMode="numeric"
            required
            placeholder="e.g. 1024"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="track-email" className="mb-1.5 block text-sm font-medium">
            Email used at checkout
          </label>
          <input
            id="track-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="h-13 w-full border border-ink bg-ink px-9 font-display text-xs tracking-[0.2em] uppercase text-bone transition-colors duration-350 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Looking…" : "Track order"}
          </button>
        </div>
      </form>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-clay">
        {state.status === "error" && state.message}
      </p>

      {state.status === "found" && state.order && <OrderResult order={state.order} />}
    </div>
  );
}

/* ---------- Result ---------- */

const STEPS = ["Order placed", "Payment confirmed", "Shipped", "Delivered"] as const;

function currentStep(o: OrderTracking): number {
  if (/deliver/i.test(o.courierStatus ?? "")) return 4;
  if (o.status === "FULFILLED" || o.trackingReference) return 3;
  if (o.status === "PAID") return 2;
  return 1;
}

function OrderResult({ order }: { order: OrderTracking }) {
  const terminal =
    order.status === "CANCELLED"
      ? "This order was cancelled."
      : order.status === "REFUNDED"
        ? "This order was refunded."
        : null;
  const step = currentStep(order);

  const dateFmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })
      : null;

  return (
    <section className="mt-12 border-t border-line pt-10" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-display-sm">Order #{order.number}</h2>
        <span className="text-sm text-stone">
          Placed {dateFmt(order.placedAt)} · {order.itemCount} item
          {order.itemCount === 1 ? "" : "s"} · {order.totalLabel}
        </span>
      </div>

      {terminal ? (
        <p className="mt-6 border border-line bg-paper p-5 text-sm text-ink-soft">{terminal}</p>
      ) : (
        <>
          {/* Status timeline */}
          <ol className="mt-8">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <li key={label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                        done && "border-clay bg-clay text-bone",
                        active && "border-clay text-clay",
                        !done && !active && "border-line text-stone",
                      )}
                    >
                      {done ? "✓" : n}
                    </span>
                    {n < STEPS.length && (
                      <span className={cn("w-px flex-1", n < step ? "bg-clay" : "bg-line")} />
                    )}
                  </div>
                  <div className={cn("pb-8", n === STEPS.length && "pb-0")}>
                    <p
                      className={cn(
                        "font-display text-xs tracking-[0.2em] uppercase",
                        active ? "text-ink" : done ? "text-ink-soft" : "text-stone",
                      )}
                    >
                      {label}
                    </p>
                    {active && label === "Shipped" && order.estimatedDelivery && (
                      <p className="mt-1 text-sm text-stone">
                        Estimated delivery {dateFmt(order.estimatedDelivery)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Live courier events */}
          {order.courierEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">
                Delivery updates
              </h3>
              <ul className="mt-4 space-y-3">
                {order.courierEvents.map((e, i) => (
                  <li key={i} className="flex gap-4 text-sm">
                    <span className="w-28 shrink-0 text-stone tabular-nums">
                      {dateFmt(e.date) ?? "—"}
                    </span>
                    <span className="text-ink-soft">{e.message || e.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.trackingReference && order.trackingUrl && (
            <p className="mt-8 text-sm text-stone">
              Tracking reference{" "}
              <span className="font-medium text-ink">{order.trackingReference}</span> ·{" "}
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-clay underline underline-offset-2 hover:text-clay-deep"
              >
                View on The Courier Guy
              </a>
            </p>
          )}
        </>
      )}

      {/* Items */}
      <div className="mt-10">
        <h3 className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">In this order</h3>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 py-4">
              <span className="relative block h-16 w-13 shrink-0 overflow-hidden bg-bone">
                {item.image && (
                  <Image src={item.image} alt="" fill sizes="52px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{item.title}</span>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <span className="block text-sm text-stone">{item.variantTitle}</span>
                )}
              </span>
              <span className="text-sm text-stone">× {item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
