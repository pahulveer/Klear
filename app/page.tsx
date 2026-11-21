"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLedger } from "@/context/LedgerContext";
import {
  Plus,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
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
    loadSampleData,
    whatsappNudge,
    isHydrated,
  } = useLedger();

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [copiedNudge, setCopiedNudge] = useState(false);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
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
    { id: "ALL", label: `ALL (${expenses.length})` },
    { id: "Food", label: "FOOD & DRINK" },
    { id: "Hostel", label: "HOSTEL UTILITIES" },
    { id: "Groceries", label: "GROCERIES" },
    { id: "Party", label: "PARTY & OUTINGS" },
  ];

  const filteredExpenses =
    activeCategory === "ALL"
      ? expenses
      : expenses.filter(
        (e) =>
          e.category.toLowerCase() === activeCategory.toLowerCase() ||
          (activeCategory === "Hostel" && e.category === "Utilities")
      );

  const youMember = members.find((m) => m.isYou) || members[0];
  const pendingTransfers = simplifiedTransfers.filter(
    (t) => !settledTransferIds.includes(t.id)
  );

  // Find any transfer where You owe someone for the immediate pay alert
  const immediateOweTransfer = youMember
    ? pendingTransfers.find((t) => t.fromId === youMember.id)
    : null;
  const immediateCreditor = immediateOweTransfer
    ? members.find((m) => m.id === immediateOweTransfer.toId)
    : null;

  // Debtors owing you
  const debtorsOwingYou = youMember
    ? pendingTransfers
      .filter((t) => t.toId === youMember.id)
      .map((t) => {
        const m = members.find((mem) => mem.id === t.fromId);
        return `${m?.name?.split(" ")[0] || "Roomie"} (${formatINR(t.amount)})`;
      })
    : [];

  // Creditors you owe
  const creditorsYouOwe = youMember
    ? pendingTransfers
      .filter((t) => t.fromId === youMember.id)
      .map((t) => {
        const m = members.find((mem) => mem.id === t.toId);
        return `${m?.name?.split(" ")[0] || "Roomie"} (${formatINR(t.amount)})`;
      })
    : [];

  const handleCopyNudge = () => {
    navigator.clipboard.writeText(whatsappNudge.text);
    setCopiedNudge(true);
    setTimeout(() => setCopiedNudge(false), 2000);
  };

  const getExpenseIcon = (title: string, category: string) => {
    const t = title.toLowerCase();
    if (t.includes("biryani") || category === "Food")
      return <Utensils className="w-5 h-5 text-amber-800" />;
    if (t.includes("power") || t.includes("meter") || t.includes("ac"))
      return <Zap className="w-5 h-5 text-emerald-800" />;
    if (t.includes("blinkit") || category === "Groceries")
      return <ShoppingBag className="w-5 h-5 text-purple-800" />;
    if (t.includes("wifi") || t.includes("airtel") || category === "Utilities")
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

  // EMPTY STATE (Only when loaded and no roommates exist yet)
  if (isHydrated && members.length === 0) {
    return (
      <div className="p-4 md:p-12 max-w-4xl mx-auto space-y-8">
        <div className="bg-white border-2 border-black rounded-3xl p-8 md:p-12 shadow-[6px_6px_0_0_#000] text-center space-y-6">
          <div className="w-14 h-14 mx-auto bg-[#FF6B00] border-2 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            <ReceiptIndianRupee className="w-7 h-7 text-black stroke-[2.5]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-black font-serif">
              Welcome to Klear
            </h1>
            <p className="text-sm md:text-base font-bold text-zinc-600 max-w-lg mx-auto">
              Your ledger is currently empty. Start fresh by adding your roommates, or load sample data to test debt simplification immediately.
            </p>
          </div>

          {/* Three Prominent Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              className="brutal-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FF7A00] text-black font-black text-sm md:text-base px-6 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-orange-500 transition-all"
            >
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
              <span>+ Add Your First Roommate</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="brutal-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] text-black font-black text-sm md:text-base px-6 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-emerald-400 transition-all"
            >
              <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              <span>Import from WhatsApp</span>
            </button>

            <button
              onClick={loadSampleData}
              className="brutal-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2DD4BF] text-black font-black text-sm md:text-base px-6 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-teal-300 transition-all"
            >
              <RotateCw className="w-5 h-5" />
              <span>Load Sample Data</span>
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
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black font-serif">
            {roomName} Ledger
          </h1>
          <p className="text-xs md:text-sm font-bold text-zinc-600 mt-1">
            Real-time peer debts & cashflow optimizer for {roomName}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="brutal-btn flex items-center gap-2 bg-[#25D366] text-black font-black text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-emerald-400 transition-all whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            <span>Import from WhatsApp</span>
          </button>

          <Link
            href="/add"
            className="brutal-btn flex items-center gap-2 bg-[#FF7A00] text-black font-black text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-orange-500 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Expense</span>
          </Link>

          <Link
            href="/add"
            className="brutal-btn flex items-center gap-2 bg-white text-black font-black text-xs md:text-sm px-4 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-zinc-50 transition-all whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Scan OCR Bill</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Left 8 Cols + Right 4 Cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* Left Column: Hero Card + Stat Tiles + Dues + Expenses */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Hero Card */}
          <div className="bg-[#FF7A00] border-2 border-black rounded-2xl p-5 md:p-6 shadow-[4px_4px_0_0_#000] text-black relative overflow-hidden">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000]">
                  <span className="text-lg">🛏️</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg md:text-xl tracking-tight">
                      {roomName}
                    </span>
                    <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      HOSTEL
                    </span>
                  </div>
                  <div className="text-xs font-bold text-black/80">
                    {!isHydrated ? (
                      <span className="inline-block w-28 h-3.5 bg-black/20 rounded animate-pulse" />
                    ) : (
                      `${members.length} Active ${members.length === 1 ? "Roommate" : "Roommates"} • Hostel Pool`
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsRoommateModalOpen(true)}
                title="Manage group roommates"
                className="brutal-btn w-8 h-8 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-amber-100 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-black" />
              </button>
            </div>

            {/* Total Spent Big Counter */}
            <div className="mt-5">
              <div className="text-[11px] font-black uppercase tracking-wider text-black/80">
                TOTAL POOL SPENT
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl md:text-5xl font-black font-mono tracking-tight">
                  {!isHydrated ? (
                    <span className="inline-block w-36 h-10 bg-black/20 rounded animate-pulse" />
                  ) : (
                    <AnimatedCurrency value={totalPoolSpent} />
                  )}
                </span>
                <span className="text-xs font-black bg-white border-2 border-black px-2 py-0.5 rounded-full shadow-[1.5px_1.5px_0_0_#000]">
                  {!isHydrated ? (
                    <span className="inline-block w-16 h-3 bg-zinc-200 rounded animate-pulse" />
                  ) : (
                    `${expenses.length} ${expenses.length === 1 ? "Expense" : "Expenses"}`
                  )}
                </span>
              </div>
            </div>

            {/* Split Balance Subcards inside Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {/* You are owed */}
              <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0_0_#000]">
                <div className="flex items-center justify-between text-[11px] font-black text-zinc-600 uppercase">
                  <span>YOU ARE OWED</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600 mt-0.5">
                  <AnimatedCurrency value={youOwed} showSign prefix="₹" />
                </div>
                <div className="text-[11px] font-bold text-zinc-600 mt-1 truncate">
                  {debtorsOwingYou.length > 0
                    ? `${debtorsOwingYou.join(" & ")} owe you`
                    : "No pending receivables"}
                </div>
              </div>

              {/* You owe */}
              <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0_0_#000]">
                <div className="flex items-center justify-between text-[11px] font-black text-zinc-600 uppercase">
                  <span>YOU OWE</span>
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-600 mt-0.5">
                  {youOwe > 0 ? (
                    <AnimatedCurrency value={youOwe} prefix="-₹" />
                  ) : (
                    <span>₹0</span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-zinc-600 mt-1 truncate">
                  {creditorsYouOwe.length > 0
                    ? `To ${creditorsYouOwe.join(" & ")} for split dues`
                    : "You are all clear of dues!"}
                </div>
              </div>
            </div>
          </div>

          {/* 3 Stat Tiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Roommates */}
            <div
              onClick={() => setIsRoommateModalOpen(true)}
              className="bg-[#FAF8F5] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between cursor-pointer hover:bg-amber-50 transition-colors"
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
                <div className="flex -space-x-2 mt-2">
                  {members.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className={`w-7 h-7 rounded-full border-2 border-black ${m.avatarBg} text-black text-[11px] font-black flex items-center justify-center shadow-[1px_1px_0_0_#000]`}
                    >
                      {m.initials}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tile 2: Bills */}
            <div className="bg-[#DDD6FE] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-950 uppercase tracking-wider">
                  TOTAL BILLS
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
                  {expenses.length - settledTransferIds.length} Active • {settledTransferIds.length} Settled
                </div>
              </div>
            </div>

            {/* Tile 3: Min Tabs */}
            <div className="bg-[#2DD4BF] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider">
                  MIN TABS
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
                  Simplified Graph
                </div>
              </div>
            </div>
          </div>

          {/* Immediate Room Tab Due Alert Banner (if you owe someone) */}
          {immediateOweTransfer && immediateCreditor && (
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FFEDD5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-black text-sm text-black">
                    Immediate Room Tab Due
                  </div>
                  <div className="text-xs font-bold text-zinc-600 mt-0.5">
                    Pay {formatINR(immediateOweTransfer.amount)} to{" "}
                    <span className="text-black font-extrabold">
                      {immediateCreditor.name}
                    </span>{" "}
                    via UPI: GPay • PhonePe • Paytm
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setActiveQrModal({
                    isOpen: true,
                    payeeName: immediateCreditor.name,
                    upiId: immediateCreditor.upiId,
                    amount: immediateOweTransfer.amount,
                    transferId: immediateOweTransfer.id,
                    isPaid: settledTransferIds.includes(
                      immediateOweTransfer.id
                    ),
                  })
                }
                className="bg-[#2DD4BF] text-black font-black text-xs md:text-sm px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all whitespace-nowrap self-start sm:self-auto"
              >
                Pay {formatINR(immediateOweTransfer.amount)} UPI →
              </button>
            </div>
          )}

          {/* Expenses Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-black">Expenses</h2>
                <span className="bg-white border-2 border-black text-black text-xs font-black px-2 py-0.5 rounded-full shadow-[1.5px_1.5px_0_0_#000]">
                  {expenses.length} Total
                </span>
              </div>

              <Link
                href="/settle"
                className="text-xs font-black text-zinc-700 hover:text-black flex items-center gap-1 hover:underline"
              >
                <span>View Full Audit & Settle</span>
                <span>&gt;</span>
              </Link>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black whitespace-nowrap transition-all ${activeCategory === cat.id
                    ? "bg-black text-white border-black shadow-[2px_2px_0_0_#000]"
                    : "bg-white text-zinc-800 border-black hover:bg-zinc-100 shadow-[1px_1px_0_0_#000]"
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              {!isHydrated ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-20 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000]" />
                  <div className="h-20 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000]" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-black rounded-2xl p-8 text-center shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="text-sm font-black text-black">
                    No expenses recorded in {roomName} yet.
                  </div>
                  <p className="text-xs font-bold text-zinc-500">
                    Add your first bill, dinner tab, or electricity split to see real-time balance calculations.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <Link
                      href="/add"
                      className="inline-flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add First Expense</span>
                    </Link>

                    <button
                      onClick={loadSampleData}
                      className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black font-black text-xs px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Load Sample Data</span>
                    </button>
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

                  // Balance impact for user
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
                                  ? `Equal (${members.length})`
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
                            • {Object.keys(expense.splitDetails).length} split •{" "}
                            {expense.date}
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

        {/* Right Column: Room Debt Matrix + Net Tab Flow Vector + WhatsApp Nudge */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Card 1: Room Debt Matrix */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-black flex items-center gap-1.5">
                  <span>🕸️</span> Room Debt Matrix
                </h3>
                <div className="text-[11px] font-bold text-zinc-500">
                  Live simplified peer-to-peer balance graph
                </div>
              </div>
              <span className="bg-[#2DD4BF] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                Algorithmic Min
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

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isPaid && creditor) {
                          setActiveQrModal({
                            isOpen: true,
                            payeeName: creditor.name,
                            upiId: creditor.upiId,
                            amount: t.amount,
                            transferId: t.id,
                            isPaid,
                          });
                        }
                      }}
                      className={`p-3 rounded-xl border-2 border-black flex items-center justify-between cursor-pointer transition-all ${isPaid
                        ? "bg-zinc-100 opacity-60"
                        : "bg-[#FAF8F5] hover:bg-amber-50 shadow-[2px_2px_0_0_#000]"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full border border-black ${debtor?.avatarBg || "bg-zinc-200"
                            } text-black font-black text-xs flex items-center justify-center shrink-0`}
                        >
                          {debtor?.initials || "R"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-black truncate">
                            {debtor?.name?.split(" ")[0]} ➔{" "}
                            {creditor?.isYou ? "You" : creditor?.name?.split(" ")[0]}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-500 truncate">
                            {t.reason || "Room split dues"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-black font-mono ${isPaid
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
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${isPaid
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
                  );
                })
              )}
            </div>

            {/* NET TAB FLOW VECTOR */}
            <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-600">
                <span>NET TAB FLOW VECTOR</span>
                <span className="text-[#059669]">
                  {pendingTransfers.length} Step{pendingTransfers.length === 1 ? "" : "s"} Path
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
                            {from?.name?.split(" ")[0]}
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
                <div className="text-[11px] font-bold text-center text-zinc-400 py-1">
                  Σ Net Δ = 0 (Ledger fully balanced)
                </div>
              )}
            </div>

            {/* 1-Click Hostel Nudge */}
            <div className="p-4 bg-[#FAF8F5] border-2 border-black rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-black">
                <span>1-CLICK HOSTEL NUDGE</span>
                <span>💬</span>
              </div>

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
                  className="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:bg-zinc-100"
                >
                  {copiedNudge ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-black" />
                  )}
                </button>
              </div>
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
