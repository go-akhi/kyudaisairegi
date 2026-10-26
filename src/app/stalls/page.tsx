import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge, Card } from "@/components/ui";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
import { listStalls } from "@/lib/stalls";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getDict();
  return {
    title: `${t.festival.title} — ${t.landing.brand}`,
    description: t.festival.subtitle,
  };
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 8h11m-4.5-4.5L13.5 8 9 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function StallsPage() {
  const [{ locale, t }, stalls] = await Promise.all([getDict(), listStalls()]);
  const openCount = stalls.filter((stall) => stall.isOpen).length;

  return (
    <div className="flex min-h-screen flex-col bg-festival-cream text-festival-ink">
      <header className="sticky top-0 z-40 border-b border-festival-line bg-festival-cream/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-tight transition-colors group-hover:text-festival-red">
              {t.landing.brand}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher
              current={locale}
              other={t.locale.other}
              label={t.locale.label}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-festival-line">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-44 -right-24 h-[460px] w-[460px] rounded-full bg-[#f6e3dc] opacity-70 blur-3xl" />
            <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-[#fdf6d8] opacity-70 blur-3xl" />
          </div>

          <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-end sm:justify-between lg:py-16">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-festival-red uppercase">
                {t.festival.eyebrow}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                {t.festival.title}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-festival-ink-soft">
                {t.festival.subtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div className="rounded-lg bg-festival-gold px-6 py-3 text-center">
                <p className="text-3xl leading-none font-semibold tabular-nums">
                  {openCount}
                </p>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[#6b4a00] uppercase">
                  {t.festival.openNow}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-10 lg:py-12">
          {stalls.length === 0 ? (
            <Card className="px-6 py-14 text-center text-sm text-festival-muted">
              {t.festival.noStalls}
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stalls.map((stall) => (
                <li key={stall.id}>
                  <Link href={`/s/${stall.slug}`} className="group block h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-lg bg-white ring-1 ring-festival-line transition-shadow hover:shadow-[0_24px_60px_-34px_rgba(64,32,0,0.45)]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-festival-sand">
                        {stall.heroImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/media/${stall.heroImage}`}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f4ecdd] via-[#fbf6ea] to-[#f6e3dc] text-5xl">
                            🏮
                          </div>
                        )}

                        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                          {stall.isOpen ? (
                            <Badge tone="ok">{t.common.open}</Badge>
                          ) : (
                            <Badge>{t.common.closed}</Badge>
                          )}
                          {stall.salePct > 0 ? (
                            <span className="rounded-md bg-festival-gold px-2 py-1 text-[11px] font-semibold text-[#402000]">
                              {fill(t.manage.pctOff, { pct: stall.salePct })}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-festival-red">
                          {stall.displayName}
                        </h2>
                        {stall.locationNote ? (
                          <p className="mt-1 text-sm text-festival-muted">
                            {stall.locationNote}
                          </p>
                        ) : null}
                        {stall.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-festival-ink-soft">
                            {stall.description}
                          </p>
                        ) : null}
                        <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-festival-red">
                          {t.festival.seeMenu}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-festival-line bg-festival-cream px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-7 w-7" />
              <span className="text-[15px] font-semibold tracking-tight">
                {t.landing.brand}
              </span>
            </div>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-festival-muted">
              {t.landing.footer.tagline}
            </p>
          </div>
          <div className="sm:text-right">
            <Link
              href="/login"
              className="text-sm font-medium text-festival-red hover:underline"
            >
              {t.festival.staff} {t.login.submit}
            </Link>
            <p className="mt-4 text-xs text-festival-muted">
              {t.landing.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
