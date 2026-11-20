import { Member, Expense, NetBalance, SimplifiedTransfer } from "@/types/ledger";

/**
 * Calculates exact net balances for each roommate across all expenses.
 * Net balance = Total paid - Total share allocated.
 * Positive (> 0): Creditor (roommate should receive money)
 * Negative (< 0): Debtor (roommate owes money)
 */
export function calculateNetBalances(
  members: Member[],
  expenses: Expense[],
  settledTransferIds: string[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all members with 0
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  // Accumulate from expenses
  expenses.forEach((expense) => {
    // Payer paid totalAmount -> credit
    if (balances[expense.paidById] !== undefined) {
      balances[expense.paidById] += expense.totalAmount;
    }

    // Each participant owes their split portion -> debit
    Object.entries(expense.splitDetails).forEach(([memberId, share]) => {
      if (balances[memberId] !== undefined) {
        balances[memberId] -= share;
      }
    });
  });

  // Round to 2 decimal places cleanly
  Object.keys(balances).forEach((id) => {
    balances[id] = Math.round((balances[id] + Number.EPSILON) * 100) / 100;
  });

  return balances;
}

/**
 * Detailed net balance list with payer/owed breakdowns
 */
export function getDetailedBalances(
  members: Member[],
  expenses: Expense[]
): NetBalance[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const paidMap: Record<string, number> = {};
  const owedMap: Record<string, number> = {};

  members.forEach((m) => {
    paidMap[m.id] = 0;
    owedMap[m.id] = 0;
  });

  expenses.forEach((exp) => {
    if (paidMap[exp.paidById] !== undefined) {
      paidMap[exp.paidById] += exp.totalAmount;
    }
    Object.entries(exp.splitDetails).forEach(([mid, amt]) => {
      if (owedMap[mid] !== undefined) {
        owedMap[mid] += amt;
      }
    });
  });

  return members.map((m) => {
    const paid = Math.round((paidMap[m.id] || 0) * 100) / 100;
    const owed = Math.round((owedMap[m.id] || 0) * 100) / 100;
    const net = Math.round((paid - owed) * 100) / 100;
    return {
      memberId: m.id,
      member: m,
      paid,
      owed,
      net,
    };
  });
}

/**
 * Greedy minimum-transactions algorithm pairing the largest debtor
 * with the largest creditor until all balances are resolved (0 net debt).
 */
export function simplifySettlements(
  balances: Record<string, number>,
  members: Member[],
  settledIds: string[] = []
): SimplifiedTransfer[] {
  // Create mutable working lists
  interface BalanceNode {
    id: string;
    amount: number;
  }

  const debtors: BalanceNode[] = [];
  const creditors: BalanceNode[] = [];

  Object.entries(balances).forEach(([id, net]) => {
    const rounded = Math.round(net * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: -rounded }); // store positive magnitude of debt
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  });

  const transfers: SimplifiedTransfer[] = [];
  let transferIndex = 1;

  // Continue matching until both lists are empty
  while (debtors.length > 0 && creditors.length > 0) {
    // Sort descending by magnitude to prioritize largest settlements
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(settledAmount * 100) / 100;

    if (roundedAmount > 0.01) {
      const transferId = `transfer-${debtor.id}-${creditor.id}`;
      const isSettled = settledIds.includes(transferId);

      const debtorMember = members.find((m) => m.id === debtor.id);
      const creditorMember = members.find((m) => m.id === creditor.id);

      transfers.push({
        id: transferId,
        fromId: debtor.id,
        toId: creditor.id,
        amount: roundedAmount,
        status: isSettled ? 'settled' : 'pending',
        title: `TRANSFER 0${transferIndex}`,
        reason: `Direct Settlement: ${debtorMember?.name || 'Roommate'} ➔ ${creditorMember?.name || 'Roommate'}`,
      });
      transferIndex++;
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) {
      debtors.shift();
    }
    if (creditor.amount <= 0.01) {
      creditors.shift();
    }
  }

  return transfers;
}

/**
 * Builds a valid UPI deep link
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export function buildUpiLink({
  upiId,
  payeeName,
  amount,
  note = "Klear Room Tab Settlement",
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const cleanUpi = upiId.trim();
  const cleanName = payeeName.trim();
  const formattedAmount = (Math.round(amount * 100) / 100).toFixed(2);
  const encodedNote = encodeURIComponent(note);
  const encodedName = encodeURIComponent(cleanName);

  return `upi://pay?pa=${cleanUpi}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
}

/**
 * Builds WhatsApp Nudge text and link
 */
export function buildWhatsAppNudge({
  transfers,
  members,
  roomName = "Room 402 Squad",
  youMember,
}: {
  transfers: SimplifiedTransfer[];
  members: Member[];
  roomName?: string;
  youMember?: Member;
}): { text: string; url: string } {
  const pendingTransfers = transfers.filter((t) => t.status !== 'settled');

  if (pendingTransfers.length === 0) {
    const text = `🎉 All clear! All dues in ${roomName} are 100% settled up. Great job roommates!`;
    return {
      text,
      url: `https://wa.me/?text=${encodeURIComponent(text)}`,
    };
  }

  const you = youMember || members.find((m) => m.isYou) || members[0];
  const youName = you?.name?.split(' ')[0] || "Roomie";
  const debtors = pendingTransfers.map((t) => {
    const fromMember = members.find((m) => m.id === t.fromId);
    return `${fromMember?.name?.split(' ')[0] || 'Roomie'} (₹${Math.round(t.amount)})`;
  });

  const debtorSummary = debtors.join(" and ");
  const text = `Oye ${roomName}! Settle-up window closing. ${debtorSummary} please clear tabs to ${youName}. Let's keep the ledger clean! ⚡ Check live tabs on Klear.`;

  return {
    text,
    url: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}

/**
 * Smart Payer Recommendation:
 * Identifies which candidate roommate should pay next to minimize group debt disparity.
 * Picks the roommate with the lowest (most negative) net balance,
 * or if tied/all zero, whoever has paid the least so far.
 */
export function getRecommendedPayer(
  members: Member[],
  detailedBalances: NetBalance[],
  candidateMemberIds?: string[]
): { member: Member; reason: string } | null {
  if (members.length === 0) return null;

  const eligible = candidateMemberIds && candidateMemberIds.length > 0
    ? detailedBalances.filter((b) => candidateMemberIds.includes(b.memberId))
    : detailedBalances;

  if (eligible.length === 0) {
    return {
      member: members[0],
      reason: "keeps room ledger active",
    };
  }

  // Sort by net ascending (lowest/most negative first), then paid ascending
  const sorted = [...eligible].sort((a, b) => {
    if (a.net !== b.net) {
      return a.net - b.net;
    }
    return a.paid - b.paid;
  });

  const chosen = sorted[0];
  let reason = "keeps group debt balanced";
  if (chosen.net < 0) {
    reason = `currently owes ₹${Math.abs(Math.round(chosen.net))} to pool`;
  } else if (chosen.paid === 0) {
    reason = "has paid ₹0 in current ledger";
  } else {
    reason = "has lowest net contribution";
  }

  return {
    member: chosen.member,
    reason,
  };
}
