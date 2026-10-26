CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"stall_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"stall_id" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"stall_id" text NOT NULL,
	"order_id" text,
	"type" text NOT NULL,
	"device_label" text DEFAULT '' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_options" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"price_delta_yen" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"stall_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_yen" integer NOT NULL,
	"image_path" text,
	"available" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_counter" (
	"stall_id" text NOT NULL,
	"day" date NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_counter_stall_id_day_pk" PRIMARY KEY("stall_id","day")
);
--> statement-breakpoint
CREATE TABLE "order_item_options" (
	"id" text PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"option_id" text,
	"name_snapshot" text NOT NULL,
	"price_delta_yen" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"item_id" text,
	"name_snapshot" text NOT NULL,
	"unit_price_yen" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"stall_id" text NOT NULL,
	"day" date NOT NULL,
	"number" integer NOT NULL,
	"status" text DEFAULT 'placed' NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"device_label" text DEFAULT '' NOT NULL,
	"subtotal_yen" integer NOT NULL,
	"discount_pct" integer DEFAULT 0 NOT NULL,
	"discount_yen" integer DEFAULT 0 NOT NULL,
	"total_yen" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stalls" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"hero_image" text,
	"location_note" text DEFAULT '' NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"sale_pct" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stalls_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_options" ADD CONSTRAINT "item_options_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_counter" ADD CONSTRAINT "order_counter_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_option_id_item_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."item_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_stall_id_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_stall_idx" ON "categories" USING btree ("stall_id");--> statement-breakpoint
CREATE INDEX "events_stall_idx" ON "events" USING btree ("stall_id","created_at");--> statement-breakpoint
CREATE INDEX "item_options_item_idx" ON "item_options" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "items_stall_idx" ON "items" USING btree ("stall_id");--> statement-breakpoint
CREATE INDEX "order_item_options_item_idx" ON "order_item_options" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stall_day_number_idx" ON "orders" USING btree ("stall_id","day","number");--> statement-breakpoint
CREATE INDEX "orders_stall_status_idx" ON "orders" USING btree ("stall_id","status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id");