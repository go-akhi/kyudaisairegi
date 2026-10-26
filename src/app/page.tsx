import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon, HandoverMockup, KitchenMockup, MenuMockup, PhoneMockup, TillMockup } from "@/components/landing/mockups";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getDict } from "@/lib/i18n/locale";
import { listStalls } from "@/lib/stalls";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getDict();
  return {
    title: `${t.landing.brand} — ${t.landing.hero.title}`,
    description: t.landing.hero.subtitle,
    openGraph: {
      title: `${t.landing.brand} — ${t.landing.hero.title}`,
      description: t.landing.hero.subtitle,
      type: "website",
    },
  } as const;
}

const blueButton =
  "inline-flex h-12 items-center justify-center rounded-[2px] bg-[#0067b8] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#005da6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067b8]";

const linkButton =
  "inline-flex h-12 items-center justify-center gap-1.5 rounded-[2px] px-1 text-[15px] font-semibold text-[#0067b8] underline decoration-[#0067b8]/40 underline-offset-[6px] transition-colors hover:decoration-[#0067b8]";

const eyebrowClass =
  "text-[13px] font-semibold tracking-[0.08em] text-[#0067b8] uppercase";

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M5 2.5h10v15l-2.5-1.6L10 17.5l-2.5-1.6L5 17.5v-15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.5 6.5h5M7.5 9.5h5M7.5 12.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M2.5 8h11m-4.5-4.5L13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Feature({
  title,
  body,
  points,
  visual,
  flip,
  tint,
}: {
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
  flip?: boolean;
  tint?: boolean;
}) {
  return (
    <div className={tint ? "border-t border-black/5 bg-[#faf9f8]" : "border-t border-black/5"}>
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-20">
        <div className={flip ? "lg:order-2" : undefined}>
          <h2 className="text-[1.7rem] leading-[1.2] font-semibold tracking-[-0.02em] text-[#1a1a1a] sm:text-[2.1rem]">
            {title}
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#4b4b4b]">{body}</p>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex gap-2.5 text-[14px] leading-snug text-[#3b3a39]">
                <CheckIcon className="mt-px h-5 w-5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={flip ? "lg:order-1" : undefined}>
          <div className="mx-auto w-full max-w-[500px]">{visual}</div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const { locale, t } = await getDict();
  const landing = t.landing;
  const stalls = await listStalls();
  const demoStall = stalls.find((stall) => stall.isOpen) ?? stalls[0] ?? null;
  const demoHref = demoStall ? `/s/${demoStall.slug}` : "/stalls";

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const qr = demoStall
    ? await QRCode.toString(`${appUrl}/s/${demoStall.slug}`, {
        type: "svg",
        margin: 0,
        width: 140,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      })
    : null;

  const navLinks = [
    { href: "#features", label: landing.nav.features },
    { href: "#how", label: landing.nav.how },
    { href: "#faq", label: landing.nav.faq },
    { href: "/stalls", label: landing.nav.stalls },
  ];

  return (
    <div className="font-landing min-h-screen bg-white text-[#1a1a1a]">
      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-5 lg:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[4px] bg-[#0067b8] text-white">
              <ReceiptIcon className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{landing.brand}</span>
          </Link>

          <nav className="ml-6 hidden items-center lg:flex">
            {navLinks.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="border-b-2 border-transparent px-3 py-4 text-[13px] text-[#262626] hover:border-[#0067b8]"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b-2 border-transparent px-3 py-4 text-[13px] text-[#262626] hover:border-[#0067b8]"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher
              current={locale}
              other={t.locale.other}
              label={t.locale.label}
            />
            <Link
              href="/login"
              className="ml-1 hidden h-9 items-center rounded-[2px] bg-[#0067b8] px-4 text-[13px] font-semibold text-white hover:bg-[#005da6] sm:inline-flex"
            >
              {landing.nav.signIn}
            </Link>
            <details className="relative lg:hidden">
              <summary
                aria-label={landing.nav.menuLabel}
                className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-[2px] text-[#262626] hover:bg-black/5 [&::-webkit-details-marker]:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 mt-1 w-48 rounded-md border border-black/10 bg-white py-1 shadow-xl">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2.5 text-sm text-[#262626] hover:bg-[#f3f2f1]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="mt-1 block border-t border-black/10 px-4 py-2.5 text-sm font-semibold text-[#0067b8] hover:bg-[#f3f2f1] sm:hidden"
                >
                  {landing.nav.signIn}
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden border-b border-black/5 bg-white">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-64 -right-48 h-[600px] w-[600px] rounded-full bg-[#d6e9f8] opacity-80 blur-3xl" />
            <div className="absolute top-24 right-[26%] h-72 w-72 rounded-full bg-[#e0f3ec] opacity-70 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:px-10 lg:py-24">
            <div className="max-w-xl">
              <p className={eyebrowClass}>{landing.hero.eyebrow}</p>
              <h1 className="mt-3 max-w-[620px] text-[2.55rem] leading-[1.06] font-semibold tracking-[-0.03em] text-balance sm:text-5xl xl:text-[3.35rem]">
                {landing.hero.title}
              </h1>
              <p className="mt-5 max-w-lg text-[17px] leading-[1.65] text-[#4b4b4b]">
                {landing.hero.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href={demoHref} className={blueButton}>
                  {landing.hero.primary}
                </Link>
                <Link href="/login" className={linkButton}>
                  {landing.hero.secondary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="mt-6 text-xs text-[#616161]">{landing.hero.note}</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {landing.hero.badges.map((badge) => (
                  <li key={badge} className="flex items-center gap-1.5 text-[11px] text-[#616161]">
                    <CheckIcon className="h-3.5 w-3.5" />
                    {badge}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#e8f1fa] via-[#f7fbfe] to-[#ecf7f2]"
              />
              <div className="relative px-1 py-3 sm:px-4">
                <TillMockup d={landing.demo} />
              </div>
              <div className="absolute -bottom-4 left-2 hidden items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] font-semibold shadow-lg ring-1 ring-black/10 sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#107c10]" />
                {landing.demo.readyChip}
              </div>
              <div className="absolute -top-2 right-4 hidden -rotate-2 rounded-md bg-[#0067b8] px-3 py-2 text-[11px] font-semibold text-white shadow-lg sm:block">
                {landing.demo.saleBanner}
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- facts */}
        <section className="bg-white">
          <dl className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-black/5 px-5 py-0 sm:grid-cols-4 lg:px-10">
            {landing.facts.map((fact) => (
              <div key={fact.label} className="bg-white px-4 py-6 first:pl-0">
                <dt className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
                  {fact.value}
                </dt>
                <dd className="mt-1 text-xs text-[#616161]">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="features" className="scroll-mt-14 px-5 pt-16 pb-4 lg:px-10 lg:pt-24">
          <div className="mx-auto max-w-[1400px]">
            <p className={eyebrowClass}>{landing.features.eyebrow}</p>
            <h2 className="mt-2 max-w-2xl text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
              {landing.features.title}
            </h2>
            <p className="mt-3 max-w-xl text-[15px] text-[#616161]">
              {landing.features.subtitle}
            </p>
          </div>
        </section>

        <div className="mt-10">
          <Feature
            title={landing.counter.title}
            body={landing.counter.body}
            points={landing.counter.points}
            visual={<HandoverMockup d={landing.demo} />}
          />

          <Feature
            title={landing.kitchen.title}
            body={landing.kitchen.body}
            points={landing.kitchen.points}
            visual={<KitchenMockup d={landing.demo} />}
            flip
            tint
          />

          <Feature
            title={landing.menuFeature.title}
            body={landing.menuFeature.body}
            points={landing.menuFeature.points}
            visual={<MenuMockup d={landing.demo} qr={qr} />}
          />

          <Feature
            title={landing.publicFeature.title}
            body={landing.publicFeature.body}
            points={landing.publicFeature.points}
            visual={
              <div className="relative mx-auto flex max-w-[380px] justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8f1fa] via-white to-[#eaf6f0] px-8 py-10 ring-1 ring-black/5">
                <div
                  aria-hidden
                  className="absolute -top-16 -right-10 h-44 w-44 rounded-full border border-[#0067b8]/10"
                />
                <div className="relative">
                  <PhoneMockup d={landing.demo} />
                </div>
              </div>
            }
            flip
            tint
          />
        </div>

        {/* ------------------------------------------------------------- how */}
        <section
          id="how"
          className="scroll-mt-14 border-t border-black/5 bg-white px-5 py-16 lg:px-10 lg:py-24"
        >
          <div className="mx-auto max-w-[1400px]">
            <p className={eyebrowClass}>{landing.how.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
              {landing.how.title}
            </h2>
            <p className="mt-3 max-w-lg text-[15px] text-[#616161]">{landing.how.subtitle}</p>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {landing.how.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-lg bg-[#faf9f8] p-6 ring-1 ring-black/5"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0067b8] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#616161]">{step.body}</p>
                </li>
              ))}
            </ol>

            <Link href="/login" className={`${linkButton} mt-8 h-10 px-0 text-sm`}>
              {landing.how.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        <section
          id="faq"
          className="scroll-mt-14 border-t border-black/5 bg-[#faf9f8] px-5 py-16 lg:px-10 lg:py-24"
        >
          <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[320px_1fr] lg:gap-16">
            <div>
              <p className={eyebrowClass}>{landing.faq.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
                {landing.faq.title}
              </h2>
            </div>

            <div className="border-t border-black/10">
              {landing.faq.items.map((item) => (
                <details key={item.q} className="group border-b border-black/10 py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 [&::-webkit-details-marker]:hidden">
                    <span className="text-[15px] font-semibold">{item.q}</span>
                    <span className="relative mt-1 h-4 w-4 shrink-0">
                      <span className="absolute top-1/2 left-0 h-[1.5px] w-4 -translate-y-1/2 bg-[#0067b8]" />
                      <span className="absolute top-0 left-1/2 h-4 w-[1.5px] -translate-x-1/2 bg-[#0067b8] transition-opacity group-open:opacity-0" />
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl pr-8 text-sm leading-relaxed text-[#616161]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="relative overflow-hidden bg-[#0067b8] px-5 py-16 text-white lg:px-10 lg:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full border border-white/15" />
            <div className="absolute -right-8 -bottom-40 h-96 w-96 rounded-full border border-white/10" />
          </div>
          <div className="relative mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
                {landing.cta.title}
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">
                {landing.cta.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-[2px] bg-white px-6 text-[15px] font-semibold text-[#0067b8] hover:bg-white/90"
              >
                {landing.cta.primary}
              </Link>
              <Link
                href="/stalls"
                className="inline-flex h-12 items-center rounded-[2px] border border-white/70 px-6 text-[15px] font-semibold text-white hover:bg-white/10"
              >
                {landing.cta.secondary}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-black/5 bg-white px-5 py-12 lg:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-[4px] bg-[#0067b8] text-white">
                <ReceiptIcon className="h-4 w-4" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">{landing.brand}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#616161]">
              {landing.footer.tagline}
            </p>
          </div>

          <nav aria-label={landing.footer.product}>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[#616161]">
              {landing.footer.product}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#features" className="hover:underline">{landing.footer.features}</a></li>
              <li><a href="#how" className="hover:underline">{landing.footer.how}</a></li>
              <li><a href="#faq" className="hover:underline">{landing.footer.faq}</a></li>
            </ul>
          </nav>

          <nav aria-label={landing.footer.pages}>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[#616161]">
              {landing.footer.pages}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/stalls" className="hover:underline">{landing.footer.stalls}</Link></li>
              <li><Link href="/login" className="hover:underline">{landing.footer.signIn}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mx-auto mt-10 flex max-w-[1400px] flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6 text-xs text-[#616161]">
          <span>{landing.footer.rights}</span>
          <LocaleSwitcher
            current={locale}
            other={t.locale.other}
            label={t.locale.label}
          />
        </div>
      </footer>
    </div>
  );
}
