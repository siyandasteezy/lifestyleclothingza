// The seven-chapter homepage. All copy renders verbatim from content/homepage.json;
// these components only stage it. Light-first: dark moments are rationed.
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Parallax } from "./Parallax";
import type { ArticleVM, CollectionVM, ProductVM } from "@/lib/types";

interface Cta {
  label: string;
  href: string;
}

const container = "mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10";

function ChapterHead({ folio, label }: { folio: string; label: string }) {
  return (
    <div className="mb-10 flex items-baseline gap-4 border-b border-line pb-4 md:mb-14">
      <span aria-hidden className="folio text-2xl">
        {folio}
      </span>
      <span className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">
        {label}
      </span>
    </div>
  );
}

/* ---------- Chapter ii — Manifesto ---------- */

export function Manifesto({
  heading,
  paragraphs,
  cta,
}: {
  heading: string;
  paragraphs: string[];
  cta?: Cta;
}) {
  return (
    <section className="bg-paper py-(--spacing-section)">
      <div className={container}>
        <ChapterHead folio="ii" label="The house" />
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-9">
            <h2 className="font-display text-display-lg leading-[1.05] text-balance">
              {heading}
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-10 lg:col-span-6 lg:col-start-6">
            <div className="space-y-5 text-lg leading-relaxed font-light text-ink-soft">
              {paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            {cta && (
              <ButtonLink href={cta.href} variant="text" className="mt-8">
                {cta.label}
              </ButtonLink>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Chapter iii — Collections index ---------- */

interface EditorialTile {
  handle: string;
  title: string;
  image: string;
}

interface TileCopy {
  heading: string;
  subheading?: string;
  body: string;
  cta: Cta;
  image: string;
}

export function CollectionsIndex({
  collections,
  headwear,
  hoodie,
  bucket,
  undeniable,
}: {
  collections: CollectionVM[];
  headwear: EditorialTile;
  hoodie: EditorialTile;
  bucket: TileCopy;
  undeniable: TileCopy;
}) {
  return (
    <section className="py-(--spacing-section)">
      <div className={container}>
        <ChapterHead folio="iii" label="Collections" />

        {/* Spread A — headwear */}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <Link href={`/collections/${headwear.handle}`} className="group block">
              <span className="relative block aspect-4/5 overflow-hidden bg-paper sm:aspect-3/4">
                <Image
                  src={bucket.image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover object-[80%_50%] transition duration-700 ease-(--ease-lux) group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-3 block font-display text-[10px] tracking-[0.25em] uppercase text-stone">
                {headwear.title} — Studio, Johannesburg
              </span>
            </Link>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5">
            <h2 className="font-display text-display-md leading-[1.08] text-balance">
              {bucket.heading}
            </h2>
            {bucket.subheading && (
              <p className="mt-4 font-accent text-lg italic text-ink">{bucket.subheading}</p>
            )}
            <p className="mt-4 max-w-md leading-relaxed font-light text-ink-soft">{bucket.body}</p>
            <ButtonLink href={bucket.cta.href} variant="text" className="mt-7">
              {bucket.cta.label}
            </ButtonLink>
          </Reveal>
        </div>

        {/* Spread B — hoodies, mirrored */}
        <div className="mt-20 grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="order-2 lg:order-1 lg:col-span-5">
            <h2 className="font-display text-display-md leading-[1.08] text-balance">
              {undeniable.heading}
            </h2>
            <p className="mt-4 max-w-md leading-relaxed font-light text-ink-soft">
              {undeniable.body}
            </p>
            <ButtonLink href={`/collections/${hoodie.handle}`} variant="text" className="mt-7">
              {undeniable.cta.label}
            </ButtonLink>
          </Reveal>
          <Reveal delay={120} className="order-1 lg:order-2 lg:col-span-7">
            <Link href={`/collections/${hoodie.handle}`} className="group block">
              <span className="relative block aspect-4/5 overflow-hidden bg-paper sm:aspect-3/4">
                <Image
                  src={hoodie.image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition duration-700 ease-(--ease-lux) group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-3 block font-display text-[10px] tracking-[0.25em] uppercase text-stone">
                {hoodie.title}
              </span>
            </Link>
          </Reveal>
        </div>

        {/* The index — every collection, typographically */}
        <Reveal className="mt-24">
          <ol className="border-t border-line">
            {collections.map((c, i) => (
              <li key={c.handle}>
                <Link
                  href={`/collections/${c.handle}`}
                  className="group flex items-baseline gap-5 border-b border-line py-4 transition-colors hover:bg-paper sm:gap-8 sm:py-5"
                >
                  <span aria-hidden className="folio w-8 shrink-0 text-sm text-stone">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-display text-lg tracking-[0.04em] group-hover:text-clay sm:text-2xl">
                    {c.title}
                  </span>
                  <span className="text-xs text-stone tabular-nums">
                    {c.productHandles.length} piece{c.productHandles.length === 1 ? "" : "s"}
                  </span>
                  <span
                    aria-hidden
                    className="hidden text-ink transition-transform duration-350 ease-(--ease-lux) group-hover:translate-x-1.5 sm:block"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Chapter iv — The Edit ---------- */

export function TheEdit({
  products,
  story,
  more,
}: {
  products: ProductVM[];
  story: { heading: string; paragraphs: string[]; cta: Cta };
  more: { heading: string; paragraphs: string[]; cta: Cta };
}) {
  return (
    <section className="bg-paper py-(--spacing-section)">
      <div className={container}>
        <ChapterHead folio="iv" label="The edit" />
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <Reveal>
                <h2 className="font-display text-display-md leading-[1.08] text-balance">
                  {story.heading}
                </h2>
                <p className="mt-5 leading-relaxed font-light text-ink-soft">
                  {story.paragraphs[0]}
                </p>
                <details className="group mt-5">
                  <summary className="cursor-pointer list-none font-display text-[11px] tracking-[0.2em] uppercase text-ink hover:text-clay [&::-webkit-details-marker]:hidden">
                    Read the story
                    <span aria-hidden className="ml-2 inline-block transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed font-light text-ink-soft">
                    {story.paragraphs.slice(1).map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                    <h3 className="pt-2 font-display text-base tracking-[0.04em] text-ink">
                      {more.heading}
                    </h3>
                    {more.paragraphs.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </details>
                <div className="mt-8 flex flex-col items-start gap-4">
                  <ButtonLink href={story.cta.href} variant="text">
                    {story.cta.label}
                  </ButtonLink>
                  <ButtonLink href={more.cta.href} variant="text">
                    {more.cta.label}
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6">
              {products.slice(0, 4).map((p, i) => (
                <Reveal key={p.handle} delay={i * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Chapter v — Campaign spread ---------- */

export function CampaignSpread({ heading, image }: { heading: string; image: string }) {
  return (
    <section className="relative h-[60vh] min-h-[24rem] sm:h-[74vh]">
      <Parallax>
        <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
      </Parallax>
      {/* Light scrim — the spread should feel like sun, not shadow */}
      <div className="absolute inset-0 bg-ink/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="px-4 text-center font-display text-display-xl leading-none tracking-[0.04em] text-balance text-bone uppercase [text-shadow:0_1px_30px_rgb(0_0_0/0.3)]">
          {heading}
        </h2>
      </div>
    </section>
  );
}

/* ---------- Chapter vi — Object spotlight ---------- */

export function ObjectSpotlight({ eyebrow, product }: { eyebrow: string; product: ProductVM }) {
  const image = product.images[0];
  return (
    <section className="bg-paper py-(--spacing-section)">
      <div className={container}>
        <ChapterHead folio="vi" label="The object" />
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="font-accent text-lg italic text-ink-soft">{eyebrow}</p>
          </Reveal>
          <Reveal delay={100}>
            <Link href={`/products/${product.handle}`} className="group mx-auto mt-10 block max-w-md">
              {image && (
                <span className="relative block aspect-4/5 overflow-hidden bg-bone">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 90vw, 448px"
                    className="object-cover transition duration-700 ease-(--ease-lux) group-hover:scale-[1.03]"
                  />
                </span>
              )}
              <span className="mt-8 block font-display text-display-sm tracking-[0.06em] uppercase group-hover:text-clay">
                {product.title}
              </span>
              <span className="mt-2 block text-sm text-ink-soft tabular-nums">
                R&thinsp;{(product.minPriceCents / 100).toFixed(2)}
              </span>
            </Link>
          </Reveal>
          <Reveal delay={180}>
            <ButtonLink href={`/products/${product.handle}`} variant="text" className="mt-8">
              View the piece
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Chapter vii — Assurance · Journal · Newsletter ---------- */

export function CloseBand({
  assurances,
  article,
  popup,
}: {
  assurances: { title: string; body: string }[];
  article: ArticleVM | null;
  popup: { heading: string; body: string };
}) {
  return (
    <section className="py-(--spacing-section)">
      <div className={container}>
        <ChapterHead folio="vii" label="In closing" />

        <ul className="grid gap-8 border-b border-line pb-14 sm:grid-cols-3">
          {assurances.map((a, i) => (
            <li key={a.title}>
              <Reveal delay={i * 80}>
                <h3 className="font-display text-xs tracking-[0.22em] uppercase">{a.title}</h3>
                <p className="mt-2 text-sm font-light text-ink-soft">{a.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <div className="grid gap-14 pt-14 lg:grid-cols-2 lg:gap-20">
          {article && (
            <Reveal>
              <p className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">
                The magazine
              </p>
              <Link href={`/blogs/${article.blogHandle}/${article.handle}`} className="group block">
                <h3 className="mt-4 font-display text-display-sm leading-snug text-balance group-hover:text-clay">
                  {article.title}
                </h3>
                {article.publishedAt && (
                  <time
                    dateTime={article.publishedAt}
                    className="mt-3 block text-xs tracking-[0.15em] uppercase text-stone"
                  >
                    {new Date(article.publishedAt).toLocaleDateString("en-ZA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </Link>
              <ButtonLink
                href={`/blogs/${article.blogHandle}/${article.handle}`}
                variant="text"
                className="mt-6"
              >
                Read more
              </ButtonLink>
            </Reveal>
          )}
          <Reveal delay={120}>
            <p className="font-display text-[10px] tracking-[0.3em] uppercase text-stone">
              First access
            </p>
            <h3 className="mt-4 font-display text-display-sm leading-snug">{popup.heading}</h3>
            <p className="mt-3 max-w-md font-light text-ink-soft">{popup.body}</p>
            <NewsletterForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
