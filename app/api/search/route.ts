import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

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
// ИИ-ОПТИМИЗАТОР ЗАПРОСОВ (Убивает Among Us)
// ==========================================
async function enhanceSearchQuery(rawQuery: string) {
    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3
    ].filter(Boolean) as string[];

    if (keys.length === 0) return rawQuery;

    try {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const genAI = new GoogleGenerativeAI(randomKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        
        const prompt = `You are a search query optimizer for an image search engine. 
        User query: "${rawQuery}"
        Task:
        1. Translate to English if it's in another language.
        2. If it's a character, historical figure, or ambiguous term (e.g., "амон гет"), disambiguate it by adding context (e.g., "Amon Goeth Schindler's List").
        3. Return ONLY the final optimized English search string. No quotes, no extra text.`;
        
        const result = await model.generateContent(prompt);
        const optimized = result.response.text().replace(/["']/g, "").trim();
        return optimized || rawQuery;
    } catch (e) {
        return rawQuery;
    }
}

// ==========================================
// ПАРСЕР DUCKDUCKGO
// ==========================================
export async function fetchFromDuckDuckGo(rawQuery: string | null, page: number = 1) {
    const query = rawQuery || "aesthetic pinterest high quality photography";
    const cacheKey = `${query}-page-${page}`;
    const smartQueryKey = `smart-${query}`;
    
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey); 
    }

    try {
        // Проверяем, переводили ли мы уже этот запрос (чтобы не дергать ИИ при скролле вниз)
        let smartQuery = memoryCache.get(smartQueryKey);
        if (!smartQuery) {
            smartQuery = await enhanceSearchQuery(query);
            memoryCache.set(smartQueryKey, smartQuery);
            setTimeout(() => memoryCache.delete(smartQueryKey), 15 * 60 * 1000); // чистим через 15 минут
        }

        const htmlResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(smartQuery)}&ia=images&iax=images`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        });
        
        const html = await htmlResp.text();
        const vqdMatch = html.match(/vqd=["']?([^"'\s&]+)["']?/);
        if (!vqdMatch) return [];
        const vqd = vqdMatch[1];
        
        const offset = (page - 1) * 100;
        const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(smartQuery)}&vqd=${vqd}&f=,,,&p=1&s=${offset}`;
        
        const imgResp = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://duckduckgo.com/"
            }
        });

        if (!imgResp.ok) return [];

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

        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        if (uniqueImages.length > 0) {
            memoryCache.set(cacheKey, uniqueImages);
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000); 
        }
        
        return uniqueImages.slice(0, 40); 
    } catch (e) {
        console.error("Search Error:", e);
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