DROP INDEX "orders_stall_day_number_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "addon_no" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "parent_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_parent_order_id_orders_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_parent_idx" ON "orders" USING btree ("parent_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stall_day_number_idx" ON "orders" USING btree ("stall_id","day","number","addon_no");