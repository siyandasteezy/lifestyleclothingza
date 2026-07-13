import { cn } from "@/lib/cn";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}
