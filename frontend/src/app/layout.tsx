import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { I18nProvider } from "@/lib/i18n/i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cars Management",
    template: "%s | Cars Management",
  },
  description:
    "Modern fleet, employees, maintenance and operations management system.",
  applicationName: "Cars Management",
  keywords: [
    "fleet management",
    "cars management",
    "employee management",
    "vehicle tracking",
    "maintenance",
    "dashboard",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ro"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-transparent font-sans text-slate-900">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}