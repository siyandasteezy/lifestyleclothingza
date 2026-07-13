"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { site } from "@/lib/site";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    <form action={formAction} className="mt-5">
      <div className="flex overflow-hidden rounded-full border border-bone/30 focus-within:border-bone">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          placeholder={site.newsletter.placeholder}
          className="w-full bg-transparent px-5 py-3 text-sm text-bone placeholder:text-bone/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 bg-bone px-5 text-sm font-semibold text-ink transition hover:bg-clay hover:text-bone disabled:opacity-60"
        >
          {pending ? "…" : "Sign up"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state.status === "success" && <span className="text-bone">Thanks — you’re on the list!</span>}
        {state.status === "error" && <span className="text-red-300">{state.message}</span>}
      </p>
    </form>
  );
}
