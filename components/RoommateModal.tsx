"use client";

import React, { useState, useEffect } from "react";
import { useLedger } from "@/context/LedgerContext";
import { X, UserPlus, Trash2, ShieldCheck, Check, AlertCircle, Edit2, Users } from "lucide-react";
import { isValidUpiId } from "@/lib/settleDebts";

interface RoommateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoommateModal: React.FC<RoommateModalProps> = ({ isOpen, onClose }) => {
  const { members, addMember, deleteMember, roomName } = useLedger();

  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isYou, setIsYou] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick edit UPI ID for existing member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingUpiValue, setEditingUpiValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a roommate name.");
      return;
    }
    if (trimmedName.length > 50) {
      setErrorMessage("Roommate name cannot exceed 50 characters.");
      return;
    }

    const trimmedUpi = upiId.trim();
    if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
      setErrorMessage("Invalid UPI ID format. Example: rohan@oksbi or 9876543210@paytm");
      return;
    }

    addMember({
      name: trimmedName,
      upiId: trimmedUpi || undefined,
      isYou: isYou || members.length === 0,
    });

    setName("");
    setUpiId("");
    setIsYou(false);
    setErrorMessage(null);
  };

  const handleSaveMemberUpi = (memberId: string) => {
    setEditError(null);
    const trimmed = editingUpiValue.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
      setEditError("Invalid UPI ID format (e.g. name@oksbi)");
      return;
    }

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    deleteMember(memberId);
    addMember({
      name: member.name,
      upiId: trimmed || undefined,
      isYou: member.isYou,
    });

    setEditingMemberId(null);
    setEditingUpiValue("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0_0_#000] p-6 space-y-5 max-h-[92vh] overflow-y-auto animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-[#FAF8F5] hover:bg-zinc-200 shadow-[2px_2px_0_0_#000] transition-colors focus:ring-2 focus:ring-black focus:outline-none"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>ROOMMATES DIRECTORY</span>
          </div>
          <h3 className="text-xl font-black text-black">{roomName} Members</h3>
          <p className="text-xs font-bold text-zinc-500 mt-0.5">
            Manage who splits bills and receives direct UPI transfers in this group.
          </p>
        </div>

        {/* Add Roommate Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-[#FAF8F5] border-2 border-black rounded-2xl space-y-3 shadow-[2px_2px_0_0_#000]">
          <div className="text-xs font-black uppercase text-zinc-700 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-black" />
            <span>+ Add New Roommate</span>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-500 rounded-xl p-2.5 text-rose-800 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div>
              <label htmlFor="roommate-name" className="sr-only">Roommate Name</label>
              <input
                id="roommate-name"
                type="text"
                placeholder="Roommate Name (e.g. Rahul Sharma)"
                value={name}
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="roommate-upi" className="sr-only">UPI ID (optional)</label>
              <input
                id="roommate-upi"
                type="text"
                placeholder="UPI ID (optional, e.g. rahul@okhdfcbank)"
                value={upiId}
                maxLength={100}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
              />
            </div>

            {members.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={isYou}
                  onChange={(e) => setIsYou(e.target.checked)}
                  className="w-4 h-4 rounded border border-black accent-[#FF7A00]"
                />
                <span>Set as &quot;You&quot; (Primary active user)</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#FF7A00] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-orange-500 active:translate-y-0.5 transition-all focus:ring-2 focus:ring-black focus:outline-none"
          >
            Add Roommate to Group
          </button>
        </form>

        {/* Current Members List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">
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
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full border border-black ${m.avatarBg} text-black font-black text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#000]`}
                  >
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-black truncate flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.isYou && (
                        <span className="text-[9px] font-black bg-black text-white px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>

                    {editingMemberId === m.id ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="e.g. name@oksbi"
                          value={editingUpiValue}
                          onChange={(e) => setEditingUpiValue(e.target.value)}
                          className="text-[10px] font-mono font-bold border border-black rounded-lg px-2 py-0.5 w-36 bg-amber-50"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveMemberUpi(m.id)}
                          className="bg-[#2DD4BF] text-black font-black text-[10px] px-2 py-0.5 rounded border border-black"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMemberId(null)}
                          className="text-[10px] font-bold text-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1">
                        <span>{m.upiId || "No UPI set"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemberId(m.id);
                            setEditingUpiValue(m.upiId || "");
                          }}
                          title="Edit UPI ID"
                          aria-label={`Edit UPI ID for ${m.name}`}
                          className="text-zinc-400 hover:text-black p-0.5"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {editError && editingMemberId === m.id && (
                      <div className="text-[9px] font-bold text-rose-600 mt-0.5">
                        {editError}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteMember(m.id)}
                  title="Remove roommate"
                  aria-label={`Remove ${m.name}`}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 rounded transition-colors focus:ring-1 focus:ring-rose-500 ml-2"
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
          className="w-full py-2.5 bg-[#2DD4BF] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-teal-300 active:translate-y-0.5 transition-all focus:ring-2 focus:ring-black focus:outline-none"
        >
          Done
        </button>
      </div>
    </div>
  );
};
