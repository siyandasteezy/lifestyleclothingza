"use client";

import { useEffect, useRef } from "react";

/** Auto-submits the signed PayFast form; the button is the no-JS/manual fallback. */
export function PayfastRedirect({
  action,
  fields,
}: {
  action: string;
  fields: [string, string][];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    const t = setTimeout(() => formRef.current?.submit(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <form ref={formRef} action={action} method="post" className="mt-8">
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="h-13 rounded-(--radius-card) bg-ink px-9 text-sm tracking-[0.08em] uppercase text-bone transition hover:bg-clay"
      >
        Pay with PayFast
      </button>
    </form>
  );
}
