"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Slide {
  eyebrow: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
  image: string;
}

const INTERVAL_MS = 6500;

/**
 * Editorial carousel matching the original theme's slideshow: light canvas,
 * neighbouring slides peeking at the edges, prev/next arrows, and a frosted
 * white text card with dark type. Scroll-snap based, so it swipes natively.
 */
export function Slideshow({ slides }: { slides: Slide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const scrollToSlide = useCallback((i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
      behavior: reducedMotion.current ? "auto" : "smooth",
    });
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const next = (active + dir + slides.length) % slides.length;
      scrollToSlide(next);
    },
    [active, slides.length, scrollToSlide],
  );

  // Keep `active` in sync while the user swipes
  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length === 0) return;
    const slideWidth = (track.children[0] as HTMLElement).clientWidth;
    const gap = 16;
    setActive(
      Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / (slideWidth + gap)))),
    );
  }, [slides.length]);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const id = setInterval(() => step(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, step]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="bg-bone py-4 sm:py-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[5vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.heading}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="relative w-[90vw] shrink-0 snap-center overflow-hidden bg-white sm:w-[86vw]"
          >
            <div className="relative h-[72svh] min-h-[28rem] sm:h-[min(82svh,50rem)]">
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                sizes="90vw"
                className="object-cover object-top"
              />

              {/* Frosted text card */}
              <div className="absolute bottom-4 left-1/2 w-[92%] -translate-x-1/2 sm:top-1/2 sm:bottom-auto sm:left-[6%] sm:w-[24rem] sm:-translate-x-0 sm:-translate-y-1/2">
                {/* Prev / next arrows */}
                <div className="absolute -top-11 left-0 flex" role="group" aria-label="Slide controls">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() => step(-1)}
                    className="flex h-11 w-14 items-center justify-center bg-ink text-bone transition hover:bg-clay"
                    tabIndex={i === active ? 0 : -1}
                  >
                    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden>
                      <path d="M7 1L2 6l5 5M2 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => step(1)}
                    className="flex h-11 w-14 items-center justify-center bg-ink text-bone transition hover:bg-clay"
                    tabIndex={i === active ? 0 : -1}
                  >
                    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden>
                      <path d="M13 1l5 5-5 5M18 6H0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <div className="bg-white/75 p-6 text-center text-ink backdrop-blur-[2px] sm:p-9">
                  <p className="text-[11px] tracking-[0.25em] uppercase text-ink-soft">
                    {slide.eyebrow}
                  </p>
                  <h2 className="mt-4 font-display text-xl leading-snug tracking-[0.06em] uppercase text-balance sm:text-2xl">
                    {slide.heading}
                  </h2>
                  <p className="mt-4 hidden text-sm leading-relaxed font-light text-ink-soft sm:block">
                    {slide.body}
                  </p>
                  <Link
                    href={slide.cta.href}
                    tabIndex={i === active ? 0 : -1}
                    className="mt-5 inline-flex items-center gap-3 border-b border-ink pb-1 text-sm tracking-wide hover:border-clay hover:text-clay sm:mt-6"
                  >
                    {slide.cta.label}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-2.5">
        {slides.map((slide, i) => (
          <button
            key={slide.heading}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            onClick={() => scrollToSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-ink" : "w-2 bg-ink/25 hover:bg-ink/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
