import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItemOptions, orderItems, orders } from "@/db/schema";
import { getAccount } from "@/lib/auth";
import type { QueueOrder, QueueResponse } from "@/lib/queue-types";

export const dynamic = "force-dynamic";

/**
 * Everything still in flight. Polled every few seconds by both the front
 * (ready list) and the back (prep queue) — no websockets, no extra process.
 */
export async function GET() {
  const account = await getAccount();
  if (!account || account.kind !== "stall" || !account.stallId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.stallId, account.stallId),
        inArray(orders.status, ["placed", "ready"]),
      ),
    )
    .orderBy(asc(orders.createdAt));

  if (orderRows.length === 0) {
    return Response.json({ orders: [] } satisfies QueueResponse);
  }

  const orderIds = orderRows.map((order) => order.id);

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.nameSnapshot));

  const optionRows =
    itemRows.length > 0
      ? await db
          .select()
          .from(orderItemOptions)
          .where(
            inArray(
              orderItemOptions.orderItemId,
              itemRows.map((item) => item.id),
            ),
          )
      : [];

  const optionsByOrderItem = new Map<string, { name: string; priceDeltaYen: number }[]>();
  for (const option of optionRows) {
    const list = optionsByOrderItem.get(option.orderItemId) ?? [];
    list.push({ name: option.nameSnapshot, priceDeltaYen: option.priceDeltaYen });
    optionsByOrderItem.set(option.orderItemId, list);
  }

  const itemsByOrder = new Map<string, QueueOrder["items"]>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      name: item.nameSnapshot,
      qty: item.qty,
      options: optionsByOrderItem.get(item.id) ?? [],
    });
    itemsByOrder.set(item.orderId, list);
  }

  const roots = [
    ...new Set(orderRows.map((order) => order.parentOrderId ?? order.id)),
  ];

  // Whole groups, including parts already handed over, so 1/2 never becomes
  // 1/1 halfway through service.
  const groupRows = await db
    .select({
      id: orders.id,
      parentOrderId: orders.parentOrderId,
      addonNo: orders.addonNo,
    })
    .from(orders)
    .where(
      and(
        eq(orders.stallId, account.stallId),
        or(inArray(orders.id, roots), inArray(orders.parentOrderId, roots)),
      ),
    );

  const partsByRoot = new Map<string, number>();
  for (const row of groupRows) {
    const root = row.parentOrderId ?? row.id;
    partsByRoot.set(root, Math.max(partsByRoot.get(root) ?? 1, row.addonNo + 1));
  }

  const payload: QueueResponse = {
    orders: orderRows.map((order) => ({
      id: order.id,
      number: order.number,
      part: order.addonNo + 1,
      parts: partsByRoot.get(order.parentOrderId ?? order.id) ?? 1,
      status: order.status as "placed" | "ready",
      customerName: order.customerName,
      note: order.note,
      totalYen: order.totalYen,
      discountPct: order.discountPct,
      createdAt: order.createdAt.toISOString(),
      readyAt: order.readyAt?.toISOString() ?? null,
      deviceLabel: order.deviceLabel,
      items: itemsByOrder.get(order.id) ?? [],
    })),
  };

  return Response.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
