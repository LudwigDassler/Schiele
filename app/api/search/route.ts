import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { classifyIntent } from "../../../lib/intentRouter";
import { supabase } from "../../../lib/supabase";
import { bayesianGuillotine } from "../../../lib/overseer";

const HYDRA_PROXY_URL = (
  process.env.HYDRA_PROXY_URL || "https://kashmir-hydra.firsovivan2003.workers.dev"
).replace(/\/$/, "");
const PAGE_SIZE = 35;
const CACHE_TTL_HOURS = 24;
const MAX_CACHE_ENTRIES = 1000;
const CACHE_VERSION = "v4";

const TOXIC_PATTERNS = /(stock|vector|clipart|template|royalty.?free|watermark|alamy|getty|shutter|depositphotos|123rf|dreamstime|freepik|pngtree|illustration|logo|icon|map|chart|graph|diagram|infographic|drawing|sketch|slideshare|researchgate|statista|powerpoint|presentation|spreadsheet|statistics|economic.?sector|rapid.?growth|exports|plarium|neuroderm|mobileye|wikipedia\.org\/wiki\/file)/i;

const SEO_SPAM = /(download|buy|premium|price|subscribe|cheap|discount|high.?res|hd.?free|wallpaper.?4k)/i;

function heuristicGuillotine(results: any[], originalQuery: string) {
  return results.filter((item) => {
    const srcUrl = (item.src || item.thumb || "").toLowerCase();
    const linkUrl = (item.link || "").toLowerCase();
    const combinedUrl = `${srcUrl} ${linkUrl}`;
    const title = (item.title || "").toLowerCase();

    if (!srcUrl.startsWith("http")) return false;
    if (TOXIC_PATTERNS.test(combinedUrl) || TOXIC_PATTERNS.test(title)) return false;
    if (SEO_SPAM.test(title) || SEO_SPAM.test(combinedUrl)) return false;

    const wordsCount = title.split(/[\s,|_-]+/).length;
    if (wordsCount > 18) return false;

    const isPopTrap = originalQuery.toLowerCase().includes("поп");
    if (
      isPopTrap &&
      (title.includes("popul") ||
        title.includes("africa") ||
        title.includes("world map") ||
        title.includes("geography"))
    ) {
      return false;
    }

    return true;
  });
}

const safelyParseJson = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

function cacheKey(query: string, page: number) {
  return `${CACHE_VERSION}::${query.trim().toLowerCase()}::p${page}`;
}

async function readCache(key: string, allowStale = false): Promise<any[] | null> {
  try {
    const { data } = await supabase
      .from("search_cache")
      .select("results, created_at")
      .eq("query_key", key)
      .maybeSingle();

    if (!data) return null;

    const ageHours = (Date.now() - new Date(data.created_at).getTime()) / 36e5;
    if (!allowStale && ageHours > CACHE_TTL_HOURS) {
      await supabase.from("search_cache").delete().eq("query_key", key);
      return null;
    }

    const cachedResults = data.results as any[];
    return Array.isArray(cachedResults) && cachedResults.length > 0 ? cachedResults : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, results: any[]) {
  if (!results || results.length === 0) return;
  try {
    const { count } = await supabase
      .from("search_cache")
      .select("*", { count: "exact", head: true });

    if ((count || 0) > MAX_CACHE_ENTRIES) {
      await supabase
        .from("search_cache")
        .delete()
        .lt("created_at", new Date(Date.now() - CACHE_TTL_HOURS * 36e5).toISOString());
    }

    await supabase
      .from("search_cache")
      .upsert(
        { query_key: key, results, created_at: new Date().toISOString() },
        { onConflict: "query_key" }
      );
  } catch {}
}

async function searchDuckDuckGo(query: string, page: number) {
  if (!HYDRA_PROXY_URL) return [];
  const isCyrillic = /[а-яА-ЯёЁ]/.test(query);
  const locale = isCyrillic ? "ru-ru" : "us-en";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": isCyrillic ? "ru-RU,ru;q=0.9,en-US;q=0.8" : "en-US,en;q=0.9",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // Точная сигнатура из рабочего исходника
    const tokenTargetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const tokenProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(tokenTargetUrl)}`;

    const tokenRes = await fetch(tokenProxyUrl, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!tokenRes.ok) throw new Error("Hydra Proxy (Token) error");

    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/i);
    if (!vqdMatch || !vqdMatch[1]) throw new Error("No vqd");
    const vqd = vqdMatch[1];

    const offset = (page - 1) * PAGE_SIZE;
    const imgTargetUrl = `https://duckduckgo.com/i.js?l=${locale}&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=type:photo&s=${offset}`;
    const imgProxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(imgTargetUrl)}`;

    const imgRes = await fetch(imgProxyUrl, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await imgRes.text();
    clearTimeout(timeoutId);

    const data = safelyParseJson(rawText);
    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    return data.results
      .map((r: any, index: number) => ({
        id: `ddg-${Date.now()}-${offset + index}`,
        src: r.image,
        thumb: r.thumbnail || r.image,
        title: r.title || query,
        link: r.url || r.image,
        source: "duckduckgo",
      }))
      .slice(0, PAGE_SIZE);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name !== "AbortError") {
      console.error("[DDG SCRAPER ERROR]", error.message);
    }
    return [];
  }
}

async function searchBing(query: string, page: number) {
  if (!HYDRA_PROXY_URL) return [];
  const isCyrillic = /[а-яА-ЯёЁ]/.test(query);
  const mkt = isCyrillic ? "ru-RU" : "en-US";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const first = (page - 1) * PAGE_SIZE + 1;
    const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&qft=+filterui:photo-photo&setmkt=${mkt}&setlang=${mkt}&form=HDRSC2&first=${first}`;
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": isCyrillic ? "ru-RU,ru;q=0.9,en-US;q=0.8" : "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
            link: artifact.purl || "",
            source: "bing",
          });
        }
      }
    });

    return visualArtifacts.filter((a) => a.src && a.src.startsWith("http")).slice(0, PAGE_SIZE);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name !== "AbortError") {
      console.error("[BING SCRAPER ERROR]", error.message);
    }
    return [];
  }
}

async function searchInternalDatabase(query: string, page: number) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .or(`image_description.ilike.%${query}%,core_vibe.ilike.%${query}%,title.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data) return [];

    return data.map((img: any) => ({
      id: `schiele-db-${img.id}`,
      src: img.src || img.image_url,
      thumb: img.src || img.image_url,
      title: img.core_vibe ? `[Schiele] ${img.core_vibe}` : query,
      link: img.src || img.image_url,
      isInternal: true,
      source: "internal_db",
    }));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId") || "anon";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

    const mixWithInternal = url.searchParams.get("mix") === "true";
    const intent = classifyIntent(rawQuery);

    let safeQuery = rawQuery
      .replace(/^[^a-zA-Z0-9А-Яа-яЁё]+/, "")
      .replace(/([a-zA-Z0-9А-Яа-яЁё]+)(?:\s+\1\b)+/gi, "$1")
      .replace(/\s+/g, " ")
      .trim();

    if (!safeQuery) safeQuery = "cinematic aesthetic";

    console.log(`[KASHMIR ROUTER] "${safeQuery}" -> ${intent}, User: ${userId}, Page: ${page}`);

    const optimizedQuery = safeQuery;
    const key = cacheKey(optimizedQuery, page);

    const internalSearchPromise = mixWithInternal
      ? searchInternalDatabase(optimizedQuery, page)
      : Promise.resolve([]);

    let externalArtifacts: any[] = [];
    let fromCache = false;

    const cached = await readCache(key);
    if (cached && cached.length > 0) {
      console.log(`[KASHMIR CACHE] Hit для "${optimizedQuery}" (страница ${page})`);
      externalArtifacts = heuristicGuillotine(cached, safeQuery);
      fromCache = externalArtifacts.length > 0;
    }

    if (!fromCache) {
      externalArtifacts = await searchDuckDuckGo(optimizedQuery, page);
      let source = "ddg";

      if (externalArtifacts.length === 0) {
        console.warn(`[KASHMIR] DDG вернул пусто, пробуем Bing...`);
        externalArtifacts = await searchBing(optimizedQuery, page);
        source = "bing";
      }

      if (externalArtifacts.length > 0) {
        console.log(`[KASHMIR] Успешно извлечено ${externalArtifacts.length} артефактов через ${source}.`);
      }
    }

    let filterApplied = false;
    if (externalArtifacts && externalArtifacts.length > 0) {
      const pureArtifacts = heuristicGuillotine(externalArtifacts, safeQuery);
      const survivedArtifacts = bayesianGuillotine(pureArtifacts);

      if (survivedArtifacts.length > 0) {
        const bayesDeathToll = pureArtifacts.length - survivedArtifacts.length;
        externalArtifacts = survivedArtifacts;
        filterApplied = true;
        console.log(`[OVERSEER: BAYES] Казнено: ${bayesDeathToll}. Итого выжило: ${externalArtifacts.length}`);
      } else {
        externalArtifacts = pureArtifacts;
      }

      if (!fromCache && externalArtifacts.length > 0) {
        await writeCache(key, externalArtifacts);
      }
    }

    const internalArtifacts = await internalSearchPromise;

    if (!mixWithInternal || internalArtifacts.length === 0) {
      return NextResponse.json({
        data: externalArtifacts,
        meta: {
          source: filterApplied ? "filtered_external" : "external",
          total: externalArtifacts.length,
        },
      });
    }

    const mixedData = [];
    const maxLength = Math.max(externalArtifacts.length, internalArtifacts.length);
    for (let i = 0; i < maxLength; i++) {
      if (internalArtifacts[i]) mixedData.push(internalArtifacts[i]);
      if (externalArtifacts[i]) mixedData.push(externalArtifacts[i]);
    }

    return NextResponse.json({
      data: mixedData,
      meta: {
        source: "mixed",
        internal: internalArtifacts.length,
        external: externalArtifacts.length,
        filtered: filterApplied,
      },
    });
  } catch (error: any) {
    console.error("[KASHMIR FATAL ERROR]", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to extract visual vibe", data: [], meta: { error: true } },
      { status: 500 }
    );
  }
}
