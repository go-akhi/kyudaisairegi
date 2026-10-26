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

type Result = { id: string; number: number } | { error: string };

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

/** Shared by new orders and add-ons: snapshot the menu and price the lines. */
async function priceLines(stallId: string, lines: CartLine[]) {
  const itemIds = [...new Set(lines.map((line) => line.itemId))];
  const itemRows = await db
    .select()
    .from(items)
    .where(and(eq(items.stallId, stallId), inArray(items.id, itemIds)));

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

  return { priced, subtotalYen };
}

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

  const { priced, subtotalYen } = await priceLines(account.stallId, lines);

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
    const created = await db.transaction(async (tx) => {
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

      for (const [index, line] of priced.entries()) {
        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            itemId: line.item.id,
            nameSnapshot: line.item.name,
            unitPriceYen: line.unitPriceYen,
            qty: line.qty,
            lineNo: index + 1,
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

      return order;
    });

    return { id: created.id, number: created.number };
  } catch {
    return { error: "Could not save the order. Try again." };
  }
}

/**
 * A linked add-on: same customer number, same frozen discount, its own
 * kitchen ticket. The original keeps its status; the queue shows a
 * "more coming" marker while any add-on is still open.
 */
export async function createAddOn(
  parentOrderId: string,
  input: { customerName: string; note: string; lines: CartLine[] },
): Promise<
  | { id: string; number: number; addonNo: number; totalYen: number }
  | { error: string }
> {
  const account = await requireStall();
  const device = await getDevice();

  const lines = (input.lines ?? []).filter(
    (line) => line.qty > 0 && line.qty <= 30,
  );
  if (lines.length === 0) return { error: "Add something first" };
  if (lines.length > 40) return { error: "That's a very long order" };

  try {
    return await db.transaction(async (tx) => {
      // Lock the parent so two tills cannot allocate the same add-on number.
      const [parent] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, parentOrderId),
            eq(orders.stallId, account.stallId),
          ),
        )
        .limit(1)
        .for("update");

      if (!parent) return { error: "closed" };
      if (parent.status === "completed" || parent.status === "cancelled") {
        return { error: "closed" };
      }

      const { priced, subtotalYen } = await priceLines(account.stallId, lines);

      // Same percentage as the parent, even if the stall's sale has changed.
      const discountYen = priced.reduce(
        (sum, line) =>
          sum + lineDiscountYen(line.unitPriceYen, line.qty, parent.discountPct),
        0,
      );
      const totalYen = subtotalYen - discountYen;

      const [next] = await tx
        .select({
          addonNo: sql<number>`coalesce(max(${orders.addonNo}), 0) + 1`,
        })
        .from(orders)
        .where(eq(orders.parentOrderId, parent.id));

      const [child] = await tx
        .insert(orders)
        .values({
          stallId: account.stallId,
          day: parent.day,
          number: parent.number,
          addonNo: Number(next?.addonNo ?? 1),
          parentOrderId: parent.id,
          customerName: (input.customerName.trim() || parent.customerName).slice(0, 40),
          note: (input.note.trim() || parent.note).slice(0, 200),
          deviceLabel: device.label,
          subtotalYen,
          discountPct: parent.discountPct,
          discountYen,
          totalYen,
        })
        .returning({
          id: orders.id,
          number: orders.number,
          addonNo: orders.addonNo,
        });

      for (const [index, line] of priced.entries()) {
        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: child.id,
            itemId: line.item.id,
            nameSnapshot: line.item.name,
            unitPriceYen: line.unitPriceYen,
            qty: line.qty,
            lineNo: index + 1,
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
        orderId: child.id,
        type: "order.addon",
        deviceLabel: device.label,
        payload: {
          number: child.number,
          addonNo: child.addonNo,
          parentOrderId: parent.id,
          totalYen,
        },
      });

      return {
        id: child.id,
        number: child.number,
        addonNo: child.addonNo,
        totalYen,
      };
    });
  } catch {
    return { error: "save" };
  }
}

/* ------------------------------------------------------------- transitions */

export async function markItemReady(
  itemId: string,
): Promise<{ ok: true } | { error: string }> {
  const account = await requireStall();
  const device = await getDevice();

  const [item] = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.id, itemId),
        eq(orders.stallId, account.stallId),
        inArray(orders.status, ["placed", "ready"]),
      ),
    )
    .limit(1);

  if (!item) return { error: "This order has already moved" };

  const updated = await db
    .update(orderItems)
    .set({ status: "ready", readyAt: new Date() })
    .where(and(eq(orderItems.id, itemId), eq(orderItems.status, "placed")))
    .returning({ id: orderItems.id });

  if (updated.length === 0) return { error: "This item has already moved" };

  await db
    .update(orders)
    .set({ status: "ready", readyAt: sql`coalesce(${orders.readyAt}, now())` })
    .where(and(eq(orders.id, item.orderId), eq(orders.status, "placed")));

  await logEvent({
    stallId: account.stallId,
    orderId: item.orderId,
    type: "item.ready",
    deviceLabel: device.label,
    payload: { itemId },
  });
  return { ok: true };
}

export async function completeItem(
  itemId: string,
): Promise<{ ok: true } | { error: string }> {
  const account = await requireStall();
  const device = await getDevice();

  const [item] = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.id, itemId),
        eq(orders.stallId, account.stallId),
        inArray(orders.status, ["placed", "ready"]),
      ),
    )
    .limit(1);

  if (!item) return { error: "This order has already moved" };

  const now = new Date();
  const updated = await db
    .update(orderItems)
    .set({ status: "completed", completedAt: now })
    .where(and(eq(orderItems.id, itemId), eq(orderItems.status, "ready")))
    .returning({ id: orderItems.id });

  if (updated.length === 0) return { error: "This item has already moved" };

  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, item.orderId),
        inArray(orderItems.status, ["placed", "ready"]),
      ),
    );

  if ((remaining?.count ?? 0) === 0) {
    await db
      .update(orders)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(orders.id, item.orderId),
          inArray(orders.status, ["placed", "ready"]),
        ),
      );
  }

  await logEvent({
    stallId: account.stallId,
    orderId: item.orderId,
    type: "item.completed",
    deviceLabel: device.label,
    payload: { itemId },
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

  await db
    .update(orderItems)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(orderItems.orderId, orderId),
        inArray(orderItems.status, ["placed", "ready"]),
      ),
    );

  await logEvent({
    stallId: account.stallId,
    orderId,
    type: "order.cancelled",
    deviceLabel: device.label,
    payload: { reason },
  });
  return { ok: true };
}
