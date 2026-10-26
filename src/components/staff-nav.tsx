import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { Button } from "./ui";

const linkClass =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200/70";

export function StaffNav({ mode }: { mode: "front" | "back" }) {
  return (
    <nav className="flex items-center gap-0.5">
      {mode === "front" ? (
        <>
          <Link href="/counter" className={linkClass}>
            Counter
          </Link>
          <Link href="/manage" className={linkClass}>
            Manage
          </Link>
        </>
      ) : (
        <Link href="/queue" className={linkClass}>
          Queue
        </Link>
      )}
      <Link href="/mode?switch=1" className={linkClass}>
        Switch
      </Link>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </nav>
  );
}
