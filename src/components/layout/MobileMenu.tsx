"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { MenuItem } from "@/lib/site";

export function MobileMenu({ menu }: { menu: MenuItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close the drawer on navigation
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        className="rounded-full p-2.5 hover:bg-ink/5"
        onClick={() => dialogRef.current?.showModal()}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Main menu"
        className="m-0 h-dvh max-h-none w-80 max-w-[85vw] bg-bone p-0 shadow-lift backdrop:bg-ink/40 open:animate-in"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <span className="font-display text-base">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            className="rounded-full p-2 hover:bg-ink/5"
            onClick={() => dialogRef.current?.close()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {menu.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 font-medium hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <span aria-hidden className="text-clay transition group-open:rotate-45">+</span>
                    </summary>
                    <ul className="mt-1 space-y-1 border-l border-line pl-4">
                      <li>
                        <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5">
                          Shop all
                        </Link>
                      </li>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link href={item.href} className="block rounded-lg px-3 py-3 font-medium hover:bg-ink/5">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
