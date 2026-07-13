import Image from "next/image";
import { prisma } from "@/lib/db";
import { deleteMedia } from "@/lib/actions/admin";
import { AdminCard, AdminHeading } from "@/components/admin/ui";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export const dynamic = "force-dynamic";

export default async function AdminMedia() {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AdminHeading title="Media" />
      <AdminCard className="mb-6">
        <MediaUploadForm />
      </AdminCard>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {assets.map((asset) => (
          <li key={asset.id} className="group overflow-hidden rounded-card border border-line bg-paper">
            <div className="relative aspect-square bg-bone">
              <Image
                src={asset.path}
                alt={asset.alt}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover"
              />
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs text-stone" title={asset.path}>
                {asset.path.split("/").pop()}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-stone">
                  {asset.bytes ? `${Math.round(asset.bytes / 1024)} KB` : ""}
                </span>
                <form action={deleteMedia}>
                  <input type="hidden" name="id" value={asset.id} />
                  <button type="submit" className="text-[11px] text-clay hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
