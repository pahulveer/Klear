"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLedger } from "@/context/LedgerContext";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  QrCode,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileDown,
  UserPlus,
  Send,
  History,
  Check,
  RotateCw,
  Scale,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatINR } from "@/lib/utils";
import { buildUpiLink } from "@/lib/settleDebts";
import { QRModal } from "@/components/QRModal";
import { RoommateModal } from "@/components/RoommateModal";
import { AnimatedCurrency } from "@/components/AnimatedCurrency";
import confetti from "canvas-confetti";

export default function SettlePage() {
  const {
    members,
    expenses,
    simplifiedTransfers,
    settledTransferIds,
    toggleSettleTransfer,
    totalPoolSpent,
    detailedBalances,
    whatsappNudge,
    roomName,
    loadSampleData,
    isHydrated,
  } = useLedger();

  const youMember = members.find((m) => m.isYou) || members[0];

  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);
  const [selectedTransferForQr, setSelectedTransferForQr] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"individuals" | "transfers">("individuals");
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<any | null>(null);

  const pendingTransfers = simplifiedTransfers.filter(
    (t) => !settledTransferIds.includes(t.id)
  );

  const totalOutstanding = pendingTransfers.reduce((sum, t) => sum + t.amount, 0);
  const totalRequiredAmount = simplifiedTransfers.reduce((sum, t) => sum + t.amount, 0);
  const totalSettledAmount = simplifiedTransfers
    .filter((t) => settledTransferIds.includes(t.id))
    .reduce((sum, t) => sum + t.amount, 0);
  const settledPercent =
    totalRequiredAmount > 0
      ? Math.round((totalSettledAmount / totalRequiredAmount) * 100)
      : 100;
  const roomPoolUpi = `${roomName.toLowerCase().replace(/[^a-z0-9]/g, "") || "roompool"}@upi`;

  const memberExpenses = React.useMemo(() => {
    if (!selectedMemberForDetails) return [];
    return expenses.filter(
      (e) =>
        e.paidById === selectedMemberForDetails.id ||
        (e.splitDetails && e.splitDetails[selectedMemberForDetails.id] !== undefined)
    );
  }, [selectedMemberForDetails, expenses]);

  const memberBalance = React.useMemo(() => {
    if (!selectedMemberForDetails) return null;
    return detailedBalances.find((b) => b.memberId === selectedMemberForDetails.id) || null;
  }, [selectedMemberForDetails, detailedBalances]);

  const memberTransfers = React.useMemo(() => {
    if (!selectedMemberForDetails) return [];
    return simplifiedTransfers.filter(
      (t) =>
        t.fromId === selectedMemberForDetails.id ||
        t.toId === selectedMemberForDetails.id
    );
  }, [selectedMemberForDetails, simplifiedTransfers]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(id);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(whatsappNudge.text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleToggleSettle = (transferId: string) => {
    const isNowSettling = !settledTransferIds.includes(transferId);
    toggleSettleTransfer(transferId);

    if (isNowSettling) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FF7A00", "#2DD4BF", "#C084FC", "#000000"],
        });
      } catch (e) {
        // graceful
      }
    }
  };

  const handleExportCSV = () => {
    const headers = "Transfer ID,From Roommate,To Roommate,Amount (INR),Status\n";
    const rows = simplifiedTransfers
      .map((t) => {
        const from = members.find((m) => m.id === t.fromId)?.name || t.fromId;
        const to = members.find((m) => m.id === t.toId)?.name || t.toId;
        const status = settledTransferIds.includes(t.id) ? "SETTLED" : "PENDING";
        return `"${t.id}","${from}","${to}",${t.amount},"${status}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${roomName.replace(/\s+/g, "_")}_Settlement_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EMPTY STATE WHEN NO MEMBERS
  if (isHydrated && members.length === 0) {
    return (
      <div className="p-4 md:p-12 max-w-3xl mx-auto space-y-6">
        <div className="bg-white border-2 border-black rounded-3xl p-8 md:p-12 shadow-[6px_6px_0_0_#000] text-center space-y-5">
          <div className="w-14 h-14 mx-auto bg-[#2DD4BF] border-2 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            <Scale className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-black font-serif">
            No Active Settlements
          </h1>
          <p className="text-xs md:text-sm font-bold text-zinc-600 max-w-md mx-auto">
            Add roommates and bills to your hostel ledger to calculate simplified peer-to-peer transfers with zero circular loops.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsRoommateModalOpen(true)}
              className="brutal-btn w-full sm:w-auto px-5 py-3 bg-[#FF7A00] text-black font-black text-xs md:text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-orange-500 transition-all"
            >
              + Add Roommates
            </button>
            <button
              onClick={loadSampleData}
              className="brutal-btn w-full sm:w-auto px-5 py-3 bg-[#2DD4BF] text-black font-black text-xs md:text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-teal-300 transition-all"
            >
              Load Sample Data
            </button>
          </div>
        </div>

        <RoommateModal
          isOpen={isRoommateModalOpen}
          onClose={() => setIsRoommateModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black">
                Minimum Settlements
              </h1>
              <span className="bg-[#2DD4BF] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                ACTIVE
              </span>
            </div>
            <div className="text-xs font-bold text-zinc-600">
              {roomName} • Algorithmic Debt Minimizer Active
            </div>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <span className="bg-white border-2 border-black text-black text-[11px] font-black px-3 py-1.5 rounded-full shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>0% FEES • AUTO-CALCULATED</span>
          </span>
        </div>
      </div>

      {/* Big Orange Banner */}
      <div className="bg-[#FF7A00] border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_#000] text-black space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>MINIMAL TRANSACTIONS HEURISTIC</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight font-serif">
              Settled in {simplifiedTransfers.length} {simplifiedTransfers.length === 1 ? "Transfer" : "Transfers"}
            </h2>

            <p className="text-xs md:text-sm font-bold text-black/90 leading-relaxed">
              Total debts reduced to minimum cash flows. Outstanding tab of {formatINR(totalOutstanding)} efficiently balanced with 0 circular handoffs.
            </p>
          </div>

          {/* 2 stat boxes on right */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0_0_#000]">
              <div className="text-[10px] font-black uppercase text-zinc-500">
                TOTAL POOL SPENT
              </div>
              <div className="text-xl md:text-2xl font-black font-mono text-black mt-0.5">
                {formatINR(totalPoolSpent)}
              </div>
              <div className="text-[10px] font-black text-emerald-600 mt-0.5">
                {settledTransferIds.length > 0
                  ? `${settledTransferIds.length} Settled`
                  : "Active Pool"}
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0_0_#000]">
              <div className="text-[10px] font-black uppercase text-zinc-500">
                DORM CYCLE STATUS
              </div>
              <div className="text-xs md:text-sm font-black text-black mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Live Active</span>
              </div>
              <div className="text-[10px] font-bold text-zinc-500 mt-1">
                {members.length} Roommates
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Graph Pathway Strip */}
        <div className="pt-3 border-t-2 border-black/15 flex items-center gap-2 flex-wrap text-xs font-mono font-bold">
          <span className="text-[10px] font-black uppercase tracking-wider text-black/80 mr-1">
            GRAPH PATHWAY:
          </span>
          {simplifiedTransfers.length > 0 ? (
            simplifiedTransfers.map((t, idx) => {
              const fromMember = members.find((m) => m.id === t.fromId);
              const toMember = members.find((m) => m.id === t.toId);
              return (
                <React.Fragment key={t.id}>
                  {idx > 0 && <span>•</span>}
                  <span className="bg-white border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                    {fromMember?.name?.split(" ")[0]} (-{formatINR(t.amount)})
                  </span>
                  <span>➔</span>
                  <span className="bg-[#2DD4BF] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000] text-black">
                    {toMember?.isYou ? "You" : toMember?.name?.split(" ")[0]} (+{formatINR(t.amount)})
                  </span>
                </React.Fragment>
              );
            })
          ) : (
            <span className="bg-white border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
              All debts balanced
            </span>
          )}
          <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded border border-black">
            Σ Net Δ = 0
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleCopyAll}
          className="bg-white hover:bg-zinc-50 border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000] flex items-center justify-between text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#DDD6FE] border border-black rounded-lg">
              <Copy className="w-4 h-4 text-purple-950" />
            </div>
            <div>
              <div className="text-xs font-black text-black">
                {copiedAll ? "Copied to Clipboard!" : "Copy All"}
              </div>
              <div className="text-[10px] font-bold text-zinc-500">
                Formatted for WhatsApp
              </div>
            </div>
          </div>
          <span className="text-xs font-black">↗</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="bg-white hover:bg-zinc-50 border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000] flex items-center justify-between text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2DD4BF] border border-black rounded-lg">
              <FileDown className="w-4 h-4 text-teal-950" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Export PDF/CSV</div>
              <div className="text-[10px] font-bold text-zinc-500">
                Monthly Audit Sheet
              </div>
            </div>
          </div>
          <span className="text-xs font-black">↗</span>
        </button>

        <button
          onClick={() => setIsRoommateModalOpen(true)}
          className="bg-white hover:bg-zinc-50 border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000] flex items-center justify-between text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FED7AA] border border-black rounded-lg">
              <UserPlus className="w-4 h-4 text-orange-950" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Edit Ledger</div>
              <div className="text-[10px] font-bold text-zinc-500">
                Add/Exclude Roomies ({members.length})
              </div>
            </div>
          </div>
          <span className="text-xs font-black">↗</span>
        </button>
      </div>

      {/* Main Grid: Who Pays Whom (Left 8) + UPI QR & Nudge (Right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* Left Column: Who Pays Whom Cards */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <span>⇆</span> Who Pays Whom
              </h2>
              <span className="bg-[#FF7A00] text-black text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                {simplifiedTransfers.length} {simplifiedTransfers.length === 1 ? "Transfer" : "Transfers"} Required
              </span>
            </div>

            {/* View Mode Toggle: Roommate Tracker vs Transfer List */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] border-2 border-black p-1 rounded-xl shadow-[2px_2px_0_0_#000]">
              <button
                type="button"
                onClick={() => setViewMode("individuals")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  viewMode === "individuals"
                    ? "bg-[#2DD4BF] text-black shadow-[1.5px_1.5px_0_0_#000]"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                👤 Roommate Tracker ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("transfers")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  viewMode === "transfers"
                    ? "bg-[#FF7A00] text-black shadow-[1.5px_1.5px_0_0_#000]"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                ⇆ All Transfers ({simplifiedTransfers.length})
              </button>
            </div>
          </div>

          {/* Visual Settlement Progress Tracker */}
          <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  OVERALL ROOM SETTLEMENT PROGRESS
                </span>
                <div className="text-sm font-black text-black flex items-center gap-2 mt-0.5">
                  {settledPercent === 100 ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      100% Settled • All Roommate Tabs Cleared!
                    </span>
                  ) : (
                    <span>
                      {formatINR(totalSettledAmount)} settled of {formatINR(totalRequiredAmount)} ({settledPercent}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                <span className="bg-[#FED7AA] border border-black px-2 py-0.5 rounded text-orange-950 shadow-[1px_1px_0_0_#000]">
                  {pendingTransfers.length} Pending
                </span>
                <span className="bg-[#2DD4BF] border border-black px-2 py-0.5 rounded text-teal-950 shadow-[1px_1px_0_0_#000]">
                  {settledTransferIds.length} Settled
                </span>
              </div>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-[#FAF8F5] border-2 border-black rounded-full h-3.5 p-0.5 overflow-hidden">
              <div
                className="bg-[#2DD4BF] h-full rounded-full transition-all duration-500 border border-black/30"
                style={{
                  width: `${Math.max(settledPercent, totalRequiredAmount === 0 ? 100 : 2)}%`,
                }}
              />
            </div>
          </div>

          {/* VIEW MODE 1: Roommate Tracker Cards (Clear Who Pays Whom & 1-Click Actions) */}
          {viewMode === "individuals" && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-black rounded-2xl p-8 text-center shadow-[2px_2px_0_0_#000] space-y-2">
                  <div className="text-sm font-black text-black">No roommates found</div>
                  <div className="text-xs font-bold text-zinc-500">
                    Add roommates or load demo data to view individual stats and debt breakdown.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((m) => {
                    const bal = detailedBalances.find((b) => b.memberId === m.id) || {
                      paid: 0,
                      owed: 0,
                      net: 0,
                    };
                    const memberTransfers = simplifiedTransfers.filter(
                      (t) => t.fromId === m.id || t.toId === m.id
                    );
                    const pendingOutgoing = memberTransfers.filter(
                      (t) => t.fromId === m.id && !settledTransferIds.includes(t.id)
                    );
                    const pendingIncoming = memberTransfers.filter(
                      (t) => t.toId === m.id && !settledTransferIds.includes(t.id)
                    );
                    const isFullySettled =
                      memberTransfers.length > 0 &&
                      pendingOutgoing.length === 0 &&
                      pendingIncoming.length === 0;

                    const netPending =
                      pendingIncoming.reduce((sum, t) => sum + t.amount, 0) -
                      pendingOutgoing.reduce((sum, t) => sum + t.amount, 0);

                    return (
                      <div
                        key={m.id}
                        className={`bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_#000] space-y-3.5 transition-all ${
                          isFullySettled ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* Roommate Header: Avatar, Name & Live Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full border-2 border-black ${m.avatarBg} text-black font-black text-sm flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#000]`}
                            >
                              {m.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm text-black truncate flex items-center gap-1.5">
                                <span>{m.isYou ? "You" : m.name}</span>
                                {m.isYou && (
                                  <span className="text-[9px] bg-zinc-200 border border-black px-1.5 py-0.2 rounded font-black">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-zinc-500 truncate flex items-center gap-1">
                                <span>{m.upiId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(m.upiId, m.id)}
                                  title="Copy UPI ID"
                                  className="hover:text-black"
                                >
                                  {copiedUpi === m.id ? (
                                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Live Status Badge */}
                          <div>
                            {isFullySettled || memberTransfers.length === 0 ? (
                              <span className="bg-[#2DD4BF] text-emerald-950 text-xs font-black px-2.5 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900" />
                                <span>ALL SETTLED</span>
                              </span>
                            ) : netPending < 0 ? (
                              <span className="bg-[#FED7AA] text-orange-950 text-xs font-black px-2.5 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center gap-1">
                                <span>OWES {formatINR(Math.abs(netPending))}</span>
                              </span>
                            ) : (
                              <span className="bg-[#CCFBF1] text-teal-950 text-xs font-black px-2.5 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center gap-1">
                                <span>RECEIVES +{formatINR(netPending)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pending Settlement Transactions (Exact Who Pays Whom) */}
                        <div className="space-y-2 pt-1 border-t border-black/10">
                          <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                            ACTIVE SETTLEMENTS ({memberTransfers.length})
                          </div>

                          {memberTransfers.length === 0 ? (
                            <div className="bg-[#FAF8F5] border border-black rounded-xl p-2.5 text-center text-xs font-bold text-zinc-500">
                              No pending transfers for this cycle ✓
                            </div>
                          ) : (
                            memberTransfers.map((t) => {
                              const isPayer = t.fromId === m.id;
                              const otherMember =
                                members.find((x) => x.id === (isPayer ? t.toId : t.fromId)) ||
                                members[0];
                              const isPaid = settledTransferIds.includes(t.id);

                              const upiLink = buildUpiLink({
                                upiId: isPayer ? otherMember.upiId : m.upiId,
                                payeeName: isPayer ? otherMember.name : m.name,
                                amount: t.amount,
                                note: `${roomName} settlement: ${m.name}`,
                              });

                              return (
                                <div
                                  key={t.id}
                                  className={`p-2.5 rounded-xl border-2 border-black transition-all ${
                                    isPaid
                                      ? "bg-zinc-100 border-zinc-400 opacity-60"
                                      : isPayer
                                      ? "bg-[#FFF7ED] shadow-[2px_2px_0_0_#000]"
                                      : "bg-[#F0FDFA] shadow-[2px_2px_0_0_#000]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-black ${
                                          isPaid
                                            ? "bg-zinc-200 text-zinc-600 line-through"
                                            : isPayer
                                            ? "bg-[#FED7AA] text-orange-950"
                                            : "bg-[#2DD4BF] text-teal-950"
                                        }`}
                                      >
                                        {isPaid ? "PAID ✓" : isPayer ? "➔ MUST PAY" : "← RECEIVES"}
                                      </span>
                                      <span
                                        className={`text-xs font-black text-black truncate ${
                                          isPaid ? "line-through text-zinc-500" : ""
                                        }`}
                                      >
                                        {isPayer
                                          ? `Pay ${otherMember.isYou ? "You" : otherMember.name.split(" ")[0]}`
                                          : `From ${otherMember.isYou ? "You" : otherMember.name.split(" ")[0]}`}
                                      </span>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span
                                        className={`font-mono font-black text-sm text-black ${
                                          isPaid ? "line-through text-zinc-400" : ""
                                        }`}
                                      >
                                        {formatINR(t.amount)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action Buttons for this transfer */}
                                  <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      {isPayer ? (
                                        <a
                                          href={upiLink}
                                          className="inline-flex items-center gap-1 bg-[#2DD4BF] hover:bg-teal-300 text-black text-[10px] font-black px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0_0_#000] active:translate-y-0.5 transition-all"
                                        >
                                          <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                                          <span>Pay UPI</span>
                                        </a>
                                      ) : (
                                        <a
                                          href={upiLink}
                                          className="inline-flex items-center gap-1 bg-[#FF7A00] hover:bg-orange-400 text-black text-[10px] font-black px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0_0_#000] active:translate-y-0.5 transition-all"
                                        >
                                          <span>Request</span>
                                        </a>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedTransferForQr({
                                            payeeName: isPayer ? otherMember.name : m.name,
                                            upiId: isPayer ? otherMember.upiId : m.upiId,
                                            amount: t.amount,
                                            transferId: t.id,
                                            isPaid,
                                          })
                                        }
                                        className="p-1 bg-white hover:bg-zinc-100 rounded-lg border border-black text-black"
                                        title="Show QR Code"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const msg = isPayer
                                            ? `Hey ${m.name.split(" ")[0]}, please send ${formatINR(
                                                t.amount
                                              )} for ${roomName} tab to ${otherMember.upiId}`
                                            : `Hey ${otherMember.name.split(" ")[0]}, please send ${formatINR(
                                                t.amount
                                              )} for ${roomName} tab to ${m.upiId}`;
                                          navigator.clipboard.writeText(msg);
                                          alert("WhatsApp reminder text copied to clipboard!");
                                        }}
                                        className="p-1 bg-white hover:bg-zinc-100 rounded-lg border border-black text-black"
                                        title="Copy WhatsApp Nudge"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Mark as Paid Checkbox */}
                                    <label className="flex items-center gap-1.5 text-[11px] font-black text-black cursor-pointer select-none bg-white px-2 py-0.5 rounded-lg border border-black shadow-[1px_1px_0_0_#000]">
                                      <input
                                        type="checkbox"
                                        checked={isPaid}
                                        onChange={() => handleToggleSettle(t.id)}
                                        className="w-3.5 h-3.5 rounded accent-[#FF7A00]"
                                      />
                                      <span>{isPaid ? "Paid ✓" : "Mark Paid"}</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Card Footer: Summary & History Link */}
                        <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-zinc-600">
                          <div className="truncate">
                            Paid: <span className="font-mono font-black text-black">{formatINR(bal.paid)}</span> • Share: <span className="font-mono font-black text-black">{formatINR(bal.owed)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedMemberForDetails(m)}
                            className="text-black font-black text-xs hover:underline flex items-center gap-1 bg-[#FAF8F5] hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0_0_#000] shrink-0 transition-colors"
                          >
                            <History className="w-3 h-3" />
                            <span>Stats & History</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: Full Direct Transfers List */}
          {viewMode === "transfers" && (
            <div className="space-y-4">
              {simplifiedTransfers.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-black rounded-2xl p-8 text-center shadow-[2px_2px_0_0_#000] space-y-2">
                  <div className="text-sm font-black text-black">
                    Zero pending debts!
                  </div>
                  <div className="text-xs font-bold text-zinc-500">
                    All tabs in {roomName} are settled up. Record a new bill to calculate splits.
                  </div>
                </div>
              ) : (
                simplifiedTransfers.map((t, idx) => {
                  const debtor = members.find((m) => m.id === t.fromId) || members[0];
                  const creditor = members.find((m) => m.id === t.toId) || members[0];
                  const isSettled = settledTransferIds.includes(t.id);
                  const isYouDebtor = youMember && t.fromId === youMember.id;
                  const isYouCreditor = youMember && t.toId === youMember.id;

                  const upiLink = buildUpiLink({
                    upiId: creditor.upiId,
                    payeeName: creditor.name,
                    amount: t.amount,
                    note: `${roomName} tab: ${debtor.name} to ${creditor.name}`,
                  });

                  return (
                    <div
                      key={t.id}
                      className={`relative overflow-hidden border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_#000] space-y-4 transition-all ${
                        isSettled ? "bg-zinc-100/90" : "bg-white"
                      }`}
                    >
                      {/* Rubber "SETTLED" Stamp Slam */}
                      {isSettled && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                          <div className="stamp-slam px-4 py-2 border-4 border-emerald-700 text-emerald-800 bg-white/95 font-black text-base sm:text-lg uppercase tracking-widest rounded-xl shadow-[4px_4px_0_0_#065f46]">
                            ✓ SETTLED &amp; PAID
                          </div>
                        </div>
                      )}

                      {/* Card Header Badge */}
                      <div className="flex items-center justify-between text-xs font-black">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-100 border border-black rounded">
                            {isYouDebtor ? "OUTGOING SETTLEMENT" : `TRANSFER 0${idx + 1}`}
                          </span>
                          <span className="text-zinc-500 hidden sm:inline">
                            Direct Settlement: {debtor.name.split(" ")[0]} ➔ {creditor.name.split(" ")[0]}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded border border-black ${
                            isYouCreditor
                              ? "bg-[#2DD4BF] text-teal-950"
                              : isYouDebtor
                              ? "bg-[#FED7AA] text-orange-950"
                              : "bg-zinc-200 text-zinc-800"
                          }`}
                        >
                          {isYouCreditor
                            ? "↙ Owes You"
                            : isYouDebtor
                            ? "↗ You Owe"
                            : "Roommate Transfer"}
                        </span>
                      </div>

                      {/* Flow Details Row */}
                      <div className="flex items-center justify-between gap-2 py-1">
                        {/* Debtor */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full border-2 border-black ${debtor.avatarBg} text-black font-black text-sm flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#000]`}
                          >
                            {debtor.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-sm text-black truncate">
                              {debtor.isYou ? "You" : debtor.name}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                              <span className="truncate">{debtor.upiId}</span>
                              <button
                                onClick={() => handleCopyText(debtor.upiId, debtor.id)}
                                title="Copy UPI ID"
                                className="hover:text-black"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Middle Amount & Arrow */}
                        <div className="text-center shrink-0 px-2">
                          <div className="text-2xl font-black font-mono text-black">
                            <AnimatedCurrency value={t.amount} />
                          </div>
                          <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                            <span>—</span>
                            <ArrowRight className="w-3 h-3 text-black" />
                            <span>—</span>
                          </div>
                          <div className="text-[9px] font-bold text-zinc-400">
                            DIRECT SETTLEMENT
                          </div>
                        </div>

                        {/* Creditor */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-row-reverse text-right">
                          <div
                            className={`w-10 h-10 rounded-full border-2 border-black ${creditor.avatarBg} text-black font-black text-sm flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#000]`}
                          >
                            {creditor.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-sm text-black truncate">
                              {creditor.isYou ? "You" : creditor.name}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 justify-end">
                              <span className="truncate">{creditor.upiId}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Mark as Paid Row */}
                      <div className="pt-2 border-t border-dashed border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isYouDebtor ? (
                            <>
                              <a
                                href={upiLink}
                                className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black font-black text-xs px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                              >
                                <span>Pay {creditor.name.split(" ")[0]} {formatINR(t.amount)} via UPI →</span>
                              </a>

                              <button
                                onClick={() =>
                                  setSelectedTransferForQr({
                                    payeeName: creditor.name,
                                    upiId: creditor.upiId,
                                    amount: t.amount,
                                    transferId: t.id,
                                    isPaid: isSettled,
                                  })
                                }
                                className="inline-flex items-center gap-1 bg-white text-black font-black text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-zinc-50"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Show QR</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <a
                                href={upiLink}
                                className="brutal-btn inline-flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-orange-500 transition-all"
                              >
                                <span>Request via UPI</span>
                              </a>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `Bhai ${debtor.name.split(" ")[0]}, please clear tab of ${formatINR(
                                      t.amount
                                    )} for ${roomName} to ${creditor.upiId}`
                                  );
                                  alert("Payment request message copied to clipboard!");
                                }}
                                className="brutal-btn p-2 bg-white text-black font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-zinc-50"
                                title="Copy Payment Request"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setSelectedTransferForQr({
                                    payeeName: creditor.name,
                                    upiId: creditor.upiId,
                                    amount: t.amount,
                                    transferId: t.id,
                                    isPaid: isSettled,
                                  })
                                }
                                className="brutal-btn p-2 bg-white text-black font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-zinc-50"
                                title="Show QR Code"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Mark as Paid Toggle Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-zinc-800 select-none">
                          <input
                            type="checkbox"
                            checked={isSettled}
                            onChange={() => handleToggleSettle(t.id)}
                            className="w-4 h-4 rounded border-2 border-black accent-[#FF7A00]"
                          />
                          <span>{isSettled ? "Marked as Paid ✓" : "Mark as Paid"}</span>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Direct UPI QR + WhatsApp Nudge + Audit History */}
        <div className="lg:col-span-4 space-y-5 min-w-0 lg:sticky lg:top-20 self-start">
          {/* Box 1: Direct UPI QR */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-3 text-center">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Direct UPI QR
              </span>
              <span className="bg-[#FED7AA] text-orange-950 text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase">
                {roomName.split(" ")[0]} POOL
              </span>
            </div>

            {/* Dynamic QR Code for Desktop judges */}
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] inline-block mx-auto">
              <QRCodeSVG
                value={buildUpiLink({
                  upiId: roomPoolUpi,
                  payeeName: roomName,
                  amount: totalOutstanding || 100,
                  note: `${roomName} Hostel Tab`,
                })}
                size={160}
                level="M"
                includeMargin={true}
              />
            </div>

            <div>
              <div className="font-mono font-black text-sm text-black">
                {roomPoolUpi}
              </div>
              <div className="text-[11px] font-bold text-zinc-500">
                Scan with any Indian UPI App
              </div>
            </div>

            {/* App badges */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black">
              <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">
                GPAY
              </span>
              <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">
                PHONEPE
              </span>
              <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">
                PAYTM
              </span>
              <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">
                BHIM
              </span>
            </div>
          </div>

          {/* Box 2: 1-Click WhatsApp Nudge */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                <span>💬</span> WhatsApp Nudge
              </h3>
              <span className="bg-[#2DD4BF] text-teal-950 text-[10px] font-black px-2 py-0.5 rounded border border-black">
                1-CLICK
              </span>
            </div>

            <p className="text-[11px] font-bold text-zinc-600">
              Send a banter reminder with accurate debt breakdowns straight to the room group chat.
            </p>

            <div className="bg-[#FAF8F5] border-2 border-black rounded-xl p-3 text-xs font-mono font-bold text-zinc-800 shadow-[1px_1px_0_0_#000]">
              <div className="text-[9px] font-black uppercase text-zinc-400 mb-1">
                Preview message:
              </div>
              &quot;{whatsappNudge.text}&quot;
            </div>

            <a
              href={whatsappNudge.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#2DD4BF] text-black font-black text-xs py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>▷ Nudge on WhatsApp Group</span>
            </a>
          </div>

          {/* Box 3: Audit History */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-black flex items-center gap-1.5">
                <History className="w-4 h-4" /> Audit History
              </h3>
              <span className="text-[10px] font-bold text-zinc-500">Live Log</span>
            </div>

            <div className="space-y-2.5 text-xs font-bold">
              {settledTransferIds.length > 0 ? (
                settledTransferIds.map((tid, idx) => (
                  <div key={tid} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-600 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-black font-black">Transfer Settled</div>
                      <div className="text-[10px] text-zinc-500">
                        {tid} marked paid
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">Just now</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400 text-[11px] font-normal italic">
                  No settlements recorded yet in {roomName}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Roommate Advanced Stats & History Modal */}
      {selectedMemberForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black rounded-3xl p-6 max-w-xl w-full shadow-[6px_6px_0_0_#000] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full border-2 border-black ${selectedMemberForDetails.avatarBg} text-black font-black text-base flex items-center justify-center shadow-[2px_2px_0_0_#000]`}
                >
                  {selectedMemberForDetails.initials}
                </div>
                <div>
                  <h3 className="text-lg font-black text-black flex items-center gap-2">
                    <span>{selectedMemberForDetails.isYou ? "You" : selectedMemberForDetails.name}</span>
                    {selectedMemberForDetails.isYou && (
                      <span className="text-[10px] bg-zinc-200 border border-black px-1.5 py-0.5 rounded font-black">
                        YOU
                      </span>
                    )}
                  </h3>
                  <div className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                    <span>{selectedMemberForDetails.upiId}</span>
                    <button
                      onClick={() => handleCopyText(selectedMemberForDetails.upiId, selectedMemberForDetails.id)}
                      title="Copy UPI ID"
                      className="hover:text-black"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMemberForDetails(null)}
                className="w-8 h-8 rounded-xl border-2 border-black bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-black text-sm shadow-[1px_1px_0_0_#000]"
              >
                ✕
              </button>
            </div>

            {/* Net Balance Status Hero Banner */}
            <div
              className={`p-4 border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000] space-y-1 ${
                (memberBalance?.net || 0) > 0
                  ? "bg-[#2DD4BF] text-teal-950"
                  : (memberBalance?.net || 0) < 0
                  ? "bg-[#FED7AA] text-orange-950"
                  : "bg-zinc-100 text-zinc-900"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">
                LIVE LEDGER STANDING
              </div>
              <div className="text-2xl font-black font-mono">
                {(memberBalance?.net || 0) > 0
                  ? `Gets Back +${formatINR(memberBalance!.net)}`
                  : (memberBalance?.net || 0) < 0
                  ? `Owes Group -${formatINR(Math.abs(memberBalance!.net))}`
                  : "All Settled Up (₹0 Net)"}
              </div>
              <p className="text-xs font-bold opacity-90">
                {(memberBalance?.net || 0) > 0
                  ? `${selectedMemberForDetails.name.split(" ")[0]} has contributed more than their consumption share and will receive refunds.`
                  : (memberBalance?.net || 0) < 0
                  ? `${selectedMemberForDetails.name.split(" ")[0]} has paid less than their share of expenses and owes dues to the pool.`
                  : "Debts and contributions for this roommate are perfectly balanced."}
              </p>
            </div>

            {/* 3 Key Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[1.5px_1.5px_0_0_#000]">
                <div className="text-[10px] font-black uppercase text-zinc-500">TOTAL PAID</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  {formatINR(memberBalance?.paid || 0)}
                </div>
                <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
                  {memberExpenses.filter((e) => e.paidById === selectedMemberForDetails.id).length} bills paid
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[1.5px_1.5px_0_0_#000]">
                <div className="text-[10px] font-black uppercase text-zinc-500">FAIR SHARE</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  {formatINR(memberBalance?.owed || 0)}
                </div>
                <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
                  Across {memberExpenses.length} splits
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[1.5px_1.5px_0_0_#000]">
                <div className="text-[10px] font-black uppercase text-zinc-500">NET BALANCE</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  {(memberBalance?.net || 0) >= 0
                    ? `+${formatINR(memberBalance?.net || 0)}`
                    : `-${formatINR(Math.abs(memberBalance?.net || 0))}`}
                </div>
                <div className="text-[10px] font-bold text-zinc-500 mt-0.5">
                  Paid − Share
                </div>
              </div>
            </div>

            {/* Direct Settlements Involving this Roommate */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <span>⚡</span> Direct Settlements Involving {selectedMemberForDetails.name.split(" ")[0]}
              </h4>

              {memberTransfers.length === 0 ? (
                <div className="p-3 bg-[#FAF8F5] border border-black rounded-xl text-xs font-bold text-zinc-500">
                  No direct settlements required for this roommate!
                </div>
              ) : (
                <div className="space-y-2">
                  {memberTransfers.map((t) => {
                    const isOutgoing = t.fromId === selectedMemberForDetails.id;
                    const otherId = isOutgoing ? t.toId : t.fromId;
                    const otherMember = members.find((m) => m.id === otherId) || members[0];
                    const isSettled = settledTransferIds.includes(t.id);
                    const upiLink = buildUpiLink({
                      upiId: isOutgoing ? otherMember.upiId : selectedMemberForDetails.upiId,
                      payeeName: isOutgoing ? otherMember.name : selectedMemberForDetails.name,
                      amount: t.amount,
                      note: `${roomName} settlement: ${selectedMemberForDetails.name}`,
                    });

                    return (
                      <div
                        key={t.id}
                        className={`p-3 border-2 border-black rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                          isSettled ? "bg-zinc-100 opacity-60" : "bg-white shadow-[2px_2px_0_0_#000]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-black ${
                              isOutgoing ? "bg-orange-200 text-orange-950" : "bg-teal-200 text-teal-950"
                            }`}
                          >
                            {isOutgoing ? "PAYS" : "RECEIVES"}
                          </span>
                          <span className="text-xs font-black text-black truncate">
                            {isOutgoing
                              ? `${selectedMemberForDetails.name.split(" ")[0]} ➔ ${otherMember.name.split(" ")[0]}`
                              : `${otherMember.name.split(" ")[0]} ➔ ${selectedMemberForDetails.name.split(" ")[0]}`}
                          </span>
                          <span className="font-mono font-black text-sm text-black">
                            {formatINR(t.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={upiLink}
                            className="px-2.5 py-1.5 bg-[#FF7A00] text-black font-black text-[11px] rounded-lg border border-black shadow-[1px_1px_0_0_#000]"
                          >
                            UPI Pay
                          </a>
                          <button
                            onClick={() =>
                              setSelectedTransferForQr({
                                payeeName: isOutgoing ? otherMember.name : selectedMemberForDetails.name,
                                upiId: isOutgoing ? otherMember.upiId : selectedMemberForDetails.upiId,
                                amount: t.amount,
                                transferId: t.id,
                                isPaid: isSettled,
                              })
                            }
                            className="p-1.5 bg-white text-black font-black rounded-lg border border-black hover:bg-zinc-50"
                            title="Show QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <label className="flex items-center gap-1.5 text-[11px] font-black text-zinc-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSettled}
                              onChange={() => handleToggleSettle(t.id)}
                              className="w-3.5 h-3.5 rounded border border-black accent-[#FF7A00]"
                            />
                            <span>Paid</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Itemized Expense History for this Roommate */}
            <div className="space-y-2.5 pt-2 border-t-2 border-black/10">
              <h4 className="text-xs font-black uppercase text-black flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Expense History ({memberExpenses.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-bold">
                  All bills involving {selectedMemberForDetails.name.split(" ")[0]}
                </span>
              </h4>

              {memberExpenses.length === 0 ? (
                <div className="p-4 bg-[#FAF8F5] border border-black rounded-xl text-center text-xs font-bold text-zinc-500">
                  No expenses logged for this roommate yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {memberExpenses.map((exp) => {
                    const isPayer = exp.paidById === selectedMemberForDetails.id;
                    const share = exp.splitDetails[selectedMemberForDetails.id] || 0;

                    return (
                      <div
                        key={exp.id}
                        className="p-2.5 bg-[#FAF8F5] border border-black rounded-xl flex items-center justify-between gap-2 shadow-[1px_1px_0_0_#000]"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-black truncate">
                            {exp.title}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                            <span>{exp.date}</span>
                            <span>•</span>
                            <span className="capitalize">{exp.category}</span>
                            <span>•</span>
                            <span>Total: {formatINR(exp.totalAmount)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isPayer && (
                            <div className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-800 px-1.5 py-0.2 rounded mb-0.5">
                              Paid Bill
                            </div>
                          )}
                          <div className="text-xs font-black font-mono text-black">
                            Share: {formatINR(share)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up QR Modal for a specific transfer */}
      {selectedTransferForQr && (
        <QRModal
          isOpen={!!selectedTransferForQr}
          onClose={() => setSelectedTransferForQr(null)}
          payeeName={selectedTransferForQr.payeeName}
          upiId={selectedTransferForQr.upiId}
          amount={selectedTransferForQr.amount}
          onMarkPaid={() => handleToggleSettle(selectedTransferForQr.transferId)}
          isPaid={selectedTransferForQr.isPaid}
        />
      )}

      {/* Roommate Management Modal */}
      <RoommateModal
        isOpen={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
      />
    </div>
  );
}
