"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { ProductGrid } from "./ProductGrid";
import { PRICE_BANDS, bandById, countsByBand, filterByBand } from "@/lib/filters";
import { cn } from "@/lib/cn";
import type { ProductVM } from "@/lib/types";

/** replaceState fires no event of its own, so the store is told explicitly. */
const URL_CHANGED = "collectionfilters:urlchange";

function subscribeToUrl(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_CHANGED, onChange);
  };
}

function getUrlBand(): string | null {
  return bandById(new URLSearchParams(window.location.search).get("price"))?.id ?? null;
}

/**
 * The server has no query string, so it renders the full, unfiltered grid —
 * which is exactly what a crawler and the first paint should see.
 */
function getServerBand(): string | null {
  return null;
}

/**
 * Catalogue and price filters above a collection's grid.
 *
 * Catalogue is a row of real links to real collection URLs, not a control —
 * crawlable, and it doubles as internal linking between category pages.
 *
 * Price is client-side and only writes a `?price=` parameter, which keeps the
 * collection pages statically prerendered. Reading searchParams on the server
 * would opt every one of them into per-request rendering, and these are the
 * store's most commercial pages.
 */
export function CollectionFilters({
  products,
  collections,
  currentHandle,
  priorityCount = 4,
}: {
  products: ProductVM[];
  collections: { handle: string; title: string }[];
  currentHandle: string;
  priorityCount?: number;
}) {
  // The URL is the single source of truth rather than component state mirroring
  // it. Subscribing keeps a shared link, a reload and the browser's back button
  // all correct, and avoids setting state from an effect on mount — which would
  // render the full grid and then immediately re-render it filtered.
  const bandId = useSyncExternalStore(subscribeToUrl, getUrlBand, getServerBand);

  const choose = useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("price", next);
    else url.searchParams.delete("price");
    // replaceState, not a push: the products are already on the page, and a
    // history entry per filter click would trap the back button.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(URL_CHANGED));
  }, []);

  const band = bandById(bandId);
  const counts = countsByBand(products);
  const visible = filterByBand(products, band);

  // min-h-11 on small screens matches the 44px touch target the variant
  // selectors already use; desktop keeps the pills compact.
  const pill =
    "inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs tracking-[0.06em] whitespace-nowrap transition sm:min-h-8";

  return (
    <>
      <div className="mb-10 space-y-4 border-y border-line py-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="font-display text-[10px] tracking-[0.25em] text-stone uppercase">
            Catalogue
          </span>
          <Link
            href="/collections/all"
            className={cn(
              pill,
              currentHandle === "all"
                ? "border-ink bg-ink text-bone"
                : "border-line text-ink hover:border-ink",
            )}
          >
            All
          </Link>
          {collections.map((c) => (
            <Link
              key={c.handle}
              href={`/collections/${c.handle}`}
              className={cn(
                pill,
                c.handle === currentHandle
                  ? "border-ink bg-ink text-bone"
                  : "border-line text-ink hover:border-ink",
              )}
            >
              {c.title}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="font-display text-[10px] tracking-[0.25em] text-stone uppercase">
            Price
          </span>
          <button
            type="button"
            onClick={() => choose(null)}
            aria-pressed={band === null}
            className={cn(
              pill,
              band === null ? "border-ink bg-ink text-bone" : "border-line text-ink hover:border-ink",
            )}
          >
            Any
          </button>
          {PRICE_BANDS.map((b) => {
            const empty = counts[b.id] === 0;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => choose(b.id)}
                disabled={empty}
                aria-pressed={band?.id === b.id}
                title={empty ? "Nothing in this collection at that price" : undefined}
                className={cn(
                  pill,
                  band?.id === b.id
                    ? "border-ink bg-ink text-bone"
                    : "border-line text-ink hover:border-ink",
                  empty && "cursor-not-allowed border-line text-stone opacity-45 hover:border-line",
                )}
              >
                {b.label}
                <span className="ml-1.5 text-[10px] opacity-60">{counts[b.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "product" : "products"} shown
        {band ? ` for ${band.label}` : ""}
      </p>

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-stone">Nothing in this collection at that price.</p>
          <button
            type="button"
            onClick={() => choose(null)}
            className="mt-3 text-sm text-ink underline underline-offset-4 hover:text-clay"
          >
            Clear the price filter
          </button>
        </div>
      ) : (
        <ProductGrid products={visible} priorityCount={priorityCount} editorial />
      )}
    </>
  );
}
