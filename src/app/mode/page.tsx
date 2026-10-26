import { redirect } from "next/navigation";
import { chooseMode, logout } from "@/lib/actions/auth";
import { requireStall } from "@/lib/auth";
import { getDevice } from "@/lib/device";
import { Button, Card, Field, field } from "@/components/ui";

export default async function ModePage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const account = await requireStall();
  const device = await getDevice();
  const { switch: switching } = await searchParams;

  // A device keeps its mode until someone deliberately changes it.
  if (device.mode && !switching) {
    redirect(device.mode === "front" ? "/counter" : "/queue");
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-orange-700 uppercase">
          {account.username}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          What is this device?
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Pick once. The device remembers until someone changes it.
        </p>
      </div>

      <form action={chooseMode} className="space-y-4">
        <Field label="Device name" hint="Shown on tickets, e.g. Front 2.">
          <input
            name="label"
            defaultValue={device.label}
            placeholder={device.mode === "back" ? "Back 1" : "Front 1"}
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
            <span className="mt-2 block text-lg font-semibold">Storefront</span>
            <span className="mt-1 block text-sm text-stone-500">
              Take orders, hand them over, manage the menu and the sale.
            </span>
          </button>

          <button
            type="submit"
            name="mode"
            value="back"
            className="group rounded-2xl bg-white p-5 text-left ring-1 ring-stone-200 transition hover:ring-stone-900"
          >
            <span className="block text-2xl">🔥</span>
            <span className="mt-2 block text-lg font-semibold">Back of store</span>
            <span className="mt-1 block text-sm text-stone-500">
              Watch the queue and mark orders ready for the front.
            </span>
          </button>
        </div>
      </form>

      <Card className="mt-8 flex items-center justify-between p-4">
        <span className="text-sm text-stone-500">Signed in as {account.username}</span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
