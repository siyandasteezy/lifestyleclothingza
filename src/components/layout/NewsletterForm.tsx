"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { site } from "@/lib/site";

const initialState: NewsletterState = { status: "idle" };

/** Giant underline field — light surfaces only. */
export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md">
      <div className="flex items-end gap-4 border-b border-ink/40 focus-within:border-clay">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          placeholder={site.newsletter.placeholder}
          className="w-full bg-transparent py-3 text-base text-ink placeholder:font-light placeholder:text-stone focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 pb-3 font-display text-[11px] tracking-[0.2em] uppercase text-ink transition hover:text-clay disabled:opacity-60"
        >
          {pending ? "…" : "Sign up"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state.status === "success" && <span className="text-moss">Thanks — you’re on the list.</span>}
        {state.status === "error" && <span className="text-clay">{state.message}</span>}
      </p>
    </form>
  );
}
