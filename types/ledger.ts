export interface Member {
  id: string;
  name: string;
  upiId: string;
  avatarBg: string;
  initials: string;
  isYou?: boolean;
  phone?: string;
}

export type SplitMode = 'equal' | 'unequal' | 'shares' | 'item-wise';

export interface BillItem {
  id: string;
  name: string;
  amount: number;
  category?: string;
  splitWith: string[]; // member IDs
  tag?: string;
}

export interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  paidById: string;
  date: string;
  category: 'Food' | 'Hostel' | 'Groceries' | 'Utilities' | 'Party' | 'Other';
  splitMode: SplitMode;
  splitDetails: Record<string, number>; // memberId -> amount owed
  shares?: Record<string, number>; // memberId -> shares count (for shares mode)
  items?: BillItem[];
  tax?: number;
  deliveryFee?: number;
  note?: string;
  receiptImage?: string;
  verified?: boolean;
}

export interface SimplifiedTransfer {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  status: 'pending' | 'settled';
  title?: string;
  reason?: string;
}

export interface NetBalance {
  memberId: string;
  member: Member;
  paid: number;
  owed: number;
  net: number; // positive = owed money, negative = owes money
}

export type CostType = 'fixed' | 'variable';

export interface TripPlanItem {
  id: string;
  title: string;
  category: string;
  estimatedAmount: number;
  costType: CostType;
  actualExpenseId?: string;
  notes?: string;
}

export type TripStatus = 'planned' | 'over';

export interface TripPlan {
  id: string;
  destination: string;
  days: number;
  vibe: 'Budget Hostel' | 'Standard' | 'Comfort';
  items: TripPlanItem[];
  flakedMemberIds: string[];
  status?: TripStatus; // 'planned' | 'over'
  paidMemberIds?: string[]; // IDs of members who have paid their share
}

export interface Group {
  id: string;
  name: string;
  icon?: string;
  members: Member[];
  expenses: Expense[];
  settledTransferIds: string[];
  trips?: TripPlan[];
  createdAt?: string;
}

