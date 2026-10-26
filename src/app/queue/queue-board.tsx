"use client";

import { useState } from "react";
import useSWR from "swr";
import { cancelOrder, markItemReady } from "@/lib/actions/orders";
import { elapsedLabel, elapsedSeconds } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n/dictionaries";
import type { QueueOrder, QueueItem, QueueResponse } from "@/lib/queue-types";
import { useNow } from "@/lib/use-now";
import { Badge, Button, Card, Empty } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function urgency(seconds: number) {
  if (seconds >= 600) return "bg-[#f9e7e2] ring-[#d9a79d]";
  if (seconds >= 300) return "bg-[#fff9e6] ring-[#e0b84d]";
  return "bg-white ring-[#e7dcc7]";
}

type Ticket = { order: QueueOrder; item: QueueItem };

export function QueueBoard({ locale, t }: { locale: Locale; t: Dict }) {
  const { data, mutate, isLoading } = useSWR<QueueResponse>("/api/queue", fetcher, {
    refreshInterval: 3000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = useNow(1000);

  const orders = data?.orders ?? [];

  const preparing: Ticket[] = orders.flatMap((order) =>
    order.items
      .filter((item) => item.status === "placed")
      .map((item) => ({ order, item })),
  );

  const ready: Ticket[] = orders
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

  function bump(itemId: string) {
    setBusyId(itemId);
    void markItemReady(itemId).finally(() => {
      setBusyId(null);
      mutate();
    });
  }

  function cancel(order: QueueOrder) {
    const reason = window.prompt(fill(t.queue.cancelPrompt, { number: order.number }));
    if (reason === null) return;
    setBusyId(order.id);
    void cancelOrder(order.id, reason).finally(() => {
      setBusyId(null);
      mutate();
    });
  }

  if (isLoading && !data) {
    return <Empty>{t.queue.loading}</Empty>;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-widest text-[#856f58] uppercase">
            {t.queue.preparing}
          </h2>
          <span className="text-sm text-[#a08a72]">
            {fill(t.queue.openCount, { n: preparing.length })}
          </span>
        </div>

        {preparing.length === 0 ? (
          <Empty>{t.queue.queueClear}</Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {preparing.map(({ order, item }) => {
              const waited = elapsedSeconds(order.createdAt, now);
              const options = item.options
                .map((option) => option.name)
                .join(locale === "ja" ? "・" : ", ");

              return (
                <li key={item.id}>
                  <Card className={`p-4 ${urgency(waited)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-2 text-4xl leading-none font-bold">
                          #{order.number}
                          {item.parts > 1 ? (
                            <span
                              aria-label={fill(t.queue.partOf, {
                                part: item.part,
                                parts: item.parts,
                              })}
                              className="rounded-md bg-[#fff3c9] px-2 py-1 text-sm font-semibold text-[#6b4a00] tabular-nums"
                            >
                              {item.part}/{item.parts}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-[#856f58]">
                          {order.customerName || t.common.noName}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${
                          waited >= 600
                            ? "bg-[#b3261e] text-[#fffef6]"
                            : waited >= 300
                              ? "bg-[#b07a1a] text-[#fffef6]"
                              : "bg-[#f4ecdd] text-[#6b5544]"
                        }`}
                      >
                        {elapsedLabel(waited, locale)}
                      </span>
                    </div>

                    <p className="mt-3 text-lg leading-snug font-medium">
                      <span className="font-bold">{item.qty}×</span> {item.name}
                      {options ? (
                        <span className="text-sm text-[#856f58]"> ({options})</span>
                      ) : null}
                    </p>

                    {order.note ? (
                      <p className="mt-2 rounded-md bg-[#fff3c9] px-2 py-1 text-sm font-medium text-[#6b4a00]">
                        {order.note}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="lg"
                        variant="ok"
                        className="flex-1"
                        disabled={busyId === item.id}
                        onClick={() => bump(item.id)}
                      >
                        {t.queue.ready}
                      </Button>
                      <button
                        type="button"
                        onClick={() => cancel(order)}
                        className="h-14 px-3 text-sm text-[#a08a72] hover:text-[#b3261e]"
                      >
                        {t.queue.cancelAction}
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-widest text-[#856f58] uppercase">
            {t.queue.waitingCounter}
          </h2>
          <span className="text-sm text-[#a08a72]">
            {fill(t.queue.readyCount, { n: ready.length })}
          </span>
        </div>

        {ready.length === 0 ? (
          <p className="text-sm text-[#a08a72]">{t.queue.nothingWaiting}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ready.map(({ order, item }) => {
              const waited = elapsedSeconds(item.readyAt ?? order.createdAt, now);
              const slow = waited >= 180;
              return (
                <li key={item.id}>
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 ring-1 ${
                      slow ? "bg-[#f9e7e2] ring-[#d9a79d]" : "bg-[#eef4f4] ring-[#bcd2d6]"
                    }`}
                  >
                    <span className="text-xl font-bold">
                      #{order.number}
                      {item.parts > 1 ? (
                        <span className="ml-1 align-middle text-xs font-semibold text-[#7a5300] tabular-nums">
                          {item.part}/{item.parts}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm text-[#856f58]">
                      {order.customerName || t.common.noName}
                    </span>
                    <span className="text-sm">
                      {item.qty}× {item.name}
                    </span>
                    <Badge tone={slow ? "danger" : "ok"}>
                      {elapsedLabel(waited, locale)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
