import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ЧЕРНЫЙ СПИСОК: Вырезаем сайты, которые блокируют встраивание или портят эстетику
const BAD_DOMAINS = ["pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", "istockphoto.com"];

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        if (p.protocol !== "http:" && p.protocol !== "https:") return false;
        if (BAD_DOMAINS.some(domain => p.hostname.includes(domain))) return false;
        return true;
    } catch {
        return false;
    }
}

// Надежный генератор ID, чтобы React не путался в дубликатах
const generateHashId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash).toString(36) + str.length.toString(36);
};

async function fetchFromGoogle(rawQuery: string) {
    if (!process.env.SERPER_API_KEY) return [];

    // Умная обработка пустого запроса или "All"
    let query = rawQuery || "aesthetic pinterest high quality photography";
    if (query.toLowerCase() === "all") {
        query = "aesthetic pinterest photography wallpaper";
    }

    try {
        const response = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
                "X-API-KEY": process.env.SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            // Запрашиваем 100 HD-картинок, чтобы было из чего фильтровать
            body: JSON.stringify({ q: query, num: 100, imgSize: "large" }),
            cache: "no-store"
        });

        const data = await response.json();
        
        // Маппинг и жесточайшая фильтрация
        const cleanImages = (data.images || [])
            .filter((img: any) => isValidImage(img.imageUrl))
            .map((img: any) => ({
                id: generateHashId(img.imageUrl),
                title: img.title || query,
                image_url: img.imageUrl,
                url: img.imageUrl,
                src: img.imageUrl,
                source: "google",
                author: img.source || "Web"
            }));

        // Полное уничтожение дубликатов по прямой ссылке на картинку
        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    // Точный приоритет: Ищем запрос пользователя, если нет - берем категорию
    const query = searchParams.get("query") || searchParams.get("q") || searchParams.get("category") || "";
    
    const images = await fetchFromGoogle(query);
    return NextResponse.json({ data: images, pins: images, photos: images, items: images });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = body.query || body.q || body.category || "";
        
        const images = await fetchFromGoogle(query);
        return NextResponse.json({ data: images, pins: images, photos: images, items: images });
    } catch {
        return NextResponse.json({ data: [], pins: [], photos: [], items: [] });
    }
}
