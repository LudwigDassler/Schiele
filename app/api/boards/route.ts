import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, ensureProfile } from "@/lib/supabaseAdmin";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  let query = supabaseAdmin.from("boards").select("*").order("created_at", { ascending: false });
  if (user_id) query = query.eq("user_id", user_id);
  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ boards: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, name, description } = body;
  if (!user_id || !name) return errorResponse("user_id and name required", 400);
  await ensureProfile(user_id);
  const { data, error } = await supabaseAdmin.from("boards").insert({ user_id, name, description: description || null }).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ board: data });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, description } = body;
  if (!id || !name) return errorResponse("id and name required", 400);
  const { data, error } = await supabaseAdmin.from("boards").update({ name, description: description || null }).eq("id", id).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ board: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("id required", 400);
  const { error } = await supabaseAdmin.from("boards").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ success: true });
}
