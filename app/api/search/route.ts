import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { kashmir } from "../../../lib/kashmir";
import { classifyIntent } from "../../../lib/intentRouter";
import { supabase } from "../../../lib/supabase";

const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev";
const PAGE_SIZE = 35;
const CACHE_TTL_HOURS = 24;

const safelyParseJson = (str: string) => {
  try { return JSON.parse(str); } catch { return null; }
};

function cacheKey(query: string, page: number) {
  return `${query.trim().toLowerCase()}::p${page}`;
}

// Кэш — это оптимизация и подушка безопасности, а не критичный путь.
// Любая ошибка здесь тихо проглатывается: лучше живой поиск без кэша,
// чем упавший запрос из-за того, что таблица кэша не настроена.
async function readCache(key: string, allowStale = false): Promise<any[] | null> {
  try {
    const { data } = await supabase.from("search_cache").select("results, created_at").eq("query_key", key).maybeSingle();
    if (!data) return null;
    const ageHours = (Date.now() - new Date(data.created_at).getTime()) / 36e5;
    if (!allowStale && ageHours > CACHE_TTL_HOURS) return null;
    return (data.results as any[]) || null;
  } catch (e) {
    return null;
  }
}

async function writeCache(key: string, results: any[]) {
  try {
    await supabase.from("search_cache").upsert({ query_key: key, results, created_at: new Date().toISOString() });
  } catch (e) {}
}

// Основной источник — DDG, качество выдачи лучше. Пагинация через смещение `s`
// (в прежней версии было жёстко зашито `p=1` — это НЕ параметр пагинации
// картиночного API DDG, поэтому лента переставала расти после первого экрана).
async function searchDuckDuckGo(query: string, page: number) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const tokenTargetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const tokenProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(tokenTargetUrl)}`;
    const tokenRes = await fetch(tokenProxyUrl, { headers, cache: "no-store", signal: controller.signal });
    if (!tokenRes.ok) throw new Error(`Hydra Proxy (Token) error: ${tokenRes.status}`);
    const html = await tokenRes.text();

    const vqdMatch = html.match(/vqd=["'](.*?)["']/);
    if (!vqdMatch) throw new Error("DuckDuckGo не отдал токен vqd");
    const vqd = vqdMatch[1];

    const offset = (page - 1) * PAGE_SIZE;
    const imgTargetUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,&s=${offset}`;
    const imgProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(imgTargetUrl)}`;

    const imgRes = await fetch(imgProxyUrl, { headers, cache: "no-store", signal: controller.signal });
    if (!imgRes.ok) throw new Error(`Hydra Proxy (Images) error: ${imgRes.status}`);
    const data = await imgRes.json();
    clearTimeout(timeoutId);

    if (!data.results || data.results.length === 0) return [];

    return data.results.map((r: any, index: number) => ({
      id: `ddg-${Date.now()}-${offset + index}`,
      src: r.image,
      thumb: r.thumbnail,
      title: r.title,
      link: r.url
    })).slice(0, PAGE_SIZE);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("[DDG SCRAPER ERROR]", error.name === "AbortError" ? "timeout" : error.message);
    return [];
  }
}

// Фоллбэк на Bing — включается только когда DDG молчит. Тот же Hydra-прокси,
// пагинация через `first` (Bing нумерует результаты с 1, а не со смещения 0).
async function searchBing(query: string, page: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const first = (page - 1) * PAGE_SIZE + 1;
    const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&setmkt=en-US&setlang=en-US&form=HDRSC2&first=${first}`;
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Hydra Proxy dropped connection with status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const visualArtifacts: any[] = [];

    $("a.iusc").each((index, element) => {
      const mData = $(element).attr("m");
      if (mData) {
        const artifact = safelyParseJson(mData);
        if (artifact && artifact.murl) {
          visualArtifacts.push({
            id: `bing-${Date.now()}-${index}`,
            src: artifact.murl,
            thumb: artifact.turl || artifact.murl,
            title: artifact.t || query,
            link: artifact.purl || ""
          });
        }
      }
    });

    return visualArtifacts.filter(a => a.src && a.src.startsWith("http")).slice(0, PAGE_SIZE);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("[BING SCRAPER ERROR]", error.name === "AbortError" ? "timeout" : error.message);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId") || "anon";
    const explicitMode = url.searchParams.get("mode");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

    const isExplicitOverride = !!explicitMode && explicitMode !== "classic";
    const intent = isExplicitOverride ? "kashmir" : classifyIntent(rawQuery);

    console.log(`[KASHMIR ROUTER] "${rawQuery}" -> ${intent}${isExplicitOverride ? ` (явный оверрайд: ${explicitMode})` : ""}, User: ${userId}, Page: ${page}`);

    let optimizedQuery = rawQuery;

    if (intent === "kashmir") {
      try {
        const processed = await kashmir.processQuery(rawQuery, userId);
        if (processed && typeof processed === 'string' && processed.trim() !== "") {
          optimizedQuery = processed.trim();
        }
      } catch (cortexError) {
        console.warn(`[KASHMIR CORTEX WARNING] Personality core glitched, falling back to raw query.`);
      }
    }

    console.log(`[KASHMIR] Vibe formulated: "${optimizedQuery}"`);

    const key = cacheKey(optimizedQuery, page);

    // 1. Свежий кэш — мгновенный ответ, скраперы вообще не трогаем
    const cached = await readCache(key);
    if (cached && cached.length > 0) {
      console.log(`[KASHMIR CACHE] Hit for "${optimizedQuery}" (page ${page})`);
      return NextResponse.json({ data: cached });
    }

    // 2. DDG — основной источник
    let artifacts = await searchDuckDuckGo(optimizedQuery, page);
    let source = "ddg";

    // 3. DDG промолчал — тихо, без ошибки для юзера, пробуем Bing
    if (artifacts.length === 0) {
      console.warn(`[KASHMIR] DDG вернул пусто, пробуем Bing...`);
      artifacts = await searchBing(optimizedQuery, page);
      source = "bing";
    }

    // 4. Оба движка легли одновременно — последний шанс: протухший кэш лучше пустой ленты
    if (artifacts.length === 0) {
      const stale = await readCache(key, true);
      if (stale && stale.length > 0) {
        console.warn(`[KASHMIR] DDG и Bing недоступны, отдаём протухший кэш для "${optimizedQuery}"`);
        return NextResponse.json({ data: stale });
      }
      throw new Error("DuckDuckGo и Bing одновременно ничего не вернули");
    }

    console.log(`[KASHMIR] Successfully extracted ${artifacts.length} artifacts via ${source}.`);

    await writeCache(key, artifacts);

    return NextResponse.json({ data: artifacts });
  } catch (error: any) {
    console.error("[KASHMIR FATAL ERROR]", error.message);
    return NextResponse.json({ error: error.message || "Failed to extract visual vibe", data: [] }, { status: 500 });
  }
}
