// Native <details> accordion — zero JS, accessible by default.
export function Accordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-paper">
      {items.map((item) => (
        <details key={item.question} className="group px-5 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden
              className="text-xl leading-none text-clay transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-5 leading-relaxed text-ink-soft">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
