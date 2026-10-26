export type QueueItem = {
  id: string;
  name: string;
  qty: number;
  options: { name: string; priceDeltaYen: number }[];
  status: "placed" | "ready";
  /** When this item became ready (for the handover timer) */
  readyAt: string | null;
  /** 1-based position in the customer's whole order, e.g. 2/4 */
  part: number;
  parts: number;
};

export type QueueOrder = {
  id: string;
  number: number;
  status: "placed" | "ready";
  customerName: string;
  note: string;
  totalYen: number;
  discountPct: number;
  createdAt: string;
  readyAt: string | null;
  deviceLabel: string;
  items: QueueItem[];
};

export type QueueResponse = { orders: QueueOrder[] };
