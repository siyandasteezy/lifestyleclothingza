"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";

export interface Slide {
  eyebrow: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
  image: string;
}

const INTERVAL_MS = 6500;

/**
 * Chapter i — the Cover. Full-bleed single look, text set directly on the
 * image, serif-italic slide counter, slow Ken Burns drift. Sits underneath
 * the transparent header.
 */
export function Slideshow({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const id = setInterval(() => step(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, step]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-[min(94svh,58rem)] min-h-[34rem] overflow-hidden bg-bone"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.heading}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${slides.length}`}
          aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-1000 ease-(--ease-lux) ${
            i === active ? "z-10 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={slide.image}
              alt=""
              fill
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              sizes="100vw"
              className={`object-cover object-top ${i === active ? "motion-safe:animate-kenburns" : ""}`}
            />
          </div>
          {/* Measured scrim — enough for AA text, light enough to keep the sun in */}
          <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/35 to-ink/10" />

          <div className="absolute inset-x-0 bottom-0 pb-16 sm:pb-20">
            <div className="mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10">
              <div className="max-w-3xl text-bone">
                <p className="font-accent text-base italic opacity-90 sm:text-lg">
                  {slide.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-[length:clamp(2.5rem,6vw,6.75rem)] leading-[0.98] tracking-[0.02em] text-balance uppercase">
                  {slide.heading}
                </h2>
                <p className="mt-5 line-clamp-3 max-w-xl text-sm leading-relaxed font-light opacity-90 sm:text-base">
                  {slide.body}
                </p>
                <div className={i === active ? "mt-8" : "mt-8 invisible"}>
                  <ButtonLink
                    href={slide.cta.href}
                    variant="inverse"
                    size="lg"
                    tabIndex={i === active ? 0 : -1}
                  >
                    {slide.cta.label}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Light veil under the transparent header so ink nav stays legible */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-36 bg-linear-to-b from-bone/80 via-bone/30 to-transparent"
      />

      {/* Folio counter + controls */}
      <div className="absolute right-4 bottom-5 z-20 flex items-center gap-5 text-bone sm:right-6 lg:right-10">
        <span className="font-accent text-lg italic tabular-nums" aria-live="polite">
          {String(active + 1).padStart(2, "0")}
          <span className="mx-2 opacity-60">—</span>
          <span className="opacity-60">{String(slides.length).padStart(2, "0")}</span>
        </span>
        <span className="flex" role="group" aria-label="Slide controls">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => step(-1)}
            className="flex h-10 w-11 items-center justify-center border border-bone/40 transition hover:bg-bone hover:text-ink"
          >
            <svg width="16" height="10" viewBox="0 0 20 12" fill="none" aria-hidden>
              <path d="M7 1L2 6l5 5M2 6h18" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => step(1)}
            className="-ml-px flex h-10 w-11 items-center justify-center border border-bone/40 transition hover:bg-bone hover:text-ink"
          >
            <svg width="16" height="10" viewBox="0 0 20 12" fill="none" aria-hidden>
              <path d="M13 1l5 5-5 5M18 6H0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-pressed={paused}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            onClick={() => setPaused((p) => !p)}
            className="-ml-px flex h-10 w-11 items-center justify-center border border-bone/40 transition hover:bg-bone hover:text-ink"
          >
            {paused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
                <path d="M1 1l8 5-8 5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
                <path d="M1 1h2.6v10H1zM6.4 1H9v10H6.4z" fill="currentColor" />
              </svg>
            )}
          </button>
        </span>
      </div>
    </section>
  );
}
