import type { Metadata } from "next";
import { absoluteUrl, site, SITE_URL } from "@/lib/site";
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  HANDLING_DAYS,
  TRANSIT_DAYS,
} from "@/lib/shipping/courier-guy";
import type { ArticleVM, ProductVM, ProductVariantVM } from "@/lib/types";

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
  /**
   * Skip the root layout's `%s – Brand` template. Set on pages whose title
   * already carries the brand, otherwise it renders twice.
   */
  absoluteTitle?: boolean;
}

/** Builds Metadata with canonical, Open Graph, and Twitter tags for any route. */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
  absoluteTitle = false,
}: PageMetaInput): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    // noindex but still followed: keeping a page out of the index is no reason
    // to stop link equity flowing through it to the pages that should rank.
    robots: noIndex ? { index: false, follow: true } : undefined,
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

// ---------- Offer building blocks ----------
//
// Shipping and return terms are identical for every offer on the store, so they
// are emitted once as @id-addressable nodes and referenced from each Offer.
// A 45-variant product would otherwise repeat them 45 times.

const SHIPPING_STANDARD_ID = `${SITE_URL}/#shipping-standard`;
const SHIPPING_FREE_ID = `${SITE_URL}/#shipping-free`;
const RETURN_POLICY_ID = `${SITE_URL}/#return-policy`;

function shippingDetailsJsonLd() {
  const destination = { "@type": "DefinedRegion", addressCountry: "ZA" };
  const deliveryTime = {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: HANDLING_DAYS.min,
      maxValue: HANDLING_DAYS.max,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: TRANSIT_DAYS.min,
      maxValue: TRANSIT_DAYS.max,
      unitCode: "DAY",
    },
  };

  return [
    {
      "@context": "https://schema.org",
      "@type": "OfferShippingDetails",
      "@id": SHIPPING_STANDARD_ID,
      shippingRate: {
        "@type": "MonetaryAmount",
        value: (FLAT_SHIPPING_CENTS / 100).toFixed(2),
        currency: "ZAR",
      },
      shippingDestination: destination,
      deliveryTime,
    },
    {
      "@context": "https://schema.org",
      "@type": "OfferShippingDetails",
      "@id": SHIPPING_FREE_ID,
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0.00",
        currency: "ZAR",
        // Free shipping kicks in once the basket clears the threshold.
        eligibleTransactionVolume: {
          "@type": "PriceSpecification",
          priceCurrency: "ZAR",
          minPrice: (FREE_SHIPPING_THRESHOLD_CENTS / 100).toFixed(2),
        },
      },
      shippingDestination: destination,
      deliveryTime,
    },
  ];
}

function returnPolicyJsonLd() {
  // Mirrors /pages/refund-policy: 7 days from delivery, buyer pays return postage.
  return {
    "@context": "https://schema.org",
    "@type": "MerchantReturnPolicy",
    "@id": RETURN_POLICY_ID,
    applicableCountry: "ZA",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    returnShippingFeesAmount: {
      "@type": "MonetaryAmount",
      value: (FLAT_SHIPPING_CENTS / 100).toFixed(2),
      currency: "ZAR",
    },
  };
}

/** Position of the option matching `pattern`, or null when the product has none. */
function optionPosition(product: ProductVM, pattern: RegExp): number | null {
  const option = product.options.find((o) => pattern.test(o.name));
  return option ? option.position : null;
}

function optionValue(variant: ProductVariantVM, position: number | null): string | null {
  if (position === null) return null;
  const value = [variant.option1, variant.option2, variant.option3][position - 1];
  return value && value !== "Default Title" ? value : null;
}

/**
 * Merchant-Center-compatible offer id. Only one variant in the catalogue carries
 * a real SKU, so fall back to a stable handle+position key. This is the same id
 * the product feed must use, with the product handle as item_group_id.
 */
export function variantOfferId(product: ProductVM, variant: ProductVariantVM): string {
  return variant.sku || `${product.handle}-${variant.position}`;
}

function offerJsonLd(product: ProductVM, variant: ProductVariantVM) {
  return {
    "@type": "Offer",
    url: absoluteUrl(`/products/${product.handle}`),
    priceCurrency: "ZAR",
    price: (variant.priceCents / 100).toFixed(2),
    itemCondition: "https://schema.org/NewCondition",
    availability: variant.available
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    seller: { "@type": "Organization", name: site.name },
    shippingDetails: [{ "@id": SHIPPING_STANDARD_ID }, { "@id": SHIPPING_FREE_ID }],
    hasMerchantReturnPolicy: { "@id": RETURN_POLICY_ID },
  };
}

/**
 * Product schema for a PDP.
 *
 * Products with real options are emitted as a ProductGroup with one addressable
 * Product per variant, because sizes to 5XL are the store's differentiator and
 * each size has to be individually eligible for merchant listings. Products with
 * a single "Default Title" variant stay a plain Product.
 *
 * Returns an array: the shared shipping/return nodes plus the product node.
 */
export function productJsonLd(product: ProductVM) {
  const images = product.images.map((i) => absoluteUrl(i.src));
  const url = absoluteUrl(`/products/${product.handle}`);
  const brand = { "@type": "Brand", name: product.vendor || site.name };
  const description = stripHtml(product.bodyHtml);

  const sizePosition = optionPosition(product, /size/i);
  const colourPosition = optionPosition(product, /colou?r/i);
  const hasRealVariants =
    product.variants.length > 1 || Boolean(optionValue(product.variants[0], sizePosition));

  const shared = [...shippingDetailsJsonLd(), returnPolicyJsonLd()];

  if (!hasRealVariants) {
    const variant = product.variants[0];
    return [
      ...shared,
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description,
        image: images,
        url,
        brand,
        sku: variantOfferId(product, variant),
        offers: offerJsonLd(product, variant),
      },
    ];
  }

  const variesBy = [
    ...(sizePosition !== null ? ["https://schema.org/size"] : []),
    ...(colourPosition !== null ? ["https://schema.org/color"] : []),
  ];

  return [
    ...shared,
    {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: product.title,
      description,
      image: images,
      url,
      brand,
      productGroupID: product.handle,
      ...(variesBy.length ? { variesBy } : {}),
      hasVariant: product.variants.map((variant) => {
        const size = optionValue(variant, sizePosition);
        const colour = optionValue(variant, colourPosition);
        return {
          "@type": "Product",
          name: `${product.title} — ${variant.title}`,
          sku: variantOfferId(product, variant),
          inProductGroupWithID: product.handle,
          image: images.slice(0, 1),
          brand,
          ...(size ? { size } : {}),
          ...(colour ? { color: colour } : {}),
          offers: offerJsonLd(product, variant),
        };
      }),
    },
  ];
}

/** CollectionPage + ItemList for a collection listing. */
export function collectionJsonLd(
  collection: { handle: string; title: string; descriptionHtml: string },
  products: ProductVM[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: descriptionFromHtml(collection.descriptionHtml, collection.title),
    url: absoluteUrl(`/collections/${collection.handle}`),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/products/${product.handle}`),
        name: product.title,
      })),
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
