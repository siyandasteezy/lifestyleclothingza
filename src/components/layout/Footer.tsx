import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";

/** Editorial index footer — light plaster, hairlines, oversized wordmark. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-bone">
      <div className="mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-14 py-20 md:grid-cols-[1fr_1fr_1.4fr] lg:gap-20">
          <nav aria-label="Main menu">
            <h2 className="mb-5 font-display text-[10px] tracking-[0.3em] uppercase text-stone">
              Main menu
            </h2>
            <ul className="space-y-2.5">
              {site.mainMenu.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    {...(item.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-sm text-ink-soft hover:text-clay"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer menu">
            <h2 className="mb-5 font-display text-[10px] tracking-[0.3em] uppercase text-stone">
              Footer menu
            </h2>
            <ul className="space-y-2.5">
              {site.footerMenu.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-ink-soft hover:text-clay">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-display text-display-sm leading-snug text-balance">
              {site.newsletter.heading}
            </h2>
            <p className="mt-3 max-w-md text-sm font-light text-ink-soft">{site.newsletter.body}</p>
            <NewsletterForm />
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">
                {site.newsletter.subheading}
              </span>
              <ul className="flex items-center gap-6" aria-label="Social media">
                {(
                  [
                    ["Facebook", site.social.facebook],
                    ["Instagram", site.social.instagram],
                    ["TikTok", site.social.tiktok],
                  ] as const
                ).map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ink underline decoration-line underline-offset-4 hover:text-clay hover:decoration-clay"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-sm font-light text-stone">{site.newsletter.socialNote}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 text-xs text-stone sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()}, {site.name} — Proudly South African
          </p>
          <p>
            <a href={`mailto:${site.email}`} className="hover:text-clay">
              {site.email}
            </a>
          </p>
        </div>
      </div>

      {/* Wordmark cropped at the baseline — the signature of a label, not a shop */}
      <div aria-hidden className="overflow-hidden select-none">
        <p className="mx-auto -mb-[0.34em] max-w-[100rem] px-4 font-display text-[11.5vw] leading-none tracking-[0.06em] whitespace-nowrap text-ink/[0.09] uppercase sm:px-6 lg:px-10">
          Lifestyle Clothing
        </p>
      </div>
    </footer>
  );
}
