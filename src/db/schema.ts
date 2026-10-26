import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const uid = () =>
  text("id").primaryKey().default(sql`gen_random_uuid()`);

/* ------------------------------------------------------------------ stalls */

export const stalls = pgTable("stalls", {
  id: uid(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
  heroImage: text("hero_image"),
  locationNote: text("location_note").notNull().default(""),
  isOpen: boolean("is_open").notNull().default(true),
  /** 0 = no sale. Front-of-house presets: 0 | 10 | 20 | 30 */
  salePct: integer("sale_pct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------------------------------------------- accounts */

export const accounts = pgTable("accounts", {
  id: uid(),
  /** 'admin' (festival organiser) | 'stall' (shared per-stall credential) */
  kind: text("kind").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  stallId: text("stall_id").references(() => stalls.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the bearer token — the raw token only ever lives in the cookie */
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_account_idx").on(t.accountId)],
);

/* -------------------------------------------------------------------- menu */

export const categories = pgTable(
  "categories",
  {
    id: uid(),
    stallId: text("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("categories_stall_idx").on(t.stallId)],
);

export const items = pgTable(
  "items",
  {
    id: uid(),
    stallId: text("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Integer yen. JPY has no minor unit, so no cents anywhere. */
    priceYen: integer("price_yen").notNull(),
    imagePath: text("image_path"),
    available: boolean("available").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_stall_idx").on(t.stallId)],
);

/** Flat, one level deep: "Large +100", "Extra cheese +50". No nesting. */
export const itemOptions = pgTable(
  "item_options",
  {
    id: uid(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDeltaYen: integer("price_delta_yen").notNull().default(0),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("item_options_item_idx").on(t.itemId)],
);

/* ------------------------------------------------------------------ orders */

export const orders = pgTable(
  "orders",
  {
    id: uid(),
    stallId: text("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    /** JST calendar day, 'YYYY-MM-DD' */
    day: date("day", { mode: "string" }).notNull(),
    /** Per-stall, per-day, starts at 1 */
    number: integer("number").notNull(),
    status: text("status").notNull().default("placed"),
    customerName: text("customer_name").notNull().default(""),
    note: text("note").notNull().default(""),
    /** Which physical device rang it up — the only attribution we get on shared creds */
    deviceLabel: text("device_label").notNull().default(""),
    subtotalYen: integer("subtotal_yen").notNull(),
    /** Frozen at creation. Never recomputed from the stall's current sale. */
    discountPct: integer("discount_pct").notNull().default(0),
    discountYen: integer("discount_yen").notNull().default(0),
    totalYen: integer("total_yen").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
  },
  (t) => [
    uniqueIndex("orders_stall_day_number_idx").on(t.stallId, t.day, t.number),
    index("orders_stall_status_idx").on(t.stallId, t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uid(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
    /** Snapshots so renaming or repricing never rewrites history */
    nameSnapshot: text("name_snapshot").notNull(),
    unitPriceYen: integer("unit_price_yen").notNull(),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderItemOptions = pgTable(
  "order_item_options",
  {
    id: uid(),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    optionId: text("option_id").references(() => itemOptions.id, {
      onDelete: "set null",
    }),
    nameSnapshot: text("name_snapshot").notNull(),
    priceDeltaYen: integer("price_delta_yen").notNull().default(0),
  },
  (t) => [index("order_item_options_item_idx").on(t.orderItemId)],
);

/* ------------------------------------------------------------------ events */

/** Order transitions AND stall-level changes (menu, prices, sale) in one log. */
export const events = pgTable(
  "events",
  {
    id: uid(),
    stallId: text("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    deviceLabel: text("device_label").notNull().default(""),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_stall_idx").on(t.stallId, t.createdAt)],
);

/* --------------------------------------------------------- order numbering */

export const orderCounter = pgTable(
  "order_counter",
  {
    stallId: text("stall_id")
      .notNull()
      .references(() => stalls.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.stallId, t.day] })],
);
