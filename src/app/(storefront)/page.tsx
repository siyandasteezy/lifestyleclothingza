import type { Metadata } from "next";
import { Slideshow, type Slide } from "@/components/home/Slideshow";
import {
  CampaignSpread,
  CloseBand,
  CollectionsIndex,
  Manifesto,
  ObjectSpotlight,
  TheEdit,
} from "@/components/home/sections";
import {
  getArticles,
  getCollectionProducts,
  getCollections,
  getProduct,
} from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { getHomepage } from "@/lib/homepage";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: site.metaTitle,
  description: site.metaDescription,
  path: "/",
});

/**
 * The seven-chapter homepage ("The Quiet Flex"). Content comes from the
 * admin-editable homepage config (falling back to the bundled JSON); this file
 * only decides the staging.
 */
export default async function HomePage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const homepage = await getHomepage();
  const sections = homepage.sections as any[];
  const byType = (type: string) => sections.find((s) => s.type === type);

  const slideshow = byType("slideshow");
  const richText = byType("richText");
  const bucket = byType("imageWithTextOverlay"); // "Bucket Your Lifestyle."
  const undeniable = byType("imageBanner"); // "Undeniable Quality."
  const story = byType("imageWithText"); // "Simplicity Done Right."
  const more = byType("imagesWithText"); // "Made to Fit You"
  const campaign = byType("mediaBanner"); // "LOOK GOOD WITH US"
  const featured = byType("featuredCollection"); // eyebrow copy for the object
  const guarantees = byType("guarantees");
  const tiles = byType("collectionList").collections as {
    handle: string;
    title: string;
    image: string;
  }[];

  const [collections, tees, pendant, articles] = await Promise.all([
    getCollections(),
    getCollectionProducts("short-sleeve-t-shirts"),
    getProduct("lifestyle-legacy-pendant"),
    getArticles("news"),
  ]);

  // The assurance line keeps three of the seven guarantees on the homepage;
  // the full list lives on Orders & Payment.
  const keep = ["Fast Delivery", "SECURE CHECKOUT", "Proudly South African"];
  const assurances = (guarantees.items as { title: string; body: string }[]).filter((g) =>
    keep.includes(g.title),
  );

  const headwearTile = tiles.find((t) => t.handle === "5-panel-caps")!;
  const hoodieTile = tiles.find((t) => t.handle === "hoodie-collection")!;

  return (
    <>
      {/* i — Cover (pulled under the transparent header) */}
      <div className="-mt-16 md:-mt-20">
        <Slideshow slides={slideshow.slides as Slide[]} />
      </div>

      {/* ii — Manifesto */}
      <Manifesto
        heading={richText.heading}
        paragraphs={richText.paragraphs}
        cta={richText.cta}
      />

      {/* iii — Collections index (carries the headwear + hoodie campaign copy) */}
      <CollectionsIndex
        collections={collections}
        headwear={headwearTile}
        hoodie={hoodieTile}
        bucket={bucket}
        undeniable={undeniable}
      />

      {/* iv — The Edit */}
      <TheEdit products={tees} story={story} more={more} />

      {/* v — Campaign spread */}
      <CampaignSpread heading={campaign.heading} image={campaign.image} />

      {/* vi — Object spotlight */}
      {pendant && <ObjectSpotlight eyebrow={featured.heading} product={pendant} />}

      {/* vii — Assurance · Journal · Newsletter */}
      <CloseBand
        assurances={assurances}
        article={articles[0] ?? null}
        popup={site.popup}
      />
    </>
  );
}
