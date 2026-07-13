import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getArticles } from "@/lib/data";
import { buildMetadata, descriptionFromHtml, truncate } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

interface Props {
  params: Promise<{ blog: string }>;
}

export async function generateStaticParams() {
  const articles = await getArticles();
  return [...new Set(articles.map((a) => a.blogHandle))].map((blog) => ({ blog }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { blog } = await params;
  const articles = await getArticles(blog);
  if (articles.length === 0) return {};
  return buildMetadata({
    title: articles[0].blogTitle,
    description: `Stories and updates from ${site.name}.`,
    path: `/blogs/${blog}`,
  });
}

export default async function BlogIndexPage({ params }: Props) {
  const { blog } = await params;
  const articles = await getArticles(blog);
  if (articles.length === 0) notFound();

  return (
    <Container className="py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase text-clay">
          The magazine
        </p>
        <h1 className="font-display text-display-lg leading-[1.05]">
          {articles[0].blogTitle}
        </h1>
      </header>
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.handle}>
            <Link
              href={`/blogs/${article.blogHandle}/${article.handle}`}
              className="group block overflow-hidden rounded-card border border-line bg-paper shadow-card transition hover:shadow-lift"
            >
              {article.heroImage && (
                <div className="relative aspect-3/2 overflow-hidden">
                  <Image
                    src={article.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <div className="p-5">
                {article.publishedAt && (
                  <time dateTime={article.publishedAt} className="text-xs tracking-wide text-stone uppercase">
                    {new Date(article.publishedAt).toLocaleDateString("en-ZA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
                <h2 className="mt-2 font-display text-lg group-hover:text-clay">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                  {truncate(article.excerpt || descriptionFromHtml(article.bodyHtml), 180)}
                </p>
                <p className="mt-4 text-sm font-medium text-clay">
                  Read more <span aria-hidden>→</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
