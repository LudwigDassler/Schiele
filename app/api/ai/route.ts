import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Подключение к БД (если таблица не работает, код просто пойдет дальше)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3
    ].filter(Boolean) as string[];

    if (keys.length === 0) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    if (action === "enhance_prompt") {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      const prompt = `You are a strict aesthetic curator. The user provided this text: "${payload}". Extract the core visual aesthetic, era, or mood. Return ONLY 3 to 5 English keywords separated by spaces. Ignore character names, focus strictly on visual style. No punctuation.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      return NextResponse.json({ result: text });
    }

    if (action === "analyze_image") {
      // 1. Попытка прочитать из БД (не упадет, если БД не настроена)
      try {
        const { data: cachedData } = await supabase.from("ai_image_cache").select("ai_tags").eq("image_url", payload).single();
        if (cachedData && cachedData.ai_tags) return NextResponse.json({ result: cachedData.ai_tags });
      } catch (e) {}

      const imageResp = await fetch(payload, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/webp,image/apng,image/*,*/*;q=0.8" },
        redirect: "follow"
      });
      
      if (!imageResp.ok) throw new Error("Image download blocked");
      
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

      // 2. ЖЕСТКИЙ АНТИ-ГАЛЛЮЦИНАГЕННЫЙ ПРОМПТ
      const prompt = `You are a visual search engine for a Pinterest clone. 
      CRITICAL RULES:
      1. Identify the SPECIFIC subject of this image (e.g., "Led Zeppelin", "Rust Cohle", "Ford Mustang").
      2. If you DO NOT recognize the exact subject, describe the LITERAL physical contents (e.g., "four men 70s rock band guitars").
      3. Return ONLY 2 to 5 precise English keywords. 
      4. NEVER hallucinate random concepts, abstract text, or instructions (like "how to"). 
      5. DO NOT describe abstract moods. Just concrete physical nouns.`;
      
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      
      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      const text = result.response.text().trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      
      // 3. Попытка сохранить в БД (тихо проигнорирует ошибку записи)
      try {
        if (text.length > 3) await supabase.from("ai_image_cache").insert([{ image_url: payload, ai_tags: text }]);
      } catch (e) {}

      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error.message.includes("429") || error.message.includes("Quota")) return NextResponse.json({ fallback: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}