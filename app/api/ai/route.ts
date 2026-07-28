import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // СЦЕНАРИЙ 1: Умный текстовый промпт
    if (action === "enhance_prompt") {
      const prompt = `You are an aesthetic curator for a visual search engine. 
      The user typed this complex/abstract query: "${payload}". 
      Translate and extract the core visual aesthetic, specific characters, era, or mood. 
      Return ONLY 3 to 6 highly relevant English keywords separated by spaces. 
      Do not include any introductory text, punctuation, or explanations.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/\n/g, " ");
      return NextResponse.json({ result: text });
    }

    // СЦЕНАРИЙ 2: Машинное зрение (Анализ картинки)
    if (action === "analyze_image") {
      const imageResp = await fetch(payload);
      if (!imageResp.ok) throw new Error("Failed to fetch image");
      
      const arrayBuffer = await imageResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

      const prompt = `Look at this image. You are a visual tagger for a Pinterest-like platform.
      Return exactly 3 to 5 English keywords (separated by spaces) that describe the core visual aesthetic, main subject, atmosphere, or style.
      Return ONLY the keywords, no punctuation or extra text.`;
      
      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      const text = result.response.text().trim().replace(/\n/g, " ");
      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Internal AI Error" }, { status: 500 });
  }
}