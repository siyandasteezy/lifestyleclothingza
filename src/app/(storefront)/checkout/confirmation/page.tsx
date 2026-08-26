import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { CURRENCY, itemsFromOrder, toRand, type OrderItemLike } from "@/lib/analytics";

export const dynamic = "force-dynamic";

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
  const { order: orderParam } = await searchParams;
  const number = orderParam ? parseInt(orderParam, 10) : NaN;

  let status: string | null = null;
  let order: {
    id: string;
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
    items: OrderItemLike[];
  } | null = null;
  if (Number.isInteger(number)) {
    try {
      const row = await prisma.order.findUnique({
        where: { number },
        select: {
          id: true,
          status: true,
          subtotalCents: true,
          shippingCents: true,
          totalCents: true,
          items: {
            select: { title: true, variantTitle: true, quantity: true, priceCents: true },
          },
        },
      });
      status = row?.status ?? null;
      order = row;
    } catch {
      // No database available — keep the generic confirmation.
    }
  }

  const paid = status === "PAID";

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      {/* Revenue is only booked once payment is confirmed. Firing on a PENDING
          order would count abandoned checkouts and automated store-bot orders
          as sales — the shop already receives those. Orders that clear after
          the customer closes this page are not captured here; that needs a
          server-side event from the Yoco webhook. */}
      {paid && order && (
        <TrackEvent
          event="purchase"
          dedupeKey={String(number)}
          params={{
            transaction_id: String(number),
            value: toRand(order.totalCents),
            shipping: toRand(order.shippingCents),
            currency: CURRENCY,
            items: itemsFromOrder(order.items),
          }}
        />
      )}
      <p className="text-5xl" aria-hidden>
        ✓
      </p>
      <h1 className="mt-4 font-display text-display-md">
        {paid ? "Payment received — thank you!" : "Thank you — order received!"}
      </h1>
      {orderParam && (
        <p className="mt-3 text-lg">
          Your order number is <strong>#{orderParam}</strong>.
        </p>
      )}
      {!paid && status === "PENDING" && (
        <p className="mt-2 max-w-md text-stone">
          Your payment is being confirmed — you’ll receive an email as soon as it clears.
        </p>
      )}
      <p className="mt-2 max-w-md text-stone">
        Questions? Reach us at{" "}
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
