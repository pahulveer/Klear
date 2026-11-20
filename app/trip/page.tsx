"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  useLedger,
  SAMPLE_TRIP_PLAN,
  SAMPLE_OVER_TRIP,
  SAMPLE_TRIPS,
} from "@/context/LedgerContext";
import {
  Compass,
  ArrowLeft,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  CreditCard,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  DollarSign,
  Palmtree,
  Car,
  Home,
  Coffee,
  Ticket,
  Luggage,
  Calendar,
  Check,
  CheckCheck,
  Flag,
  Archive,
  Layers,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getRecommendedPayer } from "@/lib/settleDebts";
import { TripPlanItem, CostType, TripPlan, TripStatus } from "@/types/ledger";
import confetti from "canvas-confetti";

export default function TripPlannerPage() {
  const {
    members,
    expenses,
    detailedBalances,
    tripPlan,
    setTripPlan,
    trips,
    activeTripId,
    setActiveTripId,
    createTrip,
    updateTrip,
    deleteTrip,
    toggleMemberTripPaid,
    setTripStatus,
    addTripPlanItem,
    updateTripPlanItem,
    deleteTripPlanItem,
    toggleFlakedMember,
    convertPlanItemToExpense,
    roomName,
  } = useLedger();

  // Generator form state
  const [destination, setDestination] = useState(tripPlan?.destination || "Kasol & Parvati Valley");
  const [days, setDays] = useState(tripPlan?.days || 3);
  const [vibe, setVibe] = useState<"Budget Hostel" | "Standard" | "Comfort">(
    tripPlan?.vibe || "Budget Hostel"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  // Trip filter tab ("planned" | "over" | "all")
  const [tripFilterTab, setTripFilterTab] = useState<"planned" | "over" | "all">("planned");

  // Keep form in sync when active trip changes
  useEffect(() => {
    if (tripPlan) {
      setDestination(tripPlan.destination);
      setDays(tripPlan.days);
      setVibe(tripPlan.vibe);
    }
  }, [tripPlan?.id, tripPlan?.destination]);

  // Manual Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemCategory, setItemCategory] = useState("Stay");
  const [itemAmount, setItemAmount] = useState<number>(1000);
  const [itemCostType, setItemCostType] = useState<CostType>("fixed");

  // Quick preset destinations
  const quickDestinations = [
    "Kasol & Parvati Valley",
    "Goa Beach Pod",
    "Rishikesh Rafting & Camping",
    "Manali & Solang Snow",
    "Gokarna & Murudeshwar",
  ];

  // Current active trip items & flakers
  const items = tripPlan?.items || [];
  const flakedIds = tripPlan?.flakedMemberIds || [];

  // Active (going) members
  const goingMembers = members.filter((m) => !flakedIds.includes(m.id));
  const flakedMembers = members.filter((m) => flakedIds.includes(m.id));

  // Calculations for Planned vs Actual
  const totalPlannedCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.estimatedAmount, 0);
  }, [items]);

  // Find actual expenses created from trip items or matching
  const actualTripExpenses = useMemo(() => {
    const tripItemExpenseIds = items
      .map((it) => it.actualExpenseId)
      .filter(Boolean) as string[];

    return expenses.filter(
      (e) =>
        tripItemExpenseIds.includes(e.id) ||
        e.note?.toLowerCase().includes("trip") ||
        e.title.toLowerCase().includes(destination.toLowerCase().split(" ")[0])
    );
  }, [items, expenses, destination]);

  const totalActualSpent = useMemo(() => {
    return actualTripExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  }, [actualTripExpenses]);

  // Flake Simulator Calculations
  const simulation = useMemo(() => {
    const totalMembers = Math.max(1, members.length);
    const goingCount = Math.max(1, goingMembers.length);

    // Sum fixed vs variable costs
    const fixedTotal = items
      .filter((it) => it.costType === "fixed")
      .reduce((sum, it) => sum + it.estimatedAmount, 0);

    const variableTotal = items
      .filter((it) => it.costType === "variable")
      .reduce((sum, it) => sum + it.estimatedAmount, 0);

    // Base cost when all roommates go
    const baseVariablePerPerson = variableTotal / totalMembers;
    const baseFixedPerPerson = fixedTotal / totalMembers;
    const basePerPerson = Math.round(baseFixedPerPerson + baseVariablePerPerson);

    // Simulated cost with current flakers:
    // Fixed cost is absorbed by ONLY going members
    const simulatedFixedPerPerson = fixedTotal / goingCount;
    // Variable cost scales down with number of going members
    const simulatedVariablePool = baseVariablePerPerson * goingCount;
    const simulatedPerPerson = Math.round(simulatedFixedPerPerson + baseVariablePerPerson);

    const perPersonDelta = simulatedPerPerson - basePerPerson;

    return {
      fixedTotal,
      variableTotal,
      simulatedVariablePool,
      basePerPerson,
      simulatedPerPerson,
      perPersonDelta,
      goingCount,
      totalMembers,
    };
  }, [items, members, goingMembers]);

  // Payment Tracking Calculations for the Active Trip
  const paidMemberIds = tripPlan?.paidMemberIds || [];
  const goingPaidCount = goingMembers.filter((m) => paidMemberIds.includes(m.id)).length;
  const isEveryonePaid =
    goingMembers.length > 0 &&
    goingMembers.every((m) => paidMemberIds.includes(m.id));

  const perPersonShare = simulation.simulatedPerPerson || Math.round(totalPlannedCost / Math.max(1, goingMembers.length));
  const totalTripExpected = perPersonShare * goingMembers.length;
  const totalTripCollected = perPersonShare * goingPaidCount;
  const totalTripPending = Math.max(0, totalTripExpected - totalTripCollected);

  // Helper: Check if all roommates paid for any given trip
  const isTripEveryonePaid = (t: TripPlan): boolean => {
    const tFlaked = t.flakedMemberIds || [];
    const tGoing = members.filter((m) => !tFlaked.includes(m.id));
    if (tGoing.length === 0) return false;
    const tPaid = t.paidMemberIds || [];
    return tGoing.every((m) => tPaid.includes(m.id));
  };

  // Filtered trips for tabs
  const plannedTrips = trips.filter((t) => (t.status || "planned") === "planned");
  const overTrips = trips.filter((t) => t.status === "over");
  const displayedTrips =
    tripFilterTab === "planned"
      ? plannedTrips
      : tripFilterTab === "over"
      ? overTrips
      : trips;

  // Toggle member payment
  const handleTogglePaid = (memberId: string) => {
    if (!tripPlan) return;
    const willBePaid = !paidMemberIds.includes(memberId);
    toggleMemberTripPaid(tripPlan.id, memberId);

    // If this payment settles everyone, celebrate!
    const newPaidCount = willBePaid ? goingPaidCount + 1 : goingPaidCount - 1;
    if (newPaidCount === goingMembers.length) {
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#2DD4BF", "#FF7A00", "#C084FC"],
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // Mark all going members as paid
  const handleMarkAllPaid = () => {
    if (!tripPlan) return;
    updateTrip(tripPlan.id, {
      paidMemberIds: goingMembers.map((m) => m.id),
    });
    try {
      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.5 },
        colors: ["#2DD4BF", "#FF7A00", "#FEF08A"],
      });
    } catch (e) {
      // ignore
    }
  };

  // Reset payments for active trip
  const handleResetPayments = () => {
    if (!tripPlan) return;
    updateTrip(tripPlan.id, {
      paidMemberIds: [],
    });
  };

  // Toggle trip status between planned and over
  const handleToggleTripStatus = (tripId: string) => {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;
    const nextStatus: TripStatus = target.status === "over" ? "planned" : "over";
    setTripStatus(tripId, nextStatus);
  };

  // Create new planned trip
  const handleCreateNewTrip = () => {
    const newId = createTrip({
      destination: "New Weekend Getaway",
      days: 3,
      vibe: "Budget Hostel",
      status: "planned",
      items: [],
      flakedMemberIds: [],
      paidMemberIds: [],
    });
    setTripFilterTab("planned");
  };

  // Load sample trips (both Kasol Planned and Goa Over)
  const handleLoadSampleTrips = () => {
    if (trips.length === 0) {
      SAMPLE_TRIPS.forEach((st) => createTrip(st));
    } else {
      setTripPlan(SAMPLE_TRIP_PLAN);
    }
    setDestination(SAMPLE_TRIP_PLAN.destination);
    setDays(SAMPLE_TRIP_PLAN.days);
    setVibe(SAMPLE_TRIP_PLAN.vibe);
  };

  // Generate AI Pre-Trip Budget
  const handleGenerateBudget = async () => {
    if (!destination.trim()) return;
    setIsGenerating(true);
    setGeneratorError(null);

    try {
      const res = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          days: Number(days) || 3,
          vibe,
          memberCount: Math.max(1, members.length || 4),
        }),
        signal: AbortSignal.timeout(45000),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      if (json.success && Array.isArray(json.items)) {
        setTripPlan({
          id: tripPlan?.id || `trip-${Date.now()}`,
          destination: json.destination || destination,
          days: json.days || days,
          vibe: json.vibe || vibe,
          status: tripPlan?.status || "planned",
          items: json.items,
          flakedMemberIds: [],
          paidMemberIds: tripPlan?.paidMemberIds || [],
        });

        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#FF7A00", "#2DD4BF", "#C084FC"],
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      console.error("Failed to generate trip plan:", err);
      setGeneratorError(err?.message || "Failed to generate budget. You can add items manually below!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert Planned Item to Real Ledger Expense
  const handleConvertItem = (item: TripPlanItem) => {
    if (members.length === 0) {
      alert("Please add roommates to your group first to convert planned items into ledger expenses.");
      return;
    }

    convertPlanItemToExpense(item.id);

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#2DD4BF", "#FF7A00", "#000000"],
      });
    } catch (e) {
      // ignore
    }
  };

  // Open manual add modal
  const openAddModal = () => {
    setEditingItemId(null);
    setItemTitle("");
    setItemCategory("Stay");
    setItemAmount(1500);
    setItemCostType("fixed");
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (item: TripPlanItem) => {
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemCategory(item.category);
    setItemAmount(item.estimatedAmount);
    setItemCostType(item.costType);
    setIsModalOpen(true);
  };

  // Save manual item
  const handleSaveItem = () => {
    if (!itemTitle.trim()) {
      alert("Please provide an item title");
      return;
    }
    if (itemAmount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    if (editingItemId) {
      updateTripPlanItem(editingItemId, {
        title: itemTitle.trim(),
        category: itemCategory,
        estimatedAmount: Math.round(Number(itemAmount)),
        costType: itemCostType,
      });
    } else {
      addTripPlanItem({
        title: itemTitle.trim(),
        category: itemCategory,
        estimatedAmount: Math.round(Number(itemAmount)),
        costType: itemCostType,
      });
    }

    setIsModalOpen(false);
  };

  // Get recommended payer for each item
  const recommendedPayerInfo = useMemo(() => {
    return getRecommendedPayer(
      members,
      detailedBalances,
      goingMembers.map((m) => m.id)
    );
  }, [members, detailedBalances, goingMembers]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-zinc-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black flex items-center gap-2">
                <span className={isEveryonePaid ? "line-through decoration-black decoration-4 text-zinc-500" : ""}>
                  {tripPlan?.destination || "Trip Planner & Budget Engine"}
                </span>
                {isEveryonePaid && (
                  <span className="no-underline text-xs font-black bg-[#2DD4BF] text-emerald-950 px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0_0_#000]">
                    100% PAID & SETTLED ✓
                  </span>
                )}
              </h1>
            </div>
            <p className="text-xs font-bold text-zinc-600 mt-0.5">
              {roomName} • {tripPlan?.status === "over" ? "Completed / Over Trip" : "Currently Planned Trip"} • Pre-trip estimation, Last-Minute Flake Simulator & Payment Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {flakedMembers.length > 0 && (
            <button
              type="button"
              onClick={() => setTripPlan((prev) => (prev ? { ...prev, flakedMemberIds: [] } : prev))}
              className="flex items-center gap-1.5 font-black text-xs px-3 py-2 rounded-xl border-2 border-black bg-[#FEF08A] hover:bg-[#fde047] text-black shadow-[2px_2px_0_0_#000] transition-all"
              title="Reset all flakers to going"
            >
              <span>⚡</span>
              <span>{flakedMembers.length} Flaked (+{formatINR(simulation.perPersonDelta)}/ea)</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-black bg-black text-[#FEF08A] ml-0.5">
                Reset ✕
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCreateNewTrip}
            className="flex items-center gap-1.5 bg-white hover:bg-zinc-100 text-black font-black text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Plan Another Trip</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Planned Item</span>
          </button>

          <button
            onClick={handleLoadSampleTrips}
            className="flex items-center gap-1.5 bg-[#2DD4BF] text-black font-black text-xs px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
            title="Load sample planned Kasol trip and completed Goa trip"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Load Sample Trips</span>
          </button>
        </div>
      </div>

      {/* Trip Manager & Switcher: Currently Planned vs. Over Trips */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_#000] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-black" />
              <span>TRIPS MANAGER:</span>
            </span>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl border-2 border-black p-0.5 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setTripFilterTab("planned")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  tripFilterTab === "planned"
                    ? "bg-[#FF7A00] text-black shadow-[1.5px_1.5px_0_0_#000]"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                🗓️ Currently Planned ({plannedTrips.length})
              </button>

              <button
                type="button"
                onClick={() => setTripFilterTab("over")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  tripFilterTab === "over"
                    ? "bg-[#C084FC] text-black shadow-[1.5px_1.5px_0_0_#000]"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                🏁 Over Trips ({overTrips.length})
              </button>

              <button
                type="button"
                onClick={() => setTripFilterTab("all")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  tripFilterTab === "all"
                    ? "bg-black text-white shadow-[1.5px_1.5px_0_0_#000]"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                All ({trips.length})
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-zinc-500">
            Click any trip to manage budget, attendance, or mark dues as paid
          </div>
        </div>

        {/* Trips Horizontal Cards */}
        {displayedTrips.length === 0 ? (
          <div className="p-4 bg-[#FAF8F5] border border-dashed border-black rounded-xl text-center text-xs font-bold text-zinc-600">
            {tripFilterTab === "over"
              ? "No trips marked as over yet. Mark any completed trip as 'Over' to archive it here!"
              : "No planned trips. Click '+ Plan Another Trip' or 'Load Sample Trips' above!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {displayedTrips.map((t) => {
              const isActive = t.id === tripPlan?.id;
              const tripAllPaid = isTripEveryonePaid(t);
              const tFlaked = t.flakedMemberIds || [];
              const tGoing = members.filter((m) => !tFlaked.includes(m.id));
              const tPaid = t.paidMemberIds || [];
              const tPaidCount = tGoing.filter((m) => tPaid.includes(m.id)).length;
              const tTotalEst = t.items.reduce((s, it) => s + it.estimatedAmount, 0);

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTripId(t.id)}
                  className={`p-3 rounded-xl border-2 border-black cursor-pointer transition-all text-left flex flex-col justify-between gap-2.5 ${
                    isActive
                      ? "bg-[#FAF8F5] ring-2 ring-black shadow-[3px_3px_0_0_#000] -translate-y-0.5"
                      : "bg-white hover:bg-zinc-50 shadow-[1.5px_1.5px_0_0_#000]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status Tag */}
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded border border-black ${
                            t.status === "over"
                              ? "bg-[#C084FC] text-black"
                              : "bg-[#FF7A00] text-black"
                          }`}
                        >
                          {t.status === "over" ? "OVER 🏁" : "PLANNED 🗓️"}
                        </span>

                        {/* Paid Stamp */}
                        {tripAllPaid ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded border border-black bg-[#2DD4BF] text-emerald-950">
                            100% PAID ✓
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-black bg-zinc-100 text-zinc-700 font-mono">
                            {tPaidCount}/{tGoing.length || members.length} Paid
                          </span>
                        )}
                      </div>

                      {/* Destination with strikethrough if everyone paid */}
                      <h4
                        className={`font-black text-sm mt-1 truncate ${
                          tripAllPaid
                            ? "line-through decoration-black decoration-2 text-zinc-500 font-bold"
                            : "text-black"
                        }`}
                      >
                        {t.destination}
                      </h4>
                    </div>

                    {/* Quick Status Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTripStatus(t.id);
                      }}
                      title={t.status === "over" ? "Reopen as planned" : "Mark as over / completed"}
                      className="p-1 rounded-lg border border-black bg-white hover:bg-zinc-200 text-black text-[10px] font-black shrink-0"
                    >
                      {t.status === "over" ? "Reopen" : "Mark Over"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600 border-t border-black/10 pt-1.5">
                    <span className="font-mono">{formatINR(tTotalEst)} Total</span>
                    <span>{t.days} Days • {t.vibe.split(" ")[0]}</span>
                    {trips.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete trip "${t.destination}"?`)) {
                            deleteTrip(t.id);
                          }
                        }}
                        className="text-zinc-400 hover:text-rose-600 ml-1 p-0.5"
                        title="Delete trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Crossed-Out Banner If All Roommates Paid For This Active Trip */}
      {isEveryonePaid && (
        <div className="bg-[#2DD4BF] border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_#000] flex items-center justify-between flex-wrap gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#2DD4BF] flex items-center justify-center text-lg font-black shrink-0 shadow-[2px_2px_0_0_#000]">
              ✓
            </div>
            <div>
              <div className="text-base font-black text-black flex items-center gap-2 flex-wrap">
                <span className="line-through decoration-black decoration-2">{tripPlan?.destination}</span>
                <span>— ALL ROOMMATES PAID! (CROSSED OUT)</span>
              </div>
              <p className="text-xs font-bold text-emerald-950">
                All {goingMembers.length} roommates have fully paid their {formatINR(perPersonShare)} share ({formatINR(totalPlannedCost)} total budget cleared).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tripPlan && tripPlan.status !== "over" && (
              <button
                type="button"
                onClick={() => handleToggleTripStatus(tripPlan.id)}
                className="px-3 py-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-black rounded-xl border border-black shadow-[2px_2px_0_0_#000]"
              >
                Mark Trip as Over 🏁
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Form & Controls (7 cols) + Planned vs Actual Spend (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* Left Column: AI Generator Box with Integrated Flake Simulator */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          {/* AI Pre-Trip Budget Generator Card */}
          <div className="bg-[#FFEDD5] border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF7A00] border-2 border-black flex items-center justify-center text-black font-black shadow-[1.5px_1.5px_0_0_#000]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-black">
                    1. Pre-Trip Budget Generator
                  </h2>
                  <p className="text-[11px] font-bold text-zinc-600">
                    Itemized hostel budget estimation with live Last-Minute Flake recalculations
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Destination Input */}
              <div>
                <label className="block text-[11px] font-black uppercase text-black mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Kasol / Shimla / Goa"
                  className="w-full bg-white border-2 border-black rounded-xl px-3.5 py-2 font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00] shadow-[2px_2px_0_0_#000]"
                />

                {/* Destination Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {quickDestinations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDestination(d)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border border-black transition-all ${
                        destination === d
                          ? "bg-[#FF7A00] text-black font-black shadow-[1px_1px_0_0_#000]"
                          : "bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {d.split("&")[0].split("/")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days & Trip Vibe Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-black uppercase text-black mb-1">
                    Number of Days
                  </label>
                  <div className="flex items-center bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDays((d) => Math.max(1, d - 1))}
                      className="px-3 py-1.5 font-black hover:bg-zinc-100 border-r border-black"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-black font-mono text-sm">
                      {days} {days === 1 ? "Day" : "Days"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDays((d) => Math.min(14, d + 1))}
                      className="px-3 py-1.5 font-black hover:bg-zinc-100 border-l border-black"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-black uppercase text-black mb-1">
                    Trip Vibe
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["Budget Hostel", "Standard", "Comfort"] as const).map((v) => {
                      const isSelected = vibe === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVibe(v)}
                          className={`py-1.5 px-1 text-center rounded-xl border-2 border-black text-xs font-black transition-all ${
                            isSelected
                              ? v === "Budget Hostel"
                                ? "bg-[#2DD4BF] text-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                                : v === "Standard"
                                ? "bg-[#C084FC] text-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                                : "bg-[#FF7A00] text-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                              : "bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cleverly Integrated Flake Simulator & Roommate Attendance */}
              <div className="pt-3 border-t-2 border-black/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚡</span>
                    <label className="text-[11px] font-black uppercase text-black">
                      Roommate Attendance & Flake Simulator
                    </label>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md border border-black bg-white shadow-[1px_1px_0_0_#000]">
                    {goingMembers.length}/{Math.max(1, members.length)} Going
                  </span>
                </div>
                <p className="text-[11px] font-bold text-zinc-600">
                  Tap any roommate to simulate what happens if they flake last-minute. Fixed costs automatically re-divide among committed members.
                </p>

                {members.length === 0 ? (
                  <div className="p-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-zinc-600">
                    No roommates added yet. Load sample data or add roommates from the header to test the flake simulator.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {members.map((m) => {
                      const isFlaked = flakedIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleFlakedMember(m.id)}
                          className={`p-2 rounded-xl border-2 border-black flex items-center justify-between text-left transition-all ${
                            isFlaked
                              ? "bg-rose-50 border-rose-400 text-zinc-400 shadow-none opacity-85"
                              : "bg-white text-black shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full border border-black ${m.avatarBg} text-black font-black text-[10px] flex items-center justify-center shrink-0`}
                            >
                              {m.initials}
                            </div>
                            <span
                              className={`text-xs font-black truncate ${
                                isFlaked ? "line-through text-zinc-400" : "text-black"
                              }`}
                            >
                              {m.name.split(" ")[0]}
                            </span>
                          </div>

                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-black shrink-0 ${
                              isFlaked
                                ? "bg-rose-200 text-rose-950 border-rose-950"
                                : "bg-[#2DD4BF] text-emerald-950"
                            }`}
                          >
                            {isFlaked ? "Flaked ✕" : "Going ✓"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Inline Flake Impact Banner */}
                {flakedMembers.length > 0 && (
                  <div className="p-3 bg-[#FEF08A] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-black text-black leading-snug flex-1">
                      <span>
                        ⚠️ Flake Impact: If {flakedMembers.map((m) => m.name.split(" ")[0]).join(", ")} flake, cost per going person surges by{" "}
                        <span className="text-rose-700 underline decoration-2">
                          +{formatINR(simulation.perPersonDelta)}
                        </span>{" "}
                        (from {formatINR(simulation.basePerPerson)} to {formatINR(simulation.simulatedPerPerson)})!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTripPlan((prev) => (prev ? { ...prev, flakedMemberIds: [] } : prev))}
                      className="text-[10px] font-black px-2 py-0.5 bg-black text-[#FEF08A] rounded border border-black hover:bg-zinc-800 shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {generatorError && (
                <div className="p-2.5 bg-rose-100 border-2 border-black rounded-xl text-xs font-black text-rose-900">
                  {generatorError}
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateBudget}
                disabled={isGenerating}
                className="w-full bg-[#FF7A00] text-black font-black text-sm py-3 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Generating itemized budget...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>Generate Pre-Trip Budget →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Planned vs. Actual Spend + Live Flake Impact Per-Person Breakdown */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-black">
                  Planned vs. Actual Spend
                </h3>
                <p className="text-[11px] font-bold text-zinc-500">
                  Compares estimated trip budget against expenses converted into your ledger
                </p>
              </div>
              <span className="text-xs font-black font-mono bg-[#FAF8F5] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000]">
                {totalPlannedCost > 0
                  ? `${Math.round((totalActualSpent / totalPlannedCost) * 100)}% CONVERTED`
                  : "0%"}
              </span>
            </div>

            {/* Numbers Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-[#FAF8F5] border border-black rounded-xl">
                <div className="text-[10px] font-black uppercase text-zinc-500">
                  TOTAL PLANNED
                </div>
                <div className="text-lg font-black font-mono text-black">
                  {formatINR(totalPlannedCost)}
                </div>
              </div>

              <div className="p-2.5 bg-[#FAF8F5] border border-black rounded-xl">
                <div className="text-[10px] font-black uppercase text-zinc-500">
                  LOGGED IN LEDGER
                </div>
                <div className="text-lg font-black font-mono text-emerald-600">
                  {formatINR(totalActualSpent)}
                </div>
              </div>

              <div className="p-2.5 bg-[#FAF8F5] border border-black rounded-xl col-span-2 sm:col-span-1">
                <div className="text-[10px] font-black uppercase text-zinc-500">
                  REMAINING BUFFER
                </div>
                <div className="text-lg font-black font-mono text-[#FF7A00]">
                  {formatINR(Math.max(0, totalPlannedCost - totalActualSpent))}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-4 bg-zinc-100 border-2 border-black rounded-full overflow-hidden p-0.5 flex">
                <div
                  className="h-full bg-[#2DD4BF] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      totalPlannedCost > 0
                        ? (totalActualSpent / totalPlannedCost) * 100
                        : 0
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 pt-0.5">
                <span>₹0 Start</span>
                <span>
                  {totalActualSpent > totalPlannedCost
                    ? `⚠️ Over planned by ${formatINR(totalActualSpent - totalPlannedCost)}`
                    : `${formatINR(totalPlannedCost - totalActualSpent)} remaining to execute`}
                </span>
                <span>{formatINR(totalPlannedCost)}</span>
              </div>
            </div>

            {/* Live Per-Person Cost & Flake Impact Widget */}
            <div className="pt-3 border-t-2 border-black/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black uppercase text-black flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Per-Person Trip Cost</span>
                </div>
                {flakedMembers.length > 0 ? (
                  <span className="text-[10px] font-black bg-rose-200 text-rose-950 border border-black px-1.5 py-0.5 rounded">
                    +{formatINR(simulation.perPersonDelta)} SURGE
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-[#2DD4BF] text-black border border-black px-1.5 py-0.5 rounded">
                    ALL COMMITTED
                  </span>
                )}
              </div>

              {/* Primary per-person cost card */}
              <div className="p-3 bg-[#FAF8F5] border-2 border-black rounded-xl flex items-center justify-between shadow-[2px_2px_0_0_#000]">
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">
                    {flakedMembers.length > 0 ? "Cost for each going member" : "Base cost per roommate"}
                  </div>
                  <div className="text-2xl font-black font-mono text-black">
                    {formatINR(flakedMembers.length > 0 ? simulation.simulatedPerPerson : simulation.basePerPerson)}
                  </div>
                </div>
                <div className="text-right text-[11px] font-bold text-zinc-600">
                  <div>{simulation.goingCount} going of {simulation.totalMembers}</div>
                  {flakedMembers.length > 0 && (
                    <div className="text-rose-600 font-black">
                      was {formatINR(simulation.basePerPerson)}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed vs Variable Pool Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-2.5 bg-white border border-black rounded-xl shadow-[1px_1px_0_0_#000]">
                  <div className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1">
                    <Car className="w-3 h-3 text-[#FF7A00]" />
                    <span>Fixed Pool</span>
                  </div>
                  <div className="text-sm font-black font-mono text-black mt-0.5">
                    {formatINR(simulation.fixedTotal)}
                  </div>
                  <div className="text-[9px] font-bold text-zinc-500 mt-0.5">
                    {formatINR(Math.round(simulation.fixedTotal / simulation.goingCount))}/ea ({simulation.goingCount} split)
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-black rounded-xl shadow-[1px_1px_0_0_#000]">
                  <div className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-[#C084FC]" />
                    <span>Variable Pool</span>
                  </div>
                  <div className="text-sm font-black font-mono text-black mt-0.5">
                    {formatINR(simulation.simulatedVariablePool)}
                  </div>
                  <div className="text-[9px] font-bold text-zinc-500 mt-0.5">
                    Scales w/ flakers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Roommate Payment & Dues Tracker (Who Paid & Who Owes & How Much) */}
      <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <span>2. Roommate Payment & Dues Tracker</span>
              </h2>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded border border-black ${
                  isEveryonePaid ? "bg-[#2DD4BF] text-emerald-950" : "bg-amber-100 text-amber-950"
                }`}
              >
                {goingPaidCount}/{goingMembers.length} Roommates Paid
              </span>
              <span className="text-xs font-mono font-bold bg-[#FAF8F5] border border-black px-2 py-0.5 rounded">
                {formatINR(totalTripCollected)} / {formatINR(totalTripExpected)} Collected
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-500 mt-0.5">
              Tracks who paid or not and how much. When everyone pays, this trip is automatically crossed out!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMarkAllPaid}
              className="flex items-center gap-1.5 bg-[#2DD4BF] text-black font-black text-xs px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mark All Paid</span>
            </button>

            {paidMemberIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetPayments}
                className="text-xs font-bold text-zinc-600 hover:text-black underline px-2 py-1"
              >
                Reset Payments
              </button>
            )}

            {tripPlan && (
              <button
                type="button"
                onClick={() => handleToggleTripStatus(tripPlan.id)}
                className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] transition-all ${
                  tripPlan.status === "over"
                    ? "bg-[#C084FC] text-black"
                    : "bg-[#FAF8F5] text-black hover:bg-zinc-100"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{tripPlan.status === "over" ? "Status: Over 🏁" : "Status: Planned 🗓️"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Roommate Cards Grid */}
        {members.length === 0 ? (
          <div className="p-4 bg-[#FAF8F5] border-2 border-dashed border-black rounded-xl text-xs font-bold text-zinc-600 text-center">
            No roommates in your group yet. Add roommates in the top header or load demo data to track payments!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {members.map((m) => {
              const isFlaked = flakedIds.includes(m.id);
              const isPaid = paidMemberIds.includes(m.id);

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border-2 border-black flex flex-col justify-between gap-3 transition-all ${
                    isFlaked
                      ? "bg-zinc-100/80 border-dashed border-zinc-400 opacity-60"
                      : isPaid
                      ? "bg-emerald-50/80 border-black shadow-[2px_2px_0_0_#000]"
                      : "bg-white border-black shadow-[2px_2px_0_0_#000]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full border border-black ${m.avatarBg} text-black font-black text-xs flex items-center justify-center shrink-0`}
                      >
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-black truncate ${
                            isFlaked
                              ? "line-through text-zinc-400"
                              : isPaid
                              ? "line-through decoration-emerald-800 text-black font-black"
                              : "text-black"
                          }`}
                        >
                          {m.name}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 font-mono truncate">
                          {m.upiId}
                        </div>
                      </div>
                    </div>

                    {/* Payment Status Badge */}
                    {isFlaked ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 shrink-0">
                        Flaked
                      </span>
                    ) : isPaid ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md border border-black bg-[#2DD4BF] text-emerald-950 shrink-0 shadow-[1px_1px_0_0_#000]">
                        PAID ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md border border-black bg-rose-200 text-rose-950 shrink-0">
                        OWES
                      </span>
                    )}
                  </div>

                  {/* Amount & 1-Click Action */}
                  <div className="pt-2 border-t border-black/10 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold uppercase text-zinc-500">
                        {isFlaked ? "Share" : isPaid ? "Paid Share" : "Amount Owed"}
                      </div>
                      <div
                        className={`text-sm font-black font-mono ${
                          isFlaked
                            ? "text-zinc-400 line-through"
                            : isPaid
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {isFlaked ? "₹0" : formatINR(perPersonShare)}
                      </div>
                    </div>

                    {!isFlaked && (
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(m.id)}
                        className={`px-2.5 py-1 text-xs font-black rounded-lg border-2 border-black transition-all ${
                          isPaid
                            ? "bg-white hover:bg-zinc-100 text-zinc-700 shadow-[1px_1px_0_0_#000]"
                            : "bg-black hover:bg-zinc-800 text-[#2DD4BF] shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
                        }`}
                      >
                        {isPaid ? "Unmark ↩" : "Mark Paid ✓"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Planned Items List with "Who Should Pay Next?" */}
      <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-black flex items-center gap-2">
              <span>3. Planned Trip Items & Smart Payer Engine</span>
              <span className="text-xs font-mono font-bold bg-[#FAF8F5] border border-black px-2 py-0.5 rounded">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            </h2>
            <p className="text-xs font-bold text-zinc-500">
              Klear algorithm identifies which roommate owes the group money to balance the ledger.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="self-start sm:self-auto flex items-center gap-1.5 bg-[#FF7A00] text-black font-black text-xs px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Item Manually</span>
          </button>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-black rounded-2xl bg-[#FAF8F5] space-y-3">
            <Luggage className="w-10 h-10 mx-auto text-zinc-400" />
            <h3 className="text-sm font-black text-black">No Planned Trip Items Yet</h3>
            <p className="text-xs font-bold text-zinc-500 max-w-sm mx-auto">
              Click &quot;Generate Pre-Trip Budget&quot; above or click &quot;Load Sample Kasol Trip&quot; to test the smart payer recommendations.
            </p>
            <button
              onClick={handleLoadSampleTrips}
              className="px-4 py-2 bg-[#2DD4BF] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
            >
              Load Sample Kasol Trip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const isConverted = !!item.actualExpenseId;
              const convertedExpense = isConverted
                ? expenses.find((e) => e.id === item.actualExpenseId)
                : null;
              const payerMember = convertedExpense
                ? members.find((m) => m.id === convertedExpense.paidById)
                : null;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border-2 border-black transition-all ${
                    isConverted
                      ? "bg-[#FAF8F5] border-black opacity-90 shadow-[2px_2px_0_0_#000]"
                      : "bg-white border-black shadow-[3px_3px_0_0_#000]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Item Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase ${
                            item.costType === "fixed"
                              ? "bg-[#FFEDD5] text-orange-950"
                              : "bg-[#DDD6FE] text-purple-950"
                          }`}
                        >
                          {item.costType === "fixed" ? "Fixed Cost (Group)" : "Variable (Per Person)"}
                        </span>

                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 border border-black/30 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>

                        {isConverted && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Converted to Ledger Expense</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-black truncate">
                        {item.title}
                      </h3>

                      {/* Smart Payer Recommendation Banner */}
                      {!isConverted && recommendedPayerInfo && (
                        <div className="inline-flex items-center gap-1.5 bg-[#FEF08A] border border-black rounded-lg px-2.5 py-1 text-xs font-black text-amber-950 shadow-[1px_1px_0_0_#000]">
                          <div
                            className={`w-4 h-4 rounded-full border border-black ${recommendedPayerInfo.member.avatarBg} text-[9px] font-black flex items-center justify-center shrink-0`}
                          >
                            {recommendedPayerInfo.member.initials}
                          </div>
                          <span>
                            Recommended Payer: <strong className="underline">{recommendedPayerInfo.member.name.split(" ")[0]}</strong> ({recommendedPayerInfo.reason})
                          </span>
                        </div>
                      )}

                      {isConverted && payerMember && (
                        <div className="text-[11px] font-bold text-zinc-600">
                          Paid by {payerMember.name} • Split among active roommates
                        </div>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/10">
                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase text-zinc-500">
                          ESTIMATED COST
                        </div>
                        <div className="text-xl font-black font-mono text-black">
                          {formatINR(item.estimatedAmount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isConverted ? (
                          <button
                            type="button"
                            onClick={() => handleConvertItem(item)}
                            className="bg-[#2DD4BF] text-black font-black text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Convert to Real Expense →</span>
                          </button>
                        ) : (
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-500 px-3 py-2 rounded-xl">
                            ✓ In Ledger
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 bg-zinc-100 hover:bg-zinc-200 border-2 border-black rounded-xl text-black transition-colors"
                          title="Edit Item"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTripPlanItem(item.id)}
                          className="p-2 bg-rose-100 hover:bg-rose-200 border-2 border-black rounded-xl text-rose-900 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border-2 border-black rounded-3xl p-6 max-w-md w-full shadow-[6px_6px_0_0_#000] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-black">
                {editingItemId ? "Edit Planned Trip Item" : "Add Custom Trip Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg border-2 border-black bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-black uppercase text-black mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. River Rafting Grade 4 or Bonfire Wood"
                  className="w-full bg-white border-2 border-black rounded-xl px-3.5 py-2 font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-black mb-1">
                    Estimated Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(Number(e.target.value))}
                    min={0}
                    className="w-full bg-white border-2 border-black rounded-xl px-3.5 py-2 font-black font-mono text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-black mb-1">
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  >
                    <option value="Stay">Hostel / Stay</option>
                    <option value="Transport">Transport / Cab</option>
                    <option value="Food & Drink">Food & Cafe</option>
                    <option value="Activities">Activities / Trek</option>
                    <option value="Groceries">Snacks & Supplies</option>
                    <option value="Misc">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-black mb-1">
                  Cost Behavior (For Flake Simulator)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemCostType("fixed")}
                    className={`p-2.5 rounded-xl border-2 border-black text-left transition-all ${
                      itemCostType === "fixed"
                        ? "bg-[#FF7A00] text-black font-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-xs font-black">Fixed Cost</div>
                    <div className="text-[10px] font-bold text-black/80">
                      Stay, Cab (split among remaining)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemCostType("variable")}
                    className={`p-2.5 rounded-xl border-2 border-black text-left transition-all ${
                      itemCostType === "variable"
                        ? "bg-[#C084FC] text-black font-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="text-xs font-black">Variable Cost</div>
                    <div className="text-[10px] font-bold text-black/80">
                      Cafe, snacks (scales down)
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border-2 border-black rounded-xl font-bold text-xs text-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2 bg-[#FF7A00] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
              >
                {editingItemId ? "Save Changes" : "Add to Trip Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
