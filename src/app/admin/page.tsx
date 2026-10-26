import { and, eq, ne, sql } from "drizzle-orm";
import QRCode from "qrcode";
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

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  name: "Give the stall a name.",
  slug: "The URL slug must be lowercase letters, numbers and dashes (3–40).",
  username: "Usernames are lowercase letters, numbers, dot, dash or underscore.",
  password: "Passwords must be at least 8 characters.",
  taken: "That slug or username is already taken.",
  missing: "That stall no longer exists.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
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
      orderCount: sql<number>`count(*)::int`,
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

  return (
    <>
      <TopBar
        title="Festival admin"
        subtitle="Stalls, accounts and today's numbers"
        right={
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        }
      />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-5">
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {ERRORS[error] ?? "Something went wrong."}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {saved === "password"
              ? "Password reset. All devices for that stall are signed out."
              : saved === "deleted"
                ? "Stall deleted."
                : "Saved."}
          </p>
        ) : null}

        <Card className="p-4">
          <h2 className="font-semibold">Today</h2>
          <p className="mt-1 text-sm text-stone-500">{today} · JST</p>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="text-2xl font-semibold">{totals.orders}</p>
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Orders
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{yen(totals.revenue)}</p>
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Takings
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{stallRows.length}</p>
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Stalls
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Add a stall</h2>
          <form action={createStall} className="grid gap-3 sm:grid-cols-2">
            <Field label="Stall name">
              <input name="displayName" className={field} required maxLength={80} />
            </Field>
            <Field label="URL slug" hint="Public menu: /s/this-value">
              <input
                name="slug"
                className={field}
                required
                placeholder="takoyaki"
                pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
              />
            </Field>
            <Field label="Username" hint="Shared by every device at the stall.">
              <input
                name="username"
                className={field}
                required
                autoCapitalize="none"
                placeholder="takoyaki"
              />
            </Field>
            <Field label="Password" hint="At least 8 characters. Only you can reset it.">
              <input
                name="password"
                type="text"
                className={field}
                required
                minLength={8}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Create stall</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-stone-500 uppercase">
            Stalls
          </h2>

          {stallRows.length === 0 ? (
            <p className="text-sm text-stone-500">No stalls yet.</p>
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
                        <Badge tone="ok">Open</Badge>
                      ) : (
                        <Badge>Closed</Badge>
                      )}
                      {stall.salePct > 0 ? (
                        <Badge tone="warn">{stall.salePct}% off</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {username ?? "no account"} ·{" "}
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
                    <p className="text-stone-500">
                      {sales?.orderCount ?? 0} orders today
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
                      {stall.isOpen ? "Close" : "Open"}
                    </Button>
                  </form>

                  <details className="rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium text-stone-700 hover:bg-stone-200/70">
                      QR
                    </summary>
                    <div
                      className="mt-2 inline-block rounded-xl bg-white p-2 ring-1 ring-stone-200 [&_svg]:h-40 [&_svg]:w-40"
                      dangerouslySetInnerHTML={{ __html: qrs[index] }}
                    />
                  </details>

                  <details className="rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium text-stone-700 hover:bg-stone-200/70">
                      Reset password
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
                        placeholder="New password"
                        className={`${field} h-10 w-48 py-1`}
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        Reset
                      </Button>
                    </form>
                  </details>

                  <details className="ml-auto rounded-lg">
                    <summary className="inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </summary>
                    <form action={deleteStall} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="stallId" value={stall.id} />
                      <span className="text-sm text-stone-500">
                        Deletes menu, orders and account.
                      </span>
                      <Button type="submit" variant="danger" size="sm">
                        Confirm delete
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
