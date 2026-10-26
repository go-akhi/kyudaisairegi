import { listStalls } from "@/lib/stalls";
import { Badge, Card, Empty } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FestivalPage() {
  const stalls = await listStalls();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-orange-700 uppercase">
          Festival
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Stalls</h1>
        <p className="mt-1 text-sm text-stone-500">
          Browse the menu. Order and pay in cash at the counter.
        </p>
      </header>

      {stalls.length === 0 ? (
        <Empty>No stalls yet.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {stalls.map((stall) => (
            <li key={stall.id}>
              <Link href={`/s/${stall.slug}`} className="group block">
                <Card className="overflow-hidden transition group-hover:ring-stone-400">
                  <div className="aspect-[16/9] bg-stone-100">
                    {stall.heroImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/media/${stall.heroImage}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🏮
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {stall.displayName}
                      </h2>
                      {stall.isOpen ? (
                        <Badge tone="ok">Open</Badge>
                      ) : (
                        <Badge>Closed</Badge>
                      )}
                    </div>
                    {stall.locationNote ? (
                      <p className="mt-1 text-sm text-stone-500">{stall.locationNote}</p>
                    ) : null}
                    {stall.salePct > 0 ? (
                      <p className="mt-2 text-sm font-semibold text-orange-700">
                        {stall.salePct}% off everything
                      </p>
                    ) : null}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-xs text-stone-400">
        Staff? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
