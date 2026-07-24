"use client";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

// Vercel serverless functions cap request bodies at ~4.5 MB. Keep well under.
const SERVER_LIMIT_BYTES = 4 * 1024 * 1024;
// Anything above this we shrink client-side first (in-memory canvas resize).
const COMPRESS_THRESHOLD_BYTES = 3 * 1024 * 1024;
// Longest-edge target after compression. 2400px is generous for retina display.
const MAX_EDGE_PX = 2400;

/**
 * Uploads a File to the admin endpoint, compressing large photos client-side
 * so we never hit Vercel's 4.5 MB body cap. Returns the public URL.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, AVIF, or GIF images.");
  }

  // GIFs would lose animation if drawn to canvas — send as-is and hope they fit.
  const payload =
    file.type === "image/gif" || file.size < COMPRESS_THRESHOLD_BYTES
      ? file
      : await compressImage(file);

  if (payload.size > SERVER_LIMIT_BYTES) {
    throw new Error(
      `Image is still ${Math.round(payload.size / 1024 / 1024)} MB after compression. Try a smaller photo.`,
    );
  }

  const body = new FormData();
  body.append("file", payload, payload instanceof File ? payload.name : file.name);

  const res = await fetch("/api/admin/upload", { method: "POST", body });

  // Vercel returns plaintext for platform-level rejections (413, 502…), so guard
  // against JSON.parse crashing with an "Unexpected token" that hides the cause.
  const raw = await res.text();
  let data: { url?: string; error?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    throw new Error(
      `Upload failed (${res.status}): ${raw.slice(0, 200) || res.statusText}`,
    );
  }
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? `Upload failed (${res.status}).`);
  }
  return data.url;
}

/** Resize a photo to at most MAX_EDGE_PX on its longer side, re-encode as JPEG. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("Image compression failed.");

  const rename = file.name.replace(/\.\w+$/, ".jpg");
  return new File([blob], rename, { type: "image/jpeg" });
}

/** Opens a native file picker and resolves with the chosen image File (or null). */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif,image/gif";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
