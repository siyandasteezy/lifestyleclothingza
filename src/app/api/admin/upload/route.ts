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
    const message = err instanceof UploadError ? err.message : "Upload failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
