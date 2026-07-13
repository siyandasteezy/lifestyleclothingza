import { prisma } from "@/lib/db";
import { AdminCard, AdminHeading } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

interface ContactMessage {
  name: string;
  email: string;
  message: string;
  receivedAt: string;
}

export default async function AdminMessages() {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "contact:" } },
    orderBy: { key: "desc" },
  });
  const messages = rows.map((r) => r.value as unknown as ContactMessage);

  return (
    <>
      <AdminHeading title="Contact messages" />
      {messages.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-stone">No messages yet — contact form submissions appear here.</p>
        </AdminCard>
      ) : (
        <ul className="space-y-4">
          {messages.map((m, i) => (
            <li key={i}>
              <AdminCard>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {m.name}{" "}
                    <a href={`mailto:${m.email}`} className="font-normal text-clay hover:underline">
                      {m.email}
                    </a>
                  </p>
                  <time className="text-xs text-stone" dateTime={m.receivedAt}>
                    {new Date(m.receivedAt).toLocaleString("en-ZA")}
                  </time>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap text-ink-soft">{m.message}</p>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
