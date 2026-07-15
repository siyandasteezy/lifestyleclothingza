import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { buildPayfastFields, payfastConfigured, payfastProcessUrl } from "@/lib/payments/payfast";
import { PayfastRedirect } from "@/components/checkout/PayfastRedirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Complete payment",
  description: "Secure payment via PayFast.",
  path: "/checkout",
  noIndex: true,
});

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || !payfastConfigured()) notFound();
  if (order.status !== "PENDING") redirect(`/checkout/confirmation?order=${order.number}`);

  const fields = buildPayfastFields({
    id: order.id,
    number: order.number,
    email: order.email,
    shippingName: order.shippingName,
    totalCents: order.totalCents,
  });

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-display-md">Almost there…</h1>
      <p className="mt-3 max-w-md text-stone">
        Order <strong>#{order.number}</strong> · {formatMoney(order.totalCents)}. You’re being
        redirected to PayFast to complete your payment securely.
      </p>
      <PayfastRedirect action={payfastProcessUrl()} fields={fields} />
    </Container>
  );
}
