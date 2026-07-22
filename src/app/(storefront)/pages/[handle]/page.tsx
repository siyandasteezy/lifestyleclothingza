import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPage, getPages } from "@/lib/data";
import { breadcrumbJsonLd, buildMetadata, descriptionFromHtml, faqJsonLd } from "@/lib/seo";
import { ContactBlock } from "@/components/pages/ContactBlock";
import { Accordion } from "@/components/ui/Accordion";
import { getHomepage } from "@/lib/homepage";

export const revalidate = 300;

// The storefront FAQ moved here from the homepage (approved direction).
type FaqSection = { type: string; heading?: string; items?: { question: string; answer: string }[] };

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

  const faq =
    handle === "orders-payments"
      ? ((await getHomepage()).sections as FaqSection[]).find((s) => s.type === "faq")
      : undefined;

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
          {handle === "orders-payments" && faq?.items && (
            <section aria-labelledby="faq-heading" className="mt-14">
              <JsonLd data={faqJsonLd(faq.items)} />
              <h2 id="faq-heading" className="mb-6 font-display text-display-sm">
                {faq.heading}
              </h2>
              <Accordion items={faq.items} />
            </section>
          )}
        </div>
      </Container>
    </>
  );
}
