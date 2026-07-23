"use client";

import { useActionState, useMemo, useState } from "react";
import { createProduct, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ProductImagesField } from "@/components/admin/ProductImagesField";
import { OptionsBuilder } from "@/components/admin/OptionsBuilder";

export interface ProductCreateSuggestions {
  vendors: string[];
  productTypes: string[];
  tags: string[];
  optionNames: string[];
}

const initialState: AdminActionState = { status: "idle" };

function slugPreview(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ProductCreateForm({
  suggestions,
}: {
  suggestions: ProductCreateSuggestions;
}) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [tags, setTags] = useState("");

  // Auto-fill handle from title until the user edits it themselves
  const autoHandle = useMemo(() => slugPreview(title), [title]);
  const shownHandle = handleTouched ? handle : autoHandle;

  const addTag = (t: string) => {
    const existing = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (existing.includes(t)) return;
    setTags([...existing, t].join(", "));
  };

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-5">
        {/* --- Basics --- */}
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="p-title">Title</Label>
            <input
              id="p-title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Signature Hoodie"
              className={adminInput}
            />
          </div>
          <div>
            <Label htmlFor="p-handle">URL slug</Label>
            <input
              id="p-handle"
              name="handle"
              value={shownHandle}
              onChange={(e) => {
                setHandleTouched(true);
                setHandle(e.target.value);
              }}
              placeholder="signature-hoodie"
              pattern="[a-z0-9-]*"
              className={adminInput}
            />
            <p className="mt-1 text-xs text-stone">
              /products/<code className="text-ink">{shownHandle || "your-title"}</code> — lowercase
              letters, numbers, and dashes.
            </p>
          </div>
          <div>
            <Label htmlFor="p-body">Description</Label>
            <RichTextEditor name="bodyHtml" defaultValue="" ariaLabel="Product description" />
          </div>
        </AdminCard>

        {/* --- Options / variants --- */}
        <AdminCard className="space-y-4">
          <h2 className="font-display text-base font-bold">Options &amp; variants</h2>
          <OptionsBuilder optionNameSuggestions={suggestions.optionNames} />
          <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-price">Starting price (R)</Label>
              <input
                id="p-price"
                name="defaultPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className={adminInput}
              />
              <p className="mt-1 text-xs text-stone">
                Applied to every variant. Adjust individual prices after saving.
              </p>
            </div>
            <div>
              <Label htmlFor="p-inventory">Starting stock</Label>
              <input
                id="p-inventory"
                name="defaultInventory"
                type="number"
                min="0"
                defaultValue="0"
                className={adminInput}
              />
            </div>
          </div>
        </AdminCard>

        {/* --- Images --- */}
        <AdminCard>
          <h2 className="mb-3 font-display text-base font-bold">Images</h2>
          <ProductImagesField initial={[]} />
        </AdminCard>
      </div>

      {/* --- Right column --- */}
      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="p-status">Status</Label>
            <select id="p-status" name="status" defaultValue="DRAFT" className={adminInput}>
              <option value="DRAFT">Draft (not shown on storefront)</option>
              <option value="ACTIVE">Active (visible to shoppers)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <p className="mt-1 text-xs text-stone">
              Draft is safer while you finish setting up.
            </p>
          </div>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-display text-base font-bold">Organization</h2>

          <datalist id="vendor-suggestions">
            {suggestions.vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="product-type-suggestions">
            {suggestions.productTypes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="tag-suggestions">
            {suggestions.tags.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <div>
            <Label htmlFor="p-vendor">Vendor</Label>
            <input
              id="p-vendor"
              name="vendor"
              list="vendor-suggestions"
              placeholder="Lifestyle Clothing ZA"
              className={adminInput}
            />
          </div>
          <div>
            <Label htmlFor="p-type">Product type</Label>
            <input
              id="p-type"
              name="productType"
              list="product-type-suggestions"
              placeholder={suggestions.productTypes[0] ?? "e.g. Hoodie"}
              className={adminInput}
            />
          </div>
          <div>
            <Label htmlFor="p-tags">Tags</Label>
            <input
              id="p-tags"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              list="tag-suggestions"
              placeholder="comma-separated, e.g. new, streetwear"
              className={adminInput}
            />
            {suggestions.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.tags.slice(0, 12).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="border border-line bg-bone px-2 py-0.5 text-xs text-ink-soft hover:border-ink hover:text-ink"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton pending={pending} label="Create product" />
          <p aria-live="polite" className="text-sm">
            {state.status === "error" && <span className="text-clay">{state.message}</span>}
          </p>
        </div>
      </div>
    </form>
  );
}
