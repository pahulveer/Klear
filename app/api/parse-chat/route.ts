import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface MemberInput {
  id: string;
  name: string;
}

interface ParsedExpense {
  title: string;
  category: "Food" | "Hostel" | "Groceries" | "Utilities" | "Party" | "Other";
  paidById: string;
  totalAmount: number;
  splitType: "equal" | "unequal" | "shares";
  splitDetails: Record<string, number>;
  confidence: "high" | "medium" | "low";
  sourceLine: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured in the server environment.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const chatText: string = body.chatText || "";
    const members: MemberInput[] = body.members || [];

    if (!chatText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide chat text to extract expenses from.",
        },
        { status: 400 }
      );
    }

    const hasExistingMembers = Array.isArray(members) && members.length > 0;

    let membersContext = "";
    if (hasExistingMembers) {
      const membersListStr = members
        .map((m) => `- ID: "${m.id}", Name: "${m.name}"`)
        .join("\n");
      membersContext = `Registered Roommates in this group:\n${membersListStr}\n\nMatch "paidById" and "splitDetails" keys to these exact registered IDs.`;
    } else {
      membersContext = `No registered roommates exist yet in this group.
You MUST FIRST identify and extract all unique roommate names mentioned as message senders (e.g. from "[21/11/24, 11:15 PM] Veer:") or explicitly mentioned participants/eaters (e.g. "Tanya", "Rohan", "Jiggi").
Assign each a unique ID like "m-1", "m-2", "m-3", etc. and return them in the "discoveredMembers" array:
[{ "id": "m-1", "name": "Veer" }, ...].
Then use these EXACT generated IDs ("m-1", "m-2", etc.) for "paidById" and all keys in "splitDetails".`;
    }

    const prompt = `You are an expert Indian hostel expense splitter AI.
Your job is to read messy English, Hinglish (Hindi written in Roman script), or romanised Punjabi WhatsApp group messages and extract shared expenses.
The text could be pasted raw lines or standard WhatsApp exported format like "[21/11/24, 11:15 PM] Name: message".

${membersContext}

Rules for Parsing:
1. Identify all messages discussing spent money (e.g. food orders like Zomato/Swiggy, groceries/Blinkit/Instamart, auto/cab/uber/rapido, electricity/wifi/room rent, water jars, party/drinks).
2. For each real expense mentioned:
   - "title": Clear concise title (e.g. "Zomato Biryani", "Room Electricity Bill", "Shared Auto from Metro").
   - "category": One of "Food", "Hostel", "Groceries", "Utilities", "Party", "Other".
   - "totalAmount": Exact amount paid in INR (positive number).
   - "paidById": Match the payer to the exact member ID (either from Registered Roommates or discoveredMembers). Look at message senders ("[date, time] Veer: ..."), or statements like "Rohan ne pay kiya tha" or "I paid" by sender. If unable to determine, pick the sender's member ID.
   - "sourceLine": The original chat line or quote that describes this expense.
   - "confidence": "high" if payer, amount, and intent are clear; "medium" if reasonable deduction; "low" if ambiguous.
   - "splitType": "equal" if split evenly among everyone or remaining active members, or "unequal" if specific shares/exclusions apply.
   - "splitDetails": An object mapping EVERY member's ID to their exact owed share in INR (rounded to 2 decimal places).
     *CRITICAL EXCLUSIONS & SUBSETS*:
     - If the message says "Tanya ne nahi khaya", "except Tanya", "Tanya excluded", "main nahi khaya" (sender excluded), "only Veer and Jiggi ate", or someone didn't participate, their share MUST BE 0.
     - Divide totalAmount equally among ONLY the eligible participating roommates.
     - The sum of all values in splitDetails MUST equal totalAmount exactly. Adjust the last cent/rupee rounding so sum === totalAmount.
3. Ignore regular chit-chat, memes, jokes, and non-expense messages.
4. If no financial transactions are found, return {"expenses": [], "discoveredMembers": []}.

Respond ONLY with valid JSON using this exact schema:
{
  "discoveredMembers": [
    { "id": "m-1", "name": "Veer" }
  ],
  "expenses": [
    {
      "title": "Zomato Biryani",
      "category": "Food",
      "paidById": "m-1",
      "totalAmount": 1260,
      "splitType": "equal",
      "splitDetails": {
        "m-1": 420
      },
      "confidence": "high",
      "sourceLine": "Bhai Zomato se Behrouz Biryani order kiya tha..."
    }
  ]
}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }, { text: `WhatsApp Chat:\n"""\n${chatText}\n"""` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const modelsToTry = [
      "gemini-3.0-flash",
      "gemini-3-flash-preview",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ];
    let response: Response | null = null;
    let result: any = null;
    let usedModel = "";

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(45000), // 45s timeout
        });

        const data = await res.json();

        if (
          res.status === 404 ||
          data.error?.code === 404 ||
          data.error?.status === "NOT_FOUND"
        ) {
          console.warn(`Model ${model} returned 404, retrying with next model...`);
          if (i < modelsToTry.length - 1) continue;
        }

        response = res;
        result = data;
        usedModel = model;
        break;
      } catch (err: any) {
        console.warn(`Attempt with ${model} failed:`, err?.message);
        if (i < modelsToTry.length - 1) continue;
        throw err;
      }
    }

    if (!response || !result || !response.ok || result.error) {
      const errorMsg =
        result?.error?.message ||
        `Gemini API request failed with status ${response?.status || 500}`;
      console.error("Gemini Parse Chat Error:", errorMsg);
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
        },
        { status: 500 }
      );
    }

    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini did not return any parse content.",
        },
        { status: 500 }
      );
    }

    let parsedData: {
      expenses: ParsedExpense[];
      discoveredMembers?: Array<{ id: string; name: string }>;
    };
    try {
      parsedData = JSON.parse(candidateText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON:", candidateText);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse structured JSON from AI response.",
        },
        { status: 500 }
      );
    }

    const rawDiscovered: MemberInput[] = Array.isArray(parsedData.discoveredMembers)
      ? parsedData.discoveredMembers.map((dm: any, i: number) => ({
          id: String(dm.id || `m-${i + 1}`),
          name: String(dm.name || `Roommate ${i + 1}`).trim(),
        }))
      : [];

    const effectiveMembers: MemberInput[] = hasExistingMembers
      ? members
      : rawDiscovered.length > 0
      ? rawDiscovered
      : [{ id: "m-1", name: "Roommate 1" }];

    const rawExpenses = Array.isArray(parsedData.expenses)
      ? parsedData.expenses
      : [];

    // Sanitize and ensure splitDetails sum to totalAmount exactly
    const sanitizedExpenses = rawExpenses.map((exp, idx) => {
      const totalAmount = Math.max(0, Number(exp.totalAmount) || 0);

      // Validate payer exists in effectiveMembers list; fallback to first member
      const payerId = effectiveMembers.some((m) => m.id === exp.paidById)
        ? exp.paidById
        : effectiveMembers[0].id;

      // Ensure every member has an entry in splitDetails
      const splitDetails: Record<string, number> = {};
      let sumSplits = 0;
      let nonZeroCount = 0;
      let lastActiveMemberId = effectiveMembers[0].id;

      effectiveMembers.forEach((m) => {
        const val = Number(exp.splitDetails?.[m.id]) || 0;
        const roundedVal = Math.round(val * 100) / 100;
        splitDetails[m.id] = roundedVal;
        sumSplits += roundedVal;
        if (roundedVal > 0) {
          nonZeroCount++;
          lastActiveMemberId = m.id;
        }
      });

      // If all splitDetails are 0 or empty, split equally across all members
      if (nonZeroCount === 0 && effectiveMembers.length > 0 && totalAmount > 0) {
        const perPerson = Math.round((totalAmount / effectiveMembers.length) * 100) / 100;
        let runningSum = 0;
        effectiveMembers.forEach((m, mIdx) => {
          if (mIdx === effectiveMembers.length - 1) {
            splitDetails[m.id] = Math.round((totalAmount - runningSum) * 100) / 100;
          } else {
            splitDetails[m.id] = perPerson;
            runningSum += perPerson;
          }
        });
      } else if (nonZeroCount > 0 && Math.abs(sumSplits - totalAmount) > 0.01) {
        // Fix penny rounding discrepancy onto the last active member
        const diff = Math.round((totalAmount - sumSplits) * 100) / 100;
        splitDetails[lastActiveMemberId] = Math.round((splitDetails[lastActiveMemberId] + diff) * 100) / 100;
      }

      return {
        id: `chat-exp-${Date.now()}-${idx}`,
        title: exp.title?.trim() || `WhatsApp Expense #${idx + 1}`,
        category: (["Food", "Hostel", "Groceries", "Utilities", "Party", "Other"].includes(
          exp.category
        )
          ? exp.category
          : "Other") as ParsedExpense["category"],
        paidById: payerId,
        totalAmount,
        splitType: exp.splitType || "equal",
        splitDetails,
        confidence: (["high", "medium", "low"].includes(exp.confidence)
          ? exp.confidence
          : "medium") as ParsedExpense["confidence"],
        sourceLine: exp.sourceLine?.trim() || "Pasted WhatsApp message",
      };
    });

    return NextResponse.json({
      success: true,
      modelUsed: usedModel,
      discoveredMembers: hasExistingMembers ? [] : rawDiscovered,
      expenses: sanitizedExpenses,
    });
  } catch (err: any) {
    console.error("WhatsApp Parse API Unexpected Failure:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error while processing chat.",
      },
      { status: 500 }
    );
  }
}
