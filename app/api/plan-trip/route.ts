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

    // If no API key is available, return real error
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured in the server environment.",
        },
        { status: 500 }
      );
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

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const modelsToTry = [
      "gemini-3.0-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-3-flash-preview",
    ];
    let response: Response | null = null;
    let result: any = null;
    let usedModel = "";

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // For gemini-3.0-flash, allow up to 2 attempts (initial + 1 retry after 1.5s on 503/429)
      const maxAttempts = model === "gemini-3.0-flash" ? 2 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(45000), // 45s timeout
          });

          const data = await res.json();
          const statusCode = res.status;
          const errorCode = data.error?.code || statusCode;
          const isRateLimitOrUnavailable =
            statusCode === 429 ||
            statusCode === 503 ||
            errorCode === 429 ||
            errorCode === 503 ||
            data.error?.status === "RESOURCE_EXHAUSTED" ||
            data.error?.status === "UNAVAILABLE";

          const isNotFound =
            statusCode === 404 ||
            errorCode === 404 ||
            data.error?.status === "NOT_FOUND";

          if (isRateLimitOrUnavailable && attempt < maxAttempts) {
            console.warn(`Model ${model} hit ${statusCode || errorCode}, retrying in 1.5s (attempt ${attempt}/${maxAttempts})...`);
            await delay(1500);
            continue;
          }

          if ((isRateLimitOrUnavailable || isNotFound) && i < modelsToTry.length - 1) {
            console.warn(`Model ${model} failed with ${statusCode || errorCode}, falling back to next model...`);
            break; // Break attempt loop to advance model
          }

          response = res;
          result = data;
          usedModel = model;
          break;
        } catch (err: any) {
          console.warn(`Attempt ${attempt} with ${model} failed:`, err?.message);
          if (attempt < maxAttempts) {
            await delay(1500);
            continue;
          }
          if (i < modelsToTry.length - 1) break;
          throw err;
        }
      }

      if (response && response.ok && result && !result.error) {
        break; // Successfully got response
      }
    }

    if (!response || !result || !response.ok || result.error) {
      const errorMsg =
        result?.error?.message ||
        `Gemini API request failed with status ${response?.status || 500}`;
      console.error("Gemini Plan Trip Error:", errorMsg);
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
          error: "Gemini did not return any plan content.",
        },
        { status: 500 }
      );
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
