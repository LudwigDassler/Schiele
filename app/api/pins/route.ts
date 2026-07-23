import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Надежная инициализация клиента БД напрямую в роуте
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    
    if (!userId) return NextResponse.json({ pins: [] });

    const { data, error } = await supabase
        .from("pins")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pins: data || [] });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { data, error } = await supabase
            .from("pins")
            .insert([body])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ pin: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to save pin" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    const { error } = await supabase.from("pins").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
