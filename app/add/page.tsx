"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLedger } from "@/context/LedgerContext";
import {
  ArrowLeft,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Scale,
  PieChart,
  Split,
  Layers,
  Loader2,
  X,
  UserPlus,
  RotateCw,
  MessageSquare,
  Sparkles,
  Utensils,
  Home,
  ShoppingBag,
  Zap,
  PartyPopper,
  Package,
  HelpCircle,
  Coins,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { SplitMode, BillItem } from "@/types/ledger";
import { RoommateModal } from "@/components/RoommateModal";
import { WhatsAppImportModal } from "@/components/WhatsAppImportModal";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";

const CATEGORIES = [
  { id: "Food", label: "Food & Meals", icon: Utensils, color: "bg-amber-100 text-amber-900 border-amber-400" },
  { id: "Hostel", label: "Hostel & Room", icon: Home, color: "bg-blue-100 text-blue-900 border-blue-400" },
  { id: "Groceries", label: "Groceries", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-900 border-emerald-400" },
  { id: "Utilities", label: "Utilities & WiFi", icon: Zap, color: "bg-yellow-100 text-yellow-900 border-yellow-400" },
  { id: "Party", label: "Party & Outings", icon: PartyPopper, color: "bg-purple-100 text-purple-900 border-purple-400" },
  { id: "Other", label: "Other Expense", icon: Package, color: "bg-zinc-100 text-zinc-900 border-zinc-400" },
] as const;

function AddExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { members, addExpense, roomName, loadSampleData } = useLedger();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isScanFocused, setIsScanFocused] = useState(false);

  // Auto-focus and scroll to scanner when arrived via "Scan" (/add?focus=scan)
  useEffect(() => {
    if (searchParams.get("focus") === "scan") {
      setIsScanFocused(true);
      if (scannerRef.current) {
        scannerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        scannerRef.current.focus();
      }
      const timer = setTimeout(() => setIsScanFocused(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const youMember = members.find((m) => m.isYou) || members[0];

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"Food" | "Hostel" | "Groceries" | "Utilities" | "Party" | "Other">("Food");
  const [paidById, setPaidById] = useState<string>(youMember?.id || "");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Sync paidById if members change
  useEffect(() => {
    if ((!paidById || !members.some((m) => m.id === paidById)) && members.length > 0) {
      setPaidById(youMember?.id || members[0].id);
    }
  }, [members, paidById, youMember]);

  // Items State (Item-wise split)
  const [items, setItems] = useState<BillItem[]>([]);

  // Tax & Delivery Fee
  const [tax, setTax] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [proportionalTax, setProportionalTax] = useState<boolean>(true);

  // Unequal split state: memberId -> exact ₹
  const [unequalSplits, setUnequalSplits] = useState<Record<string, number>>({});

  // Shares split state: memberId -> number of shares
  const [shares, setShares] = useState<Record<string, number>>({});

  // Equal mode: which members are included
  const [equalIncluded, setEqualIncluded] = useState<Record<string, boolean>>({});

  // Init member inclusion when members load
  useEffect(() => {
    const inc: Record<string, boolean> = {};
    const sh: Record<string, number> = {};
    members.forEach((m) => {
      inc[m.id] = true;
      sh[m.id] = 1;
    });
    setEqualIncluded(inc);
    setShares(sh);
  }, [members]);

  // OCR state
  const [isScanning, setIsScanning] = useState(false);
  const [scanVerifiedMessage, setScanVerifiedMessage] = useState<string | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  // Base items sum
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  // Computed total bill amount
  const totalAmount = useMemo(() => {
    if (splitMode === "item-wise") {
      return itemsSubtotal + (Number(tax) || 0) + (Number(deliveryFee) || 0);
    }
    return manualAmount > 0
      ? manualAmount
      : itemsSubtotal + (Number(tax) || 0) + (Number(deliveryFee) || 0);
  }, [splitMode, itemsSubtotal, tax, deliveryFee, manualAmount]);

  // Live calculation of each member's owed portion
  const liveSplitBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const itemDetailsByMember: Record<string, string[]> = {};

    members.forEach((m) => {
      breakdown[m.id] = 0;
      itemDetailsByMember[m.id] = [];
    });

    if (splitMode === "item-wise") {
      const memberItemSpend: Record<string, number> = {};
      members.forEach((m) => (memberItemSpend[m.id] = 0));

      items.forEach((item) => {
        const cost = Number(item.amount) || 0;
        const validParticipants = item.splitWith.filter((mid) =>
          members.some((m) => m.id === mid)
        );

        if (validParticipants.length > 0) {
          const perPerson = cost / validParticipants.length;
          validParticipants.forEach((mid) => {
            memberItemSpend[mid] = (memberItemSpend[mid] || 0) + perPerson;
            const shortName = item.name.split(" ")[0];
            itemDetailsByMember[mid]?.push(
              `${shortName} (₹${Math.round(perPerson)})`
            );
          });
        }
      });

      const extraFees = (Number(tax) || 0) + (Number(deliveryFee) || 0);
      const totalSpendAll = Object.values(memberItemSpend).reduce(
        (a, b) => a + b,
        0
      );

      members.forEach((m) => {
        const spend = memberItemSpend[m.id] || 0;
        let extraShare = 0;

        if (extraFees > 0) {
          if (proportionalTax && totalSpendAll > 0) {
            extraShare = (spend / totalSpendAll) * extraFees;
          } else {
            const activeCount = Object.values(memberItemSpend).filter(
              (v) => v > 0
            ).length;
            if (activeCount > 0 && spend > 0) {
              extraShare = extraFees / activeCount;
            }
          }
        }

        breakdown[m.id] = Math.round((spend + extraShare) * 100) / 100;
      });
    } else if (splitMode === "equal") {
      const activeMembers = members.filter((m) => equalIncluded[m.id]);
      const count = activeMembers.length || 1;
      const perHead = Math.round((totalAmount / count) * 100) / 100;

      members.forEach((m) => {
        breakdown[m.id] = equalIncluded[m.id] ? perHead : 0;
      });
    } else if (splitMode === "shares") {
      const totalShares = Object.values(shares).reduce((a, b) => a + (b || 0), 0) || 1;
      members.forEach((m) => {
        const shareCount = shares[m.id] || 0;
        breakdown[m.id] = Math.round(((totalAmount * shareCount) / totalShares) * 100) / 100;
      });
    } else if (splitMode === "unequal") {
      members.forEach((m) => {
        breakdown[m.id] = Number(unequalSplits[m.id]) || 0;
      });
    }

    return { breakdown, itemDetailsByMember };
  }, [
    splitMode,
    items,
    tax,
    deliveryFee,
    proportionalTax,
    members,
    totalAmount,
    equalIncluded,
    shares,
    unequalSplits,
  ]);

  // Unequal split total check
  const unequalAllocatedTotal = useMemo(() => {
    return Object.values(unequalSplits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [unequalSplits]);

  const unequalRemaining = Math.round((totalAmount - unequalAllocatedTotal) * 100) / 100;

  // Quick amount adder helper
  const addQuickAmount = (delta: number) => {
    if (splitMode === "item-wise") return;
    setManualAmount((prev) => Math.max(0, (Number(prev) || 0) + delta));
  };

  // Compress/resize image in browser using HTML canvas
  const compressImage = async (file: File): Promise<Blob | File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(
                  new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                    type: "image/jpeg",
                  })
                );
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Handle OCR Bill File Upload strictly using Gemini API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanVerifiedMessage(null);
    setScanErrorMessage(null);
    setItems([]);

    try {
      const processedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("bill", processedFile);

      const res = await fetch("/api/parse-bill", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(45000),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        const errorText = json.error || `Server responded with status ${res.status}`;
        console.error("Gemini OCR Error:", errorText);
        setScanErrorMessage(errorText);
        return;
      }

      if (json.success && json.data) {
        const {
          title: parsedTitle,
          items: parsedItems,
          tax: parsedTax,
          deliveryFee: parsedDel,
          totalAmount: parsedTotal,
        } = json.data;

        if (parsedTitle) setTitle(parsedTitle);
        setTax(typeof parsedTax === "number" ? parsedTax : 0);
        setDeliveryFee(typeof parsedDel === "number" ? parsedDel : 0);
        if (typeof parsedTotal === "number" && parsedTotal > 0) {
          setManualAmount(parsedTotal);
        }

        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          const newItems: BillItem[] = parsedItems.map((pi: any, idx: number) => ({
            id: `ocr-${Date.now()}-${idx}`,
            name: pi.name || `Item ${idx + 1}`,
            amount: Number(pi.amount) || 0,
            tag: pi.tag || "ITEM • 1X",
            splitWith: members.map((m) => m.id),
          }));
          setItems(newItems);
          setSplitMode("item-wise"); // auto switch to item-wise mode when receipt is scanned!
        }

        const modelTag = json.modelUsed ? ` via ${json.modelUsed}` : "";
        setScanVerifiedMessage(
          `Auto-scanned: ${parsedTitle || "Receipt"} (${parsedItems?.length || 0} items recognized${modelTag})`
        );
      } else {
        setScanErrorMessage("Unexpected response format from bill parser.");
      }
    } catch (err: any) {
      console.error("Fatal upload error:", err);
      const isTimeout = err?.name === "TimeoutError" || err?.message?.includes("timeout");
      setScanErrorMessage(
        isTimeout
          ? "Request timed out after 45 seconds. Please try again or check connection."
          : err?.message || "Failed to connect to /api/parse-bill"
      );
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Toggle roommate in an item
  const toggleItemMember = (itemId: string, memberId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.splitWith.includes(memberId);
        const nextSplitWith = exists
          ? it.splitWith.filter((id) => id !== memberId)
          : [...it.splitWith, memberId];
        return { ...it, splitWith: nextSplitWith };
      })
    );
  };

  // Add custom item
  const handleAddCustomItem = () => {
    const newItem: BillItem = {
      id: `custom-${Date.now()}`,
      name: "Custom Room Item",
      amount: 100,
      tag: "ROOM • 1X",
      splitWith: members.map((m) => m.id),
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Save & Split
  const handleSaveAndSplit = () => {
    setValidationError(null);

    if (members.length === 0) {
      setValidationError("Please add at least 1 roommate to split bills with!");
      setIsRoommateModalOpen(true);
      return;
    }
    if (!title.trim()) {
      setValidationError("Please enter an expense title (e.g. Behrouz Biryani or Electricity Bill).");
      titleInputRef.current?.focus();
      return;
    }
    if (title.trim().length > 100) {
      setValidationError("Expense title cannot exceed 100 characters.");
      return;
    }
    if (totalAmount <= 0) {
      setValidationError("Total amount must be greater than ₹0. Enter an amount or add bill items.");
      return;
    }
    if (totalAmount > 10_000_000 || isNaN(totalAmount)) {
      setValidationError("Total amount exceeds the allowable limit (₹1,00,00,000).");
      return;
    }

    if (splitMode === "unequal" && Math.abs(unequalRemaining) > 0.5) {
      if (!confirm(`Warning: Your custom splits leave ₹${Math.abs(unequalRemaining)} ${unequalRemaining > 0 ? "unallocated" : "overallocated"}. Do you still want to proceed?`)) {
        return;
      }
    }

    addExpense({
      title: title.trim(),
      totalAmount,
      paidById: paidById || members[0]?.id,
      date: "Just now",
      category,
      splitMode,
      splitDetails: liveSplitBreakdown.breakdown,
      shares: splitMode === "shares" ? shares : undefined,
      items: splitMode === "item-wise" ? items : undefined,
      tax,
      deliveryFee,
      note: "Added via Klear Smart Splitter",
      verified: !!scanVerifiedMessage,
    });

    router.push("/settle");
  };

  const payerShare = liveSplitBreakdown.breakdown[paidById] || 0;
  const toRecoverFromOthers = Math.max(0, totalAmount - payerShare);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="w-9 h-9 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black flex items-center gap-2">
              Add Expense & Scan Bill
            </h1>
            <div className="text-xs font-bold text-zinc-600">
              {roomName} • Automatic Split & Debt Minimization
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#25D366] text-black text-xs font-black px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-emerald-400 active:translate-y-0.5 transition-all whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Import WhatsApp Chat</span>
          </button>
          {members.length === 0 && (
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              className="bg-[#FF7A00] text-black text-xs font-black px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Roommates First</span>
            </button>
          )}
          <span className="bg-[#FAF8F5] border-2 border-black text-black text-[11px] font-black px-3 py-1 rounded-full shadow-[2px_2px_0_0_#000] whitespace-nowrap hidden sm:inline">
            INSTANT SYNC
          </span>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-[#FEE2E2] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex items-center justify-between gap-3 text-rose-950 animate-shake">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
            <span className="text-xs sm:text-sm font-black">{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="p-1 hover:bg-rose-200 rounded border border-black shrink-0"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
      )}

      {/* Warning Banner if No Roommates Exist */}
      {members.length === 0 && (
        <div className="bg-[#FEF08A] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" />
            <span>You haven&apos;t added any roommates to {roomName} yet. Add roommates to split tabs!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              className="bg-[#FF7A00] text-black font-black text-xs px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0_0_#000]"
            >
              + Add Roommate
            </button>
            <button
              onClick={loadSampleData}
              className="bg-white text-black font-black text-xs px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0_0_#000]"
            >
              Load Sample Data
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left (8 cols) + Live Ledger Impact Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Section 1: AMOUNT FIRST Hero Card */}
          <div className="bg-white border-2 border-black rounded-3xl p-5 md:p-6 shadow-[4px_4px_0_0_#000] space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                1. AMOUNT & TITLE
              </span>
              <span className="bg-[#FF7A00] text-black text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                PRIORITY INPUT
              </span>
            </div>

            {/* Big Amount Input Field */}
            <div className="bg-[#FAF8F5] border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0_0_#000]">
              <label htmlFor="expense-amount" className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                TOTAL BILL AMOUNT
              </label>
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black font-mono text-black">
                  ₹
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={totalAmount === 0 ? "" : totalAmount}
                  readOnly={splitMode === "item-wise"}
                  onChange={(e) => {
                    if (splitMode !== "item-wise") {
                      const val = Number(e.target.value);
                      setManualAmount(isNaN(val) ? 0 : val);
                      if (validationError) setValidationError(null);
                    }
                  }}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-black font-mono text-black focus:outline-none placeholder:text-zinc-300"
                />
              </div>

              {/* Quick Amount Add Pills for Students (+₹50, +₹100, +₹200, +₹500) */}
              {splitMode !== "item-wise" && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-dashed border-zinc-300 flex-wrap">
                  <span className="text-[10px] font-bold text-zinc-500 mr-1">Quick add:</span>
                  {[50, 100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => addQuickAmount(amt)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-black text-xs font-black rounded-lg border border-black shadow-[1px_1px_0_0_#000] active:translate-y-0.5 transition-all"
                    >
                      +₹{amt}
                    </button>
                  ))}
                  {manualAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualAmount(0)}
                      className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold rounded-lg border border-black transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expense Title */}
            <div className="space-y-1.5">
              <label htmlFor="expense-title" className="text-[10px] font-black uppercase text-zinc-500">
                WHAT WAS THIS EXPENSE FOR?
              </label>
              <input
                id="expense-title"
                ref={titleInputRef}
                type="text"
                value={title}
                placeholder="e.g. Behrouz Biryani, Canteen Lunch, Room 402 WiFi, Blinkit Snacks..."
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full bg-[#FAF8F5] border-2 border-black rounded-xl px-3.5 py-2.5 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
              />
            </div>

            {/* Visual Category Chips Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">
                CATEGORY
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                        isSelected
                          ? "bg-black text-white border-black shadow-[2px_2px_0_0_#000] scale-[1.01]"
                          : "bg-white text-zinc-800 border-black hover:bg-zinc-50 shadow-[1px_1px_0_0_#000]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? "text-[#FF7A00]" : "text-black"}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Who Paid Dropdown / Chip */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500">
                <span>WHO PAID THE UPFRONT BILL?</span>
                <button
                  type="button"
                  onClick={() => setIsRoommateModalOpen(true)}
                  className="text-blue-700 hover:underline font-bold"
                >
                  + Add/Manage Roommates
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {members.map((m) => {
                  const isPayer = paidById === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaidById(m.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all ${
                        isPayer
                          ? "bg-[#2DD4BF] text-teal-950 border-black shadow-[2px_2px_0_0_#000]"
                          : "bg-white text-zinc-700 border-black hover:bg-zinc-50 shadow-[1px_1px_0_0_#000]"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border border-black ${m.avatarBg} text-black text-[10px] font-bold flex items-center justify-center`}>
                        {m.initials}
                      </span>
                      <span>{m.isYou ? "You (Primary)" : m.name.split(" ")[0]}</span>
                      {isPayer && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: SMART OCR RECEIPT SCANNER */}
          <div className="bg-[#FFEDD5] border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0_0_#000] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="bg-[#FF7A00] text-black border border-black text-[10px] font-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                  GEMINI 3.0 MULTIMODAL OCR
                </span>
                <span className="text-xs font-black text-black">Scan Receipt / Invoice</span>
              </div>
              <span className="text-[10px] font-black uppercase bg-white border border-black px-2 py-0.5 rounded">
                AUTO LINE-ITEMS
              </span>
            </div>

            <p className="text-xs font-bold text-zinc-700">
              Auto-extracts food delivery, restaurant, grocery, or canteen bills into itemized line items with exact taxes & packaging charges.
            </p>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {/* Drag & Drop Area */}
            <div
              ref={scannerRef}
              tabIndex={0}
              role="button"
              aria-label="Upload and scan bill receipt"
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isScanning) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => {
                if (!isScanning) fileInputRef.current?.click();
              }}
              className={`relative overflow-hidden border-2 border-dashed border-black bg-white rounded-2xl p-5 text-center transition-all shadow-[2px_2px_0_0_#000] space-y-2 brutal-card-interactive focus:ring-4 focus:ring-[#FF7A00] focus:outline-none ${
                isScanFocused
                  ? "ring-4 ring-[#FF7A00] ring-offset-2 bg-amber-50/80 scale-[1.01]"
                  : ""
              } ${
                isScanning ? "opacity-90 cursor-wait" : "cursor-pointer hover:bg-amber-50/50"
              }`}
            >
              {isScanFocused && (
                <div className="absolute top-2 right-2 bg-[#FF7A00] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000] animate-bounce">
                  Tap to Select Receipt 📸
                </div>
              )}

              {/* Receipt Scanner Laser Sweep Animation */}
              {isScanning && <div className="laser-scanline" />}

              <div className="w-11 h-11 mx-auto bg-[#FFEDD5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] flex items-center justify-center">
                {isScanning ? (
                  <Loader2 className="w-5 h-5 text-black animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-black" />
                )}
              </div>
              <div>
                <div className="text-sm font-black text-black">
                  {isScanning
                    ? "Scanning & extracting bill items..."
                    : "Upload Receipt Image or Take Photo"}
                </div>
                <div className="text-[11px] font-bold text-zinc-500 mt-0.5">
                  {isScanning
                    ? "Extracting line items, amounts, tax & fees from invoice..."
                    : "Supports Zomato, Swiggy, Blinkit, Instamart & Canteen bills (JPEG, PNG, WebP up to 4MB)"}
                </div>
              </div>

              {!isScanning && (
                <button
                  type="button"
                  className="brutal-btn mt-1 inline-flex items-center gap-1.5 bg-[#FAF8F5] text-black text-xs font-black px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-zinc-100"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Choose Photo / Camera</span>
                </button>
              )}
            </div>

            {/* Error Banner */}
            {scanErrorMessage && (
              <div className="bg-[#FEE2E2] border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0_0_#000] flex items-start justify-between gap-3 text-rose-950">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide text-rose-900">
                      OCR Scan Error
                    </div>
                    <div className="text-xs font-bold font-mono mt-1 break-all">
                      {scanErrorMessage}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanErrorMessage(null)}
                  className="p-1 hover:bg-rose-200 rounded border border-black"
                >
                  <X className="w-4 h-4 text-black" />
                </button>
              </div>
            )}

            {/* Verified Banner */}
            {scanVerifiedMessage && (
              <div className="bg-[#A7F3D0] border-2 border-black rounded-xl p-3 flex items-center justify-between shadow-[2px_2px_0_0_#000]">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span className="truncate">{scanVerifiedMessage}</span>
                </div>
                <span className="bg-black text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ml-2">
                  VERIFIED
                </span>
              </div>
            )}
          </div>

          {/* Section 3: SPLIT LOGIC SELECTOR */}
          <div className="bg-white border-2 border-black rounded-3xl p-5 md:p-6 shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                2. SPLIT LOGIC
              </span>
              <span className="text-xs font-black text-black">
                {splitMode.toUpperCase()} ALLOCATION
              </span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "equal", label: "Equal Split", icon: Scale, desc: "Divide evenly" },
                { id: "item-wise", label: "Item-wise", icon: Split, desc: "Line-by-line" },
                { id: "unequal", label: "Unequal ₹", icon: PieChart, desc: "Exact amounts" },
                { id: "shares", label: "Ratio Shares", icon: Layers, desc: "Ratio weighting" },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = splitMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSplitMode(mode.id as SplitMode)}
                    className={`brutal-btn flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "bg-[#FF7A00] text-black border-black shadow-[3px_3px_0_0_#000] translate-x-0.5"
                        : "bg-white text-zinc-700 border-black hover:bg-zinc-50 shadow-[1px_1px_0_0_#000]"
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                    <span className="font-black text-xs mt-1">{mode.label}</span>
                    <span className="text-[10px] font-bold text-black/70 mt-0.5">{mode.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* EQUAL SPLIT MODE CONTENT */}
            {splitMode === "equal" && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-zinc-700">
                  <span>Included Roommates in Split:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        members.forEach((m) => (all[m.id] = true));
                        setEqualIncluded(all);
                      }}
                      className="text-[11px] text-blue-700 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const none: Record<string, boolean> = {};
                        members.forEach((m) => (none[m.id] = false));
                        setEqualIncluded(none);
                      }}
                      className="text-[11px] text-zinc-500 hover:underline font-bold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {members.map((m) => {
                    const isInc = equalIncluded[m.id];
                    const activeCount = members.filter((x) => equalIncluded[x.id]).length || 1;
                    const perHead = Math.round((totalAmount / activeCount) * 100) / 100;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setEqualIncluded((prev) => ({
                            ...prev,
                            [m.id]: !prev[m.id],
                          }))
                        }
                        className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center justify-between transition-all ${
                          isInc
                            ? `${m.avatarBg} text-black border-black shadow-[2px_2px_0_0_#000]`
                            : "bg-zinc-100 text-zinc-400 border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-white/80 border border-black text-[10px] flex items-center justify-center font-bold">
                            {m.initials}
                          </span>
                          <span className="truncate">{m.isYou ? "You" : m.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          {isInc ? (
                            <span className="font-mono text-sm">{formatINR(perHead)}</span>
                          ) : (
                            <span className="text-zinc-400">Excluded</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ITEM-WISE SPLIT MODE CONTENT */}
            {splitMode === "item-wise" && (
              <div className="pt-2 space-y-4">
                {items.length === 0 ? (
                  <div className="bg-[#FAF8F5] border-2 border-dashed border-black rounded-2xl p-6 text-center space-y-2">
                    <div className="text-sm font-black text-black">
                      No line items on this bill yet
                    </div>
                    <div className="text-xs font-bold text-zinc-500">
                      Upload a bill image above to auto-extract items, or add items manually below.
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="mt-2 inline-flex items-center gap-1.5 bg-white text-black text-xs font-black px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-zinc-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Custom Item</span>
                    </button>
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const count = item.splitWith.length;
                    const perPerson = count > 0 ? item.amount / count : 0;
                    const staggerClass = `receipt-stagger-${Math.min(idx + 1, 6)}`;

                    return (
                      <div
                        key={item.id}
                        className={`bg-[#FAF8F5] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] space-y-3 ${staggerClass}`}
                      >
                        {/* Item Header: Name, Tag, Subtotal */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItems((prev) =>
                                    prev.map((it) =>
                                      it.id === item.id ? { ...it, name: val } : it
                                    )
                                  );
                                }}
                                className="font-black text-sm md:text-base text-black bg-transparent border-b border-dashed border-zinc-400 focus:outline-none focus:border-black"
                              />
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black bg-amber-100 text-amber-900">
                                {item.tag || "ITEM"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="flex items-center">
                                <span className="text-sm font-black font-mono">₹</span>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => {
                                    const amt = Number(e.target.value) || 0;
                                    setItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id ? { ...it, amount: amt } : it
                                      )
                                    );
                                  }}
                                  className="w-20 text-right font-black font-mono text-sm md:text-base bg-white border border-black rounded px-1.5 py-0.5 focus:outline-none"
                                />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-500">
                                Subtotal
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete item"
                              aria-label="Delete item"
                              className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Split Among Roommate Chips */}
                        <div className="space-y-1.5 pt-1 border-t border-dashed border-zinc-300">
                          <div className="text-[10px] font-black uppercase text-zinc-500">
                            SPLIT AMONG:
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {members.map((m) => {
                              const isIncluded = item.splitWith.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => toggleItemMember(item.id, m.id)}
                                  className={`brutal-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-xs font-black transition-all ${
                                    isIncluded
                                      ? `${m.avatarBg} text-black border-black shadow-[2px_2px_0_0_#000]`
                                      : "bg-white text-zinc-400 border-dashed border-zinc-400 hover:border-black hover:text-black shadow-none"
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded-full bg-white/70 border border-black text-[9px] flex items-center justify-center font-bold">
                                    {m.initials}
                                  </span>
                                  <span>{m.isYou ? "You" : m.name.split(" ")[0]}</span>
                                  <span>{isIncluded ? "✓" : "+"}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[11px] font-bold text-zinc-500">
                            {count > 0 ? (
                              <>
                                ₹{Math.round(perPerson)} / person ({count} {count === 1 ? "roommate" : "roommates"})
                              </>
                            ) : (
                              <span className="text-rose-600">Select at least 1 roommate</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="w-full py-3 border-2 border-dashed border-black bg-white rounded-2xl font-black text-xs text-zinc-700 hover:bg-zinc-50 hover:text-black shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Missing Item to Bill</span>
                  </button>
                )}

                {/* Taxes & Extra Charges Card */}
                <div className="bg-[#DDD6FE] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs uppercase text-purple-950">
                      TAXES &amp; DELIVERY CHARGES
                    </span>
                    <span className="bg-white text-purple-950 border border-black text-[10px] font-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                      ₹{(Number(tax) || 0) + (Number(deliveryFee) || 0)} EXTRA
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]">
                      <label htmlFor="tax-amt" className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                        GST / Restaurant Tax
                      </label>
                      <div className="flex items-center">
                        <span className="text-sm font-black mr-1">₹</span>
                        <input
                          id="tax-amt"
                          type="number"
                          value={tax}
                          onChange={(e) => setTax(Number(e.target.value) || 0)}
                          className="w-full font-black font-mono text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]">
                      <label htmlFor="del-amt" className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                        Delivery / Packaging Surge
                      </label>
                      <div className="flex items-center">
                        <span className="text-sm font-black mr-1">₹</span>
                        <input
                          id="del-amt"
                          type="number"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                          className="w-full font-black font-mono text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0_0_#000] flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="propTax"
                      checked={proportionalTax}
                      onChange={(e) => setProportionalTax(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-2 border-black accent-[#FF7A00]"
                    />
                    <div>
                      <label htmlFor="propTax" className="text-xs font-black text-black cursor-pointer">
                        Split taxes &amp; delivery proportionally based on item spend (Recommended)
                      </label>
                      <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
                        Prevents roommates who ordered just a snack from paying high delivery penalties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UNEQUAL SPLIT MODE CONTENT */}
            {splitMode === "unequal" && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>Enter Custom ₹ Amount per Roommate:</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded border border-black ${
                      Math.abs(unequalRemaining) < 0.5
                        ? "bg-[#2DD4BF] text-teal-950"
                        : "bg-rose-100 text-rose-900"
                    }`}
                  >
                    {Math.abs(unequalRemaining) < 0.5
                      ? "100% Balanced ✓"
                      : `₹${Math.abs(unequalRemaining)} ${unequalRemaining > 0 ? "remaining" : "over"}`}
                  </span>
                </div>

                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-[#FAF8F5] border-2 border-black rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full border border-black ${m.avatarBg} text-[10px] font-bold flex items-center justify-center`}>
                          {m.initials}
                        </span>
                        <span className="font-black text-xs">{m.isYou ? "You" : m.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold text-xs mr-1">₹</span>
                        <input
                          type="number"
                          value={unequalSplits[m.id] || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setUnequalSplits((prev) => ({
                              ...prev,
                              [m.id]: val,
                            }));
                          }}
                          className="w-24 font-mono font-black text-right border-2 border-black rounded-lg px-2 py-1 bg-white text-xs focus:ring-2 focus:ring-[#FF7A00] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHARES SPLIT MODE CONTENT */}
            {splitMode === "shares" && (
              <div className="pt-2 space-y-3">
                <div className="text-xs font-black text-zinc-700">
                  Set Weighting Shares (e.g. 2 shares for heavy consumers, 1 for light):
                </div>

                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-[#FAF8F5] border-2 border-black rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full border border-black ${m.avatarBg} text-[10px] font-bold flex items-center justify-center`}>
                          {m.initials}
                        </span>
                        <span className="font-black text-xs">{m.isYou ? "You" : m.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-500">Shares:</span>
                        <input
                          type="number"
                          min="0"
                          value={shares[m.id] || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setShares((prev) => ({
                              ...prev,
                              [m.id]: val,
                            }));
                          }}
                          className="w-16 font-mono font-black text-center border-2 border-black rounded-lg px-2 py-1 bg-white text-xs focus:ring-2 focus:ring-[#FF7A00] focus:outline-none"
                        />
                        <span className="text-xs font-mono font-black text-zinc-600 min-w-[60px] text-right">
                          {formatINR(liveSplitBreakdown.breakdown[m.id] || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Live Ledger Impact */}
        <div className="lg:col-span-4 space-y-5 min-w-0 lg:sticky lg:top-20 self-start">
          <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0_0_#000] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-black flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-black" />
                <span>Live Split Impact</span>
              </h3>
              <span className="bg-[#2DD4BF] text-teal-950 text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                REAL-TIME
              </span>
            </div>

            {/* Payer Summary */}
            <div className="p-3.5 bg-[#FAF8F5] border-2 border-black rounded-2xl shadow-[2px_2px_0_0_#000]">
              <div className="text-[10px] font-black uppercase text-zinc-500">
                TOTAL CHARGED UPFRONT
              </div>
              <div className="text-2xl font-black font-mono text-black mt-0.5">
                {formatINR(totalAmount)}
              </div>
              <div className="text-[11px] font-bold text-zinc-500 mt-0.5">
                Paid by {members.find((m) => m.id === paidById)?.name || "Roommate"}
              </div>
            </div>

            {/* To be recovered from roommates */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                TO BE RECOVERED ({members.length - 1} ROOMMATES):
              </div>

              {members
                .filter((m) => m.id !== paidById)
                .map((m) => {
                  const share = liveSplitBreakdown.breakdown[m.id] || 0;
                  const itemSummary =
                    liveSplitBreakdown.itemDetailsByMember[m.id]?.join(" + ") ||
                    (splitMode === "equal" ? "Equal share" : "Calculated share");

                  return (
                    <div
                      key={m.id}
                      className="p-2.5 bg-[#FAF8F5] border border-black rounded-xl flex items-center justify-between shadow-[1px_1px_0_0_#000]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full border border-black ${m.avatarBg} text-black font-black text-[10px] flex items-center justify-center shrink-0`}
                        >
                          {m.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-black truncate">
                            {m.name.split(" ")[0]}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-500 truncate max-w-[130px]">
                            {itemSummary}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase">
                          owes
                        </div>
                        <div className="text-xs font-black font-mono text-emerald-600">
                          {formatINR(share)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Payer True Net Share */}
            <div className="p-3.5 bg-[#FFEDD5] border-2 border-black rounded-2xl shadow-[2px_2px_0_0_#000]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase text-black/80">
                    PAYER&apos;S TRUE SHARE
                  </div>
                  <div className="text-[10px] font-bold text-zinc-600">
                    Net personal cost
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-black">
                  {formatINR(payerShare)}
                </div>
              </div>
            </div>

            {/* Bill Coverage Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase">
                <span className="text-zinc-500">BILL COVERAGE</span>
                <span className="text-emerald-700">100% ACCOUNTED</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-200 border border-black rounded-full overflow-hidden flex">
                <div className="h-full bg-[#FF7A00] w-[35%]" />
                <div className="h-full bg-[#2DD4BF] w-[25%]" />
                <div className="h-full bg-[#C084FC] w-[20%]" />
                <div className="h-full bg-[#FBBF24] w-[20%]" />
              </div>
            </div>

            {/* Big Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAndSplit}
                className="brutal-btn w-full flex items-center justify-center gap-2 bg-[#FF7A00] hover:bg-orange-500 text-black font-black text-sm md:text-base py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-0.5 transition-all"
              >
                <span>Save &amp; Settle {formatINR(totalAmount)} →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />

      <WhatsAppImportModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}

export default function AddExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6 animate-pulse p-4">
          <div className="h-10 w-48 bg-zinc-200 border-2 border-black rounded-xl" />
          <div className="h-64 bg-white border-2 border-black rounded-2xl" />
        </div>
      }
    >
      <AddExpenseForm />
    </Suspense>
  );
}
