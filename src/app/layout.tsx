import type { Metadata, Viewport } from "next";
import { getLocale } from "@/lib/i18n/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stall Console",
  description: "Festival stall ordering and kitchen queue",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fffef6",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
