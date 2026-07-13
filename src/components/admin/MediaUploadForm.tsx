"use client";

import { useActionState } from "react";
import { uploadMedia, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, Label, SaveButton } from "@/components/admin/ui";

const initialState: AdminActionState = { status: "idle" };

export function MediaUploadForm() {
  const [state, formAction, pending] = useActionState(uploadMedia, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4">
      <div>
        <Label htmlFor="media-file">Upload image</Label>
        <input
          id="media-file"
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          required
          className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-bone hover:file:bg-clay"
        />
      </div>
      <div className="min-w-48 flex-1">
        <Label htmlFor="media-alt">Alt text</Label>
        <input id="media-alt" name="alt" placeholder="Describe the image" className={adminInput} />
      </div>
      <SaveButton pending={pending} label="Upload" />
      <p aria-live="polite" className="w-full text-sm">
        {state.status === "success" && <span className="text-moss">✓ {state.message}</span>}
        {state.status === "error" && <span className="text-clay">{state.message}</span>}
      </p>
    </form>
  );
}
