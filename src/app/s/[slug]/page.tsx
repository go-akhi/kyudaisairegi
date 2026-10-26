import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge, Card } from "@/components/ui";
import { unitSalePrice, yen } from "@/lib/format";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
import { getMenu, getStallBySlug } from "@/lib/stalls";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stall = await getStallBySlug(slug);
  if (!stall) return {};
  return {
    title: `${stall.displayName} — Q-Regi`,
    description: stall.description || undefined,
  };
}

function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M13.5 8h-11m4.5-4.5L2.5 8 7 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function StallMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ locale, t }, stall] = await Promise.all([
    getDict(),
    getStallBySlug(slug),
  ]);
  if (!stall) notFound();

  const { categories, uncategorised } = await getMenu(stall.id, {
    availableOnly: true,
  });

  const sections = [
    ...categories.filter((category) => category.items.length > 0),
    ...(uncategorised.length > 0
      ? [{ id: "other", name: t.manage.noCategory, items: uncategorised }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-festival-cream text-festival-ink">
      <header className="sticky top-0 z-40 border-b border-festival-line bg-festival-cream/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/stalls"
            className="flex items-center gap-1.5 text-sm font-medium text-festival-ink-soft transition-colors hover:text-festival-red"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.menu.backToStalls}
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

      <main className="mx-auto w-full max-w-3xl flex-1">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-festival-sand sm:aspect-[21/9]">
          {stall.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/media/${stall.heroImage}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f4ecdd] via-[#fbf6ea] to-[#f6e3dc] text-6xl">
              🏮
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#402000]/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 -mt-10 px-4 sm:px-5">
          <Card className="p-5 shadow-[0_24px_60px_-40px_rgba(64,32,0,0.5)]">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stall.displayName}
              </h1>
              {stall.isOpen ? (
                <Badge tone="ok">{t.common.open}</Badge>
              ) : (
                <Badge>{t.common.closed}</Badge>
              )}
            </div>
            {stall.locationNote ? (
              <p className="mt-1 text-sm text-festival-muted">
                {stall.locationNote}
              </p>
            ) : null}
            {stall.description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-festival-ink-soft">
                {stall.description}
              </p>
            ) : null}
          </Card>
        </div>

        {stall.salePct > 0 ? (
          <div className="mx-4 mt-4 rounded-lg bg-festival-gold px-4 py-3.5 text-center sm:mx-5">
            <p className="text-lg font-semibold">
              {fill(t.menu.saleBanner, { pct: stall.salePct })}
            </p>
            <p className="mt-0.5 text-xs text-[#7a5300]">{t.menu.saleNote}</p>
          </div>
        ) : null}

        {!stall.isOpen ? (
          <div className="mx-4 mt-4 rounded-lg bg-festival-sand px-4 py-3 text-center text-sm text-festival-ink-soft sm:mx-5">
            {t.menu.closedNow}
          </div>
        ) : null}

        {sections.length > 1 ? (
          <nav className="sticky top-14 z-20 mt-4 border-y border-festival-line bg-festival-cream/95 px-4 py-2 backdrop-blur sm:px-5">
            <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#cat-${section.id}`}
                    className="inline-block rounded-[3px] bg-festival-sand px-3 py-1.5 text-xs font-medium whitespace-nowrap text-festival-ink-soft transition-colors hover:bg-festival-gold/60 hover:text-festival-ink"
                  >
                    {section.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-6 space-y-9 px-4 pb-14 sm:px-5">
          {sections.length === 0 ? (
            <p className="py-12 text-center text-sm text-festival-muted">
              {t.menu.menuNotUp}
            </p>
          ) : null}

          {sections.map((section) => (
            <section
              key={section.id}
              id={`cat-${section.id}`}
              className="scroll-mt-32"
            >
              <h2 className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-festival-muted uppercase">
                {section.name}
              </h2>

              <ul className="grid gap-3 sm:grid-cols-2">
                {section.items.map((item) => {
                  const salePrice = unitSalePrice(item.priceYen, stall.salePct);
                  const onSale = salePrice < item.priceYen;

                  return (
                    <li key={item.id}>
                      <Card className="flex h-full gap-3 p-3">
                        {item.imagePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/media/${item.imagePath}`}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-md object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="leading-snug font-semibold">{item.name}</p>
                          {item.description ? (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-festival-muted">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="mt-2 flex items-baseline gap-2">
                            <span className="text-base font-semibold whitespace-nowrap">
                              {yen(salePrice)}
                            </span>
                            {onSale ? (
                              <span className="text-xs whitespace-nowrap text-festival-muted line-through">
                                {yen(item.priceYen)}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-festival-line px-5 py-8 text-center">
        <p className="text-sm text-festival-ink-soft">{t.menu.orderAtCounter}</p>
        <p className="mt-3 text-[10px] font-semibold tracking-[0.2em] text-festival-muted uppercase">
          {t.landing.brand}
        </p>
      </footer>
    </div>
  );
}
