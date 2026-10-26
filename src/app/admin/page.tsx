import { and, eq, ne, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { db } from "@/db";
import { accounts, orders, stalls } from "@/db/schema";
import { Badge, Button, Card, Field, TopBar, field } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import {
  createStall,
  deleteStall,
  resetStallPassword,
  setStallOpen,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { dayJst, yen } from "@/lib/format";
import { fill } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getDict();
  const { error, saved } = await searchParams;

  const stallRows = await db
    .select({
      stall: stalls,
      username: accounts.username,
    })
    .from(stalls)
    .leftJoin(accounts, eq(accounts.stallId, stalls.id))
    .orderBy(stalls.displayName);

  const today = dayJst();
  const salesRows = await db
    .select({
      stallId: orders.stallId,
      orderCount: sql<number>`count(distinct ${orders.number})::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalYen}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.day, today), ne(orders.status, "cancelled")))
    .groupBy(orders.stallId);

  const salesByStall = new Map(salesRows.map((row) => [row.stallId, row]));
  const totals = salesRows.reduce(
    (sum, row) => ({
      orders: sum.orders + row.orderCount,
      revenue: sum.revenue + row.revenue,
    }),
    { orders: 0, revenue: 0 },
  );

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const qrs = await Promise.all(
    stallRows.map(({ stall }) =>
      QRCode.toString(`${appUrl}/s/${stall.slug}`, {
        type: "svg",
        margin: 1,
        width: 200,
        color: { dark: "#1c1917", light: "#ffffff" },
      }),
    ),
  );

  const errorMessage = error
    ? (t.admin.errors as Record<string, string>)[error] ?? t.admin.errors.generic
    : null;

  const savedMessage =
    saved === "password"
      ? t.admin.savedPassword
      : saved === "deleted"
        ? t.admin.savedDeleted
        : saved
          ? t.admin.saved
          : null;

  return (
    <>
      <TopBar
        title={t.admin.title}
        subtitle={t.admin.subtitle}
        right={
          <div className="flex items-center gap-1">
            <LocaleSwitcher
              current={locale}
              other={t.locale.other}
              label={t.locale.label}
            />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                {t.nav.signOut}
              </Button>
            </form>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-5">
        {errorMessage ? (
          <p className="rounded-lg bg-[#f9e7e2] px-4 py-3 text-sm text-[#8f2a20]">
            {errorMessage}
          </p>
        ) : null}
        {savedMessage ? (
          <p className="rounded-lg bg-[#eef4f4] px-4 py-3 text-sm text-[#15505e]">
            {savedMessage}
          </p>
        ) : null}

        <Card className="p-4">
          <h2 className="font-semibold">{t.admin.today}</h2>
          <p className="mt-1 text-sm text-[#856f58]">
            {fill(t.admin.jst, { day: today })}
          </p>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="text-2xl font-semibold">{totals.orders}</p>
              <p className="text-xs tracking-wide text-[#856f58] uppercase">
                {t.admin.orders}
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{yen(totals.revenue)}</p>
              <p className="text-xs tracking-wide text-[#856f58] uppercase">
                {t.admin.takings}
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{stallRows.length}</p>
              <p className="text-xs tracking-wide text-[#856f58] uppercase">
                {t.admin.stallCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">{t.admin.addStall}</h2>
          <form action={createStall} className="grid gap-3 sm:grid-cols-2">
            <Field label={t.admin.stallName}>
              <input name="displayName" className={field} required maxLength={80} />
            </Field>
            <Field label={t.admin.slug} hint={t.admin.slugHint}>
              <input
                name="slug"
                className={field}
                required
                placeholder="takoyaki"
                pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
              />
            </Field>
            <Field label={t.admin.username} hint={t.admin.usernameHint}>
              <input
                name="username"
                className={field}
                required
                autoCapitalize="none"
                placeholder="takoyaki"
              />
            </Field>
            <Field label={t.admin.password} hint={t.admin.passwordHint}>
              <input
                name="password"
                type="text"
                className={field}
                required
                minLength={8}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">{t.admin.createStall}</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-[#856f58] uppercase">
            {t.admin.sectionStalls}
          </h2>

          {stallRows.length === 0 ? (
            <p className="text-sm text-[#856f58]">{t.admin.noStalls}</p>
          ) : null}

          {stallRows.map(({ stall, username }, index) => {
            const sales = salesByStall.get(stall.id);

            return (
              <Card key={stall.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{stall.displayName}</h3>
                      {stall.isOpen ? (
                        <Badge tone="ok">{t.common.open}</Badge>
                      ) : (
                        <Badge>{t.common.closed}</Badge>
                      )}
                      {stall.salePct > 0 ? (
                        <Badge tone="warn">
                          {fill(t.manage.pctOff, { pct: stall.salePct })}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-[#856f58]">
                      {username ?? t.admin.noAccount} ·{" "}
                      <a
                        href={`/s/${stall.slug}`}
                        className="underline underline-offset-2"
                      >
                        /s/{stall.slug}
                      </a>
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <p className="font-semibold">{yen(sales?.revenue ?? 0)}</p>
                    <p className="text-[#856f58]">
                      {fill(t.admin.ordersToday, { n: sales?.orderCount ?? 0 })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={setStallOpen}>
                    <input type="hidden" name="stallId" value={stall.id} />
                    <input
                      type="hidden"
                      name="isOpen"
                      value={stall.isOpen ? "0" : "1"}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {stall.isOpen ? t.manage.closeStall : t.manage.openStall}
                    </Button>
                  </form>

                  <details className="rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-[#614b37] hover:bg-[#f4ecdd]">
                      {t.admin.qr}
                    </summary>
                    <div
                      className="mt-2 inline-block rounded-lg bg-white p-2 ring-1 ring-[#e7dcc7] [&_svg]:h-40 [&_svg]:w-40"
                      dangerouslySetInnerHTML={{ __html: qrs[index] }}
                    />
                  </details>

                  <details className="rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-[#614b37] hover:bg-[#f4ecdd]">
                      {t.admin.resetPassword}
                    </summary>
                    <form
                      action={resetStallPassword}
                      className="mt-2 flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="stallId" value={stall.id} />
                      <input
                        name="password"
                        type="text"
                        minLength={8}
                        required
                        placeholder={t.admin.newPassword}
                        className={`${field} h-10 w-48 py-1`}
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        {t.admin.reset}
                      </Button>
                    </form>
                  </details>

                  <details className="ml-auto rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-[#b3261e] hover:bg-[#f9e7e2]">
                      {t.admin.delete}
                    </summary>
                    <form action={deleteStall} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="stallId" value={stall.id} />
                      <span className="text-sm text-[#856f58]">
                        {t.admin.deleteHelp}
                      </span>
                      <Button type="submit" variant="danger" size="sm">
                        {t.admin.confirmDelete}
                      </Button>
                    </form>
                  </details>
                </div>
              </Card>
            );
          })}
        </section>
      </main>
    </>
  );
}
