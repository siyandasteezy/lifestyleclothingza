import type { Metadata } from "next";
import { Slideshow, type Slide } from "@/components/home/Slideshow";
import {
  Collage,
  CollectionList,
  FaqSection,
  FeaturedCollection,
  Guarantees,
  ImageBanner,
  ImagesWithText,
  ImageWithText,
  ImageWithTextOverlay,
  RichTextSection,
  MediaBanner,
} from "@/components/home/sections";
import { getCollectionProducts, getProduct } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { homepage, site } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: site.metaTitle,
  description: site.metaDescription,
  path: "/",
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function HomePage() {
  const sections = homepage.sections as any[];
  const rendered = await Promise.all(
    sections.map(async (section, i) => {
      switch (section.type) {
        case "slideshow":
          return <Slideshow key={i} slides={section.slides as Slide[]} />;
        case "richText":
          return <RichTextSection key={i} {...section} />;
        case "imageWithTextOverlay":
          return <ImageWithTextOverlay key={i} {...section} />;
        case "featuredCollection": {
          const products = await getCollectionProducts(section.collectionHandle);
          return (
            <FeaturedCollection
              key={i}
              heading={section.heading}
              products={products}
              collectionHandle={section.collectionHandle}
            />
          );
        }
        case "guarantees":
          return <Guarantees key={i} {...section} />;
        case "collectionList":
          return <CollectionList key={i} {...section} />;
        case "mediaBanner":
          return <MediaBanner key={i} {...section} />;
        case "imageBanner":
          return <ImageBanner key={i} {...section} />;
        case "imageWithText":
          return <ImageWithText key={i} {...section} />;
        case "imagesWithText":
          return <ImagesWithText key={i} {...section} />;
        case "collage": {
          const productItem = section.items.find((it: any) => it.kind === "product");
          const collectionItem = section.items.find((it: any) => it.kind === "collection");
          const imageItem = section.items.find((it: any) => it.kind === "image");
          const product = productItem ? await getProduct(productItem.handle) : null;
          return (
            <Collage
              key={i}
              product={product}
              collection={collectionItem}
              image={imageItem.image}
            />
          );
        }
        case "faq":
          return <FaqSection key={i} {...section} />;
        default:
          return null;
      }
    }),
  );

  return <>{rendered}</>;
}
