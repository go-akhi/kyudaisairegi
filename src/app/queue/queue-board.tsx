"use client";

import { useState } from "react";
import useSWR from "swr";
import { cancelOrder, markReady } from "@/lib/actions/orders";
import { elapsedLabel, elapsedSeconds } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n/dictionaries";
import type { QueueOrder, QueueResponse } from "@/lib/queue-types";
import { useNow } from "@/lib/use-now";
import { Badge, Button, Card, Empty } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function urgency(seconds: number) {
  if (seconds >= 600) return "bg-[#f9e7e2] ring-[#d9a79d]";
  if (seconds >= 300) return "bg-[#fff9e6] ring-[#e0b84d]";
  return "bg-white ring-[#e7dcc7]";
}

export function QueueBoard({ locale, t }: { locale: Locale; t: Dict }) {
  const { data, mutate, isLoading } = useSWR<QueueResponse>("/api/queue", fetcher, {
    refreshInterval: 3000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = useNow(1000);

  const orders = data?.orders ?? [];
  const preparing = orders.filter((order) => order.status === "placed");
  const ready = orders.filter((order) => order.status === "ready");

  function bump(order: QueueOrder) {
    setBusyId(order.id);
    void markReady(order.id).finally(() => {
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
            {preparing.map((order) => {
              const waited = elapsedSeconds(order.createdAt, now);
              return (
                <li key={order.id}>
                  <Card className={`p-4 ${urgency(waited)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex flex-wrap items-baseline gap-2 text-4xl font-bold leading-none">
                          #{order.number}
                          {order.parts > 1 ? (
                            <span
                              aria-label={fill(t.queue.partOf, {
                                part: order.part,
                                parts: order.parts,
                              })}
                              className="rounded-md bg-[#fff3c9] px-2 py-1 text-sm font-semibold text-[#6b4a00] tabular-nums"
                            >
                              {order.part}/{order.parts}
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
                              ? "bg-[#fff9e6]0 text-[#fffef6]"
                              : "bg-[#f4ecdd] text-[#614b37]"
                        }`}
                      >
                        {elapsedLabel(waited, locale)}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-0.5 text-[15px]">
                      {order.items.map((item, index) => (
                        <li key={index}>
                          <span className="font-semibold">{item.qty}×</span>{" "}
                          {item.name}
                          {item.options.length > 0 ? (
                            <span className="text-[#856f58]">
                              {" "}
                              ({item.options.map((option) => option.name).join(", ")})
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {order.note ? (
                      <p className="mt-2 rounded-lg bg-[#fff3c9] px-2 py-1 text-sm font-medium text-[#6b4a00]">
                        {order.note}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="lg"
                        variant="ok"
                        className="flex-1"
                        disabled={busyId === order.id}
                        onClick={() => bump(order)}
                      >
                        {t.queue.ready}
                      </Button>
                      <button
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
            {ready.map((order) => {
              const waited = elapsedSeconds(order.readyAt ?? order.createdAt, now);
              const slow = waited >= 180;
              return (
                <li key={order.id}>
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ${
                      slow ? "bg-[#f9e7e2] ring-[#d9a79d]" : "bg-[#eef4f4] ring-[#bcd2d6]"
                    }`}
                  >
                    <span className="text-xl font-bold">
                      #{order.number}
                      {order.parts > 1 ? (
                        <span className="ml-1 align-middle text-xs font-semibold text-[#7a5300] tabular-nums">
                          {order.part}/{order.parts}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm text-[#856f58]">
                      {order.customerName || t.common.noName}
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
