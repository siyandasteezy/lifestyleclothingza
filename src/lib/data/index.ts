// Data layer entry point. DATA_SOURCE=db (PostgreSQL) | content (JSON archive).
// Every read is wrapped in React cache() so a request never runs the same query twice.
import { cache } from "react";
import { contentSource } from "./content-source";
import { dbSource } from "./db-source";
import type { DataSource } from "./source";

const source: DataSource =
  process.env.DATA_SOURCE === "content" || !process.env.DATABASE_URL
    ? contentSource
    : dbSource;

export const getProducts = cache(() => source.getProducts());
export const getProduct = cache((handle: string) => source.getProduct(handle));
export const getCollections = cache(() => source.getCollections());
export const getCollection = cache((handle: string) => source.getCollection(handle));
export const getCollectionProducts = cache((handle: string) =>
  source.getCollectionProducts(handle),
);
export const getPages = cache(() => source.getPages());
export const getPage = cache((handle: string) => source.getPage(handle));
export const getArticles = cache((blogHandle?: string) => source.getArticles(blogHandle));
export const getArticle = cache((blogHandle: string, handle: string) =>
  source.getArticle(blogHandle, handle),
);
