import type { Dict } from "@/lib/i18n/dictionaries";
import { cx } from "@/components/ui";

/**
 * Product shots for the landing page, drawn in HTML instead of screenshots so
 * they stay sharp at any size and follow the language switch. Purely
 * decorative: the wrappers are aria-hidden.
 */

export type Demo = Dict["landing"]["demo"];

const tones: Record<string, string> = {
  normal: "bg-white ring-black/10",
  warn: "bg-[#fff8e5] ring-[#c99a00]/35",
  late: "bg-[#fff3f3] ring-[#c4314b]/35",
};

const ageTones: Record<string, string> = {
  normal: "bg-[#f3f2f1] text-[#4b4b4b]",
  warn: "bg-[#c99a00] text-white",
  late: "bg-[#c4314b] text-white",
};

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5.2A2.5 2.5 0 0 1 8 2.7a2.5 2.5 0 0 1 2.5 2.5V7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#e8f1fa" />
      <path d="m6 10.2 2.6 2.6L14 7.4" stroke="#0067b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------- till */

export function TillMockup({ d, className }: { d: Demo; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "overflow-hidden rounded-xl bg-white shadow-[0_36px_90px_-32px_rgba(15,40,70,0.45)] ring-1 ring-black/10",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/5 bg-[#f3f2f1] px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e1dfdd]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e1dfdd]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e1dfdd]" />
        </span>
        <span className="mx-auto flex max-w-[70%] items-center gap-1.5 truncate rounded-[3px] bg-white px-3 py-1 text-[10px] text-[#605e5c] ring-1 ring-black/5">
          <LockIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{d.host}</span>
        </span>
        <span className="w-8" />
      </div>

      <div className="flex flex-col sm:flex-row">
        <div className="hidden w-[96px] shrink-0 flex-col border-r border-black/5 bg-[#faf9f8] p-2.5 sm:flex">
          <div className="mb-2 flex items-center gap-1.5 px-0.5">
            <span className="grid h-5 w-5 place-items-center rounded-[3px] bg-[#0067b8] text-[9px] font-bold text-white">
              屋
            </span>
            <span className="truncate text-[8px] leading-tight font-semibold whitespace-nowrap">
              {d.stall}
            </span>
          </div>
          <span className="rounded-[3px] bg-[#e8f1fa] px-2 py-1 text-[9px] font-semibold text-[#0067b8]">
            {d.newOrder}
          </span>
          <span className="mt-0.5 px-2 py-1 text-[9px] text-[#605e5c]">{d.menuTitle}</span>
          <span className="mt-auto border-t border-black/5 pt-2 text-[8px] text-[#8a8886]">
            {d.device}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="rounded-[4px] bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-semibold text-white">
              {d.newOrder}
            </span>
            <span className="rounded-[4px] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#4b4b4b] ring-1 ring-black/10">
              {d.readyTab}
              <span className="ml-1.5 rounded-[3px] bg-[#f3f2f1] px-1 py-0.5 text-[9px]">2</span>
            </span>
          </div>

          <p className="mb-1.5 text-[8px] font-semibold tracking-[0.14em] text-[#8a8886] uppercase">
            {d.category}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {d.items.map((item) => (
              <div
                key={item.name}
                className="rounded-lg bg-white p-2 ring-1 ring-black/10"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] leading-tight font-semibold">{item.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold">{item.price}</span>
                </div>
                <span className="mt-1 block text-[8px] text-[#8a8886]">{d.tapToAdd}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 border-t border-black/5 bg-[#faf9f8] p-3 sm:w-[188px] sm:border-t-0 sm:border-l">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold">{d.orderLabel}</span>
            <span className="rounded bg-[#dff6dd] px-1.5 py-0.5 text-[8px] font-semibold text-[#107c10]">
              {d.open}
            </span>
          </div>

          <ul className="mt-2 space-y-1.5">
            {d.lines.map((line) => (
              <li key={line.name} className="flex items-start justify-between gap-1.5 text-[9px]">
                <span className="min-w-0 leading-snug">
                  <span className="font-semibold">{line.qty}</span> {line.name}
                </span>
                <span className="shrink-0 font-medium">{line.price}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2 space-y-1 border-t border-black/10 pt-2 text-[9px]">
            <div className="flex justify-between text-[#605e5c]">
              <span>{d.subtotal}</span>
              <span>{d.subtotalValue}</span>
            </div>
            <div className="flex justify-between text-[#b54708]">
              <span>{d.discount}</span>
              <span>{d.discountValue}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span>{d.total}</span>
              <span>{d.totalValue}</span>
            </div>
          </div>

          <div className="mt-2 rounded-[4px] bg-[#0067b8] py-2 text-center text-[10px] font-semibold text-white">
            {d.place}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- handover */

export function HandoverMockup({ d, className }: { d: Demo; className?: string }) {
  const tickets = d.tickets.slice(0, 2);

  return (
    <div aria-hidden className={cx("relative mx-auto w-full max-w-[430px]", className)}>
      <div className="rounded-xl bg-white p-4 shadow-[0_30px_70px_-32px_rgba(15,40,70,0.4)] ring-1 ring-black/10">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-[#8a8886] uppercase">
            {d.readyTab}
          </span>
          <span className="rounded bg-[#dff6dd] px-1.5 py-0.5 text-[9px] font-semibold text-[#107c10]">
            2
          </span>
        </div>

        <div className="space-y-2">
          {tickets.map((ticket) => (
            <div key={ticket.number} className="rounded-lg bg-[#faf9f8] p-2.5 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] leading-none font-bold">{ticket.number}</p>
                  <p className="mt-1 text-[9px] text-[#605e5c]">{ticket.name}</p>
                </div>
                <span
                  className={cx(
                    "rounded px-1.5 py-1 text-[9px] font-semibold tabular-nums",
                    ageTones[ticket.tone] ?? ageTones.normal,
                  )}
                >
                  {ticket.age}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[10px] text-[#3b3a39]">
                {ticket.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-2 rounded-[3px] bg-[#107c10] py-1.5 text-center text-[9px] font-semibold text-white">
                {d.handOver}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 ml-auto w-44 rounded-lg bg-white p-3 shadow-[0_20px_50px_-24px_rgba(15,40,70,0.4)] ring-1 ring-black/10">
        <p className="text-[8px] font-semibold tracking-wide text-[#8a8886] uppercase">
          {d.sale}
        </p>
        <div className="mt-1 flex gap-1">
          {d.saleOptions.slice(1).map((option, index) => (
            <span
              key={option}
              className={cx(
                "flex-1 rounded-[3px] px-1 py-1.5 text-center text-[8px] font-semibold",
                index === 1
                  ? "bg-[#0067b8] text-white"
                  : "bg-white text-[#4b4b4b] ring-1 ring-black/10",
              )}
            >
              {option}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- kitchen */

export function KitchenMockup({ d, className }: { d: Demo; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "rounded-xl bg-[#f3f2f1] p-3 shadow-[0_30px_70px_-34px_rgba(15,40,70,0.4)] ring-1 ring-black/10",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <div>
          <p className="text-[11px] font-semibold">{d.kitchen}</p>
          <p className="text-[8px] text-[#8a8886]">{d.kitchenSub}</p>
        </div>
        <span className="rounded-[3px] bg-white px-2 py-1 text-[9px] font-medium text-[#605e5c] ring-1 ring-black/10">
          {d.preparing} · {d.openCount}
        </span>
      </div>

      <div className="space-y-2">
        {d.tickets.map((ticket) => (
          <div
            key={ticket.number}
            className={cx("rounded-lg p-2.5 ring-1", tones[ticket.tone] ?? tones.normal)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[15px] leading-none font-bold">{ticket.number}</p>
                <p className="mt-1 text-[9px] text-[#605e5c]">{ticket.name}</p>
              </div>
              <span
                className={cx(
                  "rounded px-1.5 py-1 text-[9px] font-semibold tabular-nums",
                  ageTones[ticket.tone] ?? ageTones.normal,
                )}
              >
                {ticket.age}
              </span>
            </div>
            <ul className="mt-2 space-y-0.5 text-[10px] text-[#3b3a39]">
              {ticket.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-2 rounded-[3px] bg-[#107c10] py-1.5 text-center text-[9px] font-semibold text-white">
              {d.markReady}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- menu */

export function MenuMockup({
  d,
  qr,
  className,
}: {
  d: Demo;
  qr: string | null;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cx(
        "space-y-2.5 rounded-xl bg-white p-3.5 shadow-[0_30px_70px_-34px_rgba(15,40,70,0.4)] ring-1 ring-black/10",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold">{d.menuTitle}</p>
        <span className="rounded-[3px] bg-[#dff6dd] px-1.5 py-0.5 text-[8px] font-semibold text-[#107c10]">
          {d.open}
        </span>
      </div>

      <div>
        <p className="mb-1 text-[8px] font-semibold tracking-wide text-[#8a8886] uppercase">
          {d.sale}
        </p>
        <div className="flex gap-1">
          {d.saleOptions.map((option, index) => (
            <span
              key={option}
              className={cx(
                "flex-1 rounded-[3px] px-1 py-1.5 text-center text-[8px] font-medium",
                index === 2
                  ? "bg-[#0067b8] text-white"
                  : "bg-white text-[#4b4b4b] ring-1 ring-black/10",
              )}
            >
              {option}
            </span>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-black/5 rounded-lg ring-1 ring-black/5">
        {d.menuItems.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2 px-2 py-2">
            <span
              className={cx(
                "h-7 w-7 shrink-0 rounded-md",
                index === 0
                  ? "bg-gradient-to-br from-[#f7d9c4] to-[#d9a06b]"
                  : index === 1
                    ? "bg-gradient-to-br from-[#ffe9b3] to-[#dcae4a]"
                    : "bg-gradient-to-br from-[#e6e2dc] to-[#c9c2b8]",
              )}
            />
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{item.name}</span>
            <span className="text-[10px] font-semibold">{item.price}</span>
            <span
              className={cx(
                "rounded px-1.5 py-0.5 text-[8px] font-semibold",
                item.available
                  ? "bg-[#e8f1fa] text-[#0067b8]"
                  : "bg-[#fde7e9] text-[#a4262c]",
              )}
            >
              {item.available ? d.available : d.soldOut}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 rounded-lg bg-[#faf9f8] p-2.5 ring-1 ring-black/5">
        {qr ? (
          <div
            className="h-14 w-14 shrink-0 rounded bg-white p-1 ring-1 ring-black/5 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded bg-white ring-1 ring-black/10" />
        )}
        <div className="min-w-0">
          <p className="text-[9px] font-semibold">{d.publicMenu}</p>
          <p className="truncate text-[8px] text-[#605e5c]">/s/takoyaki</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ phone */

export function PhoneMockup({ d, className }: { d: Demo; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "relative w-[236px] rounded-[2.4rem] bg-[#1a1a1a] p-[7px] shadow-[0_40px_80px_-30px_rgba(15,40,70,0.5)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[1.9rem] bg-white">
        <div className="absolute top-1.5 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-[#1a1a1a]" />
        <div className="flex h-24 items-end bg-gradient-to-br from-[#f2b880] via-[#e08a4a] to-[#a33d12] p-3 pt-8">
          <span className="text-[13px] font-bold text-white drop-shadow-sm">{d.stall}</span>
        </div>
        <div className="p-3">
          <div className="rounded-md bg-[#0067b8] px-2 py-1.5 text-center text-[9px] font-semibold text-white">
            {d.saleBanner}
          </div>
          <ul className="mt-2 divide-y divide-black/5">
            {d.menuItems.slice(0, 2).map((item) => (
              <li key={item.name} className="flex items-baseline justify-between gap-2 py-1.5">
                <span className="text-[9px] font-medium">{item.name}</span>
                <span className="text-[9px] font-semibold">{item.price}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-black/5 pt-2 text-center text-[8px] leading-snug text-[#8a8886]">
            {d.orderNote}
          </p>
        </div>
      </div>
    </div>
  );
}

export { CheckIcon };
