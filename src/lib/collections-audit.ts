// Flags collections whose names collide.
//
// Typing a name that does not exist in the product editor creates a collection,
// which is the point — but it also means "Tshirts", "Tshirt" and "T-Shirts"
// become three separate categories competing for one query. On a catalogue this
// size that is cannibalisation, not choice. The admin list surfaces it rather
// than leaving it to be noticed in the navigation months later.

/**
 * Reduces a title to what it is really naming: case, spacing, punctuation and a
 * trailing plural all removed. "T-Shirts", "Tshirt" and "t shirts" all collapse
 * to the same key.
 */
export function normaliseTitle(title: string): string {
  return singularise(title.toLowerCase().replace(/[^a-z0-9]+/g, ""));
}

/**
 * Crude but sufficient singular form.
 *
 * A bare trailing-"s" strip is wrong for the words this catalogue actually uses:
 * it turns "dresses" into "dresse" and "dress" into "dres", so the two never
 * meet. Handling the -es and -ss cases is enough to catch the plural/singular
 * pairs an admin types by hand.
 */
function singularise(word: string): string {
  if (/(?:ss|sh|ch|[sxz])es$/.test(word)) return word.slice(0, -2); // dresses -> dress
  if (/ss$/.test(word)) return word; // dress stays dress
  if (/s$/.test(word)) return word.slice(0, -1); // caps -> cap
  return word;
}

export interface AuditedCollection {
  handle: string;
  title: string;
}

/**
 * Handles that share a normalised name with at least one other collection.
 *
 * Returns a set rather than groups because the list only needs to know whether
 * to flag a row; the collision is obvious once two rows are marked.
 */
export function duplicateNameHandles(collections: AuditedCollection[]): Set<string> {
  const byKey = new Map<string, string[]>();
  for (const c of collections) {
    const key = normaliseTitle(c.title);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), c.handle]);
  }

  const flagged = new Set<string>();
  for (const handles of byKey.values()) {
    if (handles.length > 1) for (const h of handles) flagged.add(h);
  }
  return flagged;
}
