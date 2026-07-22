import { cache } from "react";
import homepageDefault from "../../content/homepage.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type HomepageConfig = { sections: any[] };

/** The bundled homepage as migrated from Shopify — the fallback / reset baseline. */
export const homepageDefaultConfig = homepageDefault as HomepageConfig;

/**
 * Homepage config, admin-editable. Reads the Setting["homepage"] override when a
 * database is connected; otherwise (or on any error) returns the bundled JSON.
 * Cached per request.
 */
export const getHomepage = cache(async (): Promise<HomepageConfig> => {
  if (!process.env.DATABASE_URL) return homepageDefaultConfig;
  try {
    const { prisma } = await import("@/lib/db");
    const row = await prisma.setting.findUnique({ where: { key: "homepage" } });
    const value = row?.value as HomepageConfig | undefined;
    if (value && Array.isArray(value.sections) && value.sections.length > 0) return value;
  } catch {
    // fall through to the bundled default
  }
  return homepageDefaultConfig;
});
