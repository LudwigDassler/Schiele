import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Блокируем мертвые CDN, стоки с вотермарками и сайты с защитой от хотлинкинга
const BAD_DOMAINS = [
    "pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", 
    "istockphoto.com", "adobestock.com", "adobe.com", "gettyimages.com", 
    "alamy.com", "amazonaws.com", "s3.ap-", "candidcareer.com"
];

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        // Пропускаем только нормальные http/https ссылки (никаких base64 или локальных путей)
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

// Детерминированный генератор ID. 
// Спасает React от ошибки 'Duplicate keys', жестко привязывая ID к номеру страницы.
const generateSafeId = (url: string, page: number) => {
    const str = url + "-page-" + page;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash); 
};

const memoryCache = new Map();

// Жесткий запрет на кэширование браузером (убивает призрачные баги при переходах назад-вперед)
export const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Зачистка фронтенд-мусора
export const sanitizeQuery = (q: string | null) => {
    if (!q || q === "null" || q === "undefined" || q === "All" || q.trim() === "") {
        return null;
    }
    return q.trim();
};

export async function fetchFromGoogle(rawQuery: string | null, page: number = 1) {
    if (!process.env.SERPER_API_KEY) return [];

    const query = rawQuery || "aesthetic pinterest high quality photography";
    const cacheKey = `${query}-page-${page}`;
    
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey); 
    }

    try {
        const response = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
                "X-API-KEY": process.env.SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, num: 40, page: page }),
            cache: "no-store"
        });

        if (!response.ok) return [];

        const data = await response.json();
        
        const cleanImages = (data.images || [])
            .filter((img: any) => isValidImage(img.imageUrl))
            .map((img: any) => ({
                id: generateSafeId(img.imageUrl, page),
                title: img.title || query,
                image_url: img.imageUrl,
                url: img.imageUrl,
                src: img.imageUrl,
                thumb: img.thumbnailUrl || img.imageUrl,
                width: img.imageWidth || 600,
                height: img.imageHeight || 800,
                source: "google",
                author: img.source || "Web"
            }));

        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        if (uniqueImages.length > 0) {
            memoryCache.set(cacheKey, uniqueImages);
            // Храним в кэше 5 минут, чтобы не перегружать сервер
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000);
        }
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// ==========================================
// РОУТЫ КАТЕГОРИЙ (ВОЗВРАЩАЮТ ОБЪЕКТ)
// ПРАВИЛО: КАТЕГОРИЯ ИМЕЕТ АБСОЛЮТНЫЙ ПРИОРИТЕТ
// ==========================================
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = sanitizeQuery(searchParams.get("category"));
    const fallbackQuery = sanitizeQuery(searchParams.get("query") || searchParams.get("q") || searchParams.get("search"));
    
    // Если есть категория - используем её. Если нет - берем остатки поиска.
    const finalQuery = category || fallbackQuery || "aesthetic";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    
    const images = await fetchFromGoogle(finalQuery, page);
    return NextResponse.json(
        { data: images, pins: images, photos: images, items: images },
        { headers: noCacheHeaders }
    );
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const category = sanitizeQuery(body.category);
        const fallbackQuery = sanitizeQuery(body.query || body.q || body.search);
        
        const finalQuery = category || fallbackQuery || "aesthetic";
        const page = parseInt(body.page || "1", 10) || 1;
        
        const images = await fetchFromGoogle(finalQuery, page);
        return NextResponse.json(
            { data: images, pins: images, photos: images, items: images },
            { headers: noCacheHeaders }
        );
    } catch {
        return NextResponse.json({ data: [], pins: [], photos: [], items: [] }, { headers: noCacheHeaders });
    }
}
