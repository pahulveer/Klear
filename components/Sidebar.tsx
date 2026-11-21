"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { totalPoolSpent, roomName, members } = useLedger();
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);

  const navItems = [
    {
      label: "Expenses",
      href: "/",
      icon: Receipt,
      active: pathname === "/",
    },
    {
      label: "Settle Up",
      href: "/settle",
      icon: Scale,
      active: pathname === "/settle",
    },
    {
      label: "Add Expense",
      href: "/add",
      icon: Camera,
      active: pathname === "/add",
    },
    {
      label: "Trip Planner",
      href: "/trip",
      icon: Compass,
      active: pathname === "/trip",
    },
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-white border-r-2 border-black p-4 min-h-[calc(100vh-61px)] justify-between select-none">
        {/* Top Navigation */}
        <div className="space-y-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-2">
              WORKSPACE
            </div>
            <nav className="space-y-1.5">
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
                  </Link>
                );
              })}

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
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-black bg-[#2DD4BF] text-black">
                  {members.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Quick Add CTA */}
          <div className="pt-2">
            <Link
              href="/add"
              className="w-full flex items-center justify-center gap-2 bg-[#FF7A00] text-black font-black text-sm py-2.5 px-3 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Expense</span>
            </Link>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-3 pt-6 border-t-2 border-black/10">
          <button
            onClick={() => setIsRoommateModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>⚙ Group & Roommates</span>
          </button>

          {/* Klear Ledger Total Card */}
          <div className="bg-[#2DD4BF] border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center justify-between text-[11px] font-black tracking-wider uppercase text-black/80">
              <span>KLEAR LEDGER</span>
              <Coins className="w-3.5 h-3.5 text-black" />
            </div>
            <div className="text-xl font-black font-mono tracking-tight text-black mt-1">
              {formatINR(totalPoolSpent)} Total
            </div>
            <div className="text-[10px] font-bold text-black/70 mt-0.5 truncate">
              {roomName} Pool
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
