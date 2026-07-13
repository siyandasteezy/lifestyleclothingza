import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bone px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-paper p-8 shadow-card">
        <h1 className="font-display text-2xl font-bold">Store admin</h1>
        <p className="mt-1 text-sm text-stone">Sign in to manage your store.</p>
        <LoginForm />
      </div>
    </div>
  );
}
