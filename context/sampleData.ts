import { Member, Expense } from "@/types/ledger";

export const SAMPLE_MEMBERS: Member[] = [
  {
    id: "m1",
    name: "You (Adarsh)",
    upiId: "adarsh@okhdfcbank",
    avatarBg: "bg-[#FF7A00]",
    initials: "Y",
    isYou: true,
    phone: "9876543210",
    isDemo: true,
  },
  {
    id: "m2",
    name: "Rohan Verma",
    upiId: "rohan.v@oksbi",
    avatarBg: "bg-[#2DD4BF]",
    initials: "R",
    isYou: false,
    phone: "9876543211",
    isDemo: true,
  },
  {
    id: "m3",
    name: "Aditya Rao",
    upiId: "aditya.rao@okaxis",
    avatarBg: "bg-[#C084FC]",
    initials: "A",
    isYou: false,
    phone: "9876543212",
    isDemo: true,
  },
  {
    id: "m4",
    name: "Tanya Sharma",
    upiId: "tanya.sharma@paytm",
    avatarBg: "bg-[#FBBF24]",
    initials: "T",
    isYou: false,
    phone: "9876543213",
    isDemo: true,
  },
];

export const SAMPLE_EXPENSES: Expense[] = [
  // 1. Food (Item-wise split)
  {
    id: "exp-1",
    title: "Zomato Behrouz Biryani Bucket",
    totalAmount: 1480,
    paidById: "m1", // You paid
    date: "Yesterday, 11:30 PM",
    category: "Food",
    splitMode: "item-wise",
    splitDetails: {
      m1: 370,
      m2: 370,
      m3: 370,
      m4: 370,
    },
    items: [
      {
        id: "item-1",
        name: "Chicken Biryani Bucket (Large)",
        amount: 840,
        splitWith: ["m1", "m2", "m3"],
        tag: "FOOD • 1X",
      },
      {
        id: "item-2",
        name: "Paneer Subz Dum Biryani",
        amount: 460,
        splitWith: ["m4"],
        tag: "VEG • 1X",
      },
      {
        id: "item-3",
        name: "Extra Raita & Gulab Jamun",
        amount: 100,
        splitWith: ["m1", "m2", "m3", "m4"],
        tag: "DESSERT • 2X",
      },
      {
        id: "item-4",
        name: "Thums Up 2.25L",
        amount: 80,
        splitWith: ["m1", "m2", "m3", "m4"],
        tag: "BEVERAGE • 1X",
      },
    ],
    tax: 0,
    deliveryFee: 0,
    note: "Late night study treat before mid-terms",
    verified: true,
    isDemo: true,
  },

  // 2. Utilities (Equal split)
  {
    id: "exp-2",
    title: "Hostel Room 402 AC & Power Meter",
    totalAmount: 1680,
    paidById: "m4", // Tanya paid
    date: "Oct 22, 06:15 PM",
    category: "Utilities",
    splitMode: "equal",
    splitDetails: {
      m1: 420,
      m2: 420,
      m3: 420,
      m4: 420,
    },
    tax: 0,
    deliveryFee: 0,
    note: "Electricity bill room meter #402",
    verified: true,
    isDemo: true,
  },

  // 3. Groceries (Shares split)
  {
    id: "exp-3",
    title: "Blinkit Room Supplies (Water Cans & Maggi)",
    totalAmount: 640,
    paidById: "m2", // Rohan paid
    date: "Oct 20, 04:30 PM",
    category: "Groceries",
    splitMode: "shares",
    shares: {
      m1: 1,
      m2: 2,
      m3: 1,
      m4: 0,
    },
    splitDetails: {
      m1: 160,
      m2: 320,
      m3: 160,
      m4: 0,
    },
    note: "20L Bisleri water cans + 12-pack Maggi noodles",
    verified: true,
    isDemo: true,
  },

  // 4. Utilities (Equal split)
  {
    id: "exp-4",
    title: "Airtel Xstream 200Mbps Wi-Fi",
    totalAmount: 1180,
    paidById: "m1", // You paid
    date: "Oct 18, 02:00 PM",
    category: "Utilities",
    splitMode: "equal",
    splitDetails: {
      m1: 295,
      m2: 295,
      m3: 295,
      m4: 295,
    },
    note: "Monthly high-speed fiber broadband recharge",
    verified: true,
    isDemo: true,
  },

  // 5. Party (Unequal split)
  {
    id: "exp-5",
    title: "Highway Dhaba Celebration & Chai Session",
    totalAmount: 1200,
    paidById: "m3", // Aditya paid
    date: "Oct 16, 09:45 PM",
    category: "Party",
    splitMode: "unequal",
    splitDetails: {
      m1: 300,
      m2: 300,
      m3: 300,
      m4: 300,
    },
    note: "Hostel squad post-exam highway dhaba treat",
    verified: true,
    isDemo: true,
  },

  // 6. Food (Equal split)
  {
    id: "exp-6",
    title: "Domino's Pizza Treat (Double Cheese & Garlic Bread)",
    totalAmount: 960,
    paidById: "m2", // Rohan paid
    date: "Oct 14, 08:20 PM",
    category: "Food",
    splitMode: "equal",
    splitDetails: {
      m1: 240,
      m2: 240,
      m3: 240,
      m4: 240,
    },
    note: "Cricket match final watch party",
    verified: true,
    isDemo: true,
  },

  // 7. Groceries (Equal split)
  {
    id: "exp-7",
    title: "Instamart Room Snacks & Cold Coffee",
    totalAmount: 520,
    paidById: "m4", // Tanya paid
    date: "Oct 12, 05:10 PM",
    category: "Groceries",
    splitMode: "equal",
    splitDetails: {
      m1: 130,
      m2: 130,
      m3: 130,
      m4: 130,
    },
    note: "Evening study munchies and cold brews",
    verified: true,
    isDemo: true,
  },

  // 8. Party (Unequal split)
  {
    id: "exp-8",
    title: "Hostel Terrace Farewell & Munchies",
    totalAmount: 1400,
    paidById: "m3", // Aditya paid
    date: "Oct 10, 10:30 PM",
    category: "Party",
    splitMode: "unequal",
    splitDetails: {
      m1: 350,
      m2: 350,
      m3: 350,
      m4: 350,
    },
    note: "Weekend terrace music & barbecue session",
    verified: true,
    isDemo: true,
  },
];
