"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImageVM } from "@/lib/types";

export function ProductGallery({ images, title }: { images: ProductImageVM[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-4/5 items-center justify-center rounded-card bg-paper text-stone">
        No image
      </div>
    );
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div>
      <div className="relative aspect-4/5 overflow-hidden rounded-card bg-paper shadow-card">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={`relative block h-20 w-16 overflow-hidden rounded-lg border-2 transition ${
                  i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
