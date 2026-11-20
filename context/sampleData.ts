import { Member, Expense } from "@/types/ledger";

export const SAMPLE_MEMBERS: Member[] = [
  {
    id: "m1",
    name: "You (Adarsh)",
    upiId: "you@okhdfcbank",
    avatarBg: "bg-[#FF7A00]",
    initials: "Y",
    isYou: true,
    phone: "9876543210",
  },
  {
    id: "m2",
    name: "Rohan Verma",
    upiId: "rohan.v@oksbi",
    avatarBg: "bg-[#2DD4BF]",
    initials: "R",
    isYou: false,
    phone: "9876543211",
  },
  {
    id: "m3",
    name: "Aditya Rao",
    upiId: "aditya.rao@okaxis",
    avatarBg: "bg-[#C084FC]",
    initials: "A",
    isYou: false,
    phone: "9876543212",
  },
  {
    id: "m4",
    name: "Tanya Sharma",
    upiId: "tanya.sharma@paytm",
    avatarBg: "bg-[#FBBF24]",
    initials: "T",
    isYou: false,
    phone: "9876543213",
  },
];

export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    title: "Zomato Midnight Biryani",
    totalAmount: 1840,
    paidById: "m1", // You paid
    date: "Yesterday, 11:30 PM",
    category: "Food",
    splitMode: "item-wise",
    splitDetails: {
      m1: 0,
      m2: 920, // Rohan owes 920
      m3: 920, // Aditya owes 920
      m4: 0,
    },
    items: [
      {
        id: "item-1",
        name: "Chicken Biryani Bucket (Large)",
        amount: 840,
        splitWith: ["m2", "m3"],
        tag: "FOOD • 1X",
      },
      {
        id: "item-2",
        name: "Mutton Dum Handi Biryani",
        amount: 840,
        splitWith: ["m2", "m3"],
        tag: "FOOD • 1X",
      },
      {
        id: "item-3",
        name: "Extra Raita & Salan Dips",
        amount: 80,
        splitWith: ["m2", "m3"],
        tag: "SIDES • 2X",
      },
      {
        id: "item-4",
        name: "Thums Up 2.25L",
        amount: 80,
        splitWith: ["m2", "m3"],
        tag: "BEVERAGE • 1X",
      },
    ],
    tax: 40,
    deliveryFee: 40,
    note: "Late night study session treat",
    verified: true,
  },
  {
    id: "exp-2",
    title: "Hostel AC & Power Meter",
    totalAmount: 1680,
    paidById: "m4", // Tanya paid
    date: "Oct 22, 06:15 PM",
    category: "Hostel",
    splitMode: "equal",
    splitDetails: {
      m1: 420, // You owe 420
      m2: 420,
      m3: 420,
      m4: 420,
    },
    tax: 0,
    deliveryFee: 0,
    note: "Electricity bill room meter #402",
    verified: true,
  },
  {
    id: "exp-3",
    title: "Blinkit Room Supplies (Water, Maggi)",
    totalAmount: 640,
    paidById: "m2", // Rohan paid
    date: "Oct 20, 04:30 PM",
    category: "Groceries",
    splitMode: "shares",
    shares: {
      m2: 2,
      m3: 1,
      m4: 1,
    },
    splitDetails: {
      m1: 0, // Not involved
      m2: 320,
      m3: 160,
      m4: 160,
    },
    note: "20L water cans + 12-pack Maggi noodles",
    verified: true,
  },
  {
    id: "exp-4",
    title: "Airtel Xstream 200Mbps",
    totalAmount: 1200,
    paidById: "m1", // You paid
    date: "Oct 18, 02:00 PM",
    category: "Utilities",
    splitMode: "equal",
    splitDetails: {
      m1: 300,
      m2: 300,
      m3: 300,
      m4: 300,
    },
    note: "Monthly fiber broadband renewal",
    verified: true,
  },
  {
    id: "exp-5",
    title: "Dhaba Dinner + Chai Session",
    totalAmount: 780,
    paidById: "m3", // Aditya paid
    date: "Oct 16, 09:45 PM",
    category: "Party",
    splitMode: "unequal",
    splitDetails: {
      m1: 195,
      m2: 195,
      m3: 195,
      m4: 195,
    },
    note: "Highway dhaba celebration",
    verified: true,
  },
];
