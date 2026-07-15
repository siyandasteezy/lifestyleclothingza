import { cn } from "@/lib/cn";
import { ProductCard } from "./ProductCard";
import type { ProductVM } from "@/lib/types";

export function ProductGrid({
  products,
  priorityCount = 0,
  editorial = false,
}: {
  products: ProductVM[];
  priorityCount?: number;
  /** One double-width campaign cell per eight products (collection pages). */
  editorial?: boolean;
}) {
  if (products.length === 0) {
    return <p className="py-12 text-center text-stone">No products found.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <li
          key={product.handle}
          className={cn(editorial && products.length > 4 && i % 8 === 4 && "lg:col-span-2")}
        >
          <ProductCard product={product} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
