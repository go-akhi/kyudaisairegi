ALTER TABLE "order_items" ADD COLUMN "line_no" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "order_items" AS oi
SET "line_no" = sub.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "order_id" ORDER BY "id") AS rn
  FROM "order_items"
) AS sub
WHERE oi."id" = sub."id";
