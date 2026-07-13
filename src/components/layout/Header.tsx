import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { CartLink } from "@/components/cart/CartLink";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bone/90 backdrop-blur supports-backdrop-filter:bg-bone/75">
      <Container className="flex h-16 items-center justify-between gap-4 md:h-20">
        <div className="flex items-center gap-2 md:hidden">
          <MobileMenu menu={site.mainMenu} />
        </div>

        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${site.name} — home`}>
          <Image
            src={site.logo}
            alt=""
            width={44}
            height={44}
            priority
            className="h-10 w-10 rounded-full object-contain md:h-11 md:w-11"
          />
          <span className="font-display text-lg tracking-tight max-[380px]:hidden">
            {site.name}
          </span>
        </Link>

        <nav aria-label="Main menu" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {site.mainMenu.map((item) =>
              item.children ? (
                <li key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium hover:bg-ink/5"
                  >
                    {item.label}
                    <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden className="mt-px">
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </Link>
                  <div className="invisible absolute left-0 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="w-72 rounded-card border border-line bg-paper p-2 shadow-lift">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bone hover:text-ink"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium hover:bg-ink/5"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="rounded-full p-2.5 hover:bg-ink/5"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          <CartLink />
        </div>
      </Container>
    </header>
  );
}
