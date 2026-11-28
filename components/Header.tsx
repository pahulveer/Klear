"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLedger } from "@/context/LedgerContext";
import {
  Trash2,
  CheckCircle2,
  Edit2,
  Check,
  Users,
  ChevronDown,
  Plus,
  FolderPlus,
  X,
  Layers,
} from "lucide-react";
import { RoommateModal } from "./RoommateModal";

const EMOJI_OPTIONS = ["🛏️", "🏖️", "🍕", "🚗", "🏠", "✈️", "🍻", "🎮", "🎒", "🏕️"];

export const Header: React.FC = () => {
  const {
    roomName,
    setRoomName,
    members,
    clearAllData,
    groups,
    activeGroupId,
    activeGroup,
    switchGroup,
    createGroup,
    deleteGroup,
    isHydrated,
  } = useLedger();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("👥");

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(roomName);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(roomName);
  }, [roomName]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsCreatingNewGroup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleCreateGroupSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      triggerToast("Please enter a group name");
      return;
    }
    createGroup(trimmed, newGroupIcon);
    setNewGroupName("");
    setNewGroupIcon("👥");
    setIsCreatingNewGroup(false);
    setIsDropdownOpen(false);
    triggerToast(`Created & switched to "${trimmed}"!`);
  };

  const handleClear = () => {
    if (confirm("Reset all data? This will wipe roommates, expenses, and settlements from your browser.")) {
      clearAllData();
      triggerToast("Ledger reset to clean state!");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-black w-full max-w-full px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-2 shadow-[0_2px_0_0_#000] overflow-visible">
        {/* Left: Brand + Multi-Group Dropdown Menu */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 shrink">
          <Link
            href="/"
            aria-label="Klear Home"
            className="flex items-center gap-1.5 sm:gap-2 group shrink-0"
          >
            <div className="bg-[#FF7A00] text-black font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] group-hover:rotate-3 transition-transform">
              K
            </div>
            <span className="font-black text-lg sm:text-xl md:text-2xl tracking-tight text-black flex items-center">
              Kl<span className="text-[#FF7A00]">ear</span>
            </span>
          </Link>

          <span className="text-zinc-300 font-bold hidden sm:inline select-none">|</span>

          {/* Group Dropdown Selector */}
          <div ref={dropdownRef} className="relative min-w-0">
            {!isHydrated ? (
              <div className="h-[34px] w-28 sm:w-44 bg-[#FAF8F5] border-2 border-black rounded-xl px-2.5 shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 animate-pulse">
                <span className="w-4 h-4 bg-zinc-300 rounded shrink-0" />
                <span className="h-3 w-16 sm:w-24 bg-zinc-300 rounded" />
              </div>
            ) : isEditingName ? (
              <div className="flex items-center gap-1.5 bg-[#FAF8F5] border-2 border-black rounded-xl px-2.5 py-1 shadow-[2px_2px_0_0_#000] min-w-0">
                <span className="text-sm shrink-0">{activeGroup?.icon || "🛏️"}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  placeholder="Group name..."
                  className="bg-transparent font-black text-xs md:text-sm text-black focus:outline-none w-28 sm:w-36 md:w-48"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveName();
                  }}
                  aria-label="Save group name"
                  className="p-1 hover:bg-zinc-200 rounded shrink-0 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                title="Click to switch or manage groups"
                className="group flex items-center gap-1.5 sm:gap-2 bg-[#FAF8F5] hover:bg-amber-50/80 border-2 border-black rounded-xl px-2.5 py-1 text-xs md:text-sm font-bold shadow-[2px_2px_0_0_#000] cursor-pointer transition-all active:translate-y-0.5 min-w-0 text-left"
              >
                <span className="text-xs sm:text-sm shrink-0">{activeGroup?.icon || "🛏️"}</span>
                <span className="truncate max-w-[105px] sm:max-w-[150px] md:max-w-[210px] text-black font-black">
                  {roomName}
                </span>
                <span className="text-zinc-500 font-bold text-[10px] sm:text-xs hidden md:inline">
                  ({members.length} {members.length === 1 ? "Member" : "Members"})
                </span>
                <span className="text-zinc-500 font-bold text-[10px] md:hidden">
                  ({members.length})
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-black stroke-[2.5] transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Neo-Brutalist Friend Groups Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-24px)] bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-3 space-y-3 animate-scaleUp">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-black/10">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <span>SHARED LEDGERS</span>
                      <span className="bg-[#2DD4BF] text-teal-950 px-1.5 py-0.5 rounded border border-black text-[9px] font-mono font-bold">
                        {groups.length} Active
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
                      Isolated groups with independent balances
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewGroup(true)}
                    className="flex items-center gap-1 text-[11px] font-black bg-[#FF7A00] text-black px-2.5 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] hover:bg-orange-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>New Group</span>
                  </button>
                </div>

                {/* Groups List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {groups.map((grp) => {
                    const isActive = grp.id === activeGroupId;
                    return (
                      <div
                        key={grp.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            switchGroup(grp.id);
                            setIsDropdownOpen(false);
                            triggerToast(`Switched to "${grp.name}"!`);
                          }
                        }}
                        onClick={() => {
                          switchGroup(grp.id);
                          setIsDropdownOpen(false);
                          triggerToast(`Switched to "${grp.name}"!`);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#FAF8F5] border-black shadow-[2px_2px_0_0_#000] ring-2 ring-[#FF7A00]"
                            : "bg-white border-transparent hover:border-black hover:bg-zinc-50 hover:shadow-[2px_2px_0_0_#000]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0 p-1 bg-white border border-black rounded-lg shadow-[1px_1px_0_0_#000]">
                            {grp.icon || "👥"}
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-xs md:text-sm text-black truncate flex items-center gap-1.5">
                              <span>{grp.name}</span>
                              {isActive && (
                                <span className="text-[9px] font-black uppercase bg-[#25D366] text-black px-1.5 py-0.2 rounded border border-black">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
                              {grp.members?.length || 0} members • {grp.expenses?.length || 0} expenses
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {groups.length > 1 && (
                            <button
                              type="button"
                              title={`Delete group "${grp.name}"`}
                              aria-label={`Delete group "${grp.name}"`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete group "${grp.name}"? All its expenses and members will be removed.`
                                  )
                                ) {
                                  deleteGroup(grp.id);
                                  triggerToast(`Deleted group "${grp.name}"`);
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create New Group Section */}
                {isCreatingNewGroup ? (
                  <form
                    onSubmit={handleCreateGroupSubmit}
                    className="bg-[#FAF8F5] border-2 border-black rounded-xl p-3 space-y-2.5 shadow-[2px_2px_0_0_#000]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-black flex items-center gap-1">
                        <FolderPlus className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>Create Shared Group</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewGroup(false)}
                        className="text-[10px] font-bold text-zinc-500 hover:text-black"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Emoji Selector */}
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 mb-1">Pick an Icon:</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewGroupIcon(emoji)}
                            className={`text-sm p-1 rounded-lg border transition-transform ${
                              newGroupIcon === emoji
                                ? "bg-[#FF7A00] border-black shadow-[1.5px_1.5px_0_0_#000] scale-110"
                                : "bg-white border-zinc-200 hover:border-black"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. Goa Trip Gang, Flat 402..."
                        className="flex-1 bg-white border-2 border-black rounded-lg px-2.5 py-1 text-xs font-bold text-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-zinc-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-[#25D366] text-black font-black text-xs px-3 py-1.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] hover:bg-emerald-400 whitespace-nowrap active:translate-y-0.5 transition-colors"
                      >
                        + Create
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-1.5 border-t border-black/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(true);
                        setIsDropdownOpen(false);
                      }}
                      className="text-[11px] font-black text-zinc-600 hover:text-black flex items-center gap-1 hover:underline"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename Active Group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewGroup(true)}
                      className="text-[11px] font-black text-[#FF7A00] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Another Group</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Roommates, Reset */}
        {!isHydrated ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 animate-pulse">
            <div className="h-[34px] w-8 sm:w-28 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]" />
            <div className="h-[34px] w-8 sm:w-16 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Roommates Directory Button */}
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              title="Manage Roommates & UPI IDs"
              aria-label="Manage Roommates & UPI IDs"
              className="inline-flex items-center gap-1.5 text-xs font-black bg-[#FAF8F5] text-black border-2 border-black rounded-xl p-2 sm:px-3 sm:py-1.5 shadow-[2px_2px_0_0_#000] hover:bg-amber-100 hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Roommates</span>
              <span className="bg-black text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {members.length}
              </span>
            </button>

            {/* Reset / Clear All Button */}
            <button
              onClick={handleClear}
              title="Clear all local data and reset ledger"
              aria-label="Reset Ledger"
              className="inline-flex items-center gap-1 text-xs font-bold bg-white text-zinc-700 hover:text-rose-700 hover:bg-rose-50 border-2 border-black rounded-xl p-2 sm:px-2.5 sm:py-1.5 shadow-[2px_2px_0_0_#000] transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        )}
      </header>

      {/* Roommates Directory Modal */}
      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />

      {/* Quick feedback banner */}
      {showToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-[#2DD4BF] border-2 border-black text-black font-black px-4 py-2.5 rounded-xl shadow-[4px_4px_0_0_#000] flex items-center gap-2 animate-scaleUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-900 stroke-[3]" />
          <span className="text-xs sm:text-sm">{showToast}</span>
        </div>
      )}
    </>
  );
};
