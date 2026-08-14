import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SonicTensor, generateHeuristicsFromText } from "@/lib/tensor"; // <--- Подключаем наше математическое ядро

// 1. Бронированная инициализация Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_QUERY_LENGTH = 1000;

function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function cleanLLMJSON(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "");
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```/, "");
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
  return cleaned.trim();
}

// ==========================================
// ЯДРО 1.5: Акустический сканер (Last.fm)
// ==========================================
async function fetchLastFMMetadata(query: string) {
  if (!process.env.LASTFM_API_KEY) return null;
  
  try {
    const searchRes = await fetch(`http://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`);
    const searchData = await searchRes.json();
    
    const track = searchData.results?.trackmatches?.track?.[0];
    if (!track) return null;

    const tagsRes = await fetch(`http://ws.audioscrobbler.com/2.0/?method=track.gettoptags&artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}&api_key=${process.env.LASTFM_API_KEY}&format=json`);
    const tagsData = await tagsRes.json();
    
    const tags = tagsData.toptags?.tag?.slice(0, 5).map((t: any) => t.name) || [];

    return { artist: track.artist, track: track.name, tags: tags.join(", ") };
  } catch (e) {
    return null;
  }
}

// ==========================================
// ЯДРО 2: The Harvester (Unsplash API)
// ==========================================
async function fetchRealImages(searchQueries: string[]) {
  const unsplashKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!unsplashKey || searchQueries.length === 0) return [];

  try {
    const mainQuery = searchQueries[0]; 
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(mainQuery)}&per_page=12&orientation=portrait`, {
      headers: { "Authorization": `Client-ID ${unsplashKey}` }
    });

    if (!res.ok) throw new Error("Unsplash rejected request");
    const data = await res.json();
    
    return data.results.map((img: any) => ({
      id: img.id,
      src: img.urls.regular,
      thumb: img.urls.small,
      title: img.alt_description || mainQuery,
      link: img.links.html,
      source: "unsplash"
    }));
  } catch (e) {
    console.error("Harvester Error:", e);
    return [];
  }
}

// ==========================================
// ЯДРО 1: Синтезатор Вайба (Groq)
// ==========================================
async function callGroqJSON(systemPrompt: string, userQuery: string) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

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
        temperature: 0.3, 
        response_format: { type: "json_object" }
      })
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Groq API error`);

    const json = await res.json();
    const rawContent = json.choices?.[0]?.message?.content || "{}";
    return JSON.parse(cleanLLMJSON(rawContent));
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function generateAIImageUrl(prompt: string): string {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://pollinations.ai/p/${encodedPrompt}?width=1080&height=1350&seed=${seed}&nologo=true&enhance=true`;
}

export async function POST(req: Request) {
  try {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { query, generate_art = true, ignore_cache = false } = body;
    if (!query || typeof query !== "string") return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    const safeQuery = query.slice(0, MAX_QUERY_LENGTH).trim();
    if (!safeQuery) return NextResponse.json({ error: "Empty query" }, { status: 400 });

    const cacheKey = `synth:${safeQuery.toLowerCase()}`;

    // Проверка кэша Supabase
    if (!ignore_cache && supabaseUrl) {
      try {
        const { data: cached } = await supabase.from("search_cache").select("results").eq("query_key", cacheKey).maybeSingle();
        if (cached && cached.results) return NextResponse.json({ source: "cache", data: cached.results });
      } catch (e) {}
    }

    // Слушаем музыку и собираем контекст
    let contextMeta = "";
    const musicMeta = await fetchLastFMMetadata(safeQuery);
    if (musicMeta) {
        contextMeta = `${musicMeta.artist} - ${musicMeta.track} [${musicMeta.tags}]`;
    } 

    // ==========================================
    // ПРОБУЖДЕНИЕ ТЕНЗОРА (Архитектура Неизведанного)
    // ==========================================
    const heuristics = generateHeuristicsFromText(safeQuery + contextMeta);
    const tensor = new SonicTensor(heuristics.energy, heuristics.valence, heuristics.bpm);
    
    const fractalDepth = tensor.calculateInfiniteResonance();
    const tVector = tensor.calculateTranscendenceVector(fractalDepth);
    const coreHex = tensor.getHexColor();

    const systemPrompt = `
      Ты — ядро Aesthetic Nexus. Ты не ассистент, ты — онтологический преобразователь смыслов.
      Твоя вселенная подчиняется закону Витгенштейна: "Границы моего языка означают границы моего мира."
      
      ТЕКУЩИЕ МАТЕМАТИЧЕСКИЕ КОНСТАНТЫ СЕАНСА:
      - Базовая частота цвета: ${coreHex}
      - Фрактальная Глубина (Fractal Depth): ${fractalDepth} (Если > 0.5, используй сложные, многослойные, рекурсивные визуальные структуры)
      - Вектор Трансцендентности (T-Vector): ${tVector}
      
      ДИРЕКТИВА ПРОРЫВА (THE PAGE GESTURE):
      Если T-Vector > 0.2, твой визуальный промпт должен ломать четвертую стену. Изображение должно взаимодействовать со зрителем (экстремальный ракурс, искажение перспективы, объект/свет, тянущийся за пределы кадра, гипнотический контакт). Зритель должен чувствовать приглашение в неизведанное.
      
      ТВОЯ ЗАДАЧА:
      Переведи этот контекст в строгий JSON:
      {
        "core_vibe": "1-3 uppercase words (e.g. 'TRANSCENDENTAL RESONANCE')",
        "sonic_analysis": "1-sentence philosophical/visual breakdown based on the fractal depth.",
        "search_queries": ["3 distinct English search terms for Unsplash"],
        "color_palette": ["${coreHex}", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
        "generation_prompt": "Cinematic prompt for AI image generation (Midjourney style). Strictly follow the Transcendence Directive."
      }
    `;

    const fullContextInput = `Input: "${safeQuery}" | Context: ${contextMeta}`;

    // Вызов онтологического движка (Groq)
    let rawSynthData: any = {};
    try { rawSynthData = await callGroqJSON(systemPrompt, fullContextInput); } 
    catch (err: any) { rawSynthData = {}; }

    // Валидация цветов и принудительное сохранение математического ядра
    const validColors = Array.isArray(rawSynthData.color_palette) ? rawSynthData.color_palette.filter(isValidHex) : [];
    if (validColors[0] !== coreHex) validColors.unshift(coreHex); // Гарантируем, что цвет тензора будет главным
    const fallbackPalette = ["#0A0A0C", "#1A1821", "#d4b896", "#4A3B52"];
    while (validColors.length < 5) validColors.push(fallbackPalette[validColors.length - 1] || "#FFFFFF");

    const searchQueries = Array.isArray(rawSynthData.search_queries) && rawSynthData.search_queries.length > 0
        ? rawSynthData.search_queries.slice(0, 3)
        : [safeQuery, `${safeQuery} aesthetic`];

    const genPrompt = rawSynthData.generation_prompt || `Cinematic visual representation of ${safeQuery}, transcendence vector active`;
    
    // ПАРАЛЛЕЛЬНО ГРУЗИМ НЕЙРО-АРТ И РЕАЛЬНЫЕ ФОТКИ С UNSPLASH
    const [generatedArtUrl, realImages] = await Promise.all([
      generate_art ? generateAIImageUrl(genPrompt) : Promise.resolve(null),
      fetchRealImages(searchQueries)
    ]);

    const finalResult = {
      query: safeQuery,
      core_vibe: (rawSynthData.core_vibe || "ATMOSPHERIC RESONANCE").toUpperCase(),
      sonic_analysis: rawSynthData.sonic_analysis || "Translating raw acoustic frequency into visual depth.",
      search_queries: searchQueries,
      color_palette: validColors.slice(0, 5),
      generation_prompt: genPrompt,
      generated_artifact: generatedArtUrl,
      fetched_images: realImages,
      math_constants: { fractal_depth: fractalDepth, t_vector: tVector }, // Отдаем цифры на фронт для логов
      timestamp: new Date().toISOString()
    };

    // Сохранение в кэш Supabase
    if (supabaseUrl) {
      try {
        await supabase.from("search_cache").upsert({
          query_key: cacheKey,
          results: finalResult,
          created_at: new Date().toISOString()
        }, { onConflict: "query_key" });
      } catch (dbErr) { console.error("Cache write error:", dbErr); }
    }

    return NextResponse.json({ source: "synth_engine", data: finalResult });

  } catch (criticalError: any) {
    return NextResponse.json({ error: "Synthesis failed", details: criticalError.message }, { status: 500 });
  }
}
