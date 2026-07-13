import { cn } from "@/lib/cn";
import { Container } from "./Container";

interface SectionProps {
  eyebrow?: string;
  heading?: string;
  headingClassName?: string;
  align?: "left" | "center";
  tone?: "bone" | "paper" | "ink";
  className?: string;
  children: React.ReactNode;
  /** Heading level for the section title (defaults to h2) */
  as?: "h1" | "h2";
}

const tones = {
  bone: "bg-bone text-ink",
  paper: "bg-paper text-ink",
  ink: "bg-ink text-bone",
};

export function Section({
  eyebrow,
  heading,
  headingClassName,
  align = "left",
  tone = "bone",
  className,
  children,
  as: Heading = "h2",
}: SectionProps) {
  return (
    <section className={cn("py-(--spacing-section)", tones[tone], className)}>
      <Container>
        {(eyebrow || heading) && (
          <header className={cn("mb-10 max-w-3xl md:mb-14", align === "center" && "mx-auto text-center")}>
            {eyebrow && (
              <p className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase text-clay">
                {eyebrow}
              </p>
            )}
            {heading && (
              <Heading
                className={cn(
                  "font-display text-display-md leading-[1.1] text-balance",
                  headingClassName,
                )}
              >
                {heading}
              </Heading>
            )}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
