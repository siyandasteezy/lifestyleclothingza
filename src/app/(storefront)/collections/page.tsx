import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getCollections } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Collections",
  description: "Browse all Lifestyle Clothing ZA collections.",
  path: "/collections",
});

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <Container className="py-10 md:py-14">
      <h1 className="mb-10 font-display text-display-lg leading-[1.05]">Collections</h1>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {collections.map((c) => (
          <li key={c.handle}>
            <Link
              href={`/collections/${c.handle}`}
              className="group relative block aspect-4/5 overflow-hidden rounded-card bg-ink shadow-card"
            >
              {c.image && (
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-80"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-transparent to-transparent" />
              <h2 className="absolute bottom-4 left-4 pr-4 font-display text-lg text-bone sm:bottom-5 sm:left-5 sm:text-xl">
                {c.title}
              </h2>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
