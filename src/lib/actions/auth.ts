"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { createSession, destroySession, getAccount, verifyPassword } from "@/lib/auth";
import { setDevice, type Mode } from "@/lib/device";
import { clearAttempts, tooManyAttempts } from "@/lib/rate-limit";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) redirect("/login?error=empty");

  const headerList = await headers();
  const ip =
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const attemptKey = `login:${ip}:${username}`;

  if (tooManyAttempts(attemptKey)) redirect("/login?error=slow");

  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .limit(1);

  const account = rows[0];
  if (!account || !verifyPassword(password, account.passwordHash)) {
    redirect("/login?error=invalid");
  }

  clearAttempts(attemptKey);
  await createSession(account.id);
  redirect(account.kind === "admin" ? "/admin" : "/mode");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function chooseMode(formData: FormData) {
  const account = await getAccount();
  if (!account || account.kind !== "stall") redirect("/login");

  const mode = String(formData.get("mode") ?? "") as Mode;
  if (mode !== "front" && mode !== "back") redirect("/mode");

  const label =
    String(formData.get("label") ?? "").trim() ||
    (mode === "front" ? "Front" : "Back");

  await setDevice(mode, label);
  redirect(mode === "front" ? "/counter" : "/queue");
}
