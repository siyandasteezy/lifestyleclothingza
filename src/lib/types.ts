// Storefront view models — shared by both data sources (Prisma DB / JSON content archive)

export interface ProductOptionVM {
  name: string;
  position: number;
  values: string[];
}

export interface ProductVariantVM {
  /** Stable key within a product: variant position as string */
  key: string;
  title: string;
  sku: string;
  priceCents: number;
  compareAtCents: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  available: boolean;
  position: number;
}

export interface ProductImageVM {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
}

export interface ProductVM {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  publishedAt: string | null;
  options: ProductOptionVM[];
  variants: ProductVariantVM[];
  images: ProductImageVM[];
  minPriceCents: number;
  maxPriceCents: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CollectionVM {
  handle: string;
  title: string;
  descriptionHtml: string;
  image: string | null;
  productHandles: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface PageVM {
  handle: string;
  title: string;
  bodyHtml: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface ArticleVM {
  blogHandle: string;
  blogTitle: string;
  handle: string;
  title: string;
  author: string;
  excerpt: string;
  bodyHtml: string;
  heroImage: string | null;
  publishedAt: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CartLine {
  productHandle: string;
  variantKey: string;
  quantity: number;
}

export interface ResolvedCartLine extends CartLine {
  product: ProductVM;
  variant: ProductVariantVM;
  lineTotalCents: number;
}
