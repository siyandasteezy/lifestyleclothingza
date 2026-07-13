import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

interface PriceProps {
  cents: number;
  maxCents?: number;
  compareAtCents?: number | null;
  className?: string;
}

export function Price({ cents, maxCents, compareAtCents, className }: PriceProps) {
  const range = maxCents != null && maxCents !== cents;
  const onSale = compareAtCents != null && compareAtCents > cents;
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn(onSale && "text-clay")}>
        {range ? `From ${formatMoney(cents)}` : formatMoney(cents)}
      </span>
      {onSale && (
        <s className="text-sm text-stone" aria-label={`Regular price ${formatMoney(compareAtCents)}`}>
          {formatMoney(compareAtCents)}
        </s>
      )}
    </span>
  );
}
