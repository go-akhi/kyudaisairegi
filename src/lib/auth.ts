import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, sessions } from "@/db/schema";

const SESSION_COOKIE = "kd_session";
const SESSION_DAYS = 30;

export type Account = {
  id: string;
  kind: "admin" | "stall";
  username: string;
  stallId: string | null;
};

/* ------------------------------------------------------------------ hashing */

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/* ---------------------------------------------------------------- sessions */

export async function createSession(accountId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.insert(sessions).values({ id: sha256(token), accountId, expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function getAccount(): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: accounts.id,
      kind: accounts.kind,
      username: accounts.username,
      stallId: accounts.stallId,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return { ...row, kind: row.kind === "admin" ? "admin" : "stall" };
}

/** Stall console (front/back). Admins are bounced to their own area. */
export async function requireStall(): Promise<Account & { stallId: string }> {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.kind === "admin") redirect("/admin");
  if (!account.stallId) redirect("/login");
  return account as Account & { stallId: string };
}

export async function requireAdmin(): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.kind !== "admin") redirect("/mode");
  return account;
}
