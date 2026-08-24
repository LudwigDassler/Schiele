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

// 🔥 НОВЫЙ БЛОК: Безопасный поиск по твоей базе (заполненной Nvidia)
async function searchInternalDatabase(query: string, page: number) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    
    // ИСПРАВЛЕНО: Фильтр .or() записан в ОДНУ СТРОКУ без пробелов после запятых.
    // Поиск идет по текстовым полям (description, vibe), куда AI дублирует все теги и распознанный текст.
    // Это надежно работает с фразами типа "Pink Floyd".
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .or(`image_description.ilike.%${query}%,core_vibe.ilike.%${query}%,title.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data) return [];

    // Приводим к общему формату карточек для фронтенда
    return data.map((img: any) => ({
      id: `schiele-db-${img.id}`,
      src: img.src || img.image_url,
      thumb: img.src || img.image_url,
      title: img.core_vibe ? `[Schiele] ${img.core_vibe}` : (img.title || query),
      link: img.src || img.image_url,
      isInternal: true // Флаг для подсветки "своих" картинок
    }));
  } catch (error: any) {
    console.error("[INTERNAL DB ERROR]", error.message);
    return []; // Если база недоступна, возвращаем пустоту, чтобы не положить общий поиск
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId") || "anon";
    const explicitMode = url.searchParams.get("mode");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

    // СЕКРЕТНЫЙ ТУМБЛЕР: Слияние работает только если передать &mix=true
    const mixWithInternal = url.searchParams.get("mix") === "true";

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

    // 🔥 ПАРАЛЛЕЛЬНЫЙ ЗАПУСК: Ищем в своей базе одновременно с DDG
    const internalSearchPromise = mixWithInternal 
      ? searchInternalDatabase(optimizedQuery, page) 
      : Promise.resolve([]);

    // --- БЛОК ВНЕШНЕГО ПОИСКА ---
    let externalArtifacts: any[] = [];
    
    const cached = await readCache(key);
    if (cached && cached.length > 0) {
      console.log(`[KASHMIR CACHE] Hit for "${optimizedQuery}" (page ${page})`);
      externalArtifacts = cached;
    } else {
      externalArtifacts = await searchDuckDuckGo(optimizedQuery, page);
      let source = "ddg";

      if (externalArtifacts.length === 0) {
        console.warn(`[KASHMIR] DDG вернул пусто, пробуем Bing...`);
        externalArtifacts = await searchBing(optimizedQuery, page);
        source = "bing";
      }

      if (externalArtifacts.length === 0) {
        const stale = await readCache(key, true);
        if (stale && stale.length > 0) {
          console.warn(`[KASHMIR] DDG и Bing недоступны, отдаём протухший кэш для "${optimizedQuery}"`);
          externalArtifacts = stale;
        }
      } else {
        console.log(`[KASHMIR] Successfully extracted ${externalArtifacts.length} artifacts via ${source}.`);
        await writeCache(key, externalArtifacts);
      }
    }

    // --- ФАЗА СЛИЯНИЯ ---
    const internalArtifacts = await internalSearchPromise;

    // Если тумблер выключен или наша база ничего не нашла — отдаем стандартную ленту
    if (!mixWithInternal || internalArtifacts.length === 0) {
      if (externalArtifacts.length === 0) throw new Error("DuckDuckGo и Bing одновременно ничего не вернули");
      return NextResponse.json({ data: externalArtifacts });
    }

    // АЛГОРИТМ "МОЛНИЯ" (Через один)
    const mixedData = [];
    const maxLength = Math.max(externalArtifacts.length, internalArtifacts.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (internalArtifacts[i]) mixedData.push(internalArtifacts[i]); // Своя
      if (externalArtifacts[i]) mixedData.push(externalArtifacts[i]); // Чужая
    }

    console.log(`[KASHMIR] Mixed ${internalArtifacts.length} internal + ${externalArtifacts.length} external artifacts.`);
    return NextResponse.json({ data: mixedData });

  } catch (error: any) {
    console.error("[KASHMIR FATAL ERROR]", error.message);
    return NextResponse.json({ error: error.message || "Failed to extract visual vibe", data: [] }, { status: 500 });
  }
}
