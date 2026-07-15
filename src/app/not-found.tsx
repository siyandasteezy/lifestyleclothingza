import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] items-center gap-10 px-4 py-16 sm:px-6 lg:mx-auto lg:max-w-[100rem] lg:grid-cols-2 lg:px-10">
      <div>
        <p className="folio text-2xl text-stone">404</p>
        <h1 className="mt-4 font-display text-display-lg leading-[1.05] uppercase">
          Page not found
        </h1>
        <p className="mt-4 max-w-md font-light text-ink-soft">
          The page you’re looking for has moved or no longer exists.
        </p>
        <Link
          href="/"
          className="group/tx mt-10 inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-ink uppercase"
        >
          <span className="border-b border-current pb-1">Back to home</span>
          <span
            aria-hidden
            className="inline-block transition-transform duration-350 ease-(--ease-lux) group-hover/tx:translate-x-1.5"
          >
            →
          </span>
        </Link>
      </div>
      <div className="relative hidden aspect-3/4 max-h-[60vh] overflow-hidden lg:block">
        <Image src="/images/home/IMG_1845.jpg" alt="" fill sizes="50vw" className="object-cover" />
      </div>
    </div>
  );
}
