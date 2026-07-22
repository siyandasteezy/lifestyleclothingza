import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TrackForm } from "@/components/track/TrackForm";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Track Your Order",
  description: "Follow your Lifestyle Clothing ZA order from checkout to your door.",
  path: "/track",
});

export default function TrackPage() {
  return (
    <Container className="py-12 md:py-20">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 font-display text-[10px] tracking-[0.3em] uppercase text-clay">
          Order status
        </p>
        <h1 className="font-display text-display-lg leading-[1.05] uppercase">Track your order</h1>
        <p className="mt-4 font-light text-ink-soft">
          Enter your order number and the email you checked out with to see where your order is.
        </p>
      </header>
      <TrackForm />
    </Container>
  );
}
