import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BAD_DOMAINS = [
    "pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", 
    "istockphoto.com", "adobestock.com", "adobe.com", "gettyimages.com", "alamy.com"
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

// ГЕНИАЛЬНЫЙ ID: Числовой, защищен от дубликатов на разных страницах пагинации
const generateSafeId = (url: string, page: number) => {
    const str = url + "-page-" + page;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash); // Всегда возвращает чистое, безопасное число
};

const memoryCache = new Map();

// Броня от кэширования Next.js на стороне клиента
export const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Зачистка мусора от фронтенда
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
                id: generateSafeId(img.imageUrl, page), // Привязываем ID к странице
                title: img.title || query,
                image_url: img.imageUrl,
                url: img.imageUrl,
                src: img.imageUrl,
                thumb: img.thumbnailUrl || img.imageUrl,
                // Абсолютная защита от краша <Image /> (даем дефолтные размеры, если их нет)
                width: img.imageWidth || 600,
                height: img.imageHeight || 800,
                source: "google",
                author: img.source || "Web"
            }));

        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        if (uniqueImages.length > 0) {
            memoryCache.set(cacheKey, uniqueImages);
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000);
        }
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// ОБРАБОТЧИКИ ДЛЯ ПОИСКА (ВОЗВРАЩАЮТ МАССИВ)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = sanitizeQuery(searchParams.get("query") || searchParams.get("q") || searchParams.get("search"));
    const category = sanitizeQuery(searchParams.get("category"));
    
    const finalQuery = query || category || "aesthetic";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    
    const images = await fetchFromGoogle(finalQuery, page);
    return NextResponse.json(images, { headers: noCacheHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = sanitizeQuery(body.query || body.q || body.search);
        const category = sanitizeQuery(body.category);
        
        const finalQuery = query || category || "aesthetic";
        const page = parseInt(body.page || "1", 10) || 1;
        
        const images = await fetchFromGoogle(finalQuery, page);
        return NextResponse.json(images, { headers: noCacheHeaders });
    } catch {
        return NextResponse.json([], { headers: noCacheHeaders });
    }
}
