import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const LOCAL_DIR = "images/uploads";

export interface SavedUpload {
  url: string;
  bytes: number;
}

export class UploadError extends Error {}

/**
 * True when durable blob storage is configured (Vercel Blob).
 * Accepts either the classic RW token or the newer OIDC pairing (store id +
 * OIDC token, injected automatically on Vercel-linked deployments).
 */
export function blobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

/**
 * Persists an uploaded image and records a MediaAsset row.
 *
 * Production (Vercel): stores in Vercel Blob — durable, CDN-served — because the
 * serverless filesystem is ephemeral. Local dev: writes to public/images/uploads.
 * Returns the public URL to store on the content it belongs to.
 */
export async function saveUpload(file: File, alt = ""): Promise<SavedUpload> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError("Choose a file to upload.");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadError("Only JPEG, PNG, WebP, AVIF, or GIF images.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Max file size is 10 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  let url: string;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    url = blob.url;
  } else {
    // Local development fallback.
    const filename = `${Date.now()}-${safeName}`;
    const dir = path.join(process.cwd(), "public", LOCAL_DIR);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    url = `/${LOCAL_DIR}/${filename}`;
  }

  await prisma.mediaAsset.create({ data: { path: url, alt, bytes: file.size } });
  return { url, bytes: file.size };
}
