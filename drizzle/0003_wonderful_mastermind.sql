ALTER TABLE "order_items" ADD COLUMN "status" text DEFAULT 'placed' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "order_items" AS oi
SET "created_at" = o."created_at",
    "status" = CASE
      WHEN o."status" = 'completed' THEN 'completed'
      WHEN o."status" = 'ready' THEN 'ready'
      WHEN o."status" = 'cancelled' THEN 'cancelled'
      ELSE 'placed'
    END,
    "ready_at" = CASE WHEN o."status" IN ('ready','completed') THEN o."ready_at" END,
    "completed_at" = CASE WHEN o."status" = 'completed' THEN o."completed_at" END
FROM "orders" AS o
WHERE oi."order_id" = o."id";--> statement-breakpoint
CREATE INDEX "order_items_status_idx" ON "order_items" USING btree ("status");