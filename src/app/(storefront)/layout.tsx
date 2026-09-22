import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getCollections } from "@/lib/data";
import { buildMenu } from "@/lib/menu";
import { site } from "@/lib/site";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  // Collections created in the admin are not in the curated menu, so they are
  // merged in here — newest first — rather than never appearing.
  const collections = await getCollections();
  const menu = buildMenu(site.mainMenu, collections);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bone"
      >
        Skip to content
      </a>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <AnnouncementBar />
      <Header menu={menu} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
