"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  itemOptions,
  items,
  orderCounter,
  orderItemOptions,
  orderItems,
  orders,
  stalls,
} from "@/db/schema";
import { requireStall } from "@/lib/auth";
import { getDevice } from "@/lib/device";
import { dayJst, lineDiscountYen } from "@/lib/format";

export type CartLine = {
  itemId: string;
  qty: number;
  optionIds: string[];
};

type Result = { number: number } | { error: string };

async function logEvent(input: {
  stallId: string;
  orderId?: string;
  type: string;
  deviceLabel: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(events).values({
    stallId: input.stallId,
    orderId: input.orderId,
    type: input.type,
    deviceLabel: input.deviceLabel,
    payload: input.payload,
  });
}

/* ---------------------------------------------------------------- creation */

export async function createOrder(input: {
  customerName: string;
  note: string;
  lines: CartLine[];
}): Promise<Result> {
  const account = await requireStall();
  const device = await getDevice();

  const lines = (input.lines ?? []).filter(
    (line) => line.qty > 0 && line.qty <= 30,
  );
  if (lines.length === 0) return { error: "Add something first" };
  if (lines.length > 40) return { error: "That's a very long order" };

  const itemIds = [...new Set(lines.map((line) => line.itemId))];
  const itemRows = await db
    .select()
    .from(items)
    .where(and(eq(items.stallId, account.stallId), inArray(items.id, itemIds)));

  const itemById = new Map(itemRows.map((item) => [item.id, item]));

  const optionIds = [...new Set(lines.flatMap((line) => line.optionIds ?? []))];
  const optionRows =
    optionIds.length > 0
      ? await db.select().from(itemOptions).where(inArray(itemOptions.id, optionIds))
      : [];
  const optionById = new Map(optionRows.map((option) => [option.id, option]));

  // Prices are always recomputed from the database. The client only says what,
  // never how much.
  const priced = lines.map((line) => {
    const item = itemById.get(line.itemId);
    if (!item) throw new Error("An item in this order no longer exists");

    const chosen = (line.optionIds ?? [])
      .map((id) => optionById.get(id))
      .filter((option): option is NonNullable<typeof option> => Boolean(option))
      .filter((option) => option.itemId === item.id);

    const unitPriceYen =
      item.priceYen + chosen.reduce((sum, option) => sum + option.priceDeltaYen, 0);

    return { item, chosen, qty: Math.min(line.qty, 30), unitPriceYen };
  });

  const subtotalYen = priced.reduce(
    (sum, line) => sum + line.unitPriceYen * line.qty,
    0,
  );

  const stallRow = await db
    .select({ salePct: stalls.salePct })
    .from(stalls)
    .where(eq(stalls.id, account.stallId))
    .limit(1);

  const salePct = stallRow[0]?.salePct ?? 0;

  const discountYen = priced.reduce(
    (sum, line) => sum + lineDiscountYen(line.unitPriceYen, line.qty, salePct),
    0,
  );
  const totalYen = subtotalYen - discountYen;
  const day = dayJst();

  try {
    const number = await db.transaction(async (tx) => {
      const [counter] = await tx
        .insert(orderCounter)
        .values({ stallId: account.stallId, day, lastNumber: 1 })
        .onConflictDoUpdate({
          target: [orderCounter.stallId, orderCounter.day],
          set: { lastNumber: sql`${orderCounter.lastNumber} + 1` },
        })
        .returning({ lastNumber: orderCounter.lastNumber });

      const [order] = await tx
        .insert(orders)
        .values({
          stallId: account.stallId,
          day,
          number: counter.lastNumber,
          customerName: input.customerName.trim().slice(0, 40),
          note: input.note.trim().slice(0, 200),
          deviceLabel: device.label,
          subtotalYen,
          discountPct: salePct,
          discountYen,
          totalYen,
        })
        .returning({ id: orders.id, number: orders.number });

      for (const line of priced) {
        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            itemId: line.item.id,
            nameSnapshot: line.item.name,
            unitPriceYen: line.unitPriceYen,
            qty: line.qty,
          })
          .returning({ id: orderItems.id });

        if (line.chosen.length > 0) {
          await tx.insert(orderItemOptions).values(
            line.chosen.map((option) => ({
              orderItemId: orderItem.id,
              optionId: option.id,
              nameSnapshot: option.name,
              priceDeltaYen: option.priceDeltaYen,
            })),
          );
        }
      }

      await tx.insert(events).values({
        stallId: account.stallId,
        orderId: order.id,
        type: "order.placed",
        deviceLabel: device.label,
        payload: { number: order.number, totalYen, discountPct: salePct },
      });

      return order.number;
    });

    return { number };
  } catch {
    return { error: "Could not save the order. Try again." };
  }
}

/* ------------------------------------------------------------- transitions */

export async function markReady(orderId: string): Promise<{ ok: true } | { error: string }> {
  const account = await requireStall();
  const device = await getDevice();

  const updated = await db
    .update(orders)
    .set({ status: "ready", readyAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.stallId, account.stallId),
        eq(orders.status, "placed"),
      ),
    )
    .returning({ id: orders.id });

  if (updated.length === 0) return { error: "This order has already moved" };

  await logEvent({
    stallId: account.stallId,
    orderId,
    type: "order.ready",
    deviceLabel: device.label,
  });
  return { ok: true };
}

export async function completeOrder(
  orderId: string,
): Promise<{ ok: true } | { error: string }> {
  const account = await requireStall();
  const device = await getDevice();

  const updated = await db
    .update(orders)
    .set({ status: "completed", completedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.stallId, account.stallId),
        eq(orders.status, "ready"),
      ),
    )
    .returning({ id: orders.id });

  if (updated.length === 0) return { error: "This order has already moved" };

  await logEvent({
    stallId: account.stallId,
    orderId,
    type: "order.completed",
    deviceLabel: device.label,
  });
  return { ok: true };
}

export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<{ ok: true } | { error: string }> {
  const account = await requireStall();
  const device = await getDevice();

  const updated = await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason.trim().slice(0, 120) || "No reason given",
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.stallId, account.stallId),
        inArray(orders.status, ["placed", "ready"]),
      ),
    )
    .returning({ id: orders.id });

  if (updated.length === 0) return { error: "This order has already moved" };

  await logEvent({
    stallId: account.stallId,
    orderId,
    type: "order.cancelled",
    deviceLabel: device.label,
    payload: { reason },
  });
  return { ok: true };
}
