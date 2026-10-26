import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge, Card } from "@/components/ui";
import { unitSalePrice, yen } from "@/lib/format";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
import { getMenu, getStallBySlug } from "@/lib/stalls";

// Fresh enough for a sale or sold-out toggle, cached enough to survive a blip.
export const revalidate = 30;

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
    <main className="mx-auto w-full max-w-2xl flex-1 pb-16">
      <div className="relative aspect-[16/9] w-full bg-stone-200">
        {stall.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${stall.heroImage}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🏮</div>
        )}
        <Link
          href="/"
          className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-stone-900 backdrop-blur"
        >
          ← {t.menu.backToStalls}
        </Link>
        <div className="absolute top-2 right-2 rounded-full bg-white/90 backdrop-blur">
          <LocaleSwitcher
            current={locale}
            other={t.locale.other}
            label={t.locale.label}
          />
        </div>
      </div>

      <header className="relative z-10 -mt-8 px-5">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {stall.displayName}
            </h1>
            {stall.isOpen ? (
              <Badge tone="ok">{t.common.open}</Badge>
            ) : (
              <Badge>{t.common.closed}</Badge>
            )}
          </div>
          {stall.locationNote ? (
            <p className="mt-1 text-sm text-stone-500">{stall.locationNote}</p>
          ) : null}
          {stall.description ? (
            <p className="mt-3 text-[15px] leading-relaxed text-stone-700">
              {stall.description}
            </p>
          ) : null}
        </Card>
      </header>

      {stall.salePct > 0 ? (
        <div className="mx-5 mt-4 rounded-xl bg-orange-700 px-4 py-3 text-center text-white">
          <p className="text-lg font-semibold">
            {fill(t.menu.saleBanner, { pct: stall.salePct })}
          </p>
          <p className="text-xs text-orange-100">{t.menu.saleNote}</p>
        </div>
      ) : null}

      {!stall.isOpen ? (
        <div className="mx-5 mt-4 rounded-xl bg-stone-200 px-4 py-3 text-center text-sm text-stone-700">
          {t.menu.closedNow}
        </div>
      ) : null}

      <div className="mt-6 space-y-8 px-5">
        {sections.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">
            {t.menu.menuNotUp}
          </p>
        ) : null}

        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 text-xs font-semibold tracking-widest text-stone-500 uppercase">
              {section.name}
            </h2>
            <ul className="space-y-3">
              {section.items.map((item) => {
                const salePrice = unitSalePrice(item.priceYen, stall.salePct);
                const onSale = salePrice < item.priceYen;

                return (
                  <li key={item.id}>
                    <Card className="flex gap-4 p-3">
                      {item.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${item.imagePath}`}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.name}</p>
                        {item.description ? (
                          <p className="mt-0.5 text-sm leading-snug text-stone-500">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-1.5 flex items-baseline gap-2">
                          <span className="font-semibold">{yen(salePrice)}</span>
                          {onSale ? (
                            <span className="text-sm text-stone-400 line-through">
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

      <footer className="mt-10 px-5 text-center text-xs text-stone-400">
        {t.menu.orderAtCounter}
      </footer>
    </main>
  );
}
