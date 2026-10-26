import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "./ui";
import { logout } from "@/lib/actions/auth";
import { getDict } from "@/lib/i18n/locale";

const linkClass =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#6b5544] hover:bg-[#f4ecdd]";

export async function StaffNav({ mode }: { mode: "front" | "back" }) {
  const { locale, t } = await getDict();

  return (
    <nav className="flex items-center gap-0.5">
      {mode === "front" ? (
        <>
          <Link href="/counter" className={linkClass}>
            {t.nav.counter}
          </Link>
          <Link href="/manage" className={linkClass}>
            {t.nav.manage}
          </Link>
        </>
      ) : (
        <Link href="/queue" className={linkClass}>
          {t.nav.queue}
        </Link>
      )}
      <Link href="/mode?switch=1" className={linkClass}>
        {t.nav.switchDevice}
      </Link>
      <LocaleSwitcher
        current={locale}
        other={t.locale.other}
        label={t.locale.label}
      />
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          {t.nav.signOut}
        </Button>
      </form>
    </nav>
  );
}
