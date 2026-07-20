import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/db";
import { retryPayment } from "@/lib/actions/checkout";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Payment cancelled",
  description: "Your payment was cancelled.",
  path: "/checkout/cancelled",
  noIndex: true,
});

export default async function CancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, status: true } })
    : null;

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-display-md">Payment cancelled</h1>
      <p className="mt-3 max-w-md text-stone">
        No money left your account.
        {order ? ` Your order #${order.number} is saved — you can complete payment whenever you're ready.` : ""}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {order && order.status === "PENDING" && (
          <form action={retryPayment}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="inline-flex h-14 items-center border border-ink bg-ink px-10 font-display text-xs tracking-[0.2em] uppercase text-bone transition-colors duration-350 hover:bg-transparent hover:text-ink"
            >
              Try payment again
            </button>
          </form>
        )}
        <Link
          href="/collections/all"
          className="text-sm text-ink underline underline-offset-4 hover:text-clay"
        >
          Continue shopping
        </Link>
      </div>
    </Container>
  );
}
