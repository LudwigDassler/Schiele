import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio"; //
import { SonicTensor, generateHeuristicsFromText } from "@/lib/tensor"; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev"; //[cite: 1]
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

const safelyParseJson = (str: string) => { //[cite: 1]
  try { return JSON.parse(str); } catch { return null; }
};

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
// ЯДРО 2: The Harvester (Wild Web Scraper через Гидра-прокси)
// ==========================================
async function searchDuckDuckGo(query: string) { //[cite: 1]
  const headers = { //[cite: 1]
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", //[cite: 1]
    "Accept-Language": "en-US,en;q=0.9", //[cite: 1]
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const tokenTargetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`; //[cite: 1]
    const tokenProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(tokenTargetUrl)}`; //[cite: 1]
    const tokenRes = await fetch(tokenProxyUrl, { headers, cache: "no-store", signal: controller.signal }); //[cite: 1]
    if (!tokenRes.ok) throw new Error("Hydra Proxy (Token) error");

    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=["'](.*?)["']/); //[cite: 1]
    if (!vqdMatch) throw new Error("DDG vqd token missing"); //[cite: 1]
    const vqd = vqdMatch[1]; //[cite: 1]

    const imgTargetUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,&s=0`; //[cite: 1]
    const imgProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(imgTargetUrl)}`; //[cite: 1]

    const imgRes = await fetch(imgProxyUrl, { headers, cache: "no-store", signal: controller.signal }); //[cite: 1]
    const data = await imgRes.json();
    clearTimeout(timeoutId);

    if (!data.results || data.results.length === 0) return []; //[cite: 1]

    return data.results.map((r: any, index: number) => ({ //[cite: 1]
      id: `ddg-synth-${Date.now()}-${index}`, //[cite: 1]
      src: r.image, //[cite: 1]
      thumb: r.thumbnail, //[cite: 1]
      title: r.title, //[cite: 1]
      link: r.url, //[cite: 1]
      source: "duckduckgo"
    })).slice(0, 12);
  } catch (error) {
    clearTimeout(timeoutId);
    return [];
  }
}

async function searchBing(query: string) { //[cite: 1]
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&setmkt=en-US&setlang=en-US&form=HDRSC2&first=1`; //[cite: 1]
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`; //[cite: 1]

    const response = await fetch(proxyUrl, { //[cite: 1]
      cache: "no-store", //[cite: 1]
      headers: { //[cite: 1]
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", //[cite: 1]
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" //[cite: 1]
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const $ = cheerio.load(html); //[cite: 1]
    const visualArtifacts: any[] = [];

    $("a.iusc").each((index, element) => { //[cite: 1]
      const mData = $(element).attr("m"); //[cite: 1]
      if (mData) {
        const artifact = safelyParseJson(mData); //[cite: 1]
        if (artifact && artifact.murl) { //[cite: 1]
          visualArtifacts.push({
            id: `bing-synth-${Date.now()}-${index}`, //[cite: 1]
            src: artifact.murl, //[cite: 1]
            thumb: artifact.turl || artifact.murl, //[cite: 1]
            title: artifact.t || query, //[cite: 1]
            link: artifact.purl || "", //[cite: 1]
            source: "bing"
          });
        }
      }
    });

    return visualArtifacts.filter(a => a.src && a.src.startsWith("http")).slice(0, 12); //[cite: 1]
  } catch (error) {
    clearTimeout(timeoutId);
    return [];
  }
}

async function fetchWildImages(searchQueries: string[]) {
  if (searchQueries.length === 0) return [];
  const mainQuery = searchQueries[0]; 
  
  // Каскадный поиск из твоего старого механизма: сначала DDG, если глухо — Bing
  let artifacts = await searchDuckDuckGo(mainQuery);
  if (artifacts.length === 0) {
    artifacts = await searchBing(mainQuery);
  }
  return artifacts;
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
        const { data: cached } = await supabase.from("search_cache").select("results").eq("query_key", cacheKey).maybeSingle(); //[cite: 1]
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
      Если T-Vector > 0.2, твой визуальный промпт должен ломать четвертую стену. Изображение должно взаимодействовать со зрителем (экстремальный ракурс, искажение перспективы, объект/свет, тянущийся за пределы кадра, гипнотический контакт).
      
      ТВОЯ ЗАДАЧА:
      Переведи этот контекст в строгий JSON:
      {
        "core_vibe": "1-3 uppercase words (e.g. 'TRANSCENDENTAL RESONANCE')",
        "sonic_analysis": "1-sentence philosophical/visual breakdown based on the fractal depth.",
        "search_queries": ["1 optimal English search query optimized for DuckDuckGo image search to fetch raw aesthetic photography"],
        "color_palette": ["${coreHex}", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
        "generation_prompt": "Cinematic prompt for AI image generation (Midjourney style). Strictly follow the Transcendence Directive."
      }
    `;

    const fullContextInput = `Input: "${safeQuery}" | Context: ${contextMeta}`;

    // Вызов онтологического движка (Groq)
    let rawSynthData: any = {};
    try { rawSynthData = await callGroqJSON(systemPrompt, fullContextInput); } 
    catch (err: any) { rawSynthData = {}; }

    // Валидация цветов
    const validColors = Array.isArray(rawSynthData.color_palette) ? rawSynthData.color_palette.filter(isValidHex) : [];
    if (validColors[0] !== coreHex) validColors.unshift(coreHex); 
    const fallbackPalette = ["#0A0A0C", "#1A1821", "#d4b896", "#4A3B52"];
    while (validColors.length < 5) validColors.push(fallbackPalette[validColors.length - 1] || "#FFFFFF");

    const searchQueries = Array.isArray(rawSynthData.search_queries) && rawSynthData.search_queries.length > 0
        ? rawSynthData.search_queries
        : [safeQuery];

    const genPrompt = rawSynthData.generation_prompt || `Cinematic visual representation of ${safeQuery}, transcendence vector active`;
    
    // ПАРАЛЛЕЛЬНО ГРУЗИМ НЕЙРО-АРТ И ФОТКИ С ДИКОГО ИНТЕРНЕТА ЧЕРЕЗ HYDRA
    const [generatedArtUrl, realImages] = await Promise.all([
      generate_art ? generateAIImageUrl(genPrompt) : Promise.resolve(null),
      fetchWildImages(searchQueries)
    ]);

    const finalResult = {
      query: safeQuery,
      core_vibe: (rawSynthData.core_vibe || "ATMOSPHERIC RESONANCE").toUpperCase(),
      sonic_analysis: rawSynthData.sonic_analysis || "Translating raw acoustic frequency into visual depth.",
      search_queries: searchQueries,
      color_palette: validColors.slice(0, 5),
      generation_prompt: genPrompt,
      generated_artifact: generatedArtUrl,
      fetched_images: realImages, // Теперь здесь сырые данные с DDG/Bing
      math_constants: { fractal_depth: fractalDepth, t_vector: tVector },
      timestamp: new Date().toISOString()
    };

    // Сохранение в кэш Supabase
    if (supabaseUrl) {
      try {
        await supabase.from("search_cache").upsert({ //[cite: 1]
          query_key: cacheKey,
          results: finalResult,
          created_at: new Date().toISOString() //[cite: 1]
        }, { onConflict: "query_key" });
      } catch (dbErr) {}
    }

    return NextResponse.json({ source: "synth_engine", data: finalResult });

  } catch (criticalError: any) {
    return NextResponse.json({ error: "Synthesis failed", details: criticalError.message }, { status: 500 });
  }
}
