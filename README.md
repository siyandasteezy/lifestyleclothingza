# Lifestyle Clothing ZA

Custom-coded rebuild of [lifestyleclothingza.com](https://lifestyleclothingza.com/) — migrated off Shopify with all content, products, collections, articles, and SEO metadata preserved.

**Stack:** Next.js (App Router, SSR/SSG) · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma · custom CMS admin.

## Getting started

Requires Node ≥ 20 (`.nvmrc` pins v24) and PostgreSQL.

```bash
nvm use
npm install
createdb lifestyle_clothing        # once
npm run db:push                    # create tables
npm run db:seed                    # import migrated Shopify content + admin user
npm run dev
```

Storefront: http://localhost:3000 · Admin: http://localhost:3000/admin

## Environment (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATA_SOURCE` | `db` (default) or `content` — serve straight from the JSON archive without a database |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin for canonicals, sitemap, OG tags |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial admin credentials consumed by `db:seed` — **change the password after first login** |
| `AUTH_SECRET` | Session secret — set a strong value in production |

## Content migration

`/content` holds the full snapshot pulled from the live Shopify store (July 2026):
34 products (381 variants), 10 collections, 7 pages, 1 blog article, homepage section copy,
navigation, announcements, and social links. All images were downloaded to `/public/images`
so nothing depends on the Shopify CDN. `npm run db:seed` is idempotent — it upserts by handle.

**URL parity with Shopify** (rankings preserved):
`/products/:handle`, `/collections/:handle`, `/collections/all`, `/blogs/news/:handle`, `/pages/:handle`.
Legacy variants (e.g. `/collections/x/Tag`, `/policies/*`) 301-redirect in `next.config.ts`.

## Architecture

```
content/            JSON content archive (source of truth for the seed)
prisma/             schema.prisma + seed.ts
src/
  app/(storefront)/ homepage, collections, products, blogs, pages, cart, checkout, search
  app/admin/        session-guarded CMS (products, orders, articles, pages, media, messages)
  app/sitemap.ts    dynamic XML sitemap        app/robots.ts   robots.txt
  components/       ui/ (design system) · layout/ · home/ · product/ · cart/ · admin/ · seo/
  lib/data/         data layer — Prisma source with JSON-archive fallback (DATA_SOURCE)
  lib/actions/      server actions (cart, checkout, newsletter, contact, admin CRUD, auth)
  lib/seo.ts        metadata + JSON-LD builders (Product, Article, FAQ, Breadcrumb, Organization)
```

- **SEO:** SSR/SSG everywhere, canonical tags, Open Graph/Twitter cards, JSON-LD structured
  data, dynamic sitemap.xml, robots.txt, 301s for legacy URLs, `next/image` AVIF/WebP.
- **Design system:** tokens in `src/app/globals.css` (`@theme`) — bone/ink/clay palette,
  fluid type scale, Inter + Archivo. WCAG AA: focus rings, skip link, aria labels,
  reduced-motion support, semantic landmarks.
- **Checkout** records orders in PostgreSQL (status: PENDING → PAID → FULFILLED). Payment is
  currently settled off-platform; wire PayFast/Yoco/Paystack into
  `src/lib/actions/checkout.ts` when ready.

## Deploying to Netlify

`netlify.toml` is already configured (Node 24, `@netlify/plugin-nextjs`, long-cache image headers).

1. **Hosted PostgreSQL** — create a database on Neon, Supabase, or Netlify DB and grab the
   **pooled** connection string (serverless functions open many short-lived connections).
2. **Schema + content** — push and seed from your machine against the hosted DB:
   ```bash
   DATABASE_URL="<hosted-url>" npm run db:push
   DATABASE_URL="<hosted-url>" ADMIN_EMAIL="you@…" ADMIN_PASSWORD="strong-password" npm run db:seed
   ```
3. **Environment variables** on the Netlify site: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`,
   `AUTH_SECRET` (e.g. `openssl rand -hex 32`), and optionally `DATA_SOURCE=content` to launch
   the storefront before the DB is ready (see `.env.example`).
4. **Deploy** — connect the git repo in the Netlify UI, or from the CLI:
   ```bash
   netlify init && netlify deploy --build --prod
   ```

Serverless caveats:

- **Admin media uploads** write to the local filesystem, which is ephemeral on Netlify —
  uploads will 200 but vanish on the next deploy. Migrated catalog images in `/public/images`
  are unaffected (they ship with the build). Move uploads to Netlify Blobs/S3/Cloudinary
  before relying on that feature in production.
- Prisma is generated with the `rhel-openssl-3.0.x` engine for Netlify's Lambda runtime
  (see `prisma/schema.prisma`).
- Once DNS for lifestyleclothingza.com points at Netlify, keep `NEXT_PUBLIC_SITE_URL` set to
  the apex domain so canonicals/sitemap stay correct.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:push` | apply Prisma schema |
| `npm run db:seed` | seed from `/content` (safe to re-run) |
| `npm run db:studio` | browse data |
| `npm run lint` | ESLint |
