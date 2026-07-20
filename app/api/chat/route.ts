import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, anthropicEnabled, CHAT_MODEL, SCHIELE_SYSTEM_PROMPT } from "@/lib/anthropic";
import { searchPhotos } from "@/lib/photos";
import type { ChatMessage, Photo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const searchTool: Anthropic.Tool = {
  name: "search_images",
  description: "Search Schiele's image sources for a subject and display the results to the user in the app.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Short, high-signal English image search query." },
    },
    required: ["query"],
  },
};

export async function POST(req: NextRequest) {
  if (!anthropic || !anthropicEnabled) {
    return NextResponse.json(
      { error: "AI assistant is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const history: ChatMessage[] = Array.isArray((body as { messages?: unknown })?.messages)
    ? ((body as { messages: ChatMessage[] }).messages)
    : [];

  const messages: Anthropic.MessageParam[] = history
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const requestOptions = {
    model: CHAT_MODEL,
    max_tokens: 512,
    system: SCHIELE_SYSTEM_PROMPT,
    tools: [searchTool],
  };

  try {
    let response = await anthropic.messages.create({ ...requestOptions, messages });

    let photos: Photo[] = [];
    let searchQuery: string | null = null;

    // Handle one round of tool use (search_images).
    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUse && toolUse.name === "search_images") {
        const q = String((toolUse.input as { query?: string })?.query || "").trim();
        searchQuery = q;
        photos = await searchPhotos({ query: q, page: 1 });

        const preview = photos.slice(0, 8).map((p) => ({ title: p.title, source: p.source }));

        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: JSON.stringify({ count: photos.length, results: preview }),
            },
          ],
        });

        response = await anthropic.messages.create({ ...requestOptions, messages });
      }
    }

    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({
      reply: reply || "I couldn't find the words for that — try rephrasing?",
      photos,
      query: searchQuery,
    });
  } catch (error) {
    console.error("chat route error:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
