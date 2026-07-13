import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Order confirmed",
  description: "Thank you for your order.",
  path: "/checkout/confirmation",
  noIndex: true,
});

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="text-5xl" aria-hidden>
        ✓
      </p>
      <h1 className="mt-4 font-display text-display-md">Thank you — order received!</h1>
      {order && (
        <p className="mt-3 text-lg">
          Your order number is <strong>#{order}</strong>.
        </p>
      )}
      <p className="mt-2 max-w-md text-stone">
        We’ve emailed the details to you. Questions? Reach us at{" "}
        <a href={`mailto:${site.email}`} className="text-clay underline underline-offset-2">
          {site.email}
        </a>
        .
      </p>
      <ButtonLink href="/collections/all" size="lg" className="mt-8">
        Continue shopping
      </ButtonLink>
    </Container>
  );
}
