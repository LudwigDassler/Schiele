import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

async function callGroq(messages: any[], model: string = "llama3-8b-8192") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens: 80
        })
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.statusText}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, userId } = body;

    if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });

    // Обычный анализ текста (Llama 3 8B)
    if (action === "enhance_prompt") {
      const prompt = `You are a strict aesthetic curator. The user provided this text: "${payload}". Extract the core visual aesthetic, era, or mood. Return ONLY 3 to 5 English keywords separated by spaces. Ignore character names, focus strictly on visual style. No punctuation.`;
      let text = await callGroq([{ role: "user", content: prompt }]);
      text = text.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      return NextResponse.json({ result: text });
    }

    // Анализ картинки (Llama 3.2 11B Vision)
    if (action === "analyze_image") {
      try {
        const { data: cachedRows } = await supabase.from("ai_image_cache").select("ai_tags").eq("image_url", payload).limit(1);
        const cachedTags = cachedRows?.[0]?.ai_tags;
        if (cachedTags) {
          if (userId) {
            try { await supabase.from("ai_image_cache").insert([{ image_url: payload, ai_tags: cachedTags, user_id: userId }]); } catch (e) {}
          }
          return NextResponse.json({ result: cachedTags });
        }
      } catch (e) {}

      const imageResp = await fetch(payload, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/webp,image/apng,image/*,*/*;q=0.8" },
        redirect: "follow"
      });
      
      if (!imageResp.ok) throw new Error("Image download blocked");
      
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = imageResp.headers.get("content-type") || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const prompt = `You are a visual search engine for a Pinterest clone. 
      CRITICAL RULES:
      1. Identify the SPECIFIC subject of this image (e.g., "Led Zeppelin", "Rust Cohle", "Ford Mustang").
      2. If you DO NOT recognize the exact subject, describe the LITERAL physical contents (e.g., "four men 70s rock band guitars").
      3. Return ONLY 2 to 5 precise English keywords. 
      4. NEVER hallucinate random concepts, abstract text, or instructions. 
      5. DO NOT describe abstract moods. Just concrete physical nouns.`;
      
      const messages = [
        {
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } }
            ]
        }
      ];

      // Вызываем Vision-модель Грока
      let text = await callGroq(messages, "llama-3.2-11b-vision-preview");
      text = text.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      
      try {
        if (text.length > 3) await supabase.from("ai_image_cache").insert([{ image_url: payload, ai_tags: text, user_id: userId || null }]);
      } catch (e) {}

      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
