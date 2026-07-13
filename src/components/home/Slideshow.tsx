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

export function Slideshow({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const next = useCallback(
    () => setActive((i) => (i + 1) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const id = setInterval(next, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-[min(92svh,56rem)] min-h-[32rem] overflow-hidden bg-ink text-bone"
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
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === active ? "z-10 opacity-100" : "z-0 opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            sizes="100vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-ink/45" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10">
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                <p className="mb-4 text-xs tracking-[0.3em] uppercase text-bone/90 sm:text-sm">
                  {slide.eyebrow}
                </p>
                <h2 className="font-display text-display-xl leading-[1.08] text-balance [text-shadow:0_1px_24px_rgb(0_0_0/0.35)]">
                  {slide.heading}
                </h2>
                <p className="mt-5 line-clamp-4 max-w-xl text-sm leading-relaxed font-light text-bone/90 sm:text-base">
                  {slide.body}
                </p>
                <div className={i === active ? "mt-8" : "mt-8 invisible"}>
                  <ButtonLink href={slide.cta.href} variant="inverse" size="lg" tabIndex={i === active ? 0 : -1}>
                    {slide.cta.label}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
        {slides.map((slide, i) => (
          <button
            key={slide.heading}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-bone" : "w-2 bg-bone/45 hover:bg-bone/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
