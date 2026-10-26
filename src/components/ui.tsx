import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "ok";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[#993333] text-[#fffef6] hover:bg-[#7c2828] active:bg-[#6b2222]",
  ok: "bg-[#1b6373] text-[#fffef6] hover:bg-[#15505e] active:bg-[#10414d]",
  secondary:
    "bg-white text-[#402000] ring-1 ring-[#d9cbb4] hover:bg-[#fbf6ea] active:bg-[#f4ecdd]",
  danger: "bg-[#b3261e] text-[#fffef6] hover:bg-[#9a201a] active:bg-[#841b16]",
  ghost: "text-[#614b37] hover:bg-[#f4ecdd] active:bg-[#e0d4bf]",
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
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
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
  "w-full rounded-md border border-[#d9cbb4] bg-white px-3 py-2.5 text-base text-[#402000] " +
  "placeholder:text-[#a08a72] focus:border-[#993333] focus:outline-none focus:ring-2 focus:ring-[#993333]/10";

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
      <span className="block text-sm font-medium text-[#614b37]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#856f58]">{hint}</span> : null}
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
    <div className={cx("rounded-lg bg-white ring-1 ring-[#e7dcc7]/80", className)}>
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
    neutral: "bg-[#f4ecdd] text-[#6b5544]",
    ok: "bg-[#e3ecec] text-[#15505e]",
    warn: "bg-[#fff3c9] text-[#6b4a00]",
    danger: "bg-[#f7e4df] text-[#7f241b]",
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
    <header className="sticky top-0 z-20 border-b border-[#e7dcc7] bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-[#856f58]">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d9cbb4] px-6 py-12 text-center text-sm text-[#856f58]">
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
        "font-medium text-[#402000] underline decoration-[#e7dcc7] underline-offset-4 hover:decoration-[#993333]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
