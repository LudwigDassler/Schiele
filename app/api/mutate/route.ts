import { NextResponse } from "next/server";
import { callGroq, getPersonalVibeContext } from "../../../lib/kashmir";

const MUTATE_SYSTEM_PROMPT = `You are an AI visual mutation engine, a sibling system to Kashmir.
The user gives you a concept derived from an image they are looking at right now.
Your job is to EVOLVE this concept into a highly specific, surreal, and cinematic search query for the NEXT image.

RULES:
1. Keep the core subject, but shift the atmosphere, lighting, era, or artistic medium.
2. Sound like a prompt written by a high-end art director or cinematographer.
3. Maximum 6 words.
4. NEVER use vague abstract words (beautiful, cool, nice). Use physical, concrete descriptions (liminal, neon-lit, brutalist concrete, 35mm grain, dense fog).
5. Output ONLY the mutated query as plain text. No quotes, no JSON, no explanation, no prefixes.`;

export async function POST(req: Request) {
  try {
    const { concept, userId } = await req.json();
    if (!concept || typeof concept !== "string") {
      return NextResponse.json({ error: "No concept provided" }, { status: 400 });
    }

    const memoryContext = userId ? await getPersonalVibeContext(userId) : "";
    const systemPrompt = MUTATE_SYSTEM_PROMPT + memoryContext;

    const mutated = await callGroq(systemPrompt, `Concept to mutate: ${concept}`);

    const mutated_query = mutated || `${concept} reimagined`;

    return NextResponse.json({ mutated_query });
  } catch (error) {
    console.error("[MUTATE] Error:", error);
    return NextResponse.json({ error: "Failed to mutate concept" }, { status: 500 });
  }
}
