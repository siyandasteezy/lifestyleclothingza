"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/admin-auth";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm focus:border-ink focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm focus:border-ink focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-bone transition hover:bg-clay disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-clay">
        {state.status === "error" && state.message}
      </p>
    </form>
  );
}
