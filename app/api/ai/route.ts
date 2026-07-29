import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // СЦЕНАРИЙ 1: Работа с текстом (если фото заблокировано)
    if (action === "enhance_prompt") {
      const prompt = `You are a strict aesthetic curator. The user provided this text: "${payload}". Extract the core visual aesthetic, era, or mood. Return ONLY 3 to 5 English keywords separated by spaces. Ignore character names, focus strictly on visual style (e.g., "dark neo-noir cinematic"). No punctuation.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      return NextResponse.json({ result: text });
    }

    // СЦЕНАРИЙ 2: Машинное зрение (Анализ картинки)
    if (action === "analyze_image") {
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

      // ГЕНИАЛЬНЫЙ ПРОМПТ: Запрещаем читать текст на фото!
      const prompt = `You are an expert art director. Analyze this image. Extract strictly 3 to 5 visual keywords (separated by spaces) that describe the core aesthetic, atmosphere, lighting, and style (e.g., "gloomy cinematic neo-noir"). STRONGLY IGNORE ANY TEXT written on the image (like logos, subtitles, or watermarks). Focus ONLY on the visual mood. Return ONLY the keywords, no commas, no extra text.`;
      
      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      
      // Очищаем ответ от любого мусора, оставляем только слова через пробел
      const text = result.response.text().trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ");
      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}