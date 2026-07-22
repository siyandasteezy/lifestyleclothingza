import { AdminHeading } from "@/components/admin/ui";
import { HomepageEditForm } from "@/components/admin/HomepageEditForm";
import { getHomepage } from "@/lib/homepage";

export const dynamic = "force-dynamic";

export default async function AdminHomepage() {
  const config = await getHomepage();
  return (
    <>
      <AdminHeading title="Homepage" />
      <p className="mb-6 max-w-2xl text-sm text-stone">
        Edit the text, buttons, and images across your homepage. Changes go live as soon as you
        save. Use “Reset to original” to undo everything.
      </p>
      <HomepageEditForm config={config} />
    </>
  );
}
