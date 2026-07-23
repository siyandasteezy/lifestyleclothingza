"use client";

import { upload } from "@vercel/blob/client";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

/**
 * Uploads a file directly from the browser to Vercel Blob via a signed token.
 * Bypasses Vercel's 4.5 MB route-handler body limit, so phone photos work.
 * The token endpoint is auth-gated to admins.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, AVIF, or GIF images.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image is too large (${Math.round(file.size / 1024 / 1024)} MB). Max is 15 MB.`);
  }
  try {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/admin/blob-token",
      contentType: file.type,
    });
    return blob.url;
  } catch (err) {
    // The SDK sometimes throws BlobError with a useful message; otherwise
    // fall through with something more readable than "Unexpected token".
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Upload failed: ${message}`);
  }
}

/** Opens a native file picker and resolves with the chosen image File (or null). */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif,image/gif";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // If the dialog is dismissed no change fires; that's fine — nothing resolves,
    // and the caller's flow simply ends when the promise is GC'd on unmount.
    input.click();
  });
}
