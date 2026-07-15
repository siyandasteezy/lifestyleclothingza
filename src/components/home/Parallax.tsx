"use client";

import { useEffect, useRef } from "react";

/** ±6% scroll-linked drift for campaign spreads. Transform-only, rAF-throttled. */
export function Parallax({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current;
      const target = inner.current;
      if (!el || !target) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -1 … 1
      target.style.transform = `translateY(${(-progress * 6).toFixed(2)}%)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={outer} className="relative h-full w-full overflow-hidden">
      <div ref={inner} className="absolute -inset-y-[8%] inset-x-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}
