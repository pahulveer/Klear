"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLedger } from "@/context/LedgerContext";
import {
  Receipt,
  Scale,
  Users,
  Settings,
  PlusCircle,
  Camera,
  Coins,
  Compass,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { RoommateModal } from "./RoommateModal";

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isScan = pathname === "/add" && searchParams?.get("focus") === "scan";
  const isAdd = pathname === "/add" && !isScan;

  const navItems = [
    {
      label: "Expenses",
      href: "/",
      icon: Receipt,
      active: pathname === "/",
      badge: null,
    },
    {
      label: "Settle Up",
      href: "/settle",
      icon: Scale,
      active: pathname === "/settle",
      badge: "Fewest payments",
    },
    {
      label: "Add Expense",
      href: "/add",
      icon: PlusCircle,
      active: isAdd,
      badge: null,
    },
    {
      label: "Scan Bill",
      href: "/add?focus=scan",
      icon: Camera,
      active: isScan,
      badge: null,
    },
    {
      label: "Trip Planner",
      href: "/trip",
      icon: Compass,
      active: pathname === "/trip",
      badge: "AI",
    },
  ];

  return (
    <div className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
              item.active
                ? "bg-[#FF7A00] text-black border-black shadow-[3px_3px_0_0_#000] translate-x-[2px]"
                : "bg-white text-zinc-800 border-transparent hover:border-black hover:bg-zinc-50 hover:shadow-[2px_2px_0_0_#000]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-black ${
                  item.active
                    ? "bg-white text-black"
                    : "bg-[#FAF8F5] text-zinc-600"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function NavLinksFallback() {
  const pathname = usePathname();
  const navItems = [
    {
      label: "Expenses",
      href: "/",
      icon: Receipt,
      active: pathname === "/",
      badge: null,
    },
    {
      label: "Settle Up",
      href: "/settle",
      icon: Scale,
      active: pathname === "/settle",
      badge: "Fewest payments",
    },
    {
      label: "Add Expense",
      href: "/add",
      icon: PlusCircle,
      active: pathname === "/add",
      badge: null,
    },
    {
      label: "Scan Bill",
      href: "/add?focus=scan",
      icon: Camera,
      active: false,
      badge: null,
    },
    {
      label: "Trip Planner",
      href: "/trip",
      icon: Compass,
      active: pathname === "/trip",
      badge: "AI",
    },
  ];

  return (
    <div className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
              item.active
                ? "bg-[#FF7A00] text-black border-black shadow-[3px_3px_0_0_#000] translate-x-[2px]"
                : "bg-white text-zinc-800 border-transparent hover:border-black hover:bg-zinc-50 hover:shadow-[2px_2px_0_0_#000]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-black ${
                  item.active
                    ? "bg-white text-black"
                    : "bg-[#FAF8F5] text-zinc-600"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export const Sidebar: React.FC = () => {
  const { totalPoolSpent, roomName, members, isHydrated } = useLedger();
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Primary sidebar"
        className="hidden md:flex flex-col w-64 bg-white border-r-2 border-black p-4 min-h-[calc(100vh-65px)] justify-between select-none shrink-0"
      >
        {/* Top Navigation */}
        <div className="space-y-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 px-2">
              WORKSPACE
            </div>
            <nav aria-label="Workspace navigation" className="space-y-1.5">
              <Suspense fallback={<NavLinksFallback />}>
                <NavLinks />
              </Suspense>

              {/* Roommates Button */}
              <button
                type="button"
                onClick={() => setIsRoommateModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-transparent hover:border-black hover:bg-zinc-50 font-bold text-sm text-zinc-800 transition-all hover:shadow-[2px_2px_0_0_#000]"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  <span>Roommates</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded border border-black bg-[#2DD4BF] text-black">
                  {!isHydrated ? (
                    <span className="inline-block w-2.5 h-2.5 bg-black/40 rounded-full animate-pulse" />
                  ) : (
                    members.length
                  )}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-3 pt-5 border-t-2 border-black/10">
          <button
            onClick={() => setIsRoommateModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Group & Roommates</span>
          </button>

          {/* Klear Ledger Total Card */}
          <div className="bg-[#2DD4BF] border-2 border-black rounded-2xl p-3.5 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center justify-between text-[11px] font-black tracking-wider uppercase text-black/80">
              <span>POOL LEDGER</span>
              <Coins className="w-3.5 h-3.5 text-black" />
            </div>
            <div className="text-xl font-black font-mono tracking-tight text-black mt-1">
              {!isHydrated ? (
                <div className="h-6 w-28 bg-teal-400/80 border border-black/30 rounded animate-pulse my-0.5" />
              ) : (
                `${formatINR(totalPoolSpent)} Total`
              )}
            </div>
            <div className="text-[10px] font-bold text-black/75 mt-0.5 truncate">
              {roomName}
            </div>
          </div>
        </div>
      </aside>

      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />
    </>
  );
};
