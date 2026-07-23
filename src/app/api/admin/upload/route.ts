// Auth-gated image upload used by the admin rich-text editor and image fields.
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { saveUpload, UploadError } from "@/lib/media";

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const { url } = await saveUpload(file, String(form.get("alt") ?? ""));
    return NextResponse.json({ url });
  } catch (err) {
    // UploadError: safe user-facing validation (type/size). Anything else is a
    // real bug — log it to Vercel logs so `vercel logs` shows the cause, and
    // surface the class name (not the raw message) to the admin so screenshots
    // stay diagnostic without leaking internals like credentials or paths.
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const detail =
      err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : String(err);
    console.error("admin upload failed:", detail);
    return NextResponse.json(
      { error: `Upload failed. Server said: ${detail}` },
      { status: 500 },
    );
  }
}
