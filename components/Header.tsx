"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLedger } from "@/context/LedgerContext";
import {
  Bell,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Edit2,
  Check,
  Users,
} from "lucide-react";
import { RoommateModal } from "./RoommateModal";

export const Header: React.FC = () => {
  const { roomName, setRoomName, members, loadSampleData, clearAllData } = useLedger();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(roomName);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(roomName);
  }, [roomName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSaveName = () => {
    setRoomName(tempName);
    setIsEditingName(false);
    triggerToast(`Group renamed to "${tempName.trim() || "My Hostel Group"}"`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setTempName(roomName);
      setIsEditingName(false);
    }
  };

  const handleResetSample = () => {
    loadSampleData();
    triggerToast("Loaded Demo Room 402 Data!");
  };

  const handleClear = () => {
    if (confirm("Reset / Clear All? This will wipe all roommates, expenses, and settlements from localStorage.")) {
      clearAllData();
      triggerToast("Ledger reset to empty state!");
    }
  };

  const youMember = members.find((m) => m.isYou) || members[0];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b-2 border-black w-full max-w-full px-3 py-2 md:px-6 md:py-3 flex items-center justify-between gap-2 shadow-[0_2px_0_0_#000] overflow-hidden">
        {/* Left: Brand + Editable Group Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
            <div className="bg-[#FF7A00] text-black font-black text-xs md:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] group-hover:rotate-3 transition-transform">
              K
            </div>
            <span className="font-black text-base sm:text-lg md:text-2xl tracking-tight text-black flex items-center">
              Kl<span className="text-[#FF7A00]">ear</span>
            </span>
          </Link>

          <span className="text-zinc-300 font-bold hidden sm:inline">|</span>

          {/* Editable Room Name Pill */}
          {isEditingName ? (
            <div className="flex items-center gap-1 bg-[#FAF8F5] border-2 border-black rounded-lg px-2 py-0.5 shadow-[2px_2px_0_0_#000] min-w-0">
              <span className="text-xs sm:text-sm">🛏️</span>
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                placeholder="Group name..."
                className="bg-transparent font-black text-xs md:text-sm text-black focus:outline-none w-24 sm:w-36 md:w-48"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSaveName();
                }}
                className="p-1 hover:bg-zinc-200 rounded shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              title="Click to rename your hostel group"
              className="group flex items-center gap-1.5 sm:gap-2 bg-[#FAF8F5] hover:bg-amber-50 border-2 border-black rounded-lg px-2 py-1 text-xs md:text-sm font-bold shadow-[2px_2px_0_0_#000] cursor-pointer transition-colors min-w-0"
            >
              <span className="text-xs sm:text-sm shrink-0">🛏️</span>
              <span className="truncate max-w-[100px] sm:max-w-[140px] md:max-w-none text-black font-black">
                {roomName}
              </span>
              <span className="text-zinc-500 font-bold text-[10px] sm:text-xs hidden md:inline">
                ({members.length} {members.length === 1 ? "Member" : "Members"})
              </span>
              <Edit2 className="w-3 h-3 text-zinc-400 group-hover:text-black transition-colors shrink-0 hidden sm:inline" />
            </div>
          )}
        </div>

        {/* Right Actions: Test Helpers & User Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Roommates Directory Button */}
          <button
            onClick={() => setIsRoommateModalOpen(true)}
            title="Manage Roommates"
            className="inline-flex items-center gap-1 text-xs font-black bg-[#FAF8F5] text-black border-2 border-black rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 shadow-[2px_2px_0_0_#000] hover:bg-amber-100 hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Roommates</span>
            <span className="bg-black text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {members.length}
            </span>
          </button>

          {/* Load Demo Data Button (Compact icon on mobile, text on sm+) */}
          <button
            onClick={handleResetSample}
            title="Load realistic Room 402 test data for judges"
            className="inline-flex items-center gap-1 text-xs font-black bg-[#2DD4BF] text-black border-2 border-black rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Load Demo Data</span>
          </button>

          {/* Reset / Clear All Button (Compact icon on mobile, text on sm+) */}
          <button
            onClick={handleClear}
            title="Wipe localStorage and reset all data to empty"
            className="inline-flex items-center gap-1 text-xs font-bold bg-white text-zinc-700 hover:text-rose-700 hover:bg-rose-50 border-2 border-black rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 shadow-[2px_2px_0_0_#000] transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Bell Notification */}
          <button className="hidden md:flex relative w-8 h-8 items-center justify-center bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:bg-zinc-50">
            <Bell className="w-4 h-4 text-black" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF7A00] text-black text-[10px] font-black rounded-full border border-black flex items-center justify-center">
              {members.length > 0 ? "3" : "0"}
            </span>
          </button>

          {/* User Profile Avatar */}
          <div
            onClick={() => setIsRoommateModalOpen(true)}
            title={youMember ? `${youMember.name} (Primary Roommate)` : "Add Roommates"}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 border-black ${
              youMember?.avatarBg || "bg-[#2DD4BF]"
            } text-black font-black flex items-center justify-center shadow-[2px_2px_0_0_#000] cursor-pointer hover:rotate-6 transition-transform shrink-0`}
          >
            <span className="text-xs">{youMember?.initials || "ME"}</span>
          </div>
        </div>
      </header>

      {/* Roommates Directory Modal */}
      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />

      {/* Quick feedback banner */}
      {showToast && (
        <div className="fixed top-16 right-6 z-50 bg-[#2DD4BF] border-2 border-black text-black font-black px-4 py-2 rounded-xl shadow-[4px_4px_0_0_#000] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{showToast}</span>
        </div>
      )}
    </>
  );
};
