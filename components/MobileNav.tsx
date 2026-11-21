"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scale, Camera, Users, Plus, Compass } from "lucide-react";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home, active: pathname === "/" },
    { label: "Settle", href: "/settle", icon: Scale, active: pathname === "/settle" },
    { label: "Scan", href: "/add?focus=scan", icon: Camera, active: pathname === "/add" },
    { label: "Trip", href: "/trip", icon: Compass, active: pathname === "/trip" },
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 md:hidden">
      <nav
        aria-label="Mobile navigation"
        className="bg-white border-2 border-black rounded-2xl shadow-[0_4px_0_0_#000] p-1.5 flex items-center justify-around gap-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                item.active
                  ? "bg-[#FAF8F5] border-black text-black shadow-[2px_2px_0_0_#000]"
                  : "border-transparent text-zinc-600 hover:text-black"
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* Highlighted Add Bill Button */}
        <Link
          href="/add"
          aria-current={pathname === "/add" ? "page" : undefined}
          className="flex items-center gap-1 bg-[#FF7A00] text-black font-black text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Bill</span>
        </Link>
      </nav>
    </div>
  );
};
