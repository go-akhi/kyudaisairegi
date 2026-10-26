/** JPY has no minor unit — everything is an integer number of yen. */
export const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

/** The stall's business day is JST regardless of where the container runs. */
export function dayJst(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date);
}

/**
 * Discounts are applied per line and summed, so the ticket always adds up:
 * what a customer sees on the item is exactly what lands in the total.
 */
export function unitSalePrice(priceYen: number, pct: number): number {
  if (pct <= 0) return priceYen;
  return priceYen - Math.round((priceYen * Math.min(pct, 100)) / 100);
}

export function lineDiscountYen(unitPriceYen: number, qty: number, pct: number): number {
  if (pct <= 0) return 0;
  return Math.round((unitPriceYen * Math.min(pct, 100)) / 100) * qty;
}

export const SALE_PRESETS = [0, 10, 20, 30] as const;

export type OrderStatus = "placed" | "ready" | "completed" | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Preparing",
  ready: "Ready",
  completed: "Handed over",
  cancelled: "Cancelled",
};

/** Seconds since the order was placed, for the ticket clock. */
export function elapsedSeconds(from: Date | string, now: number = Date.now()): number {
  const started = typeof from === "string" ? new Date(from) : from;
  return Math.max(0, Math.floor((now - started.getTime()) / 1000));
}

export function elapsedLabel(
  seconds: number,
  locale: "en" | "ja" = "en",
): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  if (locale === "ja") {
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  }
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
