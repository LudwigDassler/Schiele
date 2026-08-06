import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function POST() {
  try {
    const manifestoEntries = [
      {
        category: "manifesto",
        content: "I reject generic, mass-market aesthetics. Art must feel cinematic, tactile, raw, and atmospheric. No cheap stock photos, no bright commercial pop."
      },
      {
        category: "manifesto",
        content: "Music is physical geometry. Slow doom and ambient require heavy grain and liminal space; post-punk demands harsh flash and cold neon; 70s rock demands warm lens flare and 35mm grain."
      },
      {
        category: "manifesto",
        content: "Kashmir is not a search engine; it is a digital companion. It seeks deep mood, hidden connections, and melancholic beauty in every artifact."
      }
    ];

    const { data, error } = await supabase
      .from("kashmir_memory")
      .upsert(manifestoEntries, { onConflict: "content" });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Kashmir Memory Initialized" });
  } catch (error: any) {
    console.error("Failed to init memory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}