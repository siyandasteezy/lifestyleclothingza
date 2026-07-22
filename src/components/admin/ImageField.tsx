"use client";

import Image from "next/image";
import { useState } from "react";
import { pickImageFile, uploadImage } from "./upload-client";

/**
 * Visual image chooser for admins. Shows a preview and a button to replace it;
 * uploads happen behind the scenes and the resulting URL is posted through a
 * hidden input named `name`. The admin never sees or types a URL.
 */
export function ImageField({
  name,
  label,
  defaultValue = "",
  aspect = "aspect-4/5",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-1 block text-sm font-medium">{label}</p>
      <input type="hidden" name={name} value={url} readOnly />
      <div className="flex items-start gap-4">
        <div className={`relative w-28 shrink-0 overflow-hidden border border-line bg-bone ${aspect}`}>
          {url ? (
            <Image src={url} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-stone">
              No image
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={choose}
            disabled={busy}
            className="h-9 border border-ink bg-ink px-4 font-display text-[11px] tracking-[0.2em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {busy ? "Uploading…" : url ? "Change image" : "Upload image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-left text-xs text-stone underline underline-offset-2 hover:text-clay"
            >
              Remove
            </button>
          )}
          {error && <p className="text-xs text-clay">{error}</p>}
        </div>
      </div>
    </div>
  );
}
