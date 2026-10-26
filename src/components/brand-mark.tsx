import { cx } from "@/components/ui";

/** The receipt mark used on the landing page and the staff sign-in screen. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-[4px] bg-[#993333] text-[#fffef6]",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-[58%] w-[58%]" aria-hidden>
        <path
          d="M5 2.5h10v15l-2.5-1.6L10 17.5l-2.5-1.6L5 17.5v-15Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 6.5h5M7.5 9.5h5M7.5 12.5h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
