import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { resolveCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = buildMetadata({
  title: "Checkout",
  description: "Secure checkout.",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage() {
  const { lines, subtotalCents } = await resolveCart();
  if (lines.length === 0) redirect("/cart");

  const shippingCents = subtotalCents >= 50000 ? 0 : 9900;

  return (
    <Container className="py-10 md:py-14">
      <h1 className="mb-8 font-display text-display-md">Checkout</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <CheckoutForm />
        <aside className="rounded-card border border-line bg-paper p-6 lg:order-last" aria-label="Order summary">
          <h2 className="font-display text-lg">Your order</h2>
          <ul className="mt-4 divide-y divide-line">
            {lines.map((line) => (
              <li key={`${line.productHandle}-${line.variantKey}`} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{line.product.title}</span>
                  {line.variant.title !== "Default Title" && (
                    <span className="text-stone"> — {line.variant.title}</span>
                  )}
                  <span className="text-stone"> × {line.quantity}</span>
                </span>
                <Price cents={line.lineTotalCents} />
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone">Subtotal</dt>
              <dd>{formatMoney(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone">Shipping</dt>
              <dd>{shippingCents === 0 ? "Free" : formatMoney(shippingCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(subtotalCents + shippingCents)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </Container>
  );
}
