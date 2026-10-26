export type QueueItem = {
  name: string;
  qty: number;
  options: { name: string; priceDeltaYen: number }[];
};

export type QueueOrder = {
  id: string;
  number: number;
  /** 1-based position within a multi-part ticket (1/2, 2/2…) */
  part: number;
  parts: number;
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
