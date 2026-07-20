import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropicEnabled = Boolean(apiKey);

// Model is configurable so it can be tuned without code changes.
export const CHAT_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export const SCHIELE_SYSTEM_PROMPT = `You are the Schiele Muse — the in-app assistant for Schiele, a dark, art-focused visual discovery board (photography, art, musicians, fashion, cinema, history).
Be concise, warm and knowledgeable about art and culture. Help the user discover images.
When the user wants to see images or asks about a visual subject, call the "search_images" tool with a short, high-signal English query (e.g. "egon schiele portraits", "brutalist architecture"). Do not invent image URLs. Keep replies to a few sentences.`;

/**
 * Turn a raw user query into concise, high-signal English image-search keywords.
 * Falls back to the original query if the model is unavailable or errors.
 */
export async function enhanceSearchQuery(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!anthropic || trimmed.length < 2) return trimmed;

  try {
    const res = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 40,
      system:
        "You expand a user's image-search text into concise English keywords optimized for stock/photo APIs. " +
        "Reply with ONLY the keywords (max 6 words), no punctuation, no quotes, no explanation.",
      messages: [{ role: "user", content: trimmed }],
    });

    const text = res.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    return text || trimmed;
  } catch {
    return trimmed;
  }
}
