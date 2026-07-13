import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl text-clay">404</p>
      <h1 className="mt-4 font-display text-2xl">Page not found</h1>
      <p className="mt-2 max-w-md text-stone">
        The page you’re looking for has moved or no longer exists.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm font-semibold text-bone transition hover:bg-clay"
      >
        Back to home
      </Link>
    </div>
  );
}
