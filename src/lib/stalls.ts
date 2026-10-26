import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, itemOptions, items, stalls } from "@/db/schema";
import type { MenuCategory, MenuItem, MenuOption } from "@/lib/menu-types";

export type { MenuCategory, MenuItem, MenuOption } from "@/lib/menu-types";

export type Stall = typeof stalls.$inferSelect;

export async function getStallBySlug(slug: string): Promise<Stall | null> {
  const rows = await db.select().from(stalls).where(eq(stalls.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getStallById(id: string): Promise<Stall | null> {
  const rows = await db.select().from(stalls).where(eq(stalls.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listStalls(): Promise<Stall[]> {
  return db
    .select()
    .from(stalls)
    .orderBy(asc(stalls.displayName))
    .limit(200);
}

/**
 * One menu, ready for either the public page or the counter.
 * `availableOnly` hides sold-out items from customers but keeps them for staff.
 */
export async function getMenu(
  stallId: string,
  opts: { availableOnly?: boolean } = {},
): Promise<{ categories: MenuCategory[]; uncategorised: MenuItem[] }> {
  const [categoryRows, itemRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.stallId, stallId))
      .orderBy(asc(categories.sort), asc(categories.name)),
    db
      .select()
      .from(items)
      .where(
        opts.availableOnly
          ? and(eq(items.stallId, stallId), eq(items.available, true))
          : eq(items.stallId, stallId),
      )
      .orderBy(asc(items.sort), asc(items.name)),
  ]);

  const optionRows =
    itemRows.length > 0
      ? await db
          .select()
          .from(itemOptions)
          .where(
            inArray(
              itemOptions.itemId,
              itemRows.map((item) => item.id),
            ),
          )
          .orderBy(asc(itemOptions.sort), asc(itemOptions.name))
      : [];

  const optionsByItem = new Map<string, MenuOption[]>();
  for (const option of optionRows) {
    const list = optionsByItem.get(option.itemId) ?? [];
    list.push({
      id: option.id,
      name: option.name,
      priceDeltaYen: option.priceDeltaYen,
    });
    optionsByItem.set(option.itemId, list);
  }

  const byCategory = new Map<string | null, MenuItem[]>();
  for (const item of itemRows) {
    const list = byCategory.get(item.categoryId) ?? [];
    list.push({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      priceYen: item.priceYen,
      imagePath: item.imagePath,
      available: item.available,
      options: optionsByItem.get(item.id) ?? [],
    });
    byCategory.set(item.categoryId, list);
  }

  return {
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      items: byCategory.get(category.id) ?? [],
    })),
    uncategorised: byCategory.get(null) ?? [],
  };
}
