import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { kashmir } from "../../../lib/kashmir";

// РђРґСЂРµСЃ С‚РІРѕРµРіРѕ Р»РёС‡РЅРѕРіРѕ Cloudflare-С‰РёС‚Р°
const HYDRA_PROXY_URL = "https://kashmir-hydra.firsovivan2003.workers.dev";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("query") || "aesthetic";
    const userId = url.searchParams.get("userId");

    console.log(`[SEARCH] Raw Query: "${rawQuery}", User: ${userId || "Anon"}`);

    // 1. РџСЂРѕРіРѕРЅСЏРµРј Р·Р°РїСЂРѕСЃ С‡РµСЂРµР· РјРѕР·Рі Kashmir (СѓС‡РёС‚С‹РІР°РµРј РјР°РЅРёС„РµСЃС‚ Рё РїР°РјСЏС‚СЊ)
    const optimizedQuery = await kashmir.processQuery(rawQuery, userId);
    console.log(`[SEARCH] Kashmir Optimized Query: "${optimizedQuery}"`);

    // 2. Р¤РѕСЂРјРёСЂСѓРµРј URL РґР»СЏ DuckDuckGo (HTML РІРµСЂСЃРёСЏ РґР»СЏ РїР°СЂСЃРёРЅРіР°)
    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(optimizedQuery)}`;

    // 3. Р—Р°РІРѕСЂР°С‡РёРІР°РµРј Р·Р°РїСЂРѕСЃ РІ Р“РёРґСЂСѓ
    const proxyUrl = `${HYDRA_PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;

    // 4. Р‘СЊРµРј С‡РµСЂРµР· РїСЂРѕРєСЃРё
    const response = await fetch(proxyUrl, { 
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (!response.ok) {
        throw new Error(`Hydra Proxy failed with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const photos: any[] = [];

    // 5. РџР°СЂСЃРёРј СЂРµР·СѓР»СЊС‚Р°С‚С‹ (DuckDuckGo РїСЂСЏС‡РµС‚ РєР°СЂС‚РёРЅРєРё РІ .tile--img)
    $(".tile--img").each((i, el) => {
      const imgNode = $(el).find(".tile--img__img");
      const titleNode = $(el).find(".tile--img__title");
      const linkNode = $(el).find(".tile--img__sub");

      let src = imgNode.attr("data-src") || imgNode.attr("src");
      if (src && src.startsWith("//")) src = "https:" + src;
      
      // Р Р°СЃС€РёС„СЂРѕРІС‹РІР°РµРј СЂРµР°Р»СЊРЅС‹Р№ URL РєР°СЂС‚РёРЅРєРё, РµСЃР»Рё DuckDuckGo РµРіРѕ СЃРїСЂСЏС‚Р°Р»
      if (src && src.includes("external-content.duckduckgo.com")) {
         const realUrlMatch = src.match(/iu=\/?([^&]+)/);
         if (realUrlMatch) src = decodeURIComponent(realUrlMatch[1]);
      }

      const title = titleNode.text().trim();
      let link = linkNode.attr("href") || "";
      if (link.startsWith("//")) link = "https:" + link;

      if (src) {
        photos.push({
          id: `ddg-${Date.now()}-${i}`,
          src,
          thumb: src,
          title: title || optimizedQuery,
          link
        });
      }
    });

    console.log(`[SEARCH] Hydra returned ${photos.length} artifacts.`);

    return NextResponse.json({ data: photos });
  } catch (error: any) {
    console.error("[SEARCH API ERROR]", error.message);
    return NextResponse.json({ error: "Hydra Search failed", data: [] }, { status: 500 });
  }
}