// Issues short-lived signed upload tokens for admin-side client-direct blob
// uploads. Bypasses the 4.5 MB Vercel function body cap by letting the browser
// PUT straight to Blob storage. Only authenticated admins can request a token.
//
// The client uses @vercel/blob/client's upload(), which POSTs here twice:
// once to request the token (event.type "blob.generate-client-token"), then
// once after the actual upload to fire the completion callback ("blob.upload-completed").
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Limit big enough to make phone photos work without deliberate compression.
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ALLOWED_TYPES],
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        // Record which admin issued the token so onUploadCompleted can attribute the row.
        tokenPayload: JSON.stringify({ adminId: admin.id }),
      }),
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          await prisma.mediaAsset.create({
            data: { path: blob.url, alt: "" },
          });
        } catch (err) {
          // The blob is already stored — don't fail the upload just because our
          // media inventory row didn't write. Log so we can reconcile later.
          console.warn("blob completion: mediaAsset insert failed:", err, tokenPayload);
        }
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : String(err);
    console.error("blob-token failed:", detail);
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}
