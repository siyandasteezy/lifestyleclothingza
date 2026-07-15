import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "inverse" | "outline" | "text";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display tracking-[0.2em] uppercase transition-colors duration-350 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Primary inverts to outline on hover — no color swap, ink is the brand's black
  primary: "border border-ink bg-ink text-bone hover:bg-transparent hover:text-ink",
  inverse: "border border-bone bg-bone text-ink hover:bg-transparent hover:text-bone",
  outline: "border border-ink/30 text-ink hover:border-ink",
  text: "group/tx relative text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-8 text-[11px]",
  lg: "h-14 px-10 text-xs",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

function textUnderline(children: React.ReactNode) {
  return (
    <>
      <span className="border-b border-current pb-1">{children}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-350 ease-(--ease-lux) group-hover/tx:translate-x-1.5"
      >
        →
      </span>
    </>
  );
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
    <Link
      href={href}
      className={cn(base, variants[variant], variant !== "text" && sizes[size], className)}
      {...rest}
    >
      {variant === "text" ? textUnderline(children) : children}
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
    <button
      className={cn(base, variants[variant], variant !== "text" && sizes[size], className)}
      {...rest}
    >
      {variant === "text" ? textUnderline(children) : children}
    </button>
  );
}
