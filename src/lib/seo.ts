import type { Metadata } from "next";
import { absoluteUrl, site, SITE_URL } from "@/lib/site";
import type { ArticleVM, ProductVM } from "@/lib/types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function descriptionFromHtml(html: string, fallback = ""): string {
  const text = stripHtml(html);
  return text ? truncate(text) : fallback;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
}

/** Builds Metadata with canonical, Open Graph, and Twitter tags for any route. */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
}: PageMetaInput): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.name,
      type,
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ---------- JSON-LD builders ----------

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: SITE_URL,
    logo: absoluteUrl(site.logo),
    email: site.email,
    sameAs: [site.social.facebook, site.social.instagram, site.social.tiktok],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(product: ProductVM) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: stripHtml(product.bodyHtml),
    image: product.images.map((i) => absoluteUrl(i.src)),
    url: absoluteUrl(`/products/${product.handle}`),
    brand: { "@type": "Brand", name: product.vendor || site.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ZAR",
      lowPrice: (product.minPriceCents / 100).toFixed(2),
      highPrice: (product.maxPriceCents / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.available)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function articleJsonLd(article: ArticleVM) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    author: { "@type": "Person", name: article.author || site.name },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(site.logo) },
    },
    datePublished: article.publishedAt ?? undefined,
    mainEntityOfPage: absoluteUrl(`/blogs/${article.blogHandle}/${article.handle}`),
    ...(article.heroImage ? { image: [absoluteUrl(article.heroImage)] } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
