import Link from "next/link";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { NewsletterForm } from "./NewsletterForm";

const socials = [
  { label: "Facebook", href: site.social.facebook, path: "M13 8h2V5h-2c-1.9 0-3 1.3-3 3v2H8v3h2v7h3v-7h2.2l.5-3H13V8.3c0-.2.1-.3.3-.3z" },
  { label: "Instagram", href: site.social.instagram, path: "M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2zm0 5.9a2.3 2.3 0 110-4.6 2.3 2.3 0 010 4.6zM16.8 8a.9.9 0 11-1.8 0 .9.9 0 011.8 0zM8.6 5h6.8A3.6 3.6 0 0119 8.6v6.8a3.6 3.6 0 01-3.6 3.6H8.6A3.6 3.6 0 015 15.4V8.6A3.6 3.6 0 018.6 5zm6.8 12.7c1.3 0 2.3-1 2.3-2.3V8.6c0-1.3-1-2.3-2.3-2.3H8.6c-1.3 0-2.3 1-2.3 2.3v6.8c0 1.3 1 2.3 2.3 2.3h6.8z" },
  { label: "TikTok", href: site.social.tiktok, path: "M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 11-1.85-2.48V9.75a5.76 5.76 0 00-.74-.05 5.66 5.66 0 105.66 5.66V9.01a7.35 7.35 0 004.3 1.38V7.3a4.28 4.28 0 01-3.22-1.48z" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-bone">
      <Container className="grid gap-12 py-16 md:grid-cols-3 lg:gap-16">
        <nav aria-label="Main menu">
          <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase text-bone/60">
            Main menu
          </h2>
          <ul className="space-y-2.5">
            {site.mainMenu.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-sm text-bone/85 hover:text-bone hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer menu">
          <h2 className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase text-bone/60">
            Footer menu
          </h2>
          <ul className="space-y-2.5">
            {site.footerMenu.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-sm text-bone/85 hover:text-bone hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-display-sm">{site.newsletter.heading}</h2>
          <p className="mt-2 text-sm text-bone/75">{site.newsletter.body}</p>
          <NewsletterForm />
          <p className="mt-8 mb-3 text-xs font-semibold tracking-[0.2em] uppercase text-bone/60">
            {site.newsletter.subheading}
          </p>
          <ul className="flex items-center gap-2" aria-label="Social media">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-bone/25 text-bone/85 transition hover:border-bone hover:text-bone"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                    <path d={s.path} fill="currentColor" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-bone/60">{site.newsletter.socialNote}</p>
        </div>
      </Container>
      <div className="border-t border-bone/15">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-bone/55 sm:flex-row">
          <p>
            © {new Date().getFullYear()}, {site.name}
          </p>
          <p>
            <a href={`mailto:${site.email}`} className="hover:text-bone hover:underline">
              {site.email}
            </a>
          </p>
        </Container>
      </div>
    </footer>
  );
}
