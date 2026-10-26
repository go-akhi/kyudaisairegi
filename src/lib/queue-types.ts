export type QueueItem = {
  name: string;
  qty: number;
  options: { name: string; priceDeltaYen: number }[];
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
