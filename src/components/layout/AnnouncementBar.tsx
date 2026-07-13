import { site } from "@/lib/site";

/** Slim top bar cycling the store announcements via a CSS marquee. */
export function AnnouncementBar() {
  const messages = site.announcements;
  const row = messages.join("   •   ");
  return (
    <div className="overflow-hidden border-b border-line bg-bone text-ink" role="region" aria-label="Announcements">
      <div className="flex w-max animate-marquee gap-12 py-2 text-xs font-medium tracking-wider whitespace-nowrap sm:text-sm">
        {[0, 1].map((i) => (
          <span key={i} aria-hidden={i === 1}>
            {row} &nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}
