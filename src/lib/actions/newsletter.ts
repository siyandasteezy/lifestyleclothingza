"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

export interface NewsletterState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.toLowerCase() },
      create: { email: parsed.data.toLowerCase() },
      update: {},
    });
    return { status: "success" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
