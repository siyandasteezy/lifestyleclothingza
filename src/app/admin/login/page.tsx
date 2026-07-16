import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dbConfigured, getAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bone px-4">
      <div className="w-full max-w-sm border border-line bg-paper p-8">
        <h1 className="font-display text-2xl">Store admin</h1>
        {dbConfigured() ? (
          <>
            <p className="mt-1 text-sm text-stone">Sign in to manage your store.</p>
            <LoginForm />
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The store database isn’t connected on this deployment yet, so the admin is
            unavailable. Connect a PostgreSQL database (set <code>DATABASE_URL</code>), seed it,
            and redeploy — see the README’s deployment section.
          </p>
        )}
      </div>
    </div>
  );
}
