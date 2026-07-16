"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, dbConfigured, destroySession, verifyCredentials } from "@/lib/auth";

export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!dbConfigured()) {
    return {
      status: "error",
      message: "The store database isn't connected yet — admin is unavailable on this deployment.",
    };
  }
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: "Enter your email and password." };

  let user;
  try {
    user = await verifyCredentials(parsed.data.email, parsed.data.password);
  } catch {
    return { status: "error", message: "Couldn't reach the store database. Try again shortly." };
  }
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
