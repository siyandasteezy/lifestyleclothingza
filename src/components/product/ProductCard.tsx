import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ui/Price";
import type { ProductVM } from "@/lib/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductVM;
  priority?: boolean;
}) {
  const [image, hoverImage] = product.images;
  const soldOut = !product.variants.some((v) => v.available);
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group block rounded-card focus-visible:outline-2"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-card bg-paper">
        {image ? (
          <>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            {hoverImage && (
              <Image
                src={hoverImage.src}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover opacity-0 transition duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-stone">No image</div>
        )}
        {soldOut && (
          <span className="absolute top-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-medium tracking-wide text-bone">
            Sold out
          </span>
        )}
      </div>
      <div className="pt-3 pb-1 text-center">
        <h3 className="text-sm font-normal text-ink group-hover:text-clay sm:text-base">
          {product.title}
        </h3>
        <Price
          cents={product.minPriceCents}
          maxCents={product.maxPriceCents}
          className="mt-1 justify-center text-sm font-light text-ink-soft"
        />
      </div>
    </Link>
  );
}
