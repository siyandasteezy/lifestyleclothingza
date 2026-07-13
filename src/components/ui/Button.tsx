import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "inverse" | "outline" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-normal tracking-[0.08em] uppercase transition-colors duration-200 rounded-(--radius-card) disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-bone hover:bg-clay",
  inverse: "bg-bone text-ink hover:bg-clay hover:text-bone",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-bone",
  ghost: "text-ink underline underline-offset-4 decoration-clay hover:text-clay",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-7 text-xs",
  lg: "h-13 px-9 text-sm",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & { href: string } & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
