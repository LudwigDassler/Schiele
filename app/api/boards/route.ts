import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  let query = supabase.from("boards").select("*").order("created_at", { ascending: false });
  if (user_id) query = query.eq("user_id", user_id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ boards: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, name, description } = body;
  if (!user_id || !name) return NextResponse.json({ error: "user_id and name required" }, { status: 400 });
  await supabase.from("profiles").upsert({ id: user_id }, { onConflict: "id" });
  const { data, error } = await supabase.from("boards").insert({ user_id, name, description: description || null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ board: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}