"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateProduct, type AdminActionState } from "@/lib/actions/admin";
import { adminInput, AdminCard, Label, SaveButton } from "@/components/admin/ui";

interface ProductInput {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
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

export function ProductEditForm({ product }: { product: ProductInput }) {
  const action = updateProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-5">
        <AdminCard className="space-y-4">
          <div>
            <Label htmlFor="p-title">Title</Label>
            <input id="p-title" name="title" defaultValue={product.title} required className={adminInput} />
          </div>
          <div>
            <Label htmlFor="p-body">Description (HTML)</Label>
            <textarea
              id="p-body"
              name="bodyHtml"
              defaultValue={product.bodyHtml}
              rows={10}
              className={`${adminInput} font-mono text-xs`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="p-vendor">Vendor</Label>
              <input id="p-vendor" name="vendor" defaultValue={product.vendor} className={adminInput} />
            </div>
            <div>
              <Label htmlFor="p-type">Product type</Label>
              <input id="p-type" name="productType" defaultValue={product.productType} className={adminInput} />
            </div>
            <div>
              <Label htmlFor="p-tags">Tags (comma-separated)</Label>
              <input id="p-tags" name="tags" defaultValue={product.tags.join(", ")} className={adminInput} />
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
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-3 font-display text-base font-bold">Images</h2>
          <ul className="flex flex-wrap gap-3">
            {product.images.map((img) => (
              <li key={img.id} className="relative h-24 w-20 overflow-hidden rounded-lg bg-bone">
                <Image src={img.src} alt={img.alt} fill sizes="80px" className="object-cover" />
              </li>
            ))}
          </ul>
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
  );
}
