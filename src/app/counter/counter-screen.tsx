"use client";

import { useMemo, useState, useTransition } from "react";
import useSWR from "swr";
import type { MenuCategory, MenuItem } from "@/lib/menu-types";
import type { CartLine } from "@/lib/actions/orders";
import { cancelOrder, completeItem, createAddOn, createOrder } from "@/lib/actions/orders";
import type { QueueItem, QueueOrder, QueueResponse } from "@/lib/queue-types";
import { elapsedLabel, elapsedSeconds, unitSalePrice, yen } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n/dictionaries";
import { useNow } from "@/lib/use-now";
import { Button, Card, Empty, field } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  categories: MenuCategory[];
  uncategorised: MenuItem[];
  salePct: number;
  locale: Locale;
  t: Dict;
};

export function CounterScreen({ categories, uncategorised, salePct, locale, t }: Props) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [placed, setPlaced] = useState<{ number: number; total: number } | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; number: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cashOpen, setCashOpen] = useState(true);
  const [received, setReceived] = useState(0);
  const [calculated, setCalculated] = useState<{ received: number; total: number } | null>(null);
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
  const ready = (data?.orders ?? [])
    .flatMap((order) =>
      order.items
        .filter((item) => item.status === "ready")
        .map((item) => ({ order, item })),
    )
    .sort(
      (a, b) =>
        new Date(a.item.readyAt ?? a.order.createdAt).getTime() -
        new Date(b.item.readyAt ?? b.order.createdAt).getTime(),
    );

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
    // Keep the confirmation up: it now also anchors an add-on to this number.
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

  function resetCash() {
    setCashOpen(false);
    setReceived(0);
    setCalculated(null);
  }

  function submit() {
    setError("");
    setNotice("");
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
      // Keep the ticket open for a possible add-on until "Next order".
      setLastOrder({ id: result.id, number: result.number });
      setCart({});
      setName("");
      setNote("");
      setExpanded(null);
      resetCash();
      mutate();
    });
  }

  function submitAddOn() {
    if (!lastOrder) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await createAddOn(lastOrder.id, {
        customerName: name,
        note,
        lines: Object.values(cart),
      });
      if ("error" in result) {
        setError(
          result.error === "closed"
            ? t.counter.addOnClosed
            : result.error === "save"
              ? t.counter.addOnFailed
              : result.error,
        );
        return;
      }
      setNotice(
        fill(t.counter.addOnPlaced, {
          number: result.number,
          total: yen(result.totalYen),
        }),
      );
      setCart({});
      setNote("");
      setExpanded(null);
      resetCash();
      mutate();
    });
  }

  function handOver(itemId: string) {
    setBusyId(itemId);
    void completeItem(itemId).finally(() => {
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
      <ReadyRail
        tickets={ready}
        busyId={busyId}
        onHandOver={handOver}
        onCancel={cancel}
        locale={locale}
        t={t}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-7">
          {sections.length === 0 ? <Empty>{t.counter.noItems}</Empty> : null}

          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-[#856f58] uppercase">
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
                        className={`w-full rounded-lg bg-white p-3 text-left ring-1 transition ${
                          isOpen ? "ring-2 ring-[#993333]" : "ring-[#e7dcc7] hover:ring-[#c7b299]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium leading-tight">{item.name}</span>
                          <span className="shrink-0 font-semibold">{yen(price)}</span>
                        </div>
                        {item.options.length > 0 ? (
                          <span className="mt-1 block text-xs text-[#856f58]">
                            {item.options.length === 1
                              ? fill(t.counter.optionCount, { n: 1 })
                              : fill(t.counter.optionCountPlural, {
                                  n: item.options.length,
                                })}
                          </span>
                        ) : null}
                      </button>

                      {isOpen ? (
                        <div className="mt-1 rounded-lg bg-[#f4ecdd] p-3">
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
                                      ? "bg-[#402000] text-[#fffef6]"
                                      : "bg-white text-[#4b2f19] ring-1 ring-[#d9cbb4]"
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

        {/* Sticky only when collapsed: an open calculator plus the order card is
            taller than a tablet screen, and a sticky aside would hide the
            Place order button. */}
        <aside className={cashOpen ? "" : "lg:sticky lg:top-4"}>
          <CashCalculator
            open={cashOpen}
            onToggle={() => setCashOpen((open) => !open)}
            total={total}
            received={received}
            calculated={calculated}
            onAdd={(amount) => {
              setReceived((value) => value + amount);
              setCalculated(null);
            }}
            onClear={() => {
              setReceived(0);
              setCalculated(null);
            }}
            onCalculate={() => setCalculated({ received, total })}
            t={t}
          />

          <Card className="p-4">
            {placed ? (
              <div className="mb-4 rounded-lg bg-[#1b6373] px-4 py-4 text-[#fffef6]">
                <p className="text-xs tracking-widest uppercase opacity-80">
                  {t.counter.orderPlaced}
                </p>
                <p data-placed-number className="text-4xl font-bold">
                  #{placed.number}
                </p>
                <p className="mt-1 text-sm">
                  {fill(t.counter.collectCash, { total: yen(placed.total) })}
                </p>
                <button
                  onClick={() => {
                    setPlaced(null);
                    setLastOrder(null);
                    setNotice("");
                  }}
                  className="mt-3 h-10 w-full rounded-lg bg-white/15 font-medium"
                >
                  {t.counter.nextOrder}
                </button>
              </div>
            ) : null}

            <h2 className="mb-2 font-semibold">{t.counter.order}</h2>

            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#a08a72]">
                {t.counter.tapItems}
              </p>
            ) : (
              <ul className="divide-y divide-[#efe5d4]">
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
                          <p className="text-xs text-[#856f58]">
                            {chosen.map((option) => option.name).join(", ")}
                          </p>
                        ) : null}
                        <p className="text-xs text-[#856f58]">
                          {fill(t.counter.each, {
                            price: yen(unitSalePrice(unitPrice(line), salePct)),
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => bump(key, -1)}
                          className="h-8 w-8 rounded-lg bg-[#f4ecdd] text-lg leading-none"
                          aria-label={t.counter.removeOne}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {line.qty}
                        </span>
                        <button
                          onClick={() => bump(key, 1)}
                          className="h-8 w-8 rounded-lg bg-[#f4ecdd] text-lg leading-none"
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

            <div className="mt-3 space-y-1 border-t border-[#e7dcc7] pt-3 text-sm">
              {salePct > 0 && gross > 0 ? (
                <>
                  <div className="flex justify-between text-[#856f58]">
                    <span>{t.counter.subtotal}</span>
                    <span>{yen(gross)}</span>
                  </div>
                  <div className="flex justify-between text-[#993333]">
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
              <p className="mt-2 rounded-lg bg-[#f9e7e2] px-3 py-2 text-sm text-[#8f2a20]">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="mt-2 rounded-lg bg-[#eef4f4] px-3 py-2 text-sm text-[#15505e]">
                {notice}
              </p>
            ) : null}

            {lastOrder ? (
              <Button
                size="lg"
                variant="secondary"
                className="mt-3 w-full"
                disabled={lines.length === 0 || pending}
                onClick={submitAddOn}
              >
                {fill(t.counter.addOn, { number: lastOrder.number })}
              </Button>
            ) : null}

            <Button
              size="lg"
              className={lastOrder ? "mt-2 w-full" : "mt-3 w-full"}
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
    </div>
  );
}

const NOTES = [10000, 5000, 2000, 1000];
const COINS = [500, 100, 50, 10, 5, 1];

function CashCalculator({
  open,
  onToggle,
  total,
  received,
  calculated,
  onAdd,
  onClear,
  onCalculate,
  t,
}: {
  open: boolean;
  onToggle: () => void;
  total: number;
  received: number;
  calculated: { received: number; total: number } | null;
  onAdd: (amount: number) => void;
  onClear: () => void;
  onCalculate: () => void;
  t: Dict;
}) {
  // The cart can change after calculating; only trust a result for the
  // exact total and amount it was computed from.
  const result =
    calculated && calculated.received === received && calculated.total === total
      ? received - total
      : null;

  return (
    <Card className="mb-3 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="cash-calc"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="font-semibold">{t.counter.cashCalc}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-[#a08a72]">
            {t.counter.total}{" "}
            <span className="font-semibold text-[#6b5544] tabular-nums">
              {yen(total)}
            </span>
          </span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={`h-4 w-4 shrink-0 text-[#a08a72] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div
        id="cash-calc"
        hidden={!open}
        className="space-y-3 border-t border-[#efe5d4] px-3 pt-2.5 pb-3"
      >
        <p className="text-xs text-[#856f58]">{t.counter.cashHint}</p>

        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#a08a72] uppercase">
            {t.counter.cashNotes}
          </p>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => onAdd(note)}
                className="h-10 rounded-lg bg-[#f4ecdd] text-sm font-semibold text-[#4b2f19] transition-colors hover:bg-[#eadfcc] active:bg-[#d9cbb4]"
              >
                {yen(note)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#a08a72] uppercase">
            {t.counter.cashCoins}
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {COINS.map((coin) => (
              <button
                key={coin}
                type="button"
                onClick={() => onAdd(coin)}
                className="h-9 rounded-lg bg-[#f4ecdd] text-sm font-semibold text-[#4b2f19] transition-colors hover:bg-[#eadfcc] active:bg-[#d9cbb4]"
              >
                {yen(coin)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#fbf6ea] px-3 py-2">
          <span className="text-xs font-medium text-[#856f58]">
            {t.counter.cashReceived}
          </span>
          <span
            data-cash-received
            className="ml-auto text-xl font-bold tabular-nums"
          >
            {yen(received)}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={received === 0}
            className="text-xs text-[#a08a72] hover:text-[#b3261e] disabled:opacity-40"
          >
            {t.counter.cashClear}
          </button>
        </div>

        <Button
          className="w-full"
          disabled={total <= 0 || received <= 0}
          onClick={onCalculate}
        >
          {t.counter.cashCalculate}
        </Button>

        {result !== null ? (
          <div
            className={`rounded-lg px-3 py-2 ${
              result >= 0 ? "bg-[#eef4f4] text-[#0f4350]" : "bg-[#f9e7e2] text-[#8f2a20]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {result >= 0 ? t.counter.cashChange : t.counter.cashShort}
              </span>
              <span className="text-xl font-bold tabular-nums">
                {yen(Math.abs(result))}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ReadyRail({
  tickets,
  busyId,
  onHandOver,
  onCancel,
  locale,
  t,
}: {
  tickets: { order: QueueOrder; item: QueueItem }[];
  busyId: string | null;
  onHandOver: (itemId: string) => void;
  onCancel: (orderId: string, number: number) => void;
  locale: Locale;
  t: Dict;
}) {
  const now = useNow(1000);
  const optionSeparator = locale === "ja" ? "・" : ", ";

  // Sticks directly under the staff top bar: 69px tall, or 77px when its nav
  // wraps on narrow phones.
  return (
    <section
      aria-label={t.counter.readyTab}
      className="sticky top-[77px] z-10 -mx-4 -mt-4 mb-4 border-b border-[#e7dcc7] bg-paper/95 px-4 pt-2.5 pb-3 backdrop-blur sm:top-[69px]"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-xs font-semibold tracking-widest text-[#856f58] uppercase">
          {t.counter.readyTab}
        </h2>
        <span className="rounded-md bg-[#e3ecec] px-1.5 py-0.5 text-xs font-semibold text-[#15505e] tabular-nums">
          {tickets.length}
        </span>
        {tickets.length > 0 ? (
          <span className="ml-auto text-xs text-[#a08a72]">
            {fill(t.queue.readyCount, { n: tickets.length })}
          </span>
        ) : null}
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#d9cbb4] px-3 py-2 text-sm text-[#856f58]">
          {t.counter.emptyReady}
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {tickets.map(({ order, item }) => {
            const waited = elapsedSeconds(item.readyAt ?? order.createdAt, now);
            const slow = waited >= 300;
            const late = waited >= 600;

            const options = item.options
              .map((option) => option.name)
              .join(optionSeparator);
            const suffix = options
              ? locale === "ja"
                ? `（${options}）`
                : ` (${options})`
              : "";
            const summary = `${item.qty}× ${item.name}${suffix}`;

            return (
              <li key={item.id} className="w-[270px] shrink-0">
                <Card className="flex h-full flex-col p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 truncate text-xs text-[#856f58]">
                        <span className="mr-1.5 text-xl leading-none font-bold text-[#402000]">
                          #{order.number}
                        </span>
                        {order.customerName || t.common.noName}
                      </p>
                      {item.parts > 1 ? (
                        <span
                          aria-label={fill(t.queue.partOf, {
                            part: item.part,
                            parts: item.parts,
                          })}
                          className="shrink-0 rounded bg-[#fff3c9] px-1 py-0.5 text-[10px] font-semibold text-[#6b4a00] tabular-nums"
                        >
                          {item.part}/{item.parts}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        late
                          ? "bg-[#b3261e] text-[#fffef6]"
                          : slow
                            ? "bg-[#b07a1a] text-[#fffef6]"
                            : "bg-[#f4ecdd] text-[#6b5544]"
                      }`}
                    >
                      {elapsedLabel(waited, locale)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-[#6b5544]" title={summary}>
                    {summary}
                  </p>
                  {order.note ? (
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#8a5a00]">
                      {order.note}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="ok"
                      className="flex-1"
                      disabled={busyId === item.id}
                      onClick={() => onHandOver(item.id)}
                    >
                      {t.counter.handedOver}
                    </Button>
                    <button
                      type="button"
                      onClick={() => onCancel(order.id, order.number)}
                      className="px-2 py-1 text-xs text-[#a08a72] hover:text-[#b3261e]"
                    >
                      {t.counter.cancelAction}
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
