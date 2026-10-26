export type QueueItem = {
  name: string;
  qty: number;
  options: { name: string; priceDeltaYen: number }[];
};

export type QueueOrder = {
  id: string;
  number: number;
  /** 0 = original ticket, 1.. = linked add-on sharing the parent's number */
  addonNo: number;
  /** Another open add-on exists for this ticket */
  hasAddons: boolean;
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
