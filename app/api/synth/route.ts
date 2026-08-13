import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 1. Бронированная инициализация Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_QUERY_LENGTH = 1000;

// Валидатор HEX-цветов (чтобы не прилетел кривой код вроде "#GGG123")
function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

// Очистка от маркдаун-оберток LLM (```json ... ```)
function cleanLLMJSON(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "");
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```/, "");
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
  return cleaned.trim();
}

// Запрос к Groq с таймаутом и парсингом
async function callGroqJSON(systemPrompt: string, userQuery: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured in environment variables");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 секунд Таймаут

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        temperature: 0.3, // Снижаем температуру для точного соблюдения JSON
        response_format: { type: "json_object" }
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errBody}`);
    }

    const json = await res.json();
    const rawContent = json.choices?.[0]?.message?.content || "{}";
    return JSON.parse(cleanLLMJSON(rawContent));
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Groq API call timed out after 12s");
    }
    throw err;
  }
}

// Поколение нейро-арта без внешних ключей на базах Stable Diffusion FLUX / SDXL
function generateAIImageUrl(prompt: string): string {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://pollinations.ai/p/${encodedPrompt}?width=1080&height=1350&seed=${seed}&nologo=true&enhance=true`;
}

export async function POST(req: Request) {
  try {
    // A. Защита от кривого тела запроса
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { 
      query, 
      track_info = null, // Опционально: { artist, title, genre }
      generate_art = true, // Нужно ли сразу генерить готовую AI-картинку
      ignore_cache = false 
    } = body;

    // B. Валидация входных данных
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required" }, { status: 400 });
    }

    const safeQuery = query.slice(0, MAX_QUERY_LENGTH).trim();
    if (!safeQuery) {
      return NextResponse.json({ error: "Query is empty" }, { status: 400 });
    }

    // Уникальный префикс кэша, чтобы НЕ ломать обычный поиск
    const cacheKey = `synth:${safeQuery.toLowerCase()}`;

    // C. Проверка кэша в Supabase (С изоляцией ошибок)
    if (!ignore_cache && supabaseUrl) {
      try {
        const { data: cached } = await supabase
          .from("search_cache")
          .select("results")
          .eq("query_key", cacheKey)
          .maybeSingle();

        if (cached && cached.results) {
          return NextResponse.json({ source: "cache", data: cached.results });
        }
      } catch (e) {
        console.warn("Supabase cache check bypassed due to error:", e);
      }
    }

    // D. Музыкально-визуальный системный промпт для Groq
    const systemPrompt = `
      You are the ultimate Aesthetic & Sonic Curator for an avant-garde visual platform.
      
      YOUR TASK:
      Analyze the input, which can be a text mood, an aesthetic concept, a song title, lyrics, or an artist.
      If music metadata is provided, blend its sonic textures, production style, lighting, and visual epoch into the aesthetic.
      
      CRITICAL OUTPUT REQUIREMENTS:
      Return ONLY a JSON object with this EXACT schema:
      {
        "core_vibe": "1-3 uppercase words characterizing the overarching visual frequency (e.g. 'DARK ACADEMIA', 'NEON HYPNOSIS')",
        "sonic_analysis": "Short 1-sentence breakdown of how the music/mood translates into visual textures and lighting",
        "search_queries": ["3 distinct 2-word English search terms for photo archives"],
        "color_palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"], // Must be 5 valid 6-character hex codes
        "generation_prompt": "An evocative, detailed prompt for AI image generation (Midjourney/FLUX style). Describe camera angle, lighting, textures, era, and colors. No quality buzzwords like '4k' or 'trending'."
      }
    `;

    // Готовим расширенный запрос с учетом музыкального контекста
    let fullContextInput = safeQuery;
    if (track_info && typeof track_info === "object") {
      fullContextInput += ` | Track Info: ${track_info.artist || ""} - ${track_info.title || ""} (${track_info.genre || "Music"})`;
    }

    // E. Вызов нейро-аналитика Groq
    let rawSynthData: any = {};
    try {
      rawSynthData = await callGroqJSON(systemPrompt, fullContextInput);
    } catch (err: any) {
      console.error("Groq Synth Error:", err.message);
      // Если Groq умер, генерируем надёжный аварийный ответ
      rawSynthData = {};
    }

    // F. Жесткая валидация и дефолты (Защита от амнезии LLM)
    const validColors = Array.isArray(rawSynthData.color_palette)
      ? rawSynthData.color_palette.filter((c: string) => typeof c === "string" && isValidHex(c))
      : [];

    // Гарантируем 5 качественных цветов, даже если нейронка выплюнула чушь
    const fallbackPalette = ["#0A0A0C", "#1A1821", "#d4b896", "#4A3B52", "#802A36"];
    while (validColors.length < 5) {
      validColors.push(fallbackPalette[validColors.length] || "#FFFFFF");
    }

    const genPrompt = rawSynthData.generation_prompt || `Cinematic visual representation of ${safeQuery}, film grain, soft atmospheric lighting`;

    // Генерируем ссылку на уникальный арт
    const generatedArtUrl = generate_art ? generateAIImageUrl(genPrompt) : null;

    const finalResult = {
      query: safeQuery,
      core_vibe: (rawSynthData.core_vibe || "ATMOSPHERIC RESONANCE").toUpperCase(),
      sonic_analysis: rawSynthData.sonic_analysis || "Translating raw acoustic frequency into visual depth and physical textures.",
      search_queries: Array.isArray(rawSynthData.search_queries) && rawSynthData.search_queries.length > 0
        ? rawSynthData.search_queries.slice(0, 3)
        : [safeQuery, `${safeQuery} aesthetic`, `${safeQuery} mood`],
      color_palette: validColors.slice(0, 5),
      generation_prompt: genPrompt,
      generated_artifact: generatedArtUrl,
      timestamp: new Date().toISOString()
    };

    // G. Сохранение в Supabase (изолированно)
    if (supabaseUrl) {
      try {
        await supabase.from("search_cache").upsert({
          query_key: cacheKey,
          results: finalResult,
          created_at: new Date().toISOString()
        }, { onConflict: "query_key" });
      } catch (dbErr) {
        console.error("Failed to write to search_cache:", dbErr);
      }
    }

    return NextResponse.json({
      source: "synth_engine",
      data: finalResult
    });

  } catch (criticalError: any) {
    console.error("CRITICAL ENGINE FAILURE:", criticalError);
    return NextResponse.json({
      error: "Synthesis process failed",
      details: criticalError.message || "Unknown error"
    }, { status: 500 });
  }
}
