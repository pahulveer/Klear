"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Member, Expense, SimplifiedTransfer, NetBalance, TripPlan, TripPlanItem, Group } from "@/types/ledger";
import {
  calculateNetBalances,
  getDetailedBalances,
  simplifySettlements,
  buildWhatsAppNudge,
  getRecommendedPayer,
} from "@/lib/settleDebts";

interface LedgerContextType {
  members: Member[];
  expenses: Expense[];
  settledTransferIds: string[];
  roomName: string;
  setRoomName: (name: string) => void;
  addMember: (data: { name: string; upiId?: string; isYou?: boolean }) => void;
  deleteMember: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
  toggleSettleTransfer: (transferId: string) => void;
  clearAllData: () => void;
  netBalances: Record<string, number>;
  detailedBalances: NetBalance[];
  simplifiedTransfers: SimplifiedTransfer[];
  totalPoolSpent: number;
  youNetBalance: number;
  youOwed: number;
  youOwe: number;
  whatsappNudge: { text: string; url: string };
  isHydrated: boolean;
  tripPlan: TripPlan | null;
  setTripPlan: React.Dispatch<React.SetStateAction<TripPlan | null>>;
  trips: TripPlan[];
  activeTripId: string;
  setActiveTripId: (id: string) => void;
  createTrip: (tripData?: Partial<TripPlan>) => string;
  updateTrip: (id: string, updates: Partial<TripPlan>) => void;
  deleteTrip: (id: string) => void;
  toggleMemberTripPaid: (tripId: string, memberId: string) => void;
  setTripStatus: (tripId: string, status: 'planned' | 'over') => void;
  addTripPlanItem: (item: Omit<TripPlanItem, "id">) => void;
  updateTripPlanItem: (id: string, updates: Partial<TripPlanItem>) => void;
  deleteTripPlanItem: (id: string) => void;
  toggleFlakedMember: (memberId: string) => void;
  convertPlanItemToExpense: (itemId: string, payerId?: string) => void;
  importBatchExpensesAndMembers: (
    newExpenses: Omit<Expense, "id">[],
    newMembers?: Array<{ id: string; name: string; upiId?: string }>
  ) => void;
  groups: Group[];
  activeGroupId: string;
  activeGroup: Group | null;
  switchGroup: (groupId: string) => void;
  createGroup: (name: string, icon?: string) => string;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  GROUPS: "klear_groups_v1",
  ACTIVE_GROUP_ID: "klear_active_group_id_v1",
  MEMBERS: "klear_members_v2",
  EXPENSES: "klear_expenses_v2",
  SETTLED: "klear_settled_v2",
  ROOM_NAME: "klear_room_name_v2",
  TRIPS: "klear_trips_v2",
  ACTIVE_TRIP: "klear_active_trip_v2",
  TRIP_PLAN: "klear_trip_plan_v2",
  // Legacy fallback keys to prevent data loss on existing browser tabs
  OLD_MEMBERS: "splithostel_members_v2",
  OLD_EXPENSES: "splithostel_expenses_v2",
  OLD_SETTLED: "splithostel_settled_v2",
  OLD_ROOM_NAME: "splithostel_room_name_v2",
  OLD_TRIP_PLAN: "splithostel_trip_plan_v2",
  OLD_TRIPS: "splithostel_trips_v2",
};

const AVATAR_COLORS = [
  "bg-[#FF7A00]",
  "bg-[#2DD4BF]",
  "bg-[#C084FC]",
  "bg-[#FBBF24]",
  "bg-[#F472B6]",
  "bg-[#38BDF8]",
];

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Multi-group state
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>("grp-1");

  // Current active group ledger state
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settledTransferIds, setSettledTransferIds] = useState<string[]>([]);
  const [roomName, setRoomNameState] = useState<string>("My Hostel Group");
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || null;
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  // Load from LocalStorage (with backward-compatible fallback)
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem(STORAGE_KEYS.GROUPS);
      const savedActiveGroupId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GROUP_ID);

      const savedMembers =
        localStorage.getItem(STORAGE_KEYS.MEMBERS) ||
        localStorage.getItem(STORAGE_KEYS.OLD_MEMBERS);
      const savedExpenses =
        localStorage.getItem(STORAGE_KEYS.EXPENSES) ||
        localStorage.getItem(STORAGE_KEYS.OLD_EXPENSES);
      const savedSettled =
        localStorage.getItem(STORAGE_KEYS.SETTLED) ||
        localStorage.getItem(STORAGE_KEYS.OLD_SETTLED);
      const savedRoomName =
        localStorage.getItem(STORAGE_KEYS.ROOM_NAME) ||
        localStorage.getItem(STORAGE_KEYS.OLD_ROOM_NAME);
      const savedTrips =
        localStorage.getItem(STORAGE_KEYS.TRIPS) ||
        localStorage.getItem(STORAGE_KEYS.OLD_TRIPS);
      const savedActiveTrip = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
      const savedTripPlan =
        localStorage.getItem(STORAGE_KEYS.TRIP_PLAN) ||
        localStorage.getItem(STORAGE_KEYS.OLD_TRIP_PLAN);

      let initialGroups: Group[] = [];
      if (savedGroups) {
        try {
          const parsed = JSON.parse(savedGroups);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialGroups = parsed;
          }
        } catch (e) {
          console.error("Failed to parse saved groups:", e);
        }
      }

      if (initialGroups.length === 0) {
        const parsedMembers = savedMembers ? JSON.parse(savedMembers) : [];
        const parsedExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        const parsedSettled = savedSettled ? JSON.parse(savedSettled) : [];
        let parsedTrips: TripPlan[] = [];
        if (savedTrips) {
          try {
            parsedTrips = JSON.parse(savedTrips);
          } catch (e) {}
        } else if (savedTripPlan) {
          try {
            parsedTrips = [JSON.parse(savedTripPlan)];
          } catch (e) {}
        }

        const defaultGroup: Group = {
          id: "grp-1",
          name: savedRoomName || "My Hostel Group",
          icon: "🛏️",
          members: parsedMembers,
          expenses: parsedExpenses,
          settledTransferIds: parsedSettled,
          trips: parsedTrips,
          createdAt: new Date().toISOString(),
        };
        initialGroups = [defaultGroup];
      }

      setGroups(initialGroups);

      const targetGroup =
        initialGroups.find((g) => g.id === savedActiveGroupId) || initialGroups[0];

      setActiveGroupId(targetGroup.id);
      setRoomNameState(targetGroup.name);
      setMembers(targetGroup.members || []);
      setExpenses(targetGroup.expenses || []);
      setSettledTransferIds(targetGroup.settledTransferIds || []);
      setTrips(targetGroup.trips || []);
      if (targetGroup.trips && targetGroup.trips.length > 0) {
        setActiveTripId(savedActiveTrip || targetGroup.trips[0].id);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Keep active group synchronized inside `groups`
  useEffect(() => {
    if (!isHydrated || !activeGroupId) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeGroupId
          ? {
              ...g,
              name: roomName,
              members,
              expenses,
              settledTransferIds,
              trips,
            }
          : g
      )
    );
  }, [members, expenses, settledTransferIds, roomName, trips, activeGroupId, isHydrated]);

  // Save to LocalStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GROUP_ID, activeGroupId);
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(
        STORAGE_KEYS.SETTLED,
        JSON.stringify(settledTransferIds)
      );
      localStorage.setItem(STORAGE_KEYS.ROOM_NAME, roomName);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
      if (activeTripId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, activeTripId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
      }
      if (activeTrip) {
        localStorage.setItem(STORAGE_KEYS.TRIP_PLAN, JSON.stringify(activeTrip));
      } else {
        localStorage.removeItem(STORAGE_KEYS.TRIP_PLAN);
      }
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [groups, activeGroupId, members, expenses, settledTransferIds, roomName, trips, activeTripId, activeTrip, isHydrated]);

  // Group Management Methods
  const switchGroup = (targetGroupId: string) => {
    if (targetGroupId === activeGroupId) return;
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    if (!targetGroup) return;

    // 1. Flush current group state into groups list
    const updatedGroups = groups.map((g) =>
      g.id === activeGroupId
        ? {
            ...g,
            name: roomName,
            members,
            expenses,
            settledTransferIds,
            trips,
          }
        : g
    );
    setGroups(updatedGroups);

    // 2. Switch to target
    setActiveGroupId(targetGroup.id);
    setRoomNameState(targetGroup.name);
    setMembers(targetGroup.members || []);
    setExpenses(targetGroup.expenses || []);
    setSettledTransferIds(targetGroup.settledTransferIds || []);
    setTrips(targetGroup.trips || []);
    if (targetGroup.trips && targetGroup.trips.length > 0) {
      setActiveTripId(targetGroup.trips[0].id);
    } else {
      setActiveTripId("");
    }
  };

  const createGroup = (name: string, icon: string = "👥"): string => {
    const cleanName = name.trim() || "New Friend Group";
    const newId = `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newGroup: Group = {
      id: newId,
      name: cleanName,
      icon,
      members: [],
      expenses: [],
      settledTransferIds: [],
      trips: [],
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [
      ...groups.map((g) =>
        g.id === activeGroupId
          ? {
              ...g,
              name: roomName,
              members,
              expenses,
              settledTransferIds,
              trips,
            }
          : g
      ),
      newGroup,
    ];
    setGroups(updatedGroups);

    // Switch to new group with blank, isolated state
    setActiveGroupId(newId);
    setRoomNameState(cleanName);
    setMembers([]);
    setExpenses([]);
    setSettledTransferIds([]);
    setTrips([]);
    setActiveTripId("");

    return newId;
  };

  const deleteGroup = (groupId: string) => {
    if (groups.length <= 1) {
      alert("You need at least one group in Klear.");
      return;
    }
    const remaining = groups.filter((g) => g.id !== groupId);
    setGroups(remaining);

    if (activeGroupId === groupId) {
      const nextGroup = remaining[0];
      setActiveGroupId(nextGroup.id);
      setRoomNameState(nextGroup.name);
      setMembers(nextGroup.members || []);
      setExpenses(nextGroup.expenses || []);
      setSettledTransferIds(nextGroup.settledTransferIds || []);
      setTrips(nextGroup.trips || []);
      setActiveTripId(nextGroup.trips?.[0]?.id || "");
    }
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
    if (groupId === activeGroupId) {
      if (updates.name !== undefined) {
        setRoomNameState(updates.name.trim() || "My Hostel Group");
      }
    }
  };

  const setRoomName = (name: string) => {
    const clean = name.trim() || "My Hostel Group";
    setRoomNameState(clean);
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroupId ? { ...g, name: clean } : g))
    );
  };

  const addMember = ({
    name,
    upiId,
    isYou = false,
  }: {
    name: string;
    upiId?: string;
    isYou?: boolean;
  }) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const initials = trimmed
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const colorIndex = members.length % AVATAR_COLORS.length;
    const defaultUpi = upiId?.trim() || `${trimmed.toLowerCase().replace(/\s+/g, ".")}@upi`;

    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: isYou ? `${trimmed} (You)` : trimmed,
      upiId: defaultUpi,
      avatarBg: AVATAR_COLORS[colorIndex],
      initials,
      isYou: isYou || members.length === 0, // First member is automatically "You"
    };

    setMembers((prev) => [...prev, newMember]);
  };

  const deleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    // Clean up member from expenses
    setExpenses((prev) =>
      prev.map((exp) => {
        const nextSplits = { ...exp.splitDetails };
        delete nextSplits[id];
        return {
          ...exp,
          splitDetails: nextSplits,
          items: exp.items?.map((it) => ({
            ...it,
            splitWith: it.splitWith.filter((mid) => mid !== id),
          })),
        };
      })
    );
  };

  const addExpense = (newExpenseData: Omit<Expense, "id">) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleSettleTransfer = (transferId: string) => {
    setSettledTransferIds((prev) =>
      prev.includes(transferId)
        ? prev.filter((id) => id !== transferId)
        : [...prev, transferId]
    );
  };

  const setTripPlan = (action: React.SetStateAction<TripPlan | null>) => {
    setTrips((prevTrips) => {
      const current = prevTrips.find((t) => t.id === activeTripId) || prevTrips[0] || null;
      const nextPlan = typeof action === "function" ? action(current) : action;

      if (!nextPlan) {
        if (!activeTripId) return prevTrips;
        const remaining = prevTrips.filter((t) => t.id !== activeTripId);
        if (remaining.length > 0) setActiveTripId(remaining[0].id);
        else setActiveTripId("");
        return remaining;
      }

      const index = prevTrips.findIndex(
        (t) => t.id === nextPlan.id || (activeTripId && t.id === activeTripId)
      );
      if (index >= 0) {
        const copy = [...prevTrips];
        copy[index] = nextPlan;
        return copy;
      }
      setActiveTripId(nextPlan.id);
      return [nextPlan, ...prevTrips];
    });
  };

  const createTrip = (tripData?: Partial<TripPlan>): string => {
    const newId = `trip-${Date.now()}`;
    const newTrip: TripPlan = {
      id: newId,
      destination: tripData?.destination || "New Planned Trip",
      days: tripData?.days || 3,
      vibe: tripData?.vibe || "Budget Hostel",
      status: tripData?.status || "planned",
      items: tripData?.items || [],
      flakedMemberIds: tripData?.flakedMemberIds || [],
      paidMemberIds: tripData?.paidMemberIds || [],
    };

    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(newId);
    return newId;
  };

  const updateTrip = (id: string, updates: Partial<TripPlan>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTripId === id) {
        setActiveTripId(remaining[0]?.id || "");
      }
      return remaining;
    });
  };

  const toggleMemberTripPaid = (tripId: string, memberId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        const paid = t.paidMemberIds || [];
        const exists = paid.includes(memberId);
        return {
          ...t,
          paidMemberIds: exists
            ? paid.filter((mid) => mid !== memberId)
            : [...paid, memberId],
        };
      })
    );
  };

  const setTripStatus = (tripId: string, status: 'planned' | 'over') => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status } : t))
    );
  };

  const addTripPlanItem = (itemData: Omit<TripPlanItem, "id">) => {
    const newItem: TripPlanItem = {
      ...itemData,
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    setTripPlan((prev) => {
      if (!prev) {
        return {
          id: `trip-${Date.now()}`,
          destination: "Weekend Trip",
          days: 3,
          vibe: "Budget Hostel",
          status: "planned",
          items: [newItem],
          flakedMemberIds: [],
          paidMemberIds: [],
        };
      }
      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
  };

  const updateTripPlanItem = (id: string, updates: Partial<TripPlanItem>) => {
    setTripPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
      };
    });
  };

  const deleteTripPlanItem = (id: string) => {
    setTripPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((it) => it.id !== id),
      };
    });
  };

  const toggleFlakedMember = (memberId: string) => {
    setTripPlan((prev) => {
      const basePlan = prev || {
        id: `trip-${Date.now()}`,
        destination: "Kasol & Parvati Valley",
        days: 3,
        vibe: "Budget Hostel" as const,
        status: "planned",
        items: [],
        flakedMemberIds: [],
        paidMemberIds: [],
      };
      const exists = basePlan.flakedMemberIds.includes(memberId);
      return {
        ...basePlan,
        flakedMemberIds: exists
          ? basePlan.flakedMemberIds.filter((id) => id !== memberId)
          : [...basePlan.flakedMemberIds, memberId],
      };
    });
  };

  const convertPlanItemToExpense = (itemId: string, chosenPayerId?: string) => {
    if (!activeTrip || members.length === 0) return;
    const item = activeTrip.items.find((it) => it.id === itemId);
    if (!item) return;

    // Active (going) members
    const goingMembers = members.filter(
      (m) => !activeTrip.flakedMemberIds.includes(m.id)
    );
    const activeParticipants = goingMembers.length > 0 ? goingMembers : members;

    // Recommended payer if not explicitly chosen
    let payerId = chosenPayerId;
    if (!payerId) {
      const rec = getRecommendedPayer(
        members,
        detailedBalances,
        activeParticipants.map((m) => m.id)
      );
      payerId = rec?.member?.id || members[0]?.id;
    }

    // Calculate equal split among active participants
    const sharePerPerson =
      Math.round((item.estimatedAmount / activeParticipants.length) * 100) / 100;
    const splitDetails: Record<string, number> = {};
    activeParticipants.forEach((m) => {
      splitDetails[m.id] = sharePerPerson;
    });

    const newExpenseId = `exp-trip-${Date.now()}`;
    const newExpense: Expense = {
      id: newExpenseId,
      title: `${item.title} (${activeTrip.destination})`,
      totalAmount: item.estimatedAmount,
      paidById: payerId,
      date: "Trip Planned",
      category: "Party",
      splitMode: "equal",
      splitDetails,
      note: `Converted from Trip Planner for ${activeTrip.destination}`,
      verified: true,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Mark plan item as converted
    setTripPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === itemId ? { ...it, actualExpenseId: newExpenseId } : it
        ),
      };
    });
  };

  const importBatchExpensesAndMembers = (
    newExpensesData: Omit<Expense, "id">[],
    newMembersData?: Array<{ id: string; name: string; upiId?: string }>
  ) => {
    let currentMembers = [...members];
    if (newMembersData && newMembersData.length > 0 && currentMembers.length === 0) {
      currentMembers = newMembersData.map((m, idx) => {
        const trimmed = m.name.trim();
        const initials = trimmed
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const colorIndex = idx % AVATAR_COLORS.length;
        const defaultUpi = m.upiId || `${trimmed.toLowerCase().replace(/\s+/g, ".")}@upi`;
        return {
          id: m.id || `m-${Date.now()}-${idx}`,
          name: idx === 0 ? `${trimmed} (You)` : trimmed,
          upiId: defaultUpi,
          avatarBg: AVATAR_COLORS[colorIndex],
          initials,
          isYou: idx === 0,
        };
      });
      setMembers(currentMembers);
    }

    const createdExpenses: Expense[] = newExpensesData.map((exp, idx) => ({
      ...exp,
      id: `exp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    setExpenses((prev) => [...createdExpenses, ...prev]);
  };

  const clearAllData = () => {
    const defaultName = "My Hostel Group";
    setRoomNameState(defaultName);
    setMembers([]);
    setExpenses([]);
    setSettledTransferIds([]);
    setTrips([]);
    setActiveTripId("");

    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeGroupId
          ? {
              ...g,
              name: defaultName,
              members: [],
              expenses: [],
              settledTransferIds: [],
              trips: [],
            }
          : g
      )
    );
  };

  const netBalances = calculateNetBalances(members, expenses, settledTransferIds);
  const detailedBalances = getDetailedBalances(members, expenses);
  const simplifiedTransfers = simplifySettlements(
    netBalances,
    members,
    settledTransferIds
  );

  const totalPoolSpent = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const youMember = members.find((m) => m.isYou) || members[0];
  const youNetBalance = youMember ? netBalances[youMember.id] || 0 : 0;

  // Calculate breakdown for "You are owed" and "You owe"
  const pendingTransfers = simplifiedTransfers.filter(
    (t) => !settledTransferIds.includes(t.id)
  );

  const youOwed = youMember
    ? pendingTransfers
        .filter((t) => t.toId === youMember.id)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const youOwe = youMember
    ? pendingTransfers
        .filter((t) => t.fromId === youMember.id)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const whatsappNudge = buildWhatsAppNudge({
    transfers: simplifiedTransfers,
    members,
    roomName,
    youMember,
  });

  return (
    <LedgerContext.Provider
      value={{
        members,
        expenses,
        settledTransferIds,
        roomName,
        setRoomName,
        addMember,
        deleteMember,
        addExpense,
        deleteExpense,
        toggleSettleTransfer,
        clearAllData,
        netBalances,
        detailedBalances,
        simplifiedTransfers,
        totalPoolSpent,
        youNetBalance,
        youOwed,
        youOwe,
        whatsappNudge,
        isHydrated,
        tripPlan: activeTrip,
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
        importBatchExpensesAndMembers,
        groups,
        activeGroupId,
        activeGroup,
        switchGroup,
        createGroup,
        updateGroup,
        deleteGroup,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error("useLedger must be used within a LedgerProvider");
  }
  return context;
};
