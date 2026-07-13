"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

export interface ContactState {
  status: "idle" | "success" | "error";
  message?: string;
}

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  message: z.string().min(5).max(5000),
});

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fill in all fields with valid values." };
  }
  try {
    // Stored under Setting as a lightweight inbox; surfaced in the admin dashboard.
    await prisma.setting.upsert({
      where: { key: `contact:${Date.now()}` },
      create: {
        key: `contact:${Date.now()}`,
        value: { ...parsed.data, receivedAt: new Date().toISOString() },
      },
      update: {},
    });
    return { status: "success" };
  } catch {
    return { status: "error", message: "Something went wrong. Please email us directly." };
  }
}
