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

// ФУНДАМЕНТАЛЬНОЕ ИСПРАВЛЕНИЕ: Строго числовой ID. 
// Убраны все toString(), чтобы React не крашился при маршрутизации.
const generateSafeId = (url: string) => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = Math.imul(31 * hash + url.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash) + Math.floor(Math.random() * 100000);
};

const memoryCache = new Map();

async function fetchFromGoogle(rawQuery: string, page: number = 1) {
    if (!process.env.SERPER_API_KEY) return [];

    let query = rawQuery || "aesthetic pinterest high quality photography";
    if (query.toLowerCase() === "all") {
        query = "aesthetic pinterest photography wallpaper";
    }

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
                id: generateSafeId(img.imageUrl), // Теперь это Number
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
            setTimeout(() => memoryCache.delete(cacheKey), 10 * 60 * 1000);
        }
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// РОУТЫ ДЛЯ ПОИСКА (ВОЗВРАЩАЮТ ЧИСТЫЙ МАССИВ)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || searchParams.get("q") || searchParams.get("search") || searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const images = await fetchFromGoogle(query, page);
    return NextResponse.json(images);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = body.query || body.q || body.search || body.category || "";
        const page = parseInt(body.page || "1", 10) || 1;
        const images = await fetchFromGoogle(query, page);
        return NextResponse.json(images);
    } catch {
        return NextResponse.json([]);
    }
}
