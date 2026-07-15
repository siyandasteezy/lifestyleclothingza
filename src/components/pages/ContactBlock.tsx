"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/lib/actions/contact";

const initialState: ContactState = { status: "idle" };

const inputClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-[15px] text-ink placeholder:font-light placeholder:text-stone transition-colors focus:border-clay focus:outline-none";

/** Contact form replacing the old Shopify/hCaptcha embed. Messages land in the CMS. */
export function ContactBlock() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  if (state.status === "success") {
    return (
      <p className="mt-10 rounded-card border border-line bg-paper p-6 text-ink" role="status">
        ✓ Thanks for reaching out — we’ll get back to you soon.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-10 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input id="contact-name" name="name" required autoComplete="name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input id="contact-email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
          Message
        </label>
        <textarea id="contact-message" name="message" required rows={5} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-13 border border-ink bg-ink px-9 font-display text-[11px] tracking-[0.2em] uppercase text-bone transition-colors duration-350 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-clay">
        {state.status === "error" && state.message}
      </p>
    </form>
  );
}
