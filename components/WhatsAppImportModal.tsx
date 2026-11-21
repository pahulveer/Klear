"use client";

import React, { useState, useEffect } from "react";
import { useLedger } from "@/context/LedgerContext";
import { formatINR } from "@/lib/utils";
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  ArrowRight,
  Check,
  Quote,
  Layers,
  Send,
} from "lucide-react";
import confetti from "canvas-confetti";

interface WhatsAppImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedExpense {
  id: string;
  title: string;
  category: "Food" | "Hostel" | "Groceries" | "Utilities" | "Party" | "Other";
  paidById: string;
  totalAmount: number;
  splitType: "equal" | "unequal" | "shares";
  splitDetails: Record<string, number>;
  confidence: "high" | "medium" | "low";
  sourceLine: string;
}

export const SAMPLE_HINGLISH_CHAT = `[20/11/24, 11:15 PM] Veer: Bhai Zomato se Behrouz Biryani order kiya tha total Rs 1260 hua. Tanya ne nahi khaya, baaki 3 log split karlo. Maine pay kar diya!
[21/11/24, 10:30 AM] Rohan: Room 402 ka electricity bill aaya tha Rs 1800. Maine Google Pay se bhar diya. Sab 4 log equal de dena.
[21/11/24, 04:45 PM] Jiggi: Metro station se hostel tak ka shared auto ka 240 maine cash diya tha. Veer aur main hi the auto me.`;

export const WhatsAppImportModal: React.FC<WhatsAppImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { members, importBatchExpensesAndMembers, roomName } = useLedger();

  const [chatText, setChatText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedExpenses, setExtractedExpenses] = useState<ExtractedExpense[]>([]);
  const [discoveredMembers, setDiscoveredMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");

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

  const handleLoadSample = () => {
    setChatText(SAMPLE_HINGLISH_CHAT);
    setErrorMessage(null);
  };

  const handleExtract = async () => {
    if (!chatText.trim()) {
      setErrorMessage("Please paste some WhatsApp messages or click 'Try Sample Hinglish Chat'.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/parse-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatText,
          members: members.map((m) => ({ id: m.id, name: m.name })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract expenses from chat text.");
      }

      const expenses: ExtractedExpense[] = data.expenses || [];
      if (expenses.length === 0) {
        setErrorMessage("No financial transactions or split expenses found in this chat text. Try pasting a different message!");
        return;
      }

      if (Array.isArray(data.discoveredMembers) && data.discoveredMembers.length > 0) {
        setDiscoveredMembers(data.discoveredMembers);
      } else {
        setDiscoveredMembers([]);
      }

      setExtractedExpenses(expenses);
      setSelectedIds(expenses.map((e) => e.id)); // Default select all
      setStep("preview");

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#25D366", "#FF7A00", "#2DD4BF"],
        });
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error("WhatsApp parse error:", err);
      setErrorMessage(err.message || "Failed to parse chat. Check connection and API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectExpense = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === extractedExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(extractedExpenses.map((e) => e.id));
    }
  };

  const handleAddSelectedToLedger = () => {
    const toAdd = extractedExpenses.filter((e) => selectedIds.includes(e.id));
    if (toAdd.length === 0) {
      alert("Please select at least one expense to add.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const expensesToAdd = toAdd.map((exp) => ({
      title: exp.title,
      totalAmount: exp.totalAmount,
      paidById: exp.paidById,
      date: todayStr,
      category: exp.category,
      splitMode: (exp.splitType === "equal" ? "equal" : "unequal") as "equal" | "unequal",
      splitDetails: exp.splitDetails,
      note: `Imported from WhatsApp: "${exp.sourceLine.slice(0, 80)}"`,
    }));

    importBatchExpensesAndMembers(
      expensesToAdd,
      members.length === 0 ? discoveredMembers : undefined
    );

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#25D366", "#FF7A00", "#2DD4BF"],
      });
    } catch (e) {
      // ignore
    }

    alert(`Successfully added ${toAdd.length} expenses to your ledger!`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setChatText("");
    setErrorMessage(null);
    setExtractedExpenses([]);
    setDiscoveredMembers([]);
    setSelectedIds([]);
    setStep("input");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border-2 border-black rounded-3xl w-full max-w-2xl shadow-[6px_6px_0_0_#000] overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Modal Header */}
        <div className="p-4 md:p-5 bg-[#25D366] border-b-2 border-black flex items-start justify-between gap-3 text-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000] shrink-0">
              <MessageSquare className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-black tracking-tight font-serif text-black">
                  Import from WhatsApp Chat
                </h3>
                <span className="text-[10px] font-black uppercase bg-white text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                  X-Factor
                </span>
              </div>
              <p className="text-xs font-bold text-black/80 mt-0.5">
                Paste raw group chat • Parses English, Hinglish & Punjabi with exclusions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white text-black rounded-xl border-2 border-black hover:bg-zinc-100 shadow-[2px_2px_0_0_#000] transition-colors focus:ring-2 focus:ring-black focus:outline-none"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Real Red Error Banner on Failure */}
          {errorMessage && (
            <div className="bg-rose-100 border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0_0_#000] flex items-start gap-2.5 text-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                <strong className="font-black">Error: </strong>
                {errorMessage}
              </div>
            </div>
          )}

          {step === "input" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <span>PASTE CHAT TEXT / EXPORT:</span>
                </label>

                {/* 1-Click Sample Hinglish Button */}
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-1 text-[11px] font-black bg-[#FED7AA] text-orange-950 border-2 border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0_0_#000] hover:bg-orange-200 transition-colors self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Sample Hinglish Chat</span>
                </button>
              </div>

              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleExtract();
                  }
                }}
                rows={7}
                placeholder={`Paste WhatsApp messages or exported .txt here...\n\nExample:\n[20/11, 21:00] Veer: Zomato biryani Rs 1260 paid, Tanya ne nahi khaya baaki 3 log split karlo.\n[21/11, 10:30] Rohan: Electricity bill 1800 paid equal.\n\nTip: Press Ctrl+Enter to extract!`}
                className="w-full bg-[#FAF8F5] border-2 border-black rounded-2xl p-3 text-xs md:text-sm font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#25D366] shadow-[2px_2px_0_0_#000] placeholder:text-zinc-400 resize-y"
              />

              <div className="bg-[#FAF8F5] border-2 border-dashed border-black/30 rounded-2xl p-3 text-[11px] font-bold text-zinc-600 space-y-1">
                <div className="text-black font-black uppercase text-[10px]">
                  💡 How it understands your group chat:
                </div>
                <div>• Maps member nicknames & senders to registered roommates in {roomName}.</div>
                <div>• Respects exclusions: <em>&quot;Tanya ne nahi khaya&quot;</em> or <em>&quot;except Tanya&quot;</em> sets their share to ₹0.</div>
                <div>• Handles sub-group rides: <em>&quot;Veer aur main hi the auto me&quot;</em> splits only between those 2.</div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Auto-Discovered Roommates Banner if group was empty */}
              {members.length === 0 && discoveredMembers.length > 0 && (
                <div className="bg-[#2DD4BF]/20 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0_0_#000] flex items-center gap-2.5 text-teal-950 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-teal-800 shrink-0" />
                  <span>
                    <strong className="font-black">Auto-Discovered Roommates: </strong>
                    {discoveredMembers.map((m) => m.name).join(", ")} (will be added to your group ledger automatically)
                  </span>
                </div>
              )}

              {/* Preview Bar */}
              <div className="flex items-center justify-between gap-2 bg-[#FAF8F5] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0_0_#000]">
                <div>
                  <div className="text-xs font-black text-black">
                    Extracted {extractedExpenses.length} {extractedExpenses.length === 1 ? "Expense" : "Expenses"}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500">
                    Review extracted expenses and select which ones to add to the ledger
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-black px-2.5 py-1 bg-white border border-black rounded-lg shadow-[1px_1px_0_0_#000] hover:bg-zinc-100"
                  >
                    {selectedIds.length === extractedExpenses.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="text-[11px] font-bold text-zinc-600 hover:text-black underline"
                  >
                    Edit Chat
                  </button>
                </div>
              </div>

              {/* Extracted Expenses Cards */}
              <div className="space-y-3">
                {extractedExpenses.map((exp) => {
                  const isSelected = selectedIds.includes(exp.id);
                  const displayMembers = members.length > 0 ? members : discoveredMembers;
                  const payer = displayMembers.find((m) => m.id === exp.paidById) || displayMembers[0];

                  const confidenceColor =
                    exp.confidence === "high"
                      ? "bg-[#2DD4BF] text-teal-950"
                      : exp.confidence === "medium"
                      ? "bg-[#FED7AA] text-orange-950"
                      : "bg-rose-200 text-rose-950";

                  return (
                    <div
                      key={exp.id}
                      onClick={() => toggleSelectExpense(exp.id)}
                      className={`border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] cursor-pointer transition-all space-y-3 ${
                        isSelected
                          ? "bg-white ring-2 ring-[#25D366]"
                          : "bg-zinc-50 opacity-60"
                      }`}
                    >
                      {/* Top Row: Checkbox, Title, Category & Total Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectExpense(exp.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 mt-0.5 accent-[#25D366] rounded cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-black">
                                {exp.title}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black bg-zinc-100 text-zinc-800">
                                {exp.category}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-black ${confidenceColor}`}
                              >
                                {exp.confidence} confidence
                              </span>
                            </div>
                            <div className="text-xs font-bold text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <span>Paid by:</span>
                              <span className="text-black font-black bg-amber-100 px-1.5 py-0.2 rounded border border-black text-[10px]">
                                {payer?.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-black font-mono text-black">
                            {formatINR(exp.totalAmount)}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-500">
                            {exp.splitType} split
                          </div>
                        </div>
                      </div>

                      {/* Source Line Quote */}
                      <div className="bg-[#FAF8F5] border border-black rounded-xl p-2.5 text-xs text-zinc-700 font-mono italic flex items-start gap-2">
                        <Quote className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{exp.sourceLine}</span>
                      </div>

                      {/* Split Details Breakdown */}
                      <div className="pt-2 border-t border-black/10">
                        <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">
                          SPLIT BREAKDOWN:
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono font-bold">
                          {displayMembers.map((m) => {
                            const share = exp.splitDetails[m.id] || 0;
                            const isExcluded = share === 0;

                            return (
                              <span
                                key={m.id}
                                className={`px-2 py-0.5 rounded border border-black text-[11px] ${
                                  isExcluded
                                    ? "bg-zinc-100 text-zinc-400 line-through"
                                    : "bg-white text-black shadow-[1px_1px_0_0_#000]"
                                }`}
                              >
                                {m.name.split(" ")[0]}: {isExcluded ? "₹0 (Excluded)" : formatINR(share)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF8F5] border-t-2 border-black flex items-center justify-between gap-3">
          {step === "input" ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-white text-zinc-700 font-black text-xs rounded-xl border-2 border-black hover:bg-zinc-100 shadow-[2px_2px_0_0_#000]"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleExtract}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#25D366] text-black font-black text-xs md:text-sm px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] active:translate-y-0.5 disabled:opacity-50 transition-all ml-auto"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Extracting Expenses...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Expenses →</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-4 py-2 bg-white text-black font-black text-xs rounded-xl border-2 border-black hover:bg-zinc-100 shadow-[2px_2px_0_0_#000]"
              >
                ← Back to Chat
              </button>

              <button
                type="button"
                onClick={handleAddSelectedToLedger}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-2 bg-[#FF7A00] text-black font-black text-xs md:text-sm px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] active:translate-y-0.5 disabled:opacity-50 transition-all ml-auto"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Add Selected ({selectedIds.length}) to Ledger</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
