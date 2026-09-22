"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateCollection, deleteCollection, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageField } from "@/components/admin/ImageField";

interface CollectionInput {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  image: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  products: { id: string; handle: string; title: string }[];
}

const initialState: AdminActionState = { status: "idle" };

export function CollectionEditForm({ collection }: { collection: CollectionInput }) {
  const action = updateCollection.bind(null, collection.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const remove = deleteCollection.bind(null, collection.id);

  return (
    <>
      {/* Delete sits outside the edit form — forms cannot nest. */}
      <form id="collection-delete" action={remove} />

      <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-5">
          <AdminCard className="space-y-4">
            <div>
              <Label htmlFor="c-title">Title</Label>
              <input
                id="c-title"
                name="title"
                defaultValue={collection.title}
                required
                className={adminInput}
              />
              <p className="mt-1.5 text-xs text-stone">
                The heading on the collection page. The URL does not follow it — see below.
              </p>
            </div>
            <div>
              <Label htmlFor="c-body">Description</Label>
              <p className="mb-2 text-xs text-stone">
                Shown under the heading. This is the page&apos;s only unique text, so it is what
                gives the collection something to rank on.
              </p>
              <RichTextEditor
                name="descriptionHtml"
                defaultValue={collection.descriptionHtml}
                ariaLabel="Collection description"
              />
            </div>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="font-display text-base font-bold">
              Products ({collection.products.length})
            </h2>
            <p className="text-xs text-stone">
              Products are filed from the product page, under Collections.
            </p>
            {collection.products.length === 0 ? (
              <p className="text-sm text-clay">
                Empty. An empty collection still has a live page with nothing on it.
              </p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {collection.products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-clay hover:underline"
                    >
                      {p.title}
                    </Link>
                    <code className="shrink-0 text-[11px] text-stone">/{p.handle}</code>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard className="space-y-4">
            <ImageField
              name="image"
              label="Collection image"
              defaultValue={collection.image ?? ""}
            />
            <p className="text-xs text-stone">
              URL: <code className="text-ink">/collections/{collection.handle}</code>
            </p>
            <p className="text-xs text-stone">
              The URL is fixed here on purpose — it is indexed, and changing it without a
              redirect discards whatever the page has earned.
            </p>
          </AdminCard>

          <AdminCard className="space-y-4">
            <h2 className="font-display text-base font-bold">SEO</h2>
            <div>
              <Label htmlFor="c-meta-title">Meta title</Label>
              <input
                id="c-meta-title"
                name="metaTitle"
                defaultValue={collection.metaTitle ?? ""}
                placeholder={collection.title}
                className={adminInput}
              />
            </div>
            <div>
              <Label htmlFor="c-meta-desc">Meta description</Label>
              <textarea
                id="c-meta-desc"
                name="metaDescription"
                defaultValue={collection.metaDescription ?? ""}
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

          <AdminCard className="space-y-2">
            <h2 className="font-display text-base font-bold">Delete</h2>
            <p className="text-xs text-stone">
              Removes the collection and its page. The products themselves are kept — they just
              stop being grouped here.
            </p>
            <button
              type="submit"
              form="collection-delete"
              className="h-10 w-full rounded-full border border-clay px-5 text-sm font-semibold text-clay hover:bg-clay hover:text-bone"
            >
              Delete collection
            </button>
          </AdminCard>
        </div>
      </form>
    </>
  );
}
