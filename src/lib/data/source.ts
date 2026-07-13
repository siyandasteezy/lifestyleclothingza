import type { ArticleVM, CollectionVM, PageVM, ProductVM } from "@/lib/types";

export interface DataSource {
  getProducts(): Promise<ProductVM[]>;
  getProduct(handle: string): Promise<ProductVM | null>;
  getCollections(): Promise<CollectionVM[]>;
  getCollection(handle: string): Promise<CollectionVM | null>;
  /** handle "all" returns the full catalog */
  getCollectionProducts(handle: string): Promise<ProductVM[]>;
  getPages(): Promise<PageVM[]>;
  getPage(handle: string): Promise<PageVM | null>;
  getArticles(blogHandle?: string): Promise<ArticleVM[]>;
  getArticle(blogHandle: string, handle: string): Promise<ArticleVM | null>;
}
