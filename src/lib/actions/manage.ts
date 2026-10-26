"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories, events, itemOptions, items, stalls } from "@/db/schema";
import { requireStall } from "@/lib/auth";
import { getDevice } from "@/lib/device";
import { removeImage, saveImage } from "@/lib/uploads";

const back = (query = "") => redirect(`/manage${query}`);

async function audit(
  stallId: string,
  type: string,
  deviceLabel: string,
  payload?: Record<string, unknown>,
) {
  await db.insert(events).values({ stallId, type, deviceLabel, payload });
}

async function refresh(stallId: string) {
  const rows = await db
    .select({ slug: stalls.slug })
    .from(stalls)
    .where(eq(stalls.id, stallId))
    .limit(1);

  revalidatePath("/manage");
  revalidatePath("/");
  if (rows[0]) revalidatePath(`/s/${rows[0].slug}`);
}

/* -------------------------------------------------------------------- shop */

export async function updateStall(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const locationNote = String(formData.get("locationNote") ?? "").trim();
  if (!displayName) back("?error=name");

  const before = await db
    .select({ heroImage: stalls.heroImage })
    .from(stalls)
    .where(eq(stalls.id, account.stallId))
    .limit(1);

  let heroImage = before[0]?.heroImage ?? null;

  if (formData.get("removeHero") === "1" && heroImage) {
    await removeImage(heroImage);
    heroImage = null;
  }

  const file = formData.get("hero");
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveImage(account.stallId, file);
      if (heroImage) await removeImage(heroImage);
      heroImage = saved;
    } catch {
      back("?error=image");
    }
  }

  await db
    .update(stalls)
    .set({
      displayName: displayName.slice(0, 80),
      description: description.slice(0, 600),
      locationNote: locationNote.slice(0, 120),
      heroImage,
    })
    .where(eq(stalls.id, account.stallId));

  await audit(account.stallId, "stall.updated", device.label);
  await refresh(account.stallId);
  back("?saved=shop");
}

export async function setSale(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();

  const pct = Number(formData.get("pct") ?? 0);
  if (![0, 10, 20, 30].includes(pct)) back("?error=sale");

  await db
    .update(stalls)
    .set({ salePct: pct })
    .where(eq(stalls.id, account.stallId));

  await audit(account.stallId, "stall.sale", device.label, { pct });
  await refresh(account.stallId);
  back();
}

export async function setOpen(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();
  const isOpen = formData.get("isOpen") === "1";

  await db
    .update(stalls)
    .set({ isOpen })
    .where(eq(stalls.id, account.stallId));

  await audit(account.stallId, "stall.open", device.label, { isOpen });
  await refresh(account.stallId);
  back();
}

/* -------------------------------------------------------------- categories */

export async function addCategory(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) back("?error=category");

  await db.insert(categories).values({
    stallId: account.stallId,
    name: name.slice(0, 60),
  });

  await audit(account.stallId, "category.created", device.label, { name });
  await refresh(account.stallId);
  back();
}

export async function deleteCategory(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();
  const id = String(formData.get("categoryId") ?? "");

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.stallId, account.stallId)));

  await audit(account.stallId, "category.deleted", device.label, { id });
  await refresh(account.stallId);
  back();
}

/* ------------------------------------------------------------------- items */

/** "Large +100" per line. Keeps the model flat, one level deep. */
function parseOptions(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const match = line.match(/^(.*?)\s*([+-]\s*\d+)?$/);
      const name = (match?.[1] ?? line).trim().slice(0, 40);
      const delta = Number((match?.[2] ?? "0").replace(/\s+/g, ""));
      return { name, priceDeltaYen: Number.isFinite(delta) ? delta : 0 };
    })
    .filter((option) => option.name.length > 0);
}

export async function saveItem(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();

  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceYen = Number(formData.get("priceYen") ?? NaN);
  const description = String(formData.get("description") ?? "").trim();
  const rawCategoryId = String(formData.get("categoryId") ?? "");
  const available = formData.get("available") === "on";
  const optionsRaw = String(formData.get("options") ?? "");

  if (!name) back("?error=itemname");
  if (!Number.isInteger(priceYen) || priceYen < 0 || priceYen > 1_000_000) {
    back("?error=price");
  }

  let categoryId: string | null = rawCategoryId || null;
  if (categoryId) {
    const owned = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.stallId, account.stallId)),
      )
      .limit(1);
    if (owned.length === 0) categoryId = null;
  }

  const file = formData.get("image");
  let existingImage: string | null = null;

  if (itemId) {
    const rows = await db
      .select({ imagePath: items.imagePath })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.stallId, account.stallId)))
      .limit(1);
    existingImage = rows[0]?.imagePath ?? null;
  }

  let imagePath = existingImage;
  if (formData.get("removeImage") === "1") {
    if (imagePath) await removeImage(imagePath);
    imagePath = null;
  }
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveImage(account.stallId, file);
      if (imagePath) await removeImage(imagePath);
      imagePath = saved;
    } catch {
      back("?error=image");
    }
  }

  const values = {
    name: name.slice(0, 60),
    description: description.slice(0, 300),
    priceYen,
    categoryId,
    available,
    imagePath,
  };

  const options = parseOptions(optionsRaw);

  if (itemId) {
    await db
      .update(items)
      .set(values)
      .where(and(eq(items.id, itemId), eq(items.stallId, account.stallId)));

    await db.delete(itemOptions).where(eq(itemOptions.itemId, itemId));
    if (options.length > 0) {
      await db
        .insert(itemOptions)
        .values(options.map((option) => ({ ...option, itemId })));
    }
    await audit(account.stallId, "item.updated", device.label, { itemId });
  } else {
    const [created] = await db
      .insert(items)
      .values({ ...values, stallId: account.stallId })
      .returning({ id: items.id });

    if (options.length > 0) {
      await db
        .insert(itemOptions)
        .values(options.map((option) => ({ ...option, itemId: created.id })));
    }
    await audit(account.stallId, "item.created", device.label, {
      itemId: created.id,
    });
  }

  await refresh(account.stallId);
  back("?saved=item");
}

export async function toggleItem(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();
  const itemId = String(formData.get("itemId") ?? "");
  const available = formData.get("available") === "1";

  await db
    .update(items)
    .set({ available })
    .where(and(eq(items.id, itemId), eq(items.stallId, account.stallId)));

  await audit(account.stallId, "item.availability", device.label, {
    itemId,
    available,
  });
  await refresh(account.stallId);
  back();
}

export async function deleteItem(formData: FormData) {
  const account = await requireStall();
  const device = await getDevice();
  const itemId = String(formData.get("itemId") ?? "");

  const rows = await db
    .select({ imagePath: items.imagePath })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.stallId, account.stallId)))
    .limit(1);

  if (rows[0]?.imagePath) await removeImage(rows[0].imagePath);

  await db
    .delete(items)
    .where(and(eq(items.id, itemId), eq(items.stallId, account.stallId)));

  await audit(account.stallId, "item.deleted", device.label, { itemId });
  await refresh(account.stallId);
  back();
}
