"use client";

import React, { useState, useEffect } from "react";
import { useLedger } from "@/context/LedgerContext";
import { X, UserPlus, Trash2, ShieldCheck, Check } from "lucide-react";

interface RoommateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoommateModal: React.FC<RoommateModalProps> = ({ isOpen, onClose }) => {
  const { members, addMember, deleteMember, roomName } = useLedger();

  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isYou, setIsYou] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addMember({
      name: name.trim(),
      upiId: upiId.trim() || undefined,
      isYou: isYou || members.length === 0,
    });

    setName("");
    setUpiId("");
    setIsYou(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-6 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-black bg-[#FAF8F5] hover:bg-zinc-200 shadow-[2px_2px_0_0_#000] transition-colors"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black text-xs font-black px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ROOMMATES DIRECTORY</span>
          </div>
          <h3 className="text-xl font-black text-black">{roomName} Members</h3>
          <p className="text-xs font-bold text-zinc-500 mt-0.5">
            Manage who splits bills and receives UPI transfers in this group.
          </p>
        </div>

        {/* Add Roommate Form */}
        <form onSubmit={handleSubmit} className="p-3.5 bg-[#FAF8F5] border-2 border-black rounded-xl space-y-3">
          <div className="text-xs font-black uppercase text-zinc-700 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-black" />
            <span>+ Add New Roommate</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Roommate Name (e.g. Rahul Sharma)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
              autoFocus
            />

            <input
              type="text"
              placeholder="UPI ID (optional, e.g. rahul@okhdfcbank)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:outline-none"
            />

            {members.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 select-none pt-1">
                <input
                  type="checkbox"
                  checked={isYou}
                  onChange={(e) => setIsYou(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border border-black accent-[#FF7A00]"
                />
                <span>Set as &quot;You&quot; (Primary user)</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-[#FF7A00] text-black font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Add Roommate to Group
          </button>
        </form>

        {/* Current Members List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div className="text-[11px] font-black uppercase text-zinc-500">
            CURRENT MEMBERS ({members.length})
          </div>

          {members.length === 0 ? (
            <div className="text-center py-4 text-xs font-bold text-zinc-400">
              No roommates added yet. Add your first roommate above!
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full border border-black ${m.avatarBg} text-black font-black text-xs flex items-center justify-center shrink-0`}
                  >
                    {m.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-black truncate flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.isYou && (
                        <span className="text-[9px] font-black bg-black text-white px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 truncate">
                      {m.upiId}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteMember(m.id)}
                  title="Remove roommate"
                  className="p-1.5 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#2DD4BF] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-teal-400 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
