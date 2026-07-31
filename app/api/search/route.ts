import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Оставляем фильтр плохих доменов, чтобы в эстетику не пролез водяной знак Shutterstock
const BAD_DOMAINS = [
    "pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", 
    "istockphoto.com", "adobestock.com", "adobe.com", "gettyimages.com", 
    "alamy.com", "amazonaws.com", "s3.ap-", "candidcareer.com"
];

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        if (p.protocol !== "http:" && p.protocol !== "https:") return false;
        if (BAD_DOMAINS.some(domain => p.hostname.includes(domain))) return false;
        
        const validExt = /\.(jpeg|jpg|gif|png|webp|avif|bmp)$/i.test(p.pathname);
        if (!validExt && !p.hostname.includes("unsplash.com") && !p.hostname.includes("pinimg.com")) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

const generateSafeId = (url: string, page: number) => {
    const str = url + "-page-" + page;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash); 
};

const memoryCache = new Map();

export const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export const sanitizeQuery = (q: string | null) => {
    if (!q || q === "null" || q === "undefined" || q === "All" || q.trim() === "") {
        return null;
    }
    return q.trim();
};

// ==========================================
// НОВЫЙ ХАКЕРСКИЙ ПАРСЕР DUCKDUCKGO
// ==========================================
export async function fetchFromDuckDuckGo(rawQuery: string | null, page: number = 1) {
    const query = rawQuery || "aesthetic pinterest high quality photography";
    const cacheKey = `${query}-page-${page}`;
    
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey); 
    }

    try {
        // ШАГ 1: Притворяемся браузером и забираем секретный токен vqd
        const htmlResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        });
        
        const html = await htmlResp.text();
        
        // Регулярка для вытаскивания токена из сырого HTML
        const vqdMatch = html.match(/vqd=["']?([^"'\s&]+)["']?/);
        if (!vqdMatch) {
            console.error("[DDG Parser Error] Token vqd not found! IP might be flagged or DDG changed their HTML.");
            return [];
        }
        const vqd = vqdMatch[1];
        
        // ШАГ 2: Бьем прямо в скрытый API картинок
        // s - это offset (сдвиг). DDG отдает пачками примерно по 100 штук
        const offset = (page - 1) * 100;
        const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1&s=${offset}`;
        
        const imgResp = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://duckduckgo.com/"
            }
        });

        if (!imgResp.ok) {
            console.error(`[DDG API Error] Status: ${imgResp.status}`);
            return [];
        }

        const data = await imgResp.json();
        
        const cleanImages = (data.results || [])
            .filter((img: any) => isValidImage(img.image))
            .map((img: any) => ({
                id: generateSafeId(img.image, page),
                title: img.title || query,
                image_url: img.image,
                url: img.url,
                src: img.image,
                thumb: img.thumbnail || img.image,
                width: img.width || 600,
                height: img.height || 800,
                source: "duckduckgo",
                author: img.source || "Web"
            }));

        // Убираем дубликаты
        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        if (uniqueImages.length > 0) {
            memoryCache.set(cacheKey, uniqueImages);
            // Кэшируем на 5 минут, чтобы не спамить DDG одними и теми же запросами
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000); 
        }
        
        // Возвращаем первые 40 картинок, как и было у Serper, чтобы не перегружать интерфейс
        return uniqueImages.slice(0, 40); 
    } catch (e) {
        console.error("DuckDuckGo Parsing Error:", e);
        return [];
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = sanitizeQuery(searchParams.get("query") || searchParams.get("q") || searchParams.get("search"));
    const fallbackCategory = sanitizeQuery(searchParams.get("category"));
    
    const finalQuery = query || fallbackCategory || "aesthetic";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    
    const images = await fetchFromDuckDuckGo(finalQuery, page);
    return NextResponse.json(images, { headers: noCacheHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = sanitizeQuery(body.query || body.q || body.search);
        const fallbackCategory = sanitizeQuery(body.category);
        
        const finalQuery = query || fallbackCategory || "aesthetic";
        const page = parseInt(body.page || "1", 10) || 1;
        
        const images = await fetchFromDuckDuckGo(finalQuery, page);
        return NextResponse.json(images, { headers: noCacheHeaders });
    } catch {
        return NextResponse.json([], { headers: noCacheHeaders });
    }
}