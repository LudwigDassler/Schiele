import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!process.env.GEMINI_API_KEY) {
      console.error("API KEY IS MISSING!");
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (action === "enhance_prompt") {
      const prompt = `You are an aesthetic curator for a visual search engine. Translate and extract the core visual aesthetic, specific characters, era, or mood from this abstract query: "${payload}". Return ONLY 3 to 6 highly relevant English keywords separated by spaces. No explanations.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/\n/g, " ");
      return NextResponse.json({ result: text });
    }

    if (action === "analyze_image") {
      console.log("Fetching image for AI:", payload);
      // Притворяемся браузером, чтобы нас не заблокировали при скачивании фото
      const imageResp = await fetch(payload, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        }
      });
      
      if (!imageResp.ok) throw new Error("Image download blocked by host (403)");
      
      const arrayBuffer = await imageResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

      const prompt = `Look at this image. Return exactly 3 to 5 English keywords (separated by spaces) that describe the core visual aesthetic, main subject, atmosphere, or style. Return ONLY the keywords, no punctuation.`;
      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      const text = result.response.text().trim().replace(/\n/g, " ");
      
      console.log("AI Result:", text);
      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}