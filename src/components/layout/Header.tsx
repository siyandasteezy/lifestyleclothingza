"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";
import { CartLink } from "@/components/cart/CartLink";
import { MobileMenu } from "./MobileMenu";

/**
 * Transparent over the homepage cover, solid plaster after 40px of scroll.
 * Everywhere else it is always solid.
 */
export function Header() {
  const pathname = usePathname();
  const overCover = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overCover) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overCover]);

  const transparent = overCover && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-350",
        transparent
          ? "border-b border-transparent bg-transparent"
          : "border-b border-line bg-bone/92 backdrop-blur supports-backdrop-filter:bg-bone/80",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-10">
        <div className="flex items-center gap-2 md:hidden">
          <MobileMenu menu={site.mainMenu} />
        </div>

        <Link href="/" className="flex shrink-0 items-center" aria-label={`${site.name} — home`}>
          <Image
            src={site.logo}
            alt={site.name}
            width={48}
            height={48}
            priority
            className="h-10 w-10 object-contain md:h-12 md:w-12"
          />
        </Link>

        <nav aria-label="Main menu" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {site.mainMenu.map((item) =>
              item.children ? (
                <li key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 py-2 font-display text-[11px] tracking-[0.2em] uppercase hover:text-clay"
                  >
                    {item.label}
                    <svg width="9" height="6" viewBox="0 0 10 6" aria-hidden className="mt-px">
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.25" />
                    </svg>
                  </Link>
                  <div className="invisible absolute left-1/2 -translate-x-1/2 pt-4 opacity-0 transition duration-350 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="flex w-[34rem] border border-line bg-paper shadow-lift">
                      <ul className="flex-1 p-5">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block py-1.5 text-sm text-ink-soft hover:text-clay"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                        <li className="mt-3 border-t border-line pt-3">
                          <Link
                            href={item.href}
                            className="font-display text-[11px] tracking-[0.2em] uppercase text-ink hover:text-clay"
                          >
                            Shop all →
                          </Link>
                        </li>
                      </ul>
                      <div className="relative hidden w-44 lg:block">
                        <Image
                          src="/images/home/99EFD2A4-043C-410B-931E-67F30A62530F.png"
                          alt=""
                          fill
                          sizes="176px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    {...(item.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="py-2 font-display text-[11px] tracking-[0.2em] uppercase hover:text-clay"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/search" aria-label="Search" className="p-2.5 hover:text-clay">
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.25" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </Link>
          <CartLink />
        </div>
      </div>
    </header>
  );
}
