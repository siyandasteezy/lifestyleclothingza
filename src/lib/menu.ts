// Builds the Catalog dropdown.
//
// The menu in content/site.json is curated: its labels are shorter and cleaner
// than the collection titles behind them ("Hoodies" for a collection titled
// "Premium Hoodie", "T-Shirts" for "Lifestyle T-shirts"), and its order is
// chosen. Driving the whole menu off the database would throw that away.
//
// But it is also a hand-written list, so a collection created in the admin never
// appeared in it at all — and two collections that predate the admin, Shorts and
// Dresses, were missing for the same reason. Anything the curated list does not
// already name is added at the top, newest first, so a new collection shows up
// on its own and shows up where it will be seen.

import type { MenuItem } from "@/lib/site";

export interface MenuCollection {
  handle: string;
  title: string;
  /** ISO timestamp, or null when the source has none. Nulls sort oldest. */
  createdAt: string | null;
}

/**
 * Merges live collections into a curated menu item's children.
 *
 * Returns the item unchanged when it has no children, so non-catalogue entries
 * (Home, Contact, Track Your Order) pass straight through.
 */
export function withLiveCollections(item: MenuItem, collections: MenuCollection[]): MenuItem {
  if (!item.children) return item;

  const curated = new Set(item.children.map((child) => child.href));
  const extras = collections
    .filter((c) => !curated.has(`/collections/${c.handle}`))
    .sort((a, b) => {
      // Newest first; a collection with no timestamp goes last.
      if (!a.createdAt && !b.createdAt) return a.title.localeCompare(b.title);
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((c) => ({ label: c.title, href: `/collections/${c.handle}` }));

  return { ...item, children: [...extras, ...item.children] };
}

/** Applies withLiveCollections across a whole menu. */
export function buildMenu(menu: MenuItem[], collections: MenuCollection[]): MenuItem[] {
  return menu.map((item) => withLiveCollections(item, collections));
}
