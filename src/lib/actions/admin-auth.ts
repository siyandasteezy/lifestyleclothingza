"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";

export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: "Enter your email and password." };

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    // Uniform message — do not reveal whether the email exists.
    return { status: "error", message: "Incorrect email or password." };
  }
  await createSession(user.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
