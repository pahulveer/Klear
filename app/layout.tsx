import type { Metadata } from "next";
import "./globals.css";
import { LedgerProvider } from "@/context/LedgerContext";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Klear — Hostel Expense Splitter & Trip Planner",
  description:
    "Playful Neo-Brutalist bill splitting, debt minimization, and trip planning web app for college hostel roommates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-zinc-900 min-h-screen flex flex-col antialiased">
        <LedgerProvider>
          <Header />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 min-w-0 pb-24 md:pb-12 overflow-x-hidden">
              {children}
            </main>
          </div>
          <MobileNav />
        </LedgerProvider>
      </body>
    </html>
  );
}
