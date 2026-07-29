import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Подключаем БД для проверки кэша (Берем ключи из переменных окружения)
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

    if (keys.length === 0) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

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
      // СТРАХОВКА 1: Пытаемся прочитать из БД. Если БД лежит - не падаем, идем дальше.
      try {
        const { data: cachedData, error } = await supabase
          .from("ai_image_cache")
          .select("ai_tags")
          .eq("image_url", payload)
          .single();

        if (cachedData && cachedData.ai_tags) {
          console.log("⚡ CACHE HIT! Взято из Supabase.");
          return NextResponse.json({ result: cachedData.ai_tags });
        }
      } catch (dbError) {
        console.error("Supabase Read Error:", dbError);
      }

      console.log("🐌 CACHE MISS. Спрашиваем Google...");
      
      const imageResp = await fetch(payload, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        },
        redirect: "follow"
      });
      
      if (!imageResp.ok) throw new Error("Image download blocked");
      
      const arrayBuffer = await imageResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

      const prompt = `You are a visual search engine for a Pinterest clone. Identify the SPECIFIC subject of this image (e.g., the exact character name, exact actor, specific anime, specific car model). Return ONLY 2 to 4 precise English keywords describing the literal subject. Do NOT describe abstract moods. Just return the concrete subject name.`;
      
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      
      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      
      const text = result.response.text().trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      
      // СТРАХОВКА 2: Пытаемся сохранить в БД. Если не вышло - плевать, главное отдать юзеру результат.
      try {
        if (text.length > 3) {
           await supabase.from("ai_image_cache").insert([{ image_url: payload, ai_tags: text }]);
           console.log("💾 Сохранено в кэш на будущее.");
        }
      } catch (writeError) {
        console.error("Supabase Write Error:", writeError);
      }

      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Route Error:", error.message);
    if (error.message.includes("429") || error.message.includes("Quota") || error.message.includes("Too Many Requests")) {
        console.log("-> 429 Limit Hit. Executing silent fallback.");
        return NextResponse.json({ fallback: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}