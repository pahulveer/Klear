import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json();
    const destination = body.destination?.trim() || "Kasol & Parvati Valley";
    const days = Math.max(1, Math.min(14, Number(body.days) || 3));
    const vibe = body.vibe || "Budget Hostel";
    const memberCount = Math.max(1, Number(body.memberCount) || 4);

    // If no API key is available, return an intelligent fallback plan immediately
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing, generating offline fallback trip plan");
      return NextResponse.json({
        success: true,
        modelUsed: "offline-template",
        destination,
        days,
        vibe,
        items: getFallbackItems(destination, days, vibe, memberCount),
      });
    }

    const prompt = `You are a travel budget planner for Indian college roommates on a hostel trip.
Generate a realistic, itemized pre-trip expense plan for:
- Destination: "${destination}"
- Duration: ${days} days
- Group Size: ${memberCount} roommates
- Vibe: "${vibe}" (Budget Hostel: dorms & cheap local eats; Standard: private rooms & rental cars; Comfort: boutique stays & fine cafes)

Rules:
1. Provide 5 to 7 realistic items covering Stay, Transport, Meals, Activities, and Emergency / Late-Night Snacks.
2. Mark costType strictly as "fixed" or "variable":
   - "fixed": costs that do NOT decrease if 1 person flakes (e.g. rented cab/tempo traveller, whole room/dorm booking, guide fee, tolls/permits).
   - "variable": costs that scale down per person if someone flakes (e.g. cafe meals, cafe chai/coffee, trek entry permits, individual gear rental).
3. Ensure estimatedAmount is a realistic number in Indian Rupees (INR) for the ENTIRE group combined.

Respond ONLY with valid JSON using this exact schema:
{
  "destination": "${destination}",
  "days": ${days},
  "items": [
    {
      "id": "item-1",
      "title": "Clear concise title",
      "category": "Hostel / Stay",
      "estimatedAmount": 4500,
      "costType": "fixed"
    }
  ]
}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const modelsToTry = ["gemini-3.0-flash", "gemini-3-flash-preview"];
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
          console.warn(`Model ${model} returned 404, falling back...`);
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
      console.warn("Gemini call failed, falling back to smart template:", result?.error);
      return NextResponse.json({
        success: true,
        modelUsed: "offline-fallback",
        destination,
        days,
        vibe,
        items: getFallbackItems(destination, days, vibe, memberCount),
      });
    }

    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return NextResponse.json({
        success: true,
        modelUsed: "offline-fallback",
        destination,
        days,
        vibe,
        items: getFallbackItems(destination, days, vibe, memberCount),
      });
    }

    const cleanedText = candidateText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedText);
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const items = rawItems.map((it: any, idx: number) => ({
      id: `plan-${Date.now()}-${idx}`,
      title: String(it.title || `Planned Item ${idx + 1}`),
      category: String(it.category || "Trip"),
      estimatedAmount: Math.round(Number(it.estimatedAmount) || 1000),
      costType: it.costType === "variable" ? "variable" : "fixed",
    }));

    return NextResponse.json({
      success: true,
      modelUsed: usedModel,
      destination: parsed.destination || destination,
      days: parsed.days || days,
      vibe,
      items,
    });
  } catch (error: any) {
    console.error("Fatal /api/plan-trip error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate trip plan." },
      { status: 500 }
    );
  }
}

function getFallbackItems(
  destination: string,
  days: number,
  vibe: string,
  members: number
) {
  const stayCostPerNight = vibe === "Comfort" ? 2400 : vibe === "Standard" ? 1600 : 900;
  const foodPerPersonDay = vibe === "Comfort" ? 800 : vibe === "Standard" ? 500 : 350;

  return [
    {
      id: `fb-1`,
      title: `${destination} Hostel Stays (${days} Nights)`,
      category: "Hostel / Stay",
      estimatedAmount: stayCostPerNight * days * Math.max(1, Math.ceil(members / 2)),
      costType: "fixed" as const,
    },
    {
      id: `fb-2`,
      title: "Shared Cab / Outstation Vehicle & Fuel",
      category: "Transport",
      estimatedAmount: 2500 * days,
      costType: "fixed" as const,
    },
    {
      id: `fb-3`,
      title: `Cafe Meals, Chai & Maggi (${members} Roommates)`,
      category: "Food & Drink",
      estimatedAmount: foodPerPersonDay * days * members,
      costType: "variable" as const,
    },
    {
      id: `fb-4`,
      title: "Local Sightseeing, Entry Permits & Guides",
      category: "Activities",
      estimatedAmount: 600 * members,
      costType: "fixed" as const,
    },
    {
      id: `fb-5`,
      title: "Roadtrip Munchies, Campfire & Midnight Snacks",
      category: "Groceries",
      estimatedAmount: 300 * members,
      costType: "variable" as const,
    },
  ];
}
