"use client";

import { useActionState } from "react";
import { updatePage, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface PageInput {
  id: string;
  handle: string;
  title: string;
  bodyHtml: string;
  status: "PUBLISHED" | "DRAFT";
  metaTitle: string | null;
  metaDescription: string | null;
}

const initialState: AdminActionState = { status: "idle" };

export function PageEditForm({ page }: { page: PageInput }) {
  const action = updatePage.bind(null, page.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <AdminCard className="space-y-4">
        <div>
          <Label htmlFor="pg-title">Title</Label>
          <input id="pg-title" name="title" defaultValue={page.title} required className={adminInput} />
        </div>
        <div>
          <Label htmlFor="pg-body">Body</Label>
          <RichTextEditor name="bodyHtml" defaultValue={page.bodyHtml} ariaLabel="Page body" />
        </div>
      </AdminCard>

      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="pg-status">Status</Label>
            <select id="pg-status" name="status" defaultValue={page.status} className={adminInput}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
          <p className="text-xs text-stone">
            URL: <code className="text-ink">/pages/{page.handle}</code>
          </p>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-display text-base font-bold">SEO</h2>
          <div>
            <Label htmlFor="pg-meta-title">Meta title</Label>
            <input id="pg-meta-title" name="metaTitle" defaultValue={page.metaTitle ?? ""} className={adminInput} />
          </div>
          <div>
            <Label htmlFor="pg-meta-desc">Meta description</Label>
            <textarea
              id="pg-meta-desc"
              name="metaDescription"
              defaultValue={page.metaDescription ?? ""}
              rows={3}
              maxLength={320}
              className={adminInput}
            />
          </div>
        </AdminCard>

        <div className="flex items-center gap-3">
          <SaveButton pending={pending} />
          <p aria-live="polite" className="text-sm">
            {state.status === "success" && <span className="text-moss">✓ {state.message}</span>}
            {state.status === "error" && <span className="text-clay">{state.message}</span>}
          </p>
        </div>
      </div>
    </form>
  );
}
