"use client";

import { useActionState } from "react";
import { updateStoreSettingsAction, type AdminActionState } from "@/lib/actions/admin";
import { AdminCard, SaveButton } from "@/components/admin/ui";
import type { StoreSettings } from "@/lib/settings";

const initialState: AdminActionState = { status: "idle" };

export function SettingsForm({
  settings,
  courierConfigured,
}: {
  settings: StoreSettings;
  courierConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateStoreSettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <AdminCard className="space-y-4">
        <h2 className="font-display text-base font-bold">Fulfillment</h2>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="autoBookCourier"
            defaultChecked={settings.autoBookCourier}
            disabled={!courierConfigured}
            className="mt-1 h-4 w-4 accent-ink"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              Auto-book Courier Guy shipment when payment clears
            </span>
            <span className="mt-1 block text-xs text-stone">
              When on, every paid order is immediately handed to The Courier Guy and
              moves to <em>Fulfilled</em> without you clicking anything. Convenient — but
              you lose the buffer to inspect an order, batch daily pickups, or catch a
              wrong address before it ships.
            </span>
            {!courierConfigured && (
              <span className="mt-2 block text-xs text-clay">
                Add your Courier Guy API key (COURIER_GUY_API_KEY) before enabling this.
              </span>
            )}
            <span className="mt-2 block text-xs text-stone">
              Failures never roll payment back — the order stays <em>Paid</em> so the
              manual “Book shipment” button can retry, and errors are logged.
            </span>
          </span>
        </label>
      </AdminCard>

      <div className="flex items-center gap-3">
        <SaveButton pending={pending} />
        <p aria-live="polite" className="text-sm">
          {state.status === "success" && <span className="text-moss">✓ {state.message}</span>}
          {state.status === "error" && <span className="text-clay">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
