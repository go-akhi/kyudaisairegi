import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { TopBar } from "@/components/ui";
import { requireStall } from "@/lib/auth";
import { requireMode } from "@/lib/device";
import { getDict } from "@/lib/i18n/locale";
import { getMenu, getStallById } from "@/lib/stalls";
import { CounterScreen } from "./counter-screen";

export default async function CounterPage() {
  const account = await requireStall();
  const device = await requireMode("front");
  const { locale, t } = await getDict();
  const stall = await getStallById(account.stallId);
  if (!stall) notFound();

  const { categories, uncategorised } = await getMenu(stall.id, {
    availableOnly: true,
  });

  return (
    <>
      <TopBar
        title={stall.displayName}
        subtitle={`${device.label} · ${t.mode.front}`}
        right={<StaffNav mode="front" />}
      />
      <CounterScreen
        categories={categories}
        uncategorised={uncategorised}
        salePct={stall.salePct}
        locale={locale}
        t={t}
      />
    </>
  );
}
