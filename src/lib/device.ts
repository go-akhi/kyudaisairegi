import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Mode = "front" | "back";

const MODE_COOKIE = "kd_mode";
const DEVICE_COOKIE = "kd_device";

export type Device = {
  mode: Mode | null;
  /** Human label shown on tickets and in the event log, e.g. "Front 1" */
  label: string;
};

/**
 * Mode lives on the device, not in the session. A tablet that reboots mid-rush
 * must not land on a mode picker with a queue waiting.
 */
/**
 * Next percent-encodes cookie values on write, so "レジ1" comes back as
 * "%E3%83%AC%E3%82%B81". Decode once, tolerating hand-set raw values.
 */
function readLabel(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).slice(0, 40);
  } catch {
    return raw.slice(0, 40);
  }
}

export async function getDevice(): Promise<Device> {
  const store = await cookies();
  const raw = store.get(MODE_COOKIE)?.value;
  const mode: Mode | null = raw === "front" || raw === "back" ? raw : null;

  const label = readLabel(store.get(DEVICE_COOKIE)?.value);
  return { mode, label };
}

export async function setDevice(mode: Mode, label: string): Promise<void> {
  const store = await cookies();
  const options = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  };
  store.set(MODE_COOKIE, mode, options);
  store.set(DEVICE_COOKIE, label.slice(0, 40), options);
}

export async function requireMode(mode: Mode) {
  const device = await getDevice();
  if (device.mode !== mode) redirect("/mode");
  return device as Device & { mode: Mode };
}
