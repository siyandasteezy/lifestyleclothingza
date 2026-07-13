// Server-rendered homepage sections. All copy comes verbatim from content/homepage.json.
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { ProductCard } from "@/components/product/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo";
import type { ProductVM } from "@/lib/types";

interface Cta {
  label: string;
  href: string;
}

export function RichTextSection({
  heading,
  paragraphs,
  cta,
}: {
  heading: string;
  paragraphs: string[];
  cta?: Cta;
}) {
  return (
    <Section tone="paper" align="center" heading={heading}>
      <div className="mx-auto max-w-3xl space-y-5 text-center text-base leading-relaxed text-ink-soft sm:text-lg">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      {cta && (
        <div className="mt-8 text-center">
          <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
        </div>
      )}
    </Section>
  );
}

export function ImageWithTextOverlay({
  heading,
  subheading,
  body,
  cta,
  image,
}: {
  heading: string;
  subheading: string;
  body: string;
  cta: Cta;
  image: string;
}) {
  return (
    <section className="relative overflow-hidden bg-ink text-bone">
      <Image
        src={image}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-[80%_50%] opacity-60"
      />
      <Container className="relative flex min-h-[34rem] items-center py-(--spacing-section)">
        <div className="max-w-xl">
          <h2 className="font-display text-display-lg leading-[1.05] text-balance">
            {heading}
          </h2>
          <p className="mt-4 text-lg font-medium text-bone/95">{subheading}</p>
          <p className="mt-3 max-w-lg leading-relaxed text-bone/80">{body}</p>
          <ButtonLink href={cta.href} variant="inverse" size="lg" className="mt-8">
            {cta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

export function FeaturedCollection({
  heading,
  products,
  collectionHandle,
}: {
  heading: string;
  products: ProductVM[];
  collectionHandle: string;
}) {
  return (
    <Section heading={heading}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.handle} product={p} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <ButtonLink href={`/collections/${collectionHandle}`} variant="outline">
          View all
        </ButtonLink>
      </div>
    </Section>
  );
}

export function Guarantees({
  heading,
  items,
}: {
  heading: string;
  items: { title: string; body: string }[];
}) {
  return (
    <Section tone="ink" heading={heading} align="center" headingClassName="text-bone">
      <ul className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="w-[calc(50%-0.375rem)] rounded-card border border-bone/15 p-5 text-center sm:w-56 lg:p-4"
          >
            <h3 className="text-sm font-semibold tracking-wide text-bone">{item.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-bone/65">{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function CollectionList({
  heading,
  collections,
}: {
  heading: string;
  collections: { handle: string; title: string; image: string }[];
}) {
  return (
    <Section heading={heading}>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {collections.map((c) => (
          <Link
            key={c.handle}
            href={`/collections/${c.handle}`}
            className="group relative block aspect-2/3 overflow-hidden rounded-card bg-ink shadow-card"
          >
            <Image
              src={c.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-80"
            />
            <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-transparent to-transparent" />
            <h3 className="absolute bottom-5 left-5 font-display text-xl text-bone">
              {c.title}
              <span aria-hidden className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </h3>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function MediaBanner({ heading, image }: { heading: string; image: string }) {
  return (
    <section className="relative flex min-h-[26rem] items-center justify-center overflow-hidden bg-ink text-bone sm:min-h-[34rem]">
      <Image src={image} alt="" fill sizes="100vw" className="object-cover opacity-70" />
      <h2 className="relative px-4 text-center font-display text-display-xl leading-none tracking-tight text-balance uppercase">
        {heading}
      </h2>
    </section>
  );
}

export function ImageBanner({
  heading,
  body,
  cta,
  image,
  imageMobile,
}: {
  heading: string;
  body: string;
  cta: Cta;
  image: string;
  imageMobile?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-ink text-bone">
      {imageMobile && (
        <Image src={imageMobile} alt="" fill sizes="100vw" className="object-cover object-bottom opacity-65 sm:hidden" />
      )}
      <Image
        src={image}
        alt=""
        fill
        sizes="100vw"
        className={`object-cover object-bottom opacity-65 ${imageMobile ? "hidden sm:block" : ""}`}
      />
      <Container className="relative flex min-h-[30rem] flex-col items-center justify-center py-(--spacing-section) text-center">
        <h2 className="max-w-2xl font-display text-display-lg leading-[1.05] text-balance">
          {heading}
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-bone/85">{body}</p>
        <ButtonLink href={cta.href} variant="inverse" size="lg" className="mt-8">
          {cta.label}
        </ButtonLink>
      </Container>
    </section>
  );
}

export function ImageWithText({
  heading,
  paragraphs,
  cta,
  image,
}: {
  heading: string;
  paragraphs: string[];
  cta: Cta;
  image: string;
}) {
  return (
    <Section tone="paper">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* The original theme showed this image at a tall 9:16 crop */}
        <div className="relative aspect-9/16 max-h-[52rem] overflow-hidden rounded-card shadow-lift">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-display text-display-md leading-[1.1] text-balance">
            {heading}
          </h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <ButtonLink href={cta.href} className="mt-8">
            {cta.label}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}

export function ImagesWithText({
  heading,
  paragraphs,
  cta,
  images,
}: {
  heading: string;
  paragraphs: string[];
  cta: Cta;
  images: string[];
}) {
  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="font-display text-display-md leading-[1.1] text-balance">
            {heading}
          </h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <ButtonLink href={cta.href} className="mt-8">
            {cta.label}
          </ButtonLink>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {images.slice(0, 4).map((src, i) => (
            <div
              key={src}
              className={`relative aspect-2/3 overflow-hidden rounded-card shadow-card ${
                i % 2 === 1 ? "translate-y-6" : ""
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Collage({
  product,
  collection,
  image,
}: {
  product: ProductVM | null;
  collection: { handle: string; title: string; image: string };
  image: string;
}) {
  return (
    <Section tone="paper" heading="Shop the moment" eyebrow="Curated">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {product && (
          <div className="sm:self-start">
            <ProductCard product={product} />
          </div>
        )}
        <Link
          href={`/collections/${collection.handle}`}
          className="group relative block aspect-2/3 overflow-hidden rounded-card bg-ink shadow-card"
        >
          <Image
            src={collection.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-80"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-transparent to-transparent" />
          <h3 className="absolute bottom-5 left-5 font-display text-xl text-bone">
            {collection.title}
            <span aria-hidden className="ml-2 inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </h3>
        </Link>
        <div className="relative aspect-2/3 overflow-hidden rounded-card shadow-card">
          <Image src={image} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
        </div>
      </div>
    </Section>
  );
}

export function FaqSection({
  heading,
  items,
}: {
  heading: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <Section heading={heading} align="center">
      <JsonLd data={faqJsonLd(items)} />
      <div className="mx-auto max-w-2xl">
        <Accordion items={items} />
      </div>
    </Section>
  );
}
