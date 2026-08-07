import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { kashmir } from "../../../lib/kashmir";

// Адрес твоего личного Cloudflare-щита
const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId");

    console.log(`[KASHMIR] Intercepted raw visual request: "${rawQuery}"`);

    // 1. Кашмир осмысляет запрос, пропуская через призму своей личности
    const optimizedQuery = await kashmir.processQuery(rawQuery, userId);
    console.log(`[KASHMIR] Vibe formulated: "${optimizedQuery}"`);

    // 2. Формируем запрос к архитектуре Bing
    const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(optimizedQuery)}`;
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;

    console.log(`[HYDRA] Bypassing restrictions, targeting Bing...`);

    // 3. Бьем через щит
    const response = await fetch(proxyUrl, { 
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (!response.ok) {
        throw new Error(`Hydra Proxy dropped connection with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const visualArtifacts: any[] = [];

    // 4. Элегантная хирургия: вскрываем скрытые JSON-пейлоады в тегах a.iusc
    $("a.iusc").each((index, element) => {
      const mData = $(element).attr("m");
      if (mData) {
        try {
          const artifact = JSON.parse(mData);
          visualArtifacts.push({
            id: `kashmir-visual-${Date.now()}-${index}`,
            src: artifact.murl,     // Прямая ссылка на оригинальный исходник
            thumb: artifact.turl || artifact.murl, // Сжатое превью
            title: artifact.t || optimizedQuery,   // Мета-заголовок
            link: artifact.purl || ""              // Источник (страница)
          });
        } catch (error) {
          // Молча пропускаем битые артефакты, чтобы не ронять весь поток
        }
      }
    });

    console.log(`[KASHMIR] Successfully extracted ${visualArtifacts.length} pure visual artifacts.`);

    return NextResponse.json({ data: visualArtifacts });
  } catch (error: any) {
    console.error("[KASHMIR CORTEX ERROR]", error.message);
    return NextResponse.json({ error: "Failed to extract visual vibe", data: [] }, { status: 500 });
  }
}