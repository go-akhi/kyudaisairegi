"use client";

import { useMemo, useState, useTransition } from "react";
import useSWR from "swr";
import type { MenuCategory, MenuItem } from "@/lib/menu-types";
import type { CartLine } from "@/lib/actions/orders";
import { cancelOrder, completeOrder, createOrder } from "@/lib/actions/orders";
import type { QueueOrder, QueueResponse } from "@/lib/queue-types";
import { elapsedLabel, elapsedSeconds, unitSalePrice, yen } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n/dictionaries";
import { useNow } from "@/lib/use-now";
import { Badge, Button, Card, Empty, field } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  categories: MenuCategory[];
  uncategorised: MenuItem[];
  salePct: number;
  locale: Locale;
  t: Dict;
};

export function CounterScreen({ categories, uncategorised, salePct, locale, t }: Props) {
  const [tab, setTab] = useState<"order" | "ready">("order");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [placed, setPlaced] = useState<{ number: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { data, mutate } = useSWR<QueueResponse>("/api/queue", fetcher, {
    refreshInterval: 3000,
  });

  const sections = useMemo(
    () => [
      ...categories.filter((category) => category.items.length > 0),
      ...(uncategorised.length > 0
        ? [{ id: "other", name: t.manage.noCategory, items: uncategorised }]
        : []),
    ],
    [categories, uncategorised, t.manage.noCategory],
  );

  const itemById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const section of sections) {
      for (const item of section.items) map.set(item.id, item);
    }
    return map;
  }, [sections]);

  const lines = Object.entries(cart);
  const ready = (data?.orders ?? []).filter((order) => order.status === "ready");

  const unitPrice = (line: CartLine) => {
    const item = itemById.get(line.itemId);
    if (!item) return 0;
    return (
      item.priceYen +
      item.options
        .filter((option) => line.optionIds.includes(option.id))
        .reduce((sum, option) => sum + option.priceDeltaYen, 0)
    );
  };

  const lineTotal = (line: CartLine) => unitSalePrice(unitPrice(line), salePct) * line.qty;
  const total = lines.reduce((sum, [, line]) => sum + lineTotal(line), 0);
  const gross = lines.reduce((sum, [, line]) => sum + unitPrice(line) * line.qty, 0);

  function add(item: MenuItem, optionIds: string[]) {
    const key = `${item.id}|${[...optionIds].sort().join(",")}`;
    setCart((prev) => ({
      ...prev,
      [key]: {
        itemId: item.id,
        optionIds,
        qty: (prev[key]?.qty ?? 0) + 1,
      },
    }));
    setPlaced(null);
  }

  function bump(key: string, delta: number) {
    setCart((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const next = { ...prev };
      const qty = line.qty + delta;
      if (qty <= 0) delete next[key];
      else next[key] = { ...line, qty };
      return next;
    });
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createOrder({
        customerName: name,
        note,
        lines: Object.values(cart),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPlaced({ number: result.number, total });
      setCart({});
      setName("");
      setNote("");
      setExpanded(null);
      mutate();
    });
  }

  function handOver(orderId: string) {
    setBusyId(orderId);
    void completeOrder(orderId).finally(() => {
      setBusyId(null);
      mutate();
    });
  }

  function cancel(orderId: string, orderNumber: number) {
    const reason = window.prompt(
      fill(t.counter.cancelPrompt, { number: orderNumber }),
    );
    if (reason === null) return;
    setBusyId(orderId);
    void cancelOrder(orderId, reason).finally(() => {
      setBusyId(null);
      mutate();
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("order")}
          className={`h-11 rounded-xl px-4 font-medium ${tab === "order" ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
        >
          {t.counter.newOrder}
        </button>
        <button
          onClick={() => setTab("ready")}
          className={`h-11 rounded-xl px-4 font-medium ${tab === "ready" ? "bg-green-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
        >
          {t.counter.readyTab}
          {ready.length > 0 ? (
            <span className="ml-2 rounded-md bg-white/20 px-1.5 py-0.5 text-sm">
              {ready.length}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "ready" ? (
        <ReadyList
          orders={ready}
          busyId={busyId}
          onHandOver={handOver}
          onCancel={cancel}
          locale={locale}
          t={t}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-7">
            {sections.length === 0 ? <Empty>{t.counter.noItems}</Empty> : null}

            {sections.map((section) => (
              <section key={section.id}>
                <h2 className="mb-2 text-xs font-semibold tracking-widest text-stone-500 uppercase">
                  {section.name}
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.items.map((item) => {
                    const price = unitSalePrice(item.priceYen, salePct);
                    const isOpen = expanded === item.id;
                    const chosen = picked[item.id] ?? [];

                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => {
                            if (item.options.length === 0) add(item, []);
                            else setExpanded(isOpen ? null : item.id);
                          }}
                          className={`w-full rounded-2xl bg-white p-3 text-left ring-1 transition ${
                            isOpen ? "ring-2 ring-stone-900" : "ring-stone-200 hover:ring-stone-400"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium leading-tight">{item.name}</span>
                            <span className="shrink-0 font-semibold">{yen(price)}</span>
                          </div>
                          {item.options.length > 0 ? (
                            <span className="mt-1 block text-xs text-stone-500">
                              {item.options.length === 1
                                ? fill(t.counter.optionCount, { n: 1 })
                                : fill(t.counter.optionCountPlural, {
                                    n: item.options.length,
                                  })}
                            </span>
                          ) : null}
                        </button>

                        {isOpen ? (
                          <div className="mt-1 rounded-2xl bg-stone-100 p-3">
                            <div className="flex flex-wrap gap-2">
                              {item.options.map((option) => {
                                const active = chosen.includes(option.id);
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() =>
                                      setPicked((prev) => ({
                                        ...prev,
                                        [item.id]: active
                                          ? chosen.filter((id) => id !== option.id)
                                          : [...chosen, option.id],
                                      }))
                                    }
                                    className={`h-10 rounded-lg px-3 text-sm font-medium ${
                                      active
                                        ? "bg-stone-900 text-white"
                                        : "bg-white text-stone-800 ring-1 ring-stone-300"
                                    }`}
                                  >
                                    {option.name}
                                    {option.priceDeltaYen !== 0
                                      ? ` ${option.priceDeltaYen > 0 ? "+" : "−"}${yen(Math.abs(option.priceDeltaYen))}`
                                      : ""}
                                  </button>
                                );
                              })}
                            </div>
                            <Button
                              size="sm"
                              className="mt-3 w-full"
                              onClick={() => {
                                add(item, chosen);
                                setPicked((prev) => ({ ...prev, [item.id]: [] }));
                                setExpanded(null);
                              }}
                            >
                              {t.counter.addToOrder}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="lg:sticky lg:top-4">
            <Card className="p-4">
              {placed ? (
                <div className="mb-4 rounded-xl bg-green-700 px-4 py-4 text-white">
                  <p className="text-xs tracking-widest uppercase opacity-80">
                    {t.counter.orderPlaced}
                  </p>
                  <p className="text-4xl font-bold">#{placed.number}</p>
                  <p className="mt-1 text-sm">
                    {fill(t.counter.collectCash, { total: yen(placed.total) })}
                  </p>
                  <button
                    onClick={() => setPlaced(null)}
                    className="mt-3 h-10 w-full rounded-lg bg-white/15 font-medium"
                  >
                    {t.counter.nextOrder}
                  </button>
                </div>
              ) : null}

              <h2 className="mb-2 font-semibold">{t.counter.order}</h2>

              {lines.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">
                  {t.counter.tapItems}
                </p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {lines.map(([key, line]) => {
                    const item = itemById.get(line.itemId);
                    if (!item) return null;
                    const chosen = item.options.filter((option) =>
                      line.optionIds.includes(option.id),
                    );

                    return (
                      <li key={key} className="flex gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {item.name}
                          </p>
                          {chosen.length > 0 ? (
                            <p className="text-xs text-stone-500">
                              {chosen.map((option) => option.name).join(", ")}
                            </p>
                          ) : null}
                          <p className="text-xs text-stone-500">
                            {fill(t.counter.each, {
                              price: yen(unitSalePrice(unitPrice(line), salePct)),
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => bump(key, -1)}
                            className="h-8 w-8 rounded-lg bg-stone-100 text-lg leading-none"
                            aria-label={t.counter.removeOne}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {line.qty}
                          </span>
                          <button
                            onClick={() => bump(key, 1)}
                            className="h-8 w-8 rounded-lg bg-stone-100 text-lg leading-none"
                            aria-label={t.counter.addOne}
                          >
                            +
                          </button>
                        </div>
                        <span className="w-16 text-right text-sm font-semibold">
                          {yen(lineTotal(line))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
                {salePct > 0 && gross > 0 ? (
                  <>
                    <div className="flex justify-between text-stone-500">
                      <span>{t.counter.subtotal}</span>
                      <span>{yen(gross)}</span>
                    </div>
                    <div className="flex justify-between text-orange-700">
                      <span>{fill(t.counter.off, { pct: salePct })}</span>
                      <span>−{yen(gross - total)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t.counter.total}</span>
                  <span>{yen(total)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.counter.namePlaceholder}
                  className={field}
                  maxLength={40}
                />
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t.counter.notePlaceholder}
                  className={field}
                  maxLength={200}
                />
              </div>

              {error ? (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <Button
                size="lg"
                className="mt-3 w-full"
                disabled={lines.length === 0 || pending}
                onClick={submit}
              >
                {pending
                  ? t.counter.saving
                  : fill(t.counter.placeOrder, { total: yen(total) })}
              </Button>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function ReadyList({
  orders,
  busyId,
  onHandOver,
  onCancel,
  locale,
  t,
}: {
  orders: QueueOrder[];
  busyId: string | null;
  onHandOver: (id: string) => void;
  onCancel: (id: string, number: number) => void;
  locale: Locale;
  t: Dict;
}) {
  const now = useNow(1000);

  if (orders.length === 0) {
    return <Empty>{t.counter.emptyReady}</Empty>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => {
        const waited = elapsedSeconds(order.readyAt ?? order.createdAt, now);
        return (
          <li key={order.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold leading-none">#{order.number}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {order.customerName || t.common.noName} ·{" "}
                    {fill(t.counter.waitingFor, {
                      time: elapsedLabel(waited, locale),
                    })}
                  </p>
                </div>
                <Badge tone="ok">{t.queue.ready}</Badge>
              </div>

              <ul className="mt-3 space-y-0.5 text-sm text-stone-700">
                {order.items.map((item, index) => (
                  <li key={index}>
                    <span className="font-semibold">{item.qty}×</span> {item.name}
                    {item.options.length > 0 ? (
                      <span className="text-stone-500">
                        {" "}
                        ({item.options.map((option) => option.name).join(", ")})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="lg"
                  variant="ok"
                  className="flex-1"
                  disabled={busyId === order.id}
                  onClick={() => onHandOver(order.id)}
                >
                  {t.counter.handedOver}
                </Button>
                <button
                  onClick={() => onCancel(order.id, order.number)}
                  className="h-14 px-3 text-sm text-stone-400 hover:text-red-600"
                >
                  {t.counter.cancelAction}
                </button>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
