"use client";

import { useActionState } from "react";
import { upsertArticle, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";

export interface ArticleInput {
  id: string | null;
  handle: string;
  title: string;
  author: string;
  excerpt: string;
  bodyHtml: string;
  heroImage: string | null;
  status: "PUBLISHED" | "DRAFT";
  metaTitle: string | null;
  metaDescription: string | null;
}

const initialState: AdminActionState = { status: "idle" };

export function ArticleEditForm({ article }: { article: ArticleInput }) {
  const action = upsertArticle.bind(null, article.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="a-title">Title</Label>
            <input id="a-title" name="title" defaultValue={article.title} required className={adminInput} />
          </div>
          <div>
            <Label htmlFor="a-handle">Handle (URL slug)</Label>
            <input
              id="a-handle"
              name="handle"
              defaultValue={article.handle}
              required
              pattern="[a-z0-9-]+"
              className={adminInput}
            />
            <p className="mt-1 text-xs text-stone">/blogs/news/&lt;handle&gt;</p>
          </div>
          <div>
            <Label htmlFor="a-author">Author</Label>
            <input id="a-author" name="author" defaultValue={article.author} className={adminInput} />
          </div>
          <div>
            <Label htmlFor="a-excerpt">Excerpt</Label>
            <textarea id="a-excerpt" name="excerpt" defaultValue={article.excerpt} rows={2} className={adminInput} />
          </div>
          <div>
            <Label htmlFor="a-body">Body (HTML)</Label>
            <textarea
              id="a-body"
              name="bodyHtml"
              defaultValue={article.bodyHtml}
              rows={16}
              className={`${adminInput} font-mono text-xs`}
            />
          </div>
        </AdminCard>
      </div>

      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="a-status">Status</Label>
            <select id="a-status" name="status" defaultValue={article.status} className={adminInput}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
          <div>
            <Label htmlFor="a-hero">Hero image path</Label>
            <input
              id="a-hero"
              name="heroImage"
              defaultValue={article.heroImage ?? ""}
              placeholder="/images/uploads/…"
              className={adminInput}
            />
          </div>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-display text-base font-bold">SEO</h2>
          <div>
            <Label htmlFor="a-meta-title">Meta title</Label>
            <input id="a-meta-title" name="metaTitle" defaultValue={article.metaTitle ?? ""} className={adminInput} />
          </div>
          <div>
            <Label htmlFor="a-meta-desc">Meta description</Label>
            <textarea
              id="a-meta-desc"
              name="metaDescription"
              defaultValue={article.metaDescription ?? ""}
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
