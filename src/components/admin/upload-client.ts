"use client";

/** Uploads a file to the admin upload endpoint and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed.");
  }
  return data.url;
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
