import siteConfig from "../../content/site.json";
import homepageConfig from "../../content/homepage.json";

export interface MenuItem {
  label: string;
  href: string;
  children?: MenuItem[];
}

export const site = siteConfig as typeof siteConfig & { mainMenu: MenuItem[] };
export const homepage = homepageConfig;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lifestyleclothingza.com";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
