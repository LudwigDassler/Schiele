import { NextResponse } from "next/server";
import { kashmir } from "../../../lib/kashmir";
import { classifyIntent } from "../../../lib/intentRouter";
import { supabase } from "../../../lib/supabase";

const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev";

// Ультимативный парсер DuckDuckGo с поддержкой пагинации
async function searchDuckDuckGo(query: string, page: number = 1) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // 1. Получаем токен vqd
    const tokenTargetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const tokenProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(tokenTargetUrl)}`;
    
    const tokenRes = await fetch(tokenProxyUrl, { headers, cache: "no-store", signal: controller.signal });
    if (!tokenRes.ok) throw new Error("DDG Token error");
    const html = await tokenRes.text();
    
    const vqdMatch = html.match(/vqd=["'](.*?)["']/);
    if (!vqdMatch) throw new Error("DDG vqd not found");
    const vqd = vqdMatch[1];

    // 2. Вычисляем смещение для пагинации (DDG принимает s для офсета, p для страницы)
    const sOffset = (page - 1) * 35;

    // 3. Дергаем картинки с учетом страницы
    const imgTargetUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,&p=${page}&s=${sOffset}`;
    const imgProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(imgTargetUrl)}`;
    
    const imgRes = await fetch(imgProxyUrl, { headers, cache: "no-store", signal: controller.signal });
    if (!imgRes.ok) throw new Error("DDG Images error");
    const data = await imgRes.json();
    clearTimeout(timeoutId);

    if (!data.results || data.results.length === 0) return [];

    return data.results.map((r: any, index: number) => ({
      id: `kashmir-visual-${Date.now()}-${page}-${index}`,
      src: r.image,
      thumb: r.thumbnail,
      title: r.title,
      link: r.url
    }));

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("[DDG SCRAPER WARNING] Fallback triggered or failed:", error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId") || "anon";
    const explicitMode = url.searchParams.get("mode");
    const page = parseInt(url.searchParams.get("page") || "1", 10);

    const isExplicitOverride = !!explicitMode && explicitMode !== "classic";
    const intent = isExplicitOverride ? "kashmir" : classifyIntent(rawQuery);

    let optimizedQuery = rawQuery;

    if (intent === "kashmir") {
      try {
        const processed = await kashmir.processQuery(rawQuery, userId);
        if (processed && typeof processed === 'string' && processed.trim() !== "") {
          optimizedQuery = processed.trim();
        }
      } catch (cortexError) {
        console.warn(`[KASHMIR CORTEX WARNING] Falling back to raw query.`);
      }
    }

    console.log(`[KASHMIR ROUTER] Query: "${optimizedQuery}" (Page: ${page}) -> Intent: ${intent}`);

    // Пробуем взять из кэша Supabase, если это не первая страница (или для разгрузки)
    // Либо сразу парсим и сохраняем в кэш
    let cleanArtifacts = await searchDuckDuckGo(optimizedQuery, page);

    // Если утка легка / выдала пустоту — фоллбэк на питоновский/запасной метод или пустой массив с ошибкой
    if (cleanArtifacts.length === 0 && page === 1) {
       console.log("[KASHMIR] DDG empty, returning cached or default state");
    }

    return NextResponse.json({ data: cleanArtifacts, page });
  } catch (error: any) {
    console.error("[KASHMIR FATAL ERROR]", error.message);
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
  }
}
