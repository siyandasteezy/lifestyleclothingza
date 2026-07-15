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
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-paper">
        {image ? (
          <>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-700 ease-(--ease-lux) group-hover:scale-[1.03]"
            />
            {hoverImage && (
              <Image
                src={hoverImage.src}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover opacity-0 transition duration-700 ease-(--ease-lux) group-hover:scale-[1.03] group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-stone">No image</div>
        )}
        {soldOut && (
          <span className="absolute top-3 left-3 bg-ink/85 px-3 py-1 font-display text-[10px] tracking-[0.18em] text-bone uppercase">
            Sold out
          </span>
        )}
      </div>
      <div className="pt-3 pb-1 text-center">
        <h3 className="text-sm text-ink group-hover:text-clay sm:text-[15px]">{product.title}</h3>
        <Price
          cents={product.minPriceCents}
          maxCents={product.maxPriceCents}
          className="mt-1 justify-center text-[13px] font-light text-ink-soft tabular-nums"
        />
      </div>
    </Link>
  );
}
