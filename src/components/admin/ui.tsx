import { cn } from "@/lib/cn";

export const adminInput =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

export function AdminHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

export function AdminCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-paper p-5", className)}>{children}</div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
    </label>
  );
}

const badgeTones: Record<string, string> = {
  ACTIVE: "bg-moss/15 text-moss",
  PUBLISHED: "bg-moss/15 text-moss",
  PAID: "bg-moss/15 text-moss",
  FULFILLED: "bg-ink/10 text-ink",
  PENDING: "bg-gold/15 text-gold",
  DRAFT: "bg-stone/15 text-stone",
  ARCHIVED: "bg-stone/15 text-stone",
  CANCELLED: "bg-clay/15 text-clay",
  REFUNDED: "bg-clay/15 text-clay",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[status] ?? "bg-stone/15 text-stone",
      )}
    >
      {status}
    </span>
  );
}

export function SaveButton({ pending, label = "Save" }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-full bg-ink px-7 text-sm font-semibold text-bone transition hover:bg-clay disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}
