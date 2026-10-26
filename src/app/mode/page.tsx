import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button, Card, Field, field } from "@/components/ui";
import { chooseMode, logout } from "@/lib/actions/auth";
import { requireStall } from "@/lib/auth";
import { getDevice } from "@/lib/device";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
import { redirect } from "next/navigation";

export default async function ModePage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const account = await requireStall();
  const device = await getDevice();
  const { locale, t } = await getDict();
  const { switch: switching } = await searchParams;

  // A device keeps its mode until someone deliberately changes it.
  if (device.mode && !switching) {
    redirect(device.mode === "front" ? "/counter" : "/queue");
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-widest text-orange-700 uppercase">
            {account.username}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.mode.title}</h1>
          <p className="mt-1 text-sm text-stone-500">{t.mode.subtitle}</p>
        </div>
        <LocaleSwitcher
          current={locale}
          other={t.locale.other}
          label={t.locale.label}
        />
      </div>

      <form action={chooseMode} className="space-y-4">
        <Field label={t.mode.deviceName} hint={t.mode.deviceHint}>
          <input
            name="label"
            defaultValue={device.label}
            placeholder={device.mode === "back" ? "厨房1" : "レジ1"}
            className={field}
            maxLength={40}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="submit"
            name="mode"
            value="front"
            className="group rounded-2xl bg-white p-5 text-left ring-1 ring-stone-200 transition hover:ring-stone-900"
          >
            <span className="block text-2xl">🧾</span>
            <span className="mt-2 block text-lg font-semibold">{t.mode.front}</span>
            <span className="mt-1 block text-sm text-stone-500">
              {t.mode.frontDesc}
            </span>
          </button>

          <button
            type="submit"
            name="mode"
            value="back"
            className="group rounded-2xl bg-white p-5 text-left ring-1 ring-stone-200 transition hover:ring-stone-900"
          >
            <span className="block text-2xl">🔥</span>
            <span className="mt-2 block text-lg font-semibold">{t.mode.back}</span>
            <span className="mt-1 block text-sm text-stone-500">
              {t.mode.backDesc}
            </span>
          </button>
        </div>
      </form>

      <Card className="mt-8 flex items-center justify-between p-4">
        <span className="text-sm text-stone-500">
          {fill(t.mode.signedInAs, { name: account.username })}
        </span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            {t.nav.signOut}
          </Button>
        </form>
      </Card>
    </main>
  );
}
