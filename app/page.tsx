"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useLedger } from "@/context/LedgerContext";
import {
  Plus,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Receipt,
  GitCommit,
  CreditCard,
  Utensils,
  Zap,
  ShoppingBag,
  Wifi,
  Coffee,
  CheckCircle,
  Copy,
  Share2,
  UserPlus,
  ShieldCheck,
  MessageSquare,
  ReceiptIndianRupee,
  Building2,
  Network,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { QRModal } from "@/components/QRModal";
import { RoommateModal } from "@/components/RoommateModal";
import { WhatsAppImportModal } from "@/components/WhatsAppImportModal";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";

export default function DashboardPage() {
  const {
    members,
    expenses,
    roomName,
    totalPoolSpent,
    youNetBalance,
    youOwed,
    youOwe,
    simplifiedTransfers,
    settledTransferIds,
    toggleSettleTransfer,
    whatsappNudge,
    isHydrated,
  } = useLedger();

  const mounted = isHydrated;

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedNudge, setCopiedNudge] = useState(false);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [missingUpiTransferId, setMissingUpiTransferId] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<{
    isOpen: boolean;
    payeeName: string;
    upiId: string;
    amount: number;
    transferId: string;
    isPaid: boolean;
  }>({
    isOpen: false,
    payeeName: "",
    upiId: "",
    amount: 0,
    transferId: "",
    isPaid: false,
  });

  const categories = [
    { id: "ALL", label: "All Bills" },
    { id: "Food", label: "Food & Meals" },
    { id: "Hostel", label: "Hostel & Stay" },
    { id: "Groceries", label: "Groceries" },
    { id: "Party", label: "Party & Outings" },
  ];

  const youMember = members.find((m) => m.isYou) || members[0];
  const pendingTransfers = simplifiedTransfers.filter(
    (t) => !settledTransferIds.includes(t.id)
  );

  // Immediate pending transfer where You owe someone
  const immediateOweTransfer = youMember
    ? pendingTransfers.find((t) => t.fromId === youMember.id)
    : null;
  const immediateCreditor = immediateOweTransfer
    ? members.find((m) => m.id === immediateOweTransfer.toId)
    : null;

  // Debtors owing you
  const debtorsOwingYou = useMemo(() => {
    if (!youMember) return [];
    return pendingTransfers
      .filter((t) => t.toId === youMember.id)
      .map((t) => {
        const m = members.find((mem) => mem.id === t.fromId);
        return {
          name: m?.name?.split(" ")[0] || "Roomie",
          amount: t.amount,
          transfer: t,
        };
      });
  }, [youMember, pendingTransfers, members]);

  // Creditors you owe
  const creditorsYouOwe = useMemo(() => {
    if (!youMember) return [];
    return pendingTransfers
      .filter((t) => t.fromId === youMember.id)
      .map((t) => {
        const m = members.find((mem) => mem.id === t.toId);
        return {
          name: m?.name?.split(" ")[0] || "Roomie",
          amount: t.amount,
          transfer: t,
          creditor: m,
        };
      });
  }, [youMember, pendingTransfers, members]);

  // Filtered and searched expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory =
        activeCategory === "ALL" ||
        e.category.toLowerCase() === activeCategory.toLowerCase() ||
        (activeCategory === "Hostel" && e.category === "Utilities");

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        e.title.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        (members.find((m) => m.id === e.paidById)?.name || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [expenses, activeCategory, searchQuery, members]);

  const handleCopyNudge = () => {
    navigator.clipboard.writeText(whatsappNudge.text);
    setCopiedNudge(true);
    setTimeout(() => setCopiedNudge(false), 2000);
  };

  const getExpenseIcon = (title: string, category: string) => {
    const t = title.toLowerCase();
    if (t.includes("biryani") || t.includes("food") || t.includes("dinner") || category === "Food")
      return <Utensils className="w-5 h-5 text-amber-800" />;
    if (t.includes("power") || t.includes("meter") || t.includes("ac") || t.includes("electric"))
      return <Zap className="w-5 h-5 text-emerald-800" />;
    if (t.includes("blinkit") || t.includes("zepto") || t.includes("grocery") || category === "Groceries")
      return <ShoppingBag className="w-5 h-5 text-purple-800" />;
    if (t.includes("wifi") || t.includes("airtel") || t.includes("jio") || category === "Utilities")
      return <Wifi className="w-5 h-5 text-rose-800" />;
    return <Coffee className="w-5 h-5 text-orange-800" />;
  };

  const getCategoryBadgeColor = (splitMode: string) => {
    switch (splitMode) {
      case "item-wise":
        return "bg-[#FED7AA] text-orange-950 border-orange-900";
      case "equal":
        return "bg-[#A7F3D0] text-emerald-950 border-emerald-900";
      case "shares":
        return "bg-[#DDD6FE] text-purple-950 border-purple-900";
      case "unequal":
        return "bg-[#FEF08A] text-amber-950 border-amber-900";
      default:
        return "bg-zinc-200 text-zinc-900 border-zinc-900";
    }
  };

  // EMPTY STATE: Zero roommates in group
  if (isHydrated && members.length === 0) {
    return (
      <div className="p-4 md:p-12 max-w-4xl mx-auto space-y-8 animate-fadeIn">
        <div className="bg-white border-2 border-black rounded-3xl p-8 md:p-12 shadow-[6px_6px_0_0_#000] text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[#FF7A00] border-2 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            <ReceiptIndianRupee className="w-8 h-8 text-black stroke-[2.5]" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COLLEGE HOSTEL EXPENSE SPLITTER</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-black font-serif">
              Welcome to Klear
            </h1>
            <p className="text-sm md:text-base font-bold text-zinc-600 max-w-lg mx-auto leading-relaxed">
              Zero-awkwardness hostel expense splitting, bill scanning, and fewest payments to settle up for college roommates.
            </p>
          </div>

          {/* Two Prominent Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              className="brutal-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FF7A00] text-black font-black text-sm md:text-base px-6 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-orange-500 transition-all"
            >
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
              <span>+ Add First Roommate</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="brutal-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] text-black font-black text-sm md:text-base px-6 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-emerald-400 transition-all"
            >
              <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              <span>Import WhatsApp Chat</span>
            </button>
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

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-black font-serif">
              {roomName}
            </h1>
            <span className="bg-[#FAF8F5] border-2 border-black text-black text-xs font-black px-2.5 py-0.5 rounded-full shadow-[1.5px_1.5px_0_0_#000]">
              {members.length} {members.length === 1 ? "Roommate" : "Roommates"}
            </span>
            {expenses.length === 0 ? (
              <span className="bg-zinc-100 text-zinc-700 border border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                No expenses yet
              </span>
            ) : pendingTransfers.length === 0 ? (
              <span className="bg-[#2DD4BF] text-teal-950 border border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                All Even ✓
              </span>
            ) : (
              <span className="bg-[#FFEDD5] text-orange-950 border border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                {pendingTransfers.length} {pendingTransfers.length === 1 ? "Settlement Due" : "Settlements Due"}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm font-bold text-zinc-600 mt-1">
            Real-time peer debt minimization & shared expense tracking
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="brutal-btn flex items-center gap-1.5 bg-[#25D366] text-black font-black text-xs md:text-sm px-3.5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-emerald-400 transition-all whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            <span>Import WhatsApp</span>
          </button>

          <Link
            href="/add?focus=scan"
            className="brutal-btn flex items-center gap-1.5 bg-white text-black font-black text-xs md:text-sm px-3.5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-zinc-50 transition-all whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Bill</span>
          </Link>

          <Link
            href="/add"
            className="brutal-btn flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-orange-500 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Left 8 Cols (Hero + Feed) + Right 4 Cols (Matrix + Nudge) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* Left Column: Hero Overview + Quick Pay Alert + Stat Tiles + Expense Feed */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Master Financial Overview Card */}
          <div className="bg-[#FF7A00] border-2 border-black rounded-3xl p-5 md:p-6 shadow-[4px_4px_0_0_#000] text-black relative overflow-hidden">
            {/* Top row: Group identity & shortcut */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg md:text-xl tracking-tight text-black">
                      {roomName}
                    </span>
                    <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      ACTIVE LEDGER
                    </span>
                  </div>
                  <div className="text-xs font-bold text-black/80">
                    {!isHydrated ? (
                      <span className="inline-block w-28 h-3.5 bg-black/20 rounded animate-pulse" />
                    ) : (
                      `Viewing as: ${youMember?.name || "Roommate"} (${youMember?.isYou ? "You" : "Primary"})`
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsRoommateModalOpen(true)}
                title="Manage roommates directory"
                aria-label="Manage roommates directory"
                className="brutal-btn w-9 h-9 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-amber-100 transition-colors"
              >
                <Users className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Center: Primary Financial Headline answering "Where do I stand?" */}
            <div className="mt-5 pt-4 border-t-2 border-black/15">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-black/85">
                    YOUR NET POSITION
                  </div>
                  <div className="flex items-baseline gap-2.5 mt-1">
                    <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-black">
                      {!isHydrated ? (
                        <span className="inline-block w-36 h-10 bg-black/20 rounded animate-pulse" />
                      ) : youNetBalance > 0 ? (
                        <AnimatedCurrency value={youNetBalance} showSign prefix="₹" />
                      ) : youNetBalance < 0 ? (
                        <AnimatedCurrency value={Math.abs(youNetBalance)} prefix="-₹" />
                      ) : (
                        <span>₹0.00</span>
                      )}
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] ${
                        youNetBalance > 0
                          ? "bg-[#2DD4BF] text-teal-950"
                          : youNetBalance < 0
                          ? "bg-rose-200 text-rose-950"
                          : "bg-white text-zinc-900"
                      }`}
                    >
                      {youNetBalance > 0
                        ? "You are owed"
                        : youNetBalance < 0
                        ? "You owe money"
                        : expenses.length === 0
                        ? "No expenses yet"
                        : "All even"}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] font-black uppercase tracking-wider text-black/80">
                    TOTAL GROUP SPEND
                  </div>
                  <div className="text-xl md:text-2xl font-black font-mono text-black mt-0.5">
                    {!isHydrated ? (
                      <span className="inline-block w-24 h-6 bg-black/20 rounded animate-pulse" />
                    ) : (
                      formatINR(totalPoolSpent)
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-black/75">
                    {expenses.length} {expenses.length === 1 ? "bill recorded" : "bills recorded"}
                  </div>
                </div>
              </div>
            </div>

            {/* Split Balance Subcards inside Hero: Answers (1) How much do I owe? & (2) How much do people owe me? */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {/* You are owed card */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0_0_#000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-zinc-600 uppercase">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>PEOPLE OWE YOU</span>
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-400 font-black">
                      RECEIVABLE
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                    {!mounted ? (
                      <span className="inline-block w-24 h-7 bg-zinc-200 rounded animate-pulse" />
                    ) : (
                      <AnimatedCurrency value={youOwed} showSign prefix="₹" />
                    )}
                  </div>
                </div>
                <div className="text-xs font-bold text-zinc-600 mt-2 truncate">
                  {debtorsOwingYou.length > 0 ? (
                    <span className="text-black font-extrabold">
                      {debtorsOwingYou.map((d) => `${d.name} (${formatINR(d.amount)})`).join(", ")}
                    </span>
                  ) : expenses.length === 0 ? (
                    "No expenses yet"
                  ) : (
                    "No pending receivables"
                  )}
                </div>
              </div>

              {/* You owe card */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0_0_#000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-zinc-600 uppercase">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                      <span>YOU OWE OTHERS</span>
                    </span>
                    <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded border border-rose-400 font-black">
                      PAYABLE
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                    {!mounted ? (
                      <span className="inline-block w-24 h-7 bg-zinc-200 rounded animate-pulse" />
                    ) : youOwe > 0 ? (
                      <AnimatedCurrency value={youOwe} prefix="-₹" />
                    ) : (
                      <span>₹0.00</span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-bold text-zinc-600 mt-2 truncate">
                  {creditorsYouOwe.length > 0 ? (
                    <span className="text-black font-extrabold">
                      {creditorsYouOwe.map((c) => `To ${c.name} (${formatINR(c.amount)})`).join(", ")}
                    </span>
                  ) : expenses.length === 0 ? (
                    "No expenses yet"
                  ) : (
                    "You are all clear of dues!"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Immediate Action Alert Banner: Answers "What should I do next?" */}
          {immediateOweTransfer && immediateCreditor && (
            <div className="bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-8 border-l-[#FF7A00]">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-[#FFEDD5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] shrink-0 mt-0.5 sm:mt-0">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-black">
                      Immediate Action Required
                    </span>
                    <span className="text-[9px] font-black uppercase bg-[#FED7AA] text-orange-950 px-1.5 py-0.2 rounded border border-black">
                      DUE NOW
                    </span>
                  </div>
                  <div className="text-xs font-bold text-zinc-600 mt-1">
                    Pay {formatINR(immediateOweTransfer.amount)} to{" "}
                    <span className="text-black font-extrabold">{immediateCreditor?.name || "Roommate"}</span>{" "}
                    via UPI (GPay • PhonePe • Paytm) to clear your share.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {immediateCreditor?.upiId?.trim() ? (
                  <button
                    onClick={() =>
                      setActiveQrModal({
                        isOpen: true,
                        payeeName: immediateCreditor.name || "Roommate",
                        upiId: immediateCreditor.upiId || "",
                        amount: immediateOweTransfer.amount,
                        transferId: immediateOweTransfer.id,
                        isPaid: settledTransferIds.includes(immediateOweTransfer.id),
                      })
                    }
                    className="brutal-btn bg-[#2DD4BF] text-black font-black text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-teal-300 transition-all whitespace-nowrap"
                  >
                    Pay {formatINR(immediateOweTransfer.amount)} to {(immediateCreditor.name || "Roommate").split(" ")[0]} via UPI →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-400 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-zinc-300 cursor-not-allowed select-none whitespace-nowrap"
                    title="No UPI ID registered for this roommate"
                  >
                    <span>No UPI ID</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3 Stat Tiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Roommates */}
            <div
              onClick={() => setIsRoommateModalOpen(true)}
              className="bg-[#FAF8F5] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between cursor-pointer hover:bg-amber-50/70 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                  ROOMMATES
                </span>
                <Users className="w-4 h-4 text-zinc-800" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-black font-mono">
                  {!isHydrated ? (
                    <span className="inline-block w-8 h-8 bg-zinc-200 rounded animate-pulse" />
                  ) : (
                    members.length
                  )}
                </div>
                <div className="flex -space-x-1.5 mt-2">
                  {members.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className={`w-7 h-7 rounded-full border-2 border-black ${m.avatarBg} text-black text-[11px] font-black flex items-center justify-center shadow-[1px_1px_0_0_#000]`}
                    >
                      {m.initials}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-7 h-7 rounded-full border-2 border-black bg-zinc-200 text-black text-[10px] font-black flex items-center justify-center shadow-[1px_1px_0_0_#000]">
                      +{members.length - 5}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] font-bold text-zinc-500">
                Tap to manage & add UPI IDs
              </div>
            </div>

            {/* Tile 2: Bills */}
            <div className="bg-[#DDD6FE] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-950 uppercase tracking-wider">
                  RECORDED BILLS
                </span>
                <Receipt className="w-4 h-4 text-purple-950" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-black font-mono text-purple-950">
                  {!isHydrated ? (
                    <span className="inline-block w-8 h-8 bg-purple-300 rounded animate-pulse" />
                  ) : (
                    expenses.length
                  )}
                </div>
                <div className="text-[11px] font-bold text-purple-900 mt-1">
                  {expenses.length - settledTransferIds.length} active bills
                </div>
              </div>
            </div>

            {/* Tile 3: Minimum Settlement Payments */}
            <div className="bg-[#2DD4BF] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider">
                  Payments needed
                </span>
                <GitCommit className="w-4 h-4 text-teal-950" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-black font-mono text-teal-950">
                  {!isHydrated ? (
                    <span className="inline-block w-8 h-8 bg-teal-300 rounded animate-pulse" />
                  ) : (
                    pendingTransfers.length
                  )}
                </div>
                <div className="text-[11px] font-bold text-teal-900 mt-1">
                  Settles all {members.length} roommates
                </div>
              </div>
              <Link
                href="/settle"
                className="text-[10px] font-black text-teal-950 hover:underline flex items-center gap-1"
              >
                <span>View settlement graph</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity / Expenses Section */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-black">Recent Activity</h2>
                <span className="bg-white border-2 border-black text-black text-xs font-black px-2.5 py-0.5 rounded-full shadow-[1.5px_1.5px_0_0_#000]">
                  {filteredExpenses.length} {filteredExpenses.length === 1 ? "Bill" : "Bills"}
                </span>
              </div>

              <Link
                href="/settle"
                className="text-xs font-black text-zinc-700 hover:text-black flex items-center gap-1 hover:underline"
              >
                <span>View Full Audit & Settle</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bills, payers, categories..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-zinc-400 hover:text-black text-xs font-black"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? "bg-black text-white border-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white text-zinc-800 border-black hover:bg-zinc-100 shadow-[1px_1px_0_0_#000]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expenses Feed */}
            <div className="space-y-3">
              {!isHydrated ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-20 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000]" />
                  <div className="h-20 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000]" />
                  <div className="h-20 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000]" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-black rounded-2xl p-8 text-center shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="w-12 h-12 mx-auto bg-amber-50 border-2 border-black rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-zinc-700" />
                  </div>
                  <div className="text-sm font-black text-black">
                    {searchQuery
                      ? `No expenses matching "${searchQuery}"`
                      : `No expenses recorded in ${roomName} yet.`}
                  </div>
                  <p className="text-xs font-bold text-zinc-500 max-w-sm mx-auto">
                    {searchQuery
                      ? "Try searching for a different term or resetting the category filter."
                      : "Add your first canteen bill, dinner tab, or electricity split to see real-time balance calculations."}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    {searchQuery ? (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setActiveCategory("ALL");
                        }}
                        className="inline-flex items-center gap-1.5 bg-black text-white font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                      >
                        Clear Filters
                      </button>
                    ) : (
                        <Link
                          href="/add"
                          className="inline-flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add First Expense</span>
                        </Link>
                    )}
                  </div>
                </div>
              ) : (
                filteredExpenses.map((expense, idx) => {
                  const payer =
                    members.find((m) => m.id === expense.paidById) || members[0];
                  const userShare = youMember
                    ? expense.splitDetails[youMember.id] || 0
                    : 0;
                  const isUserPayer = youMember && expense.paidById === youMember.id;

                  // Balance impact for current user
                  let impactBadge;
                  if (isUserPayer) {
                    const toRecover = expense.totalAmount - userShare;
                    impactBadge = (
                      <div className="text-right">
                        <div className="text-xs md:text-sm font-black font-mono text-emerald-600">
                          +{formatINR(toRecover)} back
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500">
                          Total {formatINR(expense.totalAmount)}
                        </div>
                      </div>
                    );
                  } else if (userShare > 0) {
                    impactBadge = (
                      <div className="text-right">
                        <div className="text-xs md:text-sm font-black font-mono text-rose-600">
                          -{formatINR(userShare)} you owe
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500">
                          Total {formatINR(expense.totalAmount)}
                        </div>
                      </div>
                    );
                  } else {
                    impactBadge = (
                      <div className="text-right">
                        <div className="text-xs md:text-sm font-bold text-zinc-500">
                          Not involved
                        </div>
                        <div className="text-[10px] font-bold text-zinc-400">
                          Total {formatINR(expense.totalAmount)}
                        </div>
                      </div>
                    );
                  }

                  const staggerClass = `receipt-stagger-${Math.min(idx + 1, 6)}`;

                  return (
                    <div
                      key={expense.id}
                      className={`bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex items-center justify-between gap-3 hover:translate-x-0.5 transition-transform ${staggerClass}`}
                    >
                      {/* Left: Icon + Title + Payer Subtext */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 shrink-0 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] flex items-center justify-center">
                          {getExpenseIcon(expense.title, expense.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm md:text-base text-black truncate">
                              {expense.title}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(
                                expense.splitMode
                              )}`}
                            >
                              {expense.splitMode === "item-wise"
                                ? "Item-wise"
                                : expense.splitMode === "equal"
                                ? `Equal (${Object.keys(expense.splitDetails).length})`
                                : expense.splitMode === "shares"
                                ? "Shares"
                                : expense.splitMode}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-zinc-500 truncate mt-0.5">
                            Paid by{" "}
                            <span className="text-black font-extrabold">
                              {payer?.isYou ? "You" : payer?.name?.split(" ")[0] || "Roomie"}
                            </span>{" "}
                            • {Object.keys(expense.splitDetails).length} in split • {expense.date}
                          </div>
                        </div>
                      </div>

                      {/* Right: Net Impact */}
                      <div className="shrink-0">{impactBadge}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Who owes who + Who pays whom + WhatsApp Nudge */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Card 1: Who owes who */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-black flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-black" strokeWidth={2.5} />
                  <span>Who owes who</span>
                </h3>
                <div className="text-[11px] font-bold text-zinc-500">
                  Who needs to pay whom, simplified
                </div>
              </div>
              <span className="bg-[#2DD4BF] text-teal-950 text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                Fewest payments
              </span>
            </div>

            {/* Matrix Items */}
            <div className="space-y-2.5 pt-1">
              {!isHydrated ? (
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-16 bg-[#FAF8F5] border border-black rounded-xl" />
                  <div className="h-16 bg-[#FAF8F5] border border-black rounded-xl" />
                </div>
              ) : simplifiedTransfers.length === 0 ? (
                <div className="p-4 bg-[#FAF8F5] border border-black rounded-xl text-center text-xs font-bold text-zinc-500">
                  No debts to settle in {roomName}. All tabs are zero-sum balanced!
                </div>
              ) : (
                simplifiedTransfers.map((t) => {
                  const debtor = members.find((m) => m.id === t.fromId);
                  const creditor = members.find((m) => m.id === t.toId);
                  const isPaid = settledTransferIds.includes(t.id);
                  const isYouCreditor = youMember && t.toId === youMember.id;
                  const isYouDebtor = youMember && t.fromId === youMember.id;
                  const hasCreditorUpi = Boolean(creditor && creditor.upiId && creditor.upiId.trim());
                  const creditorName = creditor?.name ? creditor.name.split(" ")[0] : "Roommate";

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isPaid) return;
                        if (hasCreditorUpi) {
                          setMissingUpiTransferId(null);
                          setActiveQrModal({
                            isOpen: true,
                            payeeName: creditor?.name || "Roommate",
                            upiId: (creditor?.upiId || "").trim(),
                            amount: t.amount,
                            transferId: t.id,
                            isPaid,
                          });
                        } else {
                          setMissingUpiTransferId((prev) => (prev === t.id ? null : t.id));
                        }
                      }}
                      className={`p-3 rounded-xl border-2 border-black flex flex-col justify-between cursor-pointer transition-all ${
                        isPaid
                          ? "bg-zinc-100 opacity-60"
                          : "bg-[#FAF8F5] hover:bg-amber-50 shadow-[2px_2px_0_0_#000]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full border border-black ${
                              debtor?.avatarBg || "bg-zinc-200"
                            } text-black font-black text-xs flex items-center justify-center shrink-0`}
                          >
                            {debtor?.initials || "R"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-black truncate">
                              {debtor?.isYou ? "You" : debtor?.name?.split(" ")[0]} ➔{" "}
                              {creditor?.isYou ? "You" : creditor?.name?.split(" ")[0]}
                            </div>
                            <div className="text-[10px] font-bold text-zinc-500 truncate">
                              {t.reason || "Room split dues"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-black font-mono ${
                              isPaid
                                ? "text-zinc-500 line-through"
                                : isYouCreditor
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {isYouCreditor ? "+" : "-"}
                            {formatINR(t.amount)}
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                              isPaid
                                ? "bg-zinc-200 text-zinc-600 border-zinc-400"
                                : isYouDebtor
                                ? "bg-rose-100 text-rose-800 border-rose-800"
                                : "bg-emerald-100 text-emerald-800 border-emerald-800"
                            }`}
                          >
                            {isPaid ? "SETTLED ✓" : isYouDebtor ? "DUE TODAY" : "PENDING"}
                          </span>
                        </div>
                      </div>

                      {/* Inline warning when tapped and creditor has no UPI ID */}
                      {missingUpiTransferId === t.id && !hasCreditorUpi && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-zinc-300 flex items-center justify-between gap-2 text-[11px] font-bold text-amber-900 bg-amber-50/90 rounded-lg px-2.5 py-1.5">
                          <span>Add a UPI ID for {creditorName} to pay by UPI</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsRoommateModalOpen(true);
                            }}
                            className="text-[10px] font-black underline text-black hover:text-orange-600 shrink-0"
                          >
                            Edit Roommate →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Who pays whom Flow */}
            <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-600">
                <span>Who pays whom</span>
                <span className="text-[#059669]">
                  {pendingTransfers.length} {pendingTransfers.length === 1 ? "payment needed" : "payments needed"}
                </span>
              </div>

              {simplifiedTransfers.length > 0 ? (
                <div className="flex items-center justify-between gap-1 pt-1 text-center font-mono text-[10px] font-bold overflow-x-auto scrollbar-none">
                  {simplifiedTransfers.slice(0, 3).map((t, idx) => {
                    const from = members.find((m) => m.id === t.fromId);
                    const to = members.find((m) => m.id === t.toId);
                    return (
                      <React.Fragment key={t.id}>
                        {idx > 0 && <span className="font-black">➔</span>}
                        <div className="bg-white border border-black rounded px-2 py-1 shadow-[1px_1px_0_0_#000] shrink-0">
                          <div className="font-black text-black truncate max-w-[60px]">
                            {from?.isYou ? "YOU" : from?.name?.split(" ")[0]}
                          </div>
                          <div className="text-rose-600 font-black">
                            -{formatINR(t.amount)}
                          </div>
                        </div>
                        <span className="font-black">➔</span>
                        <div className="bg-[#FF7A00] text-black border border-black rounded px-2 py-1 shadow-[1px_1px_0_0_#000] shrink-0">
                          <div className="font-black truncate max-w-[60px]">
                            {to?.isYou ? "YOU" : to?.name?.split(" ")[0]}
                          </div>
                          <div className="font-black">
                            +{formatINR(t.amount)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] font-bold text-center text-zinc-500 py-1">
                  {expenses.length === 0 ? "No expenses yet" : "Everything adds up"}
                </div>
              )}
            </div>

            {/* 1-Click Hostel Nudge */}
            <div className="p-4 bg-[#FAF8F5] border-2 border-black rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-black">
                <span>1-CLICK HOSTEL NUDGE</span>
                <MessageSquare className="w-4 h-4 text-black" strokeWidth={2.5} />
              </div>

              {expenses.length === 0 ? (
                <div className="bg-zinc-50 border-2 border-zinc-400 rounded-lg p-3 text-center space-y-1">
                  <div className="text-xs font-black text-zinc-700 flex items-center justify-center gap-1.5">
                    <span>No expenses yet</span>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-500">
                    Add an expense to calculate settlements and send reminders.
                  </p>
                </div>
              ) : pendingTransfers.length === 0 ? (
                <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-3 text-center space-y-1">
                  <div className="text-xs font-black text-emerald-900 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>All Dues Settled!</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800">
                    Everyone in {roomName} is even. No pending dues to nudge.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white border-2 border-black rounded-lg p-2.5 text-xs font-medium italic text-zinc-800 shadow-[1px_1px_0_0_#000]">
                    &quot;{whatsappNudge.text}&quot;
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={whatsappNudge.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#2DD4BF] text-black font-black text-xs py-2 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Nudge</span>
                    </a>

                    <button
                      onClick={handleCopyNudge}
                      title="Copy reminder message"
                      aria-label="Copy reminder message"
                      className="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:bg-zinc-100 transition-colors"
                    >
                      {copiedNudge ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-black" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic QR Code Modal */}
      <QRModal
        isOpen={activeQrModal.isOpen}
        onClose={() => setActiveQrModal((prev) => ({ ...prev, isOpen: false }))}
        payeeName={activeQrModal.payeeName}
        upiId={activeQrModal.upiId}
        amount={activeQrModal.amount}
        onMarkPaid={() => {
          if (activeQrModal.transferId) {
            toggleSettleTransfer(activeQrModal.transferId);
          }
        }}
        isPaid={activeQrModal.isPaid}
      />

      {/* Roommates Directory Modal */}
      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />

      {/* WhatsApp Chat Import Modal */}
      <WhatsAppImportModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}
