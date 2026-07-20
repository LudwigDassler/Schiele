import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, ensureProfile } from "@/lib/supabaseAdmin";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const board_id = searchParams.get("board_id");
  let query = supabaseAdmin.from("pins").select("*").order("created_at", { ascending: false });
  if (user_id) query = query.eq("user_id", user_id);
  if (board_id) query = query.eq("board_id", board_id);
  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ pins: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, image_url, title, board_id, source_url, source, author } = body;
  if (!user_id || !image_url) return errorResponse("user_id and image_url required", 400);
  await ensureProfile(user_id);
  const { data, error } = await supabaseAdmin.from("pins").insert({ user_id, image_url, title, board_id: board_id || null, source_url, source, author }).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ pin: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("id required", 400);
  const { error } = await supabaseAdmin.from("pins").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ success: true });
}
