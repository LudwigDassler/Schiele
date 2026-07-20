import { NextRequest, NextResponse } from "next/server";
import { searchPhotos, PER_PROVIDER } from "@/lib/photos";
import { enhanceSearchQuery, anthropicEnabled } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "All";
  const rawQuery = (searchParams.get("query") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const useAI = searchParams.get("ai") === "1";

  let query = rawQuery;
  let enhancedQuery: string | null = null;

  // Optional AI query understanding: only on the first page to avoid drift while paginating.
  if (useAI && rawQuery && anthropicEnabled && page === 1) {
    const enhanced = await enhanceSearchQuery(rawQuery);
    if (enhanced && enhanced.toLowerCase() !== rawQuery.toLowerCase()) {
      query = enhanced;
      enhancedQuery = enhanced;
    }
  }

  try {
    const photos = await searchPhotos({ query, category, page });
    return NextResponse.json({
      photos,
      page,
      hasMore: photos.length >= PER_PROVIDER,
      enhancedQuery,
    });
  } catch (error) {
    console.error("photos route error:", error);
    return NextResponse.json({ photos: [], page, hasMore: false, error: "Failed to load photos" }, { status: 500 });
  }
}
