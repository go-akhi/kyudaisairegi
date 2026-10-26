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
export async function getDevice(): Promise<Device> {
  const store = await cookies();
  const raw = store.get(MODE_COOKIE)?.value;
  const mode: Mode | null = raw === "front" || raw === "back" ? raw : null;

  const label = store.get(DEVICE_COOKIE)?.value?.slice(0, 40) || "";
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
