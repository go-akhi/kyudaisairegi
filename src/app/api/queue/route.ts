import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItemOptions, orderItems, orders } from "@/db/schema";
import { getAccount } from "@/lib/auth";
import type { QueueOrder, QueueResponse } from "@/lib/queue-types";

export const dynamic = "force-dynamic";

/**
 * Everything still in flight, itemised. Polled every few seconds by both the
 * front (ready items) and the back (prep queue) — no websockets, no extra
 * process. Each item is its own ticket; the group marker (2/4) carries the
 * order context across batches and add-ons.
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

  const roots = [
    ...new Set(orderRows.map((order) => order.parentOrderId ?? order.id)),
  ];

  // Whole groups, including orders and items already finished, so 1/4 never
  // becomes 1/1 halfway through service.
  const groupOrders = await db
    .select({
      id: orders.id,
      parentOrderId: orders.parentOrderId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.stallId, account.stallId),
        or(inArray(orders.id, roots), inArray(orders.parentOrderId, roots)),
      ),
    );

  const groupOrderIds = groupOrders.map((order) => order.id);
  const groupOrderById = new Map(groupOrders.map((order) => [order.id, order]));

  const allItemRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, groupOrderIds))
    .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

  const optionRows =
    allItemRows.length > 0
      ? await db
          .select()
          .from(orderItemOptions)
          .where(
            inArray(
              orderItemOptions.orderItemId,
              allItemRows.map((item) => item.id),
            ),
          )
      : [];

  const optionsByOrderItem = new Map<
    string,
    { name: string; priceDeltaYen: number }[]
  >();
  for (const option of optionRows) {
    const list = optionsByOrderItem.get(option.orderItemId) ?? [];
    list.push({ name: option.nameSnapshot, priceDeltaYen: option.priceDeltaYen });
    optionsByOrderItem.set(option.orderItemId, list);
  }

  // Creation order across the whole group: parent order items first, then each
  // add-on batch in the order it was rung up.
  const orderTime = (orderId: string) =>
    groupOrderById.get(orderId)?.createdAt.getTime() ?? 0;

  const sortedItems = [...allItemRows].sort(
    (a, b) =>
      orderTime(a.orderId) - orderTime(b.orderId) ||
      a.lineNo - b.lineNo ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );

  const itemsByRoot = new Map<string, typeof sortedItems>();
  for (const item of sortedItems) {
    const order = groupOrderById.get(item.orderId);
    const root = order?.parentOrderId ?? item.orderId;
    const list = itemsByRoot.get(root) ?? [];
    list.push(item);
    itemsByRoot.set(root, list);
  }

  const markerByItem = new Map<string, { part: number; parts: number }>();
  for (const list of itemsByRoot.values()) {
    list.forEach((item, index) =>
      markerByItem.set(item.id, { part: index + 1, parts: list.length }),
    );
  }

  const itemsByOrder = new Map<string, QueueOrder["items"]>();
  for (const item of allItemRows) {
    if (item.status !== "placed" && item.status !== "ready") continue;
    const marker = markerByItem.get(item.id);
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      id: item.id,
      name: item.nameSnapshot,
      qty: item.qty,
      options: optionsByOrderItem.get(item.id) ?? [],
      status: item.status,
      readyAt: item.readyAt?.toISOString() ?? null,
      part: marker?.part ?? 1,
      parts: marker?.parts ?? 1,
    });
    itemsByOrder.set(item.orderId, list);
  }

  const payload: QueueResponse = {
    orders: orderRows
      .map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status as "placed" | "ready",
        customerName: order.customerName,
        note: order.note,
        totalYen: order.totalYen,
        discountPct: order.discountPct,
        createdAt: order.createdAt.toISOString(),
        readyAt: order.readyAt?.toISOString() ?? null,
        deviceLabel: order.deviceLabel,
        items: itemsByOrder.get(order.id) ?? [],
      }))
      .filter((order) => order.items.length > 0),
  };

  return Response.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
