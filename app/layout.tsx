import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LedgerProvider } from "@/context/LedgerContext";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klear.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Klear — Playful Hostel Expense Splitter & Trip Planner",
  description:
    "Fast, playful Neo-Brutalist hostel expense splitter, bill scanner, debt minimizer, and group trip planner with zero fluff.",
  openGraph: {
    title: "Klear — Smart Hostel Expense Splitter & Trip Planner",
    description:
      "Playful Neo-Brutalist bill splitting, debt minimization, and trip planning web app for college roommates and friend groups.",
    url: siteUrl,
    siteName: "Klear",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Klear — Playful Hostel Expense Splitter & Trip Planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klear — Smart Hostel Expense Splitter & Trip Planner",
    description:
      "Playful Neo-Brutalist bill splitting, debt minimization, and trip planning web app for college roommates and friend groups.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-zinc-900 min-h-screen flex flex-col antialiased overflow-x-hidden max-w-[100vw] w-full">
        <LedgerProvider>
          <Header />
          <div className="flex flex-1 w-full max-w-full min-w-0 overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 w-full min-w-0 max-w-full px-3 sm:px-6 pt-4 pb-28 md:pb-8 overflow-x-hidden">
              <div className="max-w-6xl mx-auto w-full min-w-0">
                {children}
              </div>
            </main>
          </div>
          <MobileNav />
        </LedgerProvider>
      </body>
    </html>
  );
}
