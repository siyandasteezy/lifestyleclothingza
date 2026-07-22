import siteConfig from "../../content/site.json";

export interface MenuItem {
  label: string;
  href: string;
  children?: MenuItem[];
}

export const site = siteConfig as typeof siteConfig & { mainMenu: MenuItem[] };

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lifestyleclothingza.com";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
