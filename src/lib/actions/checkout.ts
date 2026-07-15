"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveCart, writeCartLines } from "@/lib/cart";
import { payfastConfigured } from "@/lib/payments/payfast";
import { quoteShipping } from "@/lib/shipping/courier-guy";

const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  phone: z.string().max(30).optional(),
  name: z.string().min(2, "Enter the recipient's full name."),
  address1: z.string().min(3, "Enter a street address."),
  address2: z.string().optional(),
  city: z.string().min(2, "Enter a city."),
  province: z.string().min(2, "Enter a province."),
  postalCode: z.string().min(3, "Enter a postal code."),
  country: z.string().min(2),
  note: z.string().max(1000).optional(),
});

export interface CheckoutState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const { lines, subtotalCents } = await resolveCart();
  if (lines.length === 0) {
    return { status: "error", message: "Your cart is empty." };
  }

  const data = parsed.data;
  const shipping = await quoteShipping(
    {
      name: data.name,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      phone: data.phone,
      email: data.email,
    },
    subtotalCents,
  );

  let order: { id: string; number: number };
  try {
    order = await prisma.order.create({
      data: {
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        subtotalCents,
        shippingCents: shipping.cents,
        totalCents: subtotalCents + shipping.cents,
        shippingName: data.name,
        shippingMethod: shipping.method,
        shippingAddress: {
          address1: data.address1,
          address2: data.address2 ?? "",
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country,
          serviceLevelCode: shipping.serviceLevelCode ?? "",
        },
        note: data.note || null,
        paymentMethod: payfastConfigured() ? "payfast" : "manual",
        items: {
          create: await Promise.all(
            lines.map(async (line) => {
              const product = await prisma.product.findUnique({
                where: { handle: line.productHandle },
                include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
              });
              const variant = product?.variants.find(
                (v) => String(v.position) === line.variantKey,
              );
              return {
                productId: product?.id,
                variantId: variant?.id,
                title: line.product.title,
                variantTitle: line.variant.title,
                quantity: line.quantity,
                priceCents: line.variant.priceCents,
                image: product?.images[0]?.src,
              };
            }),
          ),
        },
      },
      select: { id: true, number: true },
    });
  } catch {
    return { status: "error", message: "We couldn't place your order. Please try again." };
  }

  await writeCartLines([]);
  if (payfastConfigured()) {
    redirect(`/checkout/pay/${order.id}`);
  }
  redirect(`/checkout/confirmation?order=${order.number}`);
}
