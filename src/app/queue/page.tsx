import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { TopBar } from "@/components/ui";
import { requireStall } from "@/lib/auth";
import { requireMode } from "@/lib/device";
import { getDict } from "@/lib/i18n/locale";
import { getStallById } from "@/lib/stalls";
import { QueueBoard } from "./queue-board";

export default async function QueuePage() {
  const account = await requireStall();
  const device = await requireMode("back");
  const { locale, t } = await getDict();
  const stall = await getStallById(account.stallId);
  if (!stall) notFound();

  return (
    <>
      <TopBar
        title={stall.displayName}
        subtitle={`${device.label} · ${t.mode.back}`}
        right={<StaffNav mode="back" />}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <QueueBoard locale={locale} t={t} />
      </main>
    </>
  );
}
