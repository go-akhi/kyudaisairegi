import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button, Card, Field, field } from "@/components/ui";
import { login } from "@/lib/actions/auth";
import { getAccount } from "@/lib/auth";
import { getDict } from "@/lib/i18n/locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccount();
  if (account) redirect(account.kind === "admin" ? "/admin" : "/mode");

  const { locale, t } = await getDict();
  const { error } = await searchParams;
  const message = error
    ? (t.login.errors as Record<string, string>)[error] ?? t.login.errors.generic
    : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <p className="text-sm font-semibold tracking-widest text-[#993333] uppercase">
            {t.login.eyebrow}
          </p>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t.login.title}</h1>
        <p className="mt-1 text-sm text-[#856f58]">{t.login.subtitle}</p>
      </div>

      <Card className="p-5">
        <form action={login} className="space-y-4">
          <Field label={t.login.username}>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              className={field}
              required
            />
          </Field>
          <Field label={t.login.password}>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className={field}
              required
            />
          </Field>

          {message ? (
            <p className="rounded-lg bg-[#f9e7e2] px-3 py-2 text-sm text-[#8f2a20]">
              {message}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            {t.login.submit}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs text-[#a08a72]">{t.login.hint}</p>

      <div className="mt-4 flex justify-center">
        <LocaleSwitcher
          current={locale}
          other={t.locale.other}
          label={t.locale.label}
        />
      </div>
    </main>
  );
}
