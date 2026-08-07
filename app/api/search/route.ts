import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { kashmir } from "../../../lib/kashmir";
import { classifyIntent } from "../../../lib/intentRouter";

const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev";

// Вспомогательная функция БЕЗ export, чтобы Next.js не сошел с ума
const safelyParseJson = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId") || "anon";
    const explicitMode = url.searchParams.get("mode");

    // "classic" — это дефолт фронтенда, когда юзер сам ничего не выбрал.
    // Он значит "реши сам", а не "никогда не буди Kashmir". Любое другое
    // значение mode (id персоны, явный "kashmir" из Оракула и т.д.) —
    // осознанный выбор юзера, который всегда побеждает эвристику.
    const isExplicitOverride = !!explicitMode && explicitMode !== "classic";
    const intent = isExplicitOverride ? "kashmir" : classifyIntent(rawQuery);

    console.log(`[KASHMIR ROUTER] "${rawQuery}" -> ${intent}${isExplicitOverride ? ` (явный оверрайд: ${explicitMode})` : ""}, User: ${userId}`);

    let optimizedQuery = rawQuery;

    if (intent === "kashmir") {
      // Failsafe: защищаем ядро Кашмира от падений
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

    // Жесткая привязка к en-US для отсечения регионального мусора
    const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(optimizedQuery)}&setmkt=en-US&setlang=en-US&form=HDRSC2`;
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;

    // Timeout-контроллер: даем Гидре ровно 15 секунд на ответ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(proxyUrl, { 
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error("Hydra Proxy connection timed out (15s limit).");
      }
      throw fetchError;
    }
    
    if (!response.ok) {
        throw new Error(`Hydra Proxy dropped connection with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const visualArtifacts: any[] = [];

    // Безопасный парсинг скрытых узлов
    $("a.iusc").each((index, element) => {
      const mData = $(element).attr("m");
      if (mData) {
        const artifact = safelyParseJson(mData);
        if (artifact && artifact.murl) {
          visualArtifacts.push({
            id: `kashmir-visual-${Date.now()}-${index}`,
            src: artifact.murl,     
            thumb: artifact.turl || artifact.murl,
            title: artifact.t || optimizedQuery,   
            link: artifact.purl || ""              
          });
        }
      }
    });

    // Финальная санитаризация: убираем пустышки и битые ссылки
    const cleanArtifacts = visualArtifacts.filter(a => a.src && a.src.startsWith('http'));

    console.log(`[KASHMIR] Successfully extracted ${cleanArtifacts.length} pure visual artifacts.`);

    return NextResponse.json({ data: cleanArtifacts });
  } catch (error: any) {
    console.error("[KASHMIR FATAL ERROR]", error.message);
    return NextResponse.json({ error: error.message || "Failed to extract visual vibe", data: [] }, { status: 500 });
  }
}
