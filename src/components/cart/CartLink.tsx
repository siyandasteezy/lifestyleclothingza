"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Reads the cart-count cookie client-side so pages stay statically cacheable. */
export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      const match = document.cookie.match(/(?:^|; )cart_count=(\d+)/);
      setCount(match ? parseInt(match[1], 10) : 0);
    };
    read();
    window.addEventListener("cart:updated", read);
    return () => window.removeEventListener("cart:updated", read);
  }, []);

  return (
    <Link href="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} className="relative p-2.5 hover:text-clay">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3 5h2l1.6 9.2A1.5 1.5 0 008.08 15.5h6.34a1.5 1.5 0 001.48-1.27L17 8H6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="18" r="1" fill="currentColor" />
        <circle cx="14.5" cy="18" r="1" fill="currentColor" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[11px] font-semibold text-bone">
          {count}
        </span>
      )}
    </Link>
  );
}
