"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, stalls } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";

const back = (query = "") => redirect(`/admin${query}`);

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const USERNAME = /^[a-z0-9][a-z0-9_.-]{1,38}[a-z0-9]$/;

export async function createStall(formData: FormData) {
  await requireAdmin();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!displayName) back("?error=name");
  if (!SLUG.test(slug)) back("?error=slug");
  if (!USERNAME.test(username)) back("?error=username");
  if (password.length < 8) back("?error=password");

  try {
    await db.transaction(async (tx) => {
      const [stall] = await tx
        .insert(stalls)
        .values({ slug, displayName: displayName.slice(0, 80), isOpen: true })
        .returning({ id: stalls.id });

      await tx.insert(accounts).values({
        kind: "stall",
        username,
        passwordHash: hashPassword(password),
        stallId: stall.id,
      });
    });
  } catch {
    back("?error=taken");
  }

  back("?saved=created");
}

export async function resetStallPassword(formData: FormData) {
  await requireAdmin();

  const stallId = String(formData.get("stallId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) back("?error=password");

  const updated = await db
    .update(accounts)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(accounts.stallId, stallId))
    .returning({ id: accounts.id });

  if (updated.length === 0) back("?error=missing");

  // Every device signed in as that stall is now logged out.
  back("?saved=password");
}

export async function deleteStall(formData: FormData) {
  await requireAdmin();

  const stallId = String(formData.get("stallId") ?? "");
  // Orders, menu, and the shared account cascade from the stall row.
  await db.delete(stalls).where(eq(stalls.id, stallId));

  back("?saved=deleted");
}

export async function setStallOpen(formData: FormData) {
  await requireAdmin();

  const stallId = String(formData.get("stallId") ?? "");
  const isOpen = formData.get("isOpen") === "1";

  await db.update(stalls).set({ isOpen }).where(eq(stalls.id, stallId));
  back();
}
