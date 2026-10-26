import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge, Card, Empty } from "@/components/ui";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
import { listStalls } from "@/lib/stalls";

export const dynamic = "force-dynamic";

export default async function StallsPage() {
  const [{ locale, t }, stalls] = await Promise.all([getDict(), listStalls()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#e7dcc7] bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          <Link
            href="/"
            className="text-sm font-medium text-[#856f58] hover:text-[#402000]"
          >
            ← {t.landing.brand}
          </Link>
          <div className="ml-auto">
            <LocaleSwitcher
              current={locale}
              other={t.locale.other}
              label={t.locale.label}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <header className="mb-8">
          <p className="text-sm font-semibold tracking-widest text-[#993333] uppercase">
            {t.festival.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {t.festival.title}
          </h1>
          <p className="mt-1 text-sm text-[#856f58]">{t.festival.subtitle}</p>
        </header>

        {stalls.length === 0 ? (
          <Empty>{t.festival.noStalls}</Empty>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {stalls.map((stall) => (
              <li key={stall.id}>
                <Link href={`/s/${stall.slug}`} className="group block">
                  <Card className="overflow-hidden transition group-hover:ring-[#c7b299]">
                    <div className="aspect-[16/9] bg-[#f4ecdd]">
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
                          <Badge tone="ok">{t.common.open}</Badge>
                        ) : (
                          <Badge>{t.common.closed}</Badge>
                        )}
                      </div>
                      {stall.locationNote ? (
                        <p className="mt-1 text-sm text-[#856f58]">{stall.locationNote}</p>
                      ) : null}
                      {stall.salePct > 0 ? (
                        <p className="mt-2 text-sm font-semibold text-[#993333]">
                          {fill(t.menu.saleBanner, { pct: stall.salePct })}
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-xs text-[#a08a72]">
          {t.festival.staff}{" "}
          <Link href="/login" className="underline">
            {t.login.submit}
          </Link>
        </p>
      </main>
    </div>
  );
}
