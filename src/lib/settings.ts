// Typed store settings, backed by the Setting model. Values are JSON, so any
// shape is legal — pass a default that documents the expected shape.
import { prisma } from "@/lib/db";

export interface StoreSettings {
  /** When true, the Yoco webhook auto-books a Courier Guy shipment on payment. */
  autoBookCourier: boolean;
}

export const defaultStoreSettings: StoreSettings = {
  autoBookCourier: false,
};

const SETTINGS_KEY = "store";

/**
 * Reads the store settings from the database. Falls back to defaults if the
 * row doesn't exist yet or the value shape is unexpected. Never throws — a
 * settings-read failure should never break the site.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return defaultStoreSettings;
    const value = row.value as Partial<StoreSettings>;
    return { ...defaultStoreSettings, ...value };
  } catch {
    return defaultStoreSettings;
  }
}

/** Writes a partial patch — other keys stay intact. Requires an admin caller. */
export async function updateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getStoreSettings();
  const next: StoreSettings = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next as unknown as object },
    update: { value: next as unknown as object },
  });
  return next;
}
