import "server-only";

import { cookies, headers } from "next/headers";
import { dictionaries, type Dict, LOCALE_COOKIE, type Locale } from "./dictionaries";

export type { Locale } from "./dictionaries";

/**
 * Cookie first, then the browser's preference. A Japanese phone opening the
 * public menu gets Japanese without touching a switch.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (chosen === "en" || chosen === "ja") return chosen;

  const headerList = await headers();
  const preferred = (headerList.get("accept-language") ?? "").toLowerCase();
  const japaneseIndex = preferred.indexOf("ja");
  const englishIndex = preferred.indexOf("en");

  if (japaneseIndex === -1) return "en";
  if (englishIndex === -1) return "ja";
  return japaneseIndex < englishIndex ? "ja" : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
