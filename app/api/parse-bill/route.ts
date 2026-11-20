import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("bill") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No bill image file provided in request." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const base64Data = buffer.toString("base64");

    const prompt = `Parse this receipt/bill image strictly. Extract the store/restaurant title, itemized line items with numeric amounts, tax/GST, delivery fee, and total amount.
Respond ONLY in JSON with schema:
{
  "title": "Store or restaurant name",
  "items": [{"name": "Item name", "amount": 100}],
  "tax": 0,
  "deliveryFee": 0,
  "totalAmount": 100
}
All amounts must be numeric (INR).`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
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

          // If 503 or 429 on gemini-3.0-flash and first attempt, wait 1.5s and retry once
          if (isRateLimitOrUnavailable && attempt < maxAttempts) {
            console.warn(
              `Model ${model} returned ${statusCode} (${data.error?.status || "busy"}), retrying in 1.5s (attempt ${attempt}/${maxAttempts})...`
            );
            await delay(1500);
            continue;
          }

          // If 404 (not found) or persistent 503/429, fall back to next model in sequence
          if (isNotFound || isRateLimitOrUnavailable) {
            console.warn(
              `Model ${model} returned ${statusCode} (${data.error?.status || "error"}), falling back to next available model...`
            );
            if (i < modelsToTry.length - 1) {
              break; // Break inner loop to try next model
            }
          }

          response = res;
          result = data;
          usedModel = model;

          // If response is successful, break both loops
          if (res.ok && !data.error) {
            break;
          }
        } catch (fetchErr: any) {
          console.warn(`Attempt ${attempt} with ${model} failed:`, fetchErr?.message);
          if (attempt < maxAttempts) {
            await delay(1500);
            continue;
          }
          if (i < modelsToTry.length - 1) {
            break; // Break inner loop to try next model
          }
          throw fetchErr;
        }
      }

      // If we got a successful response from this model, stop trying further fallbacks
      if (response && response.ok && !result?.error) {
        break;
      }
    }

    if (!response || !result) {
      return NextResponse.json(
        { error: "Failed to receive response from Gemini API models." },
        { status: 500 }
      );
    }

    if (!response.ok || result.error) {
      const errorMessage =
        result.error?.message ||
        `Gemini API failed with status ${response.status}: ${response.statusText}`;
      console.error("Gemini API Error from Google:", result.error || result);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const candidateText =
      result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.error("Gemini returned empty candidate text:", result);
      return NextResponse.json(
        { error: "Gemini did not return any readable content for this image." },
        { status: 500 }
      );
    }

    const cleanedText = candidateText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      console.error("JSON parsing error on Gemini response:", cleanedText);
      return NextResponse.json(
        { error: `Failed to parse Gemini response as JSON: ${parseErr.message}` },
        { status: 500 }
      );
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.map((it: any) => ({
          name: String(it.name || "Item"),
          amount: Number(it.amount) || 0,
        }))
      : [];

    const tax = Number(parsed.tax) || 0;
    const deliveryFee = Number(parsed.deliveryFee) || 0;
    const computedSum =
      items.reduce((s: number, i: any) => s + i.amount, 0) + tax + deliveryFee;
    const totalAmount = Number(parsed.totalAmount) || computedSum;

    return NextResponse.json({
      success: true,
      modelUsed: usedModel,
      data: {
        title: parsed.title || "Scanned Receipt",
        items,
        tax,
        deliveryFee,
        totalAmount,
      },
    });
  } catch (error: any) {
    console.error("Fatal /api/parse-bill error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error occurred while scanning bill." },
      { status: 500 }
    );
  }
}
