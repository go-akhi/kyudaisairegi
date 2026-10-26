import { redirect } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { getAccount } from "@/lib/auth";
import { Button, Card, Field, field } from "@/components/ui";

const ERRORS: Record<string, string> = {
  empty: "Enter a username and password.",
  invalid: "That username and password don't match.",
  slow: "Too many attempts. Wait a minute and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccount();
  if (account) redirect(account.kind === "admin" ? "/admin" : "/mode");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-orange-700 uppercase">
          Stall Console
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Staff sign in
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          One account per stall, shared across its devices.
        </p>
      </div>

      <Card className="p-5">
        <form action={login} className="space-y-4">
          <Field label="Username">
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              className={field}
              required
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className={field}
              required
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {ERRORS[error] ?? "Sign in failed."}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs text-stone-400">
        Lost the password? Ask the festival admin to reset it.
      </p>
    </main>
  );
}
