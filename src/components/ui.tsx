import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "ok";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950",
  ok: "bg-green-700 text-white hover:bg-green-800 active:bg-green-900",
  secondary:
    "bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-50 active:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-stone-700 hover:bg-stone-200/70 active:bg-stone-200",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-14 px-6 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors select-none disabled:pointer-events-none disabled:opacity-40",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------- form */

export const field =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 " +
  "placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

/* -------------------------------------------------------------------- card */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("rounded-2xl bg-white ring-1 ring-stone-200/80", className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- misc */

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-stone-100 text-stone-600",
    ok: "bg-green-100 text-green-800",
    warn: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function TopBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-stone-500">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900",
        className,
      )}
    >
      {children}
    </Link>
  );
}
