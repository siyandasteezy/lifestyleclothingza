<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lifestyle Clothing ZA — project notes

Custom rebuild of lifestyleclothingza.com (migrated off Shopify). See README.md for setup and architecture.

## Rules

- **Node:** system default is v14 — always use `~/.nvm/versions/node/v24.14.0/bin` (see `.nvmrc`). `.claude/launch.json` already handles this for the dev server.
- **Content is sacred:** copy in `/content/*.json` was migrated verbatim from the live store (including intentional quirks like "Contct Us" and the Facebook "Track Your Order" link). Never rewrite it; only the owner edits copy via the admin.
- **URL parity:** `/products/:handle`, `/collections/:handle`, `/blogs/news/:handle`, `/pages/:handle` must keep matching the old Shopify URLs. Add 301s in `next.config.ts` when a URL must change.
- **Prisma is v6** (v7 has breaking config changes — do not upgrade casually). Money is stored as integer cents (`priceCents`).
- **Data layer:** storefront reads go through `src/lib/data/index.ts` (Prisma or JSON archive via `DATA_SOURCE`). Admin reads/writes Prisma directly.
- **Admin server actions** must call `assertAdmin()`/`requireAdmin()` first — they are public HTTP endpoints.
- **Design tokens** live in `src/app/globals.css` `@theme` (bone/ink/clay…). Use token classes (`bg-bone`, `text-ink`, `text-clay`) instead of raw colors.
