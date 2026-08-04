"use client";

import { useActionState } from "react";
import {
  addProductVariant,
  deleteProductVariant,
  updateProduct,
  type AdminActionState,
} from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ProductImagesField } from "@/components/admin/ProductImagesField";

interface ProductInput {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  bodyHtml: string;
  sizeChartHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  /** Declared options, in position order — the add-variant row picks from these. */
  options: { name: string; position: number; values: string[] }[];
  variants: {
    id: string;
    title: string;
    priceCents: number;
    compareAtCents: number | null;
    available: boolean;
    inventoryQty: number;
  }[];
  images: { id: string; src: string; alt: string }[];
}

const initialState: AdminActionState = { status: "idle" };

export interface ProductEditSuggestions {
  vendors: string[];
  productTypes: string[];
  tags: string[];
}

export function ProductEditForm({
  product,
  suggestions,
}: {
  product: ProductInput;
  suggestions?: ProductEditSuggestions;
}) {
  const action = updateProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [addState, addAction, addPending] = useActionState(
    addProductVariant.bind(null, product.id),
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(deleteProductVariant, initialState);
  const lastVariant = product.variants.length <= 1;
  const vendors = suggestions?.vendors ?? [];
  const productTypes = suggestions?.productTypes ?? [];
  const tags = suggestions?.tags ?? [];

  return (
    <>
      {/* Variant add/delete carriers. They hold no controls — the inputs and
          buttons live inside the variants table and point here with the form
          attribute, since a form cannot be nested inside the product form. */}
      <form id="variant-add" action={addAction} />
      <form id="variant-delete" action={deleteAction} />

      <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      {/* Shared with all three inputs — one datalist per field type. */}
      <datalist id="edit-vendor-suggestions">
        {vendors.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="edit-product-type-suggestions">
        {productTypes.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="edit-tag-suggestions">
        {tags.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="p-title">Title</Label>
            <input id="p-title" name="title" defaultValue={product.title} required className={adminInput} />
          </div>
          <div>
            <Label htmlFor="p-body">Description</Label>
            <RichTextEditor name="bodyHtml" defaultValue={product.bodyHtml} ariaLabel="Product description" />
          </div>
          <div>
            <Label htmlFor="p-size-chart">Size chart</Label>
            <p className="mb-2 text-xs text-stone">
              Real measurements in cm for this product — chest, length, sleeve. Shown in the
              Size &amp; fit panel on the product page. Left empty, the page links to the
              general size guide instead.
            </p>
            <RichTextEditor
              name="sizeChartHtml"
              defaultValue={product.sizeChartHtml}
              ariaLabel="Size chart"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="p-vendor">Vendor</Label>
              <input
                id="p-vendor"
                name="vendor"
                defaultValue={product.vendor}
                list="edit-vendor-suggestions"
                className={adminInput}
              />
            </div>
            <div>
              <Label htmlFor="p-type">Product type</Label>
              <input
                id="p-type"
                name="productType"
                defaultValue={product.productType}
                list="edit-product-type-suggestions"
                className={adminInput}
              />
            </div>
            <div>
              <Label htmlFor="p-tags">Tags (comma-separated)</Label>
              <input
                id="p-tags"
                name="tags"
                defaultValue={product.tags.join(", ")}
                list="edit-tag-suggestions"
                className={adminInput}
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard className="overflow-x-auto p-0">
          <h2 className="border-b border-line px-5 py-3 font-display text-base font-bold">Variants</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-stone uppercase">
                <th className="px-5 py-2.5">Variant</th>
                <th className="px-5 py-2.5">Price (R)</th>
                <th className="px-5 py-2.5">Compare at</th>
                <th className="px-5 py-2.5">Stock</th>
                <th className="px-5 py-2.5">Available</th>
                <th className="px-5 py-2.5">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium">{v.title}</td>
                  <td className="px-5 py-2.5">
                    <input
                      name={`variant-${v.id}-price`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(v.priceCents / 100).toFixed(2)}
                      aria-label={`Price for ${v.title}`}
                      className={`${adminInput} w-28`}
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    <input
                      name={`variant-${v.id}-compareAt`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={v.compareAtCents != null ? (v.compareAtCents / 100).toFixed(2) : ""}
                      aria-label={`Compare-at price for ${v.title}`}
                      className={`${adminInput} w-28`}
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    <input
                      name={`variant-${v.id}-inventory`}
                      type="number"
                      min="0"
                      defaultValue={v.inventoryQty}
                      aria-label={`Stock for ${v.title}`}
                      className={`${adminInput} w-20`}
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    <input
                      name={`variant-${v.id}-available`}
                      type="checkbox"
                      defaultChecked={v.available}
                      aria-label={`${v.title} available`}
                      className="h-4 w-4 accent-ink"
                    />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {/* Submits the sibling delete form; the id rides on the value. */}
                    <button
                      type="submit"
                      form="variant-delete"
                      name="variantId"
                      value={v.id}
                      disabled={lastVariant}
                      title={
                        lastVariant
                          ? "A product needs at least one variant"
                          : `Delete ${v.title}`
                      }
                      className="rounded-full px-3 py-1 text-xs font-semibold text-clay hover:bg-clay/10 disabled:cursor-not-allowed disabled:text-stone disabled:hover:bg-transparent"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add a variant. Inputs belong to the sibling "variant-add" form
                  via the form attribute, because forms cannot nest. */}
              <tr className="border-t border-line bg-bone/40">
                <td className="px-5 py-3">
                  {product.options.length === 0 ? (
                    <span className="text-xs text-stone">Default Title</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {product.options.map((o) => (
                        <select
                          key={o.position}
                          form="variant-add"
                          name={`option-${o.position}`}
                          aria-label={o.name}
                          defaultValue=""
                          className={`${adminInput} w-auto min-w-28`}
                        >
                          <option value="" disabled>
                            {o.name}…
                          </option>
                          {o.values.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <input
                    form="variant-add"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    aria-label="Price for new variant"
                    className={`${adminInput} w-28`}
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    form="variant-add"
                    name="compareAt"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="—"
                    aria-label="Compare-at price for new variant"
                    className={`${adminInput} w-28`}
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    form="variant-add"
                    name="inventory"
                    type="number"
                    min="0"
                    defaultValue={0}
                    aria-label="Stock for new variant"
                    className={`${adminInput} w-20`}
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    form="variant-add"
                    name="sku"
                    placeholder="SKU"
                    aria-label="SKU for new variant"
                    className={`${adminInput} w-24`}
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="submit"
                    form="variant-add"
                    disabled={addPending}
                    className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-bone hover:bg-clay disabled:opacity-50"
                  >
                    {addPending ? "Adding…" : "Add"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          {(addState.status !== "idle" || deleteState.status !== "idle") && (
            <p aria-live="polite" className="border-t border-line px-5 py-2.5 text-sm">
              {[addState, deleteState]
                .filter((s) => s.status !== "idle")
                .map((s, i) => (
                  <span key={i} className={s.status === "error" ? "text-clay" : "text-moss"}>
                    {s.status === "success" ? `✓ ${s.message}` : s.message}
                  </span>
                ))}
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="mb-3 font-display text-base font-bold">Images</h2>
          <ProductImagesField initial={product.images.map((img) => img.src)} />
        </AdminCard>
      </div>

      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="p-status">Status</Label>
            <select id="p-status" name="status" defaultValue={product.status} className={adminInput}>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <p className="text-xs text-stone">
            URL: <code className="text-ink">/products/{product.handle}</code>
          </p>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-display text-base font-bold">SEO</h2>
          <div>
            <Label htmlFor="p-meta-title">Meta title</Label>
            <input
              id="p-meta-title"
              name="metaTitle"
              defaultValue={product.metaTitle ?? ""}
              placeholder={product.title}
              className={adminInput}
            />
          </div>
          <div>
            <Label htmlFor="p-meta-desc">Meta description</Label>
            <textarea
              id="p-meta-desc"
              name="metaDescription"
              defaultValue={product.metaDescription ?? ""}
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
    </>
  );
}
