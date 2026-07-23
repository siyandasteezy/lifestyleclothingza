import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/admin-auth";

const nav = [
  { label: "Overview", href: "/admin" },
  { label: "Homepage", href: "/admin/homepage" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Pages", href: "/admin/pages" },
  { label: "Media", href: "/admin/media" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh bg-bone">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper md:flex">
        <div className="border-b border-line p-5">
          <p className="font-display text-lg font-bold">Lifestyle Admin</p>
          <p className="mt-0.5 truncate text-xs text-stone">{admin.email}</p>
        </div>
        <nav className="flex-1 p-3" aria-label="Admin">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-bone hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bone hover:text-ink"
          >
            ← View storefront
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-clay hover:bg-bone"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 overflow-x-auto border-b border-line bg-paper px-4 py-3 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium whitespace-nowrap text-ink-soft">
              {item.label}
            </Link>
          ))}
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
