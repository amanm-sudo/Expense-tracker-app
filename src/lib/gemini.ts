import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn(
    "[gemini] GEMINI_API_KEY is not set. AI features will use the fallback path.",
  );
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Returns a Gemini GenerativeModel instance.
 * @param modelName  Override model (default: GEMINI_MODEL env or "gemini-2.0-flash")
 */
export function getGeminiModel(modelName?: string) {
  if (!genAI) {
    throw new Error("Gemini client unavailable — GEMINI_API_KEY not set.");
  }
  return genAI.getGenerativeModel({
    model: modelName ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  });
}

/**
 * Quick single-turn text generation helper.
 * Returns the raw text response or null on failure.
 */
export async function geminiGenerate(
  prompt: string,
  modelName?: string,
): Promise<string | null> {
  try {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    return result.response.text() ?? null;
  } catch (err) {
    console.error("[gemini] generateContent failed:", err);
    return null;
  }
}
