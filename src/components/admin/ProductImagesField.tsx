"use client";

import Image from "next/image";
import { useState } from "react";
import { pickImageFile, uploadImage } from "./upload-client";

/**
 * Manage a product's images visually — add via upload, remove, reorder. Posts
 * the ordered image URLs as image-0, image-1, … hidden inputs for the server
 * action to reconcile. No URLs are ever shown to the admin.
 */
export function ProductImagesField({ initial }: { initial: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setUrls((u) => [...u, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (i: number) => setUrls((u) => u.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setUrls((u) => {
      const j = i + dir;
      if (j < 0 || j >= u.length) return u;
      const next = [...u];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      {urls.map((url, i) => (
        <input key={i} type="hidden" name={`image-${i}`} value={url} readOnly />
      ))}
      <ul className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <li key={url} className="group relative h-28 w-22 overflow-hidden border border-line bg-bone">
            <Image src={url} alt="" fill sizes="88px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 opacity-0 transition group-hover:opacity-100">
              <button type="button" aria-label="Move left" onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-1 text-xs text-bone disabled:opacity-30">
                ←
              </button>
              <button type="button" aria-label="Remove image" onClick={() => remove(i)} className="px-2 py-1 text-xs text-bone hover:text-clay">
                ✕
              </button>
              <button type="button" aria-label="Move right" onClick={() => move(i, 1)} disabled={i === urls.length - 1} className="px-2 py-1 text-xs text-bone disabled:opacity-30">
                →
              </button>
            </div>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="flex h-28 w-22 flex-col items-center justify-center border border-dashed border-line text-xs text-stone hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {busy ? "…" : <><span className="text-lg">+</span>Add</>}
          </button>
        </li>
      </ul>
      {error && <p className="mt-2 text-xs text-clay">{error}</p>}
      <p className="mt-2 text-xs text-stone">First image is the main product photo. Hover to reorder or remove.</p>
    </div>
  );
}
