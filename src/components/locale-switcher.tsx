"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Locale lives in a plain cookie (not httpOnly) so the switch keeps the URL
 * untouched — QR codes point at /s/<slug> and must never gain a /ja prefix.
 */
export function LocaleSwitcher({
  current,
  other,
  label,
}: {
  current: Locale;
  other: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      onClick={() => switchTo(current === "ja" ? "en" : "ja")}
      className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#6b5544] hover:bg-[#f4ecdd] disabled:opacity-50"
    >
      {other}
    </button>
  );
}
