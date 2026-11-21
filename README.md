# Klear — Hostel Expense Splitter, Debt Minimizer & Trip Planner

> A Playful Neo-Brutalist web app designed for college hostel roommates, flats, and squads to eliminate money awkwardness, scan shared bills with Gemini 3.0 Flash, optimize debts into minimum cash transfers, and plan group trips with real-time flake simulation.

---

## ⚡ Core Features

### 1. 🧾 Real Gemini Bill Scanner
- **Fast Client-Side Compression**: Compresses uploaded bills/receipts down to 1200px max width via browser canvas for fast uploads even on spotty hostel Wi-Fi.
- **Multimodal Gemini 3.0 Flash API**: Scans messy food delivery, grocery, and dining bills to extract itemized line items, taxes, packaging charges, and total amount with structured JSON enforcement.
- **Auto-Retry Resilience**: Gracefully falls back from `gemini-3.0-flash` to `gemini-3-flash-preview` if a region/version endpoint shifts.

### 2. ⚖️ Debt Minimization Engine & Instant UPI Settlement
- **Bipartite Net Cashflow Minimization**: Transforms messy $N \times N$ multi-person splits into the absolute minimum number of settlement transfers ($N-1$ or fewer).
- **Direct UPI Deep Links**: Generates native UPI payment links (`upi://pay?pa=...&am=...&tn=Klear`) that directly trigger Google Pay, PhonePe, Paytm, or BHIM.
- **Dynamic QR Code Modal**: Scan-to-pay QR codes rendered live in Playful Neo-Brutalist design cards.
- **1-Click WhatsApp Settle Nudge**: Pre-formats humorous hostel debt reminders for WhatsApp groups.

### 3. 📊 Individual Member Profiles & Deep History Explorer
- **Interactive Roommate Cards**: View individual spend shares, total paid, and net position.
- **Drill-Down Modal**: Click any roommate to see an advanced breakdown of all expenses they participated in, payments made, and bilateral settlement transfers.

### 4. 🏕️ AI Trip Planner & Last-Minute Flake Simulator
- **Pre-Trip Budget Generator**: Generates itemized hostel budgets for Kasol, Goa, Manali, etc., broken down into fixed (cabs, stay) and variable (meals, cafes) costs.
- **Embedded Flake Simulator**: Tap any roommate chip to simulate them dropping out. Fixed costs dynamically re-divide among committed members while variable costs scale down.
- **Smart Payer Engine**: Intelligently recommends which roommate should pay the next upcoming trip item to maintain group debt equilibrium.

### 5. 💬 Import from WhatsApp Chat (X-Factor)
- **Natural Language & Hinglish Parsing**: Paste messy group chats or exported `.txt` files in English, Hinglish, or Punjabi (e.g. *"Zomato Behrouz Biryani total Rs 1260 hua. Tanya ne nahi khaya baaki 3 split karlo"*).
- **Intelligent Payer & Exclusion Mapping**: Automatically detects who paid, handles exclusions (*"Tanya ne nahi khaya"*), and accurately calculates exact shares across group members.
- **1-Click Ledger Import**: Interactive preview cards allow reviewing source message quotes and adding selected expenses to the active ledger with one tap.

### 6. 🛏️ Zero-Friction Group State
- **Empty by Default**: Start fresh with an empty group or customize your group name on the fly.
- **One-Click Demo Data**: Instantly load realistic sample hostel squad data for testing and demonstrations.
- **Complete Reset**: Wipes local state clean with a single click.

---

## 🤖 AI Tools Used Declaration

In compliance with hackathon and transparent development guidelines, the following AI tools and models were used in building **Klear**:

1. **Google Stitch**: Used for the initial UI layout generation and design token inspiration, establishing the bold Playful Neo-Brutalist aesthetic (2px black borders, hard drop shadows, punchy pastel accents).
2. **Google Antigravity**: Used as the AI coding and agentic scaffolding harness for full-stack architecture, React/Next.js component implementation, state management, and debugging.
3. **Google Gemini API (`gemini-3.0-flash` / `gemini-3-flash-preview`)**:
   - Powers the multimodal Bill Scanner in `/api/parse-bill` for itemized invoice extraction.
   - Powers the Pre-Trip Travel Budget Generator in `/api/plan-trip` for destination budgeting and cost type categorization.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS (Custom Playful Neo-Brutalist design system)
- **Icons**: Lucide React
- **QR Codes**: `qrcode.react`
- **Celebration Effects**: `canvas-confetti`
- **AI SDK**: Google Generative AI REST API (`gemini-3.0-flash`)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
npm run build
npm run start
```

---

