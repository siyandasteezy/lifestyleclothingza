import { AdminHeading } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getStoreSettings } from "@/lib/settings";
import { courierGuyConfigured } from "@/lib/shipping/courier-guy";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const settings = await getStoreSettings();
  return (
    <>
      <AdminHeading title="Settings" />
      <SettingsForm settings={settings} courierConfigured={courierGuyConfigured()} />
    </>
  );
}
