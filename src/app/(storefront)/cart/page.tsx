import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { updateCartLine, clearCart } from "@/lib/actions/cart";
import { resolveCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cart",
  description: "Your shopping cart.",
  path: "/cart",
  noIndex: true,
});

export default async function CartPage() {
  const { lines, subtotalCents } = await resolveCart();

  if (lines.length === 0) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <h1 className="font-display text-display-md">Your cart is empty</h1>
        <p className="mt-3 text-stone">Find something that speaks your style.</p>
        <ButtonLink href="/collections/all" size="lg" className="mt-8">
          Continue shopping
        </ButtonLink>
      </Container>
    );
  }

  return (
    <Container className="py-10 md:py-14">
      <h1 className="mb-8 font-display text-display-md">Your cart</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="divide-y divide-line border border-line bg-paper">
          {lines.map((line) => {
            const image = line.product.images[0];
            return (
              <li key={`${line.productHandle}-${line.variantKey}`} className="flex gap-4 p-4 sm:p-5">
                <Link
                  href={`/products/${line.productHandle}`}
                  className="relative block h-28 w-22 shrink-0 overflow-hidden bg-bone"
                >
                  {image && (
                    <Image src={image.src} alt={image.alt} fill sizes="88px" className="object-cover" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${line.productHandle}`}
                        className="font-medium hover:text-clay"
                      >
                        {line.product.title}
                      </Link>
                      {line.variant.title !== "Default Title" && (
                        <p className="mt-0.5 text-sm text-stone">{line.variant.title}</p>
                      )}
                    </div>
                    <Price cents={line.lineTotalCents} className="font-medium" />
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <form action={updateCartLine} className="flex items-center gap-2">
                      <input type="hidden" name="productHandle" value={line.productHandle} />
                      <input type="hidden" name="variantKey" value={line.variantKey} />
                      <label className="sr-only" htmlFor={`qty-${line.productHandle}-${line.variantKey}`}>
                        Quantity for {line.product.title}
                      </label>
                      <input
                        id={`qty-${line.productHandle}-${line.variantKey}`}
                        type="number"
                        name="quantity"
                        min={0}
                        max={99}
                        defaultValue={line.quantity}
                        className="h-9 w-16 border border-line bg-bone px-3 text-center text-sm"
                      />
                      <button type="submit" className="text-sm text-stone underline underline-offset-2 hover:text-ink">
                        Update
                      </button>
                    </form>
                    <form action={updateCartLine}>
                      <input type="hidden" name="productHandle" value={line.productHandle} />
                      <input type="hidden" name="variantKey" value={line.variantKey} />
                      <input type="hidden" name="quantity" value={0} />
                      <button type="submit" className="text-sm text-clay underline underline-offset-2 hover:text-clay-deep">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="border border-line bg-paper p-6" aria-label="Order summary">
          <h2 className="font-display text-lg">Summary</h2>
          {subtotalCents < 50000 ? (
            <div className="mt-4">
              <p className="text-xs text-ink-soft">
                <strong className="text-ink">{formatMoney(50000 - subtotalCents)}</strong> away from
                free delivery
              </p>
              <div
                className="mt-2 h-px w-full bg-line"
                role="progressbar"
                aria-valuenow={Math.round((subtotalCents / 50000) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward free delivery"
              >
                <div
                  className="h-px bg-clay transition-[width] duration-700 ease-(--ease-lux)"
                  style={{ width: `${Math.min(100, (subtotalCents / 50000) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-moss">✓ This order ships free</p>
          )}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone">Subtotal</dt>
              <dd className="font-medium">{formatMoney(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone">Shipping</dt>
              <dd className="text-stone">Calculated at checkout</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-stone">
            Free shipping on orders over R500 — taxes included where applicable.
          </p>
          <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
            Checkout
          </ButtonLink>
          <form action={clearCart} className="mt-3 text-center">
            <button type="submit" className="text-sm text-stone underline underline-offset-2 hover:text-ink">
              Clear cart
            </button>
          </form>
        </aside>
      </div>
    </Container>
  );
}
