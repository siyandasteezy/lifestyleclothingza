import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { getArticle, getArticles } from "@/lib/data";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata, descriptionFromHtml } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ blog: string; article: string }>;
}

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ blog: a.blogHandle, article: a.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { blog, article: handle } = await params;
  const article = await getArticle(blog, handle);
  if (!article) return {};
  return buildMetadata({
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? descriptionFromHtml(article.bodyHtml, article.title),
    path: `/blogs/${blog}/${handle}`,
    image: article.heroImage,
    type: "article",
  });
}

export default async function ArticlePage({ params }: Props) {
  const { blog, article: handle } = await params;
  const article = await getArticle(blog, handle);
  if (!article) notFound();

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd(article),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: article.blogTitle, path: `/blogs/${article.blogHandle}` },
            { name: article.title, path: `/blogs/${article.blogHandle}/${article.handle}` },
          ]),
        ]}
      />
      <Container className="py-10 md:py-14">
        <article className="mx-auto max-w-3xl">
          <header>
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone">
              <Link href={`/blogs/${article.blogHandle}`} className="hover:text-ink hover:underline">
                ← {article.blogTitle}
              </Link>
            </nav>
            <h1 className="font-display text-display-lg leading-[1.05] text-balance">
              {article.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone">
              {article.publishedAt && (
                <time dateTime={article.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString("en-ZA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              )}
              {article.author && (
                <>
                  <span aria-hidden>·</span>
                  <span>{article.author}</span>
                </>
              )}
            </p>
          </header>
          {article.heroImage && (
            <div className="relative mt-8 aspect-3/2 overflow-hidden rounded-card shadow-card">
              <Image
                src={article.heroImage}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}
          <div
            className="prose mt-10"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </article>
      </Container>
    </>
  );
}
