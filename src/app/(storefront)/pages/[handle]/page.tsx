import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPage, getPages } from "@/lib/data";
import { breadcrumbJsonLd, buildMetadata, descriptionFromHtml } from "@/lib/seo";
import { ContactBlock } from "@/components/pages/ContactBlock";

export const revalidate = 300;

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateStaticParams() {
  const pages = await getPages();
  return pages.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const page = await getPage(handle);
  if (!page) return {};
  return buildMetadata({
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? descriptionFromHtml(page.bodyHtml, page.title),
    path: `/pages/${handle}`,
  });
}

export default async function StaticPage({ params }: Props) {
  const { handle } = await params;
  const page = await getPage(handle);
  if (!page) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: page.title, path: `/pages/${handle}` },
        ])}
      />
      <Container className="py-10 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-display-lg leading-[1.05] text-balance">
            {page.title}
          </h1>
          <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
          {handle === "contact" && <ContactBlock />}
        </div>
      </Container>
    </>
  );
}
