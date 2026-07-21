import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

const generateHashId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash).toString(36) + str.length.toString(36);
};

// ЮВЕЛИРНАЯ ПРАВКА: Добавлен параметр page для бесконечной ленты
async function fetchFromGoogle(rawQuery: string, page: number = 1) {
    if (!process.env.SERPER_API_KEY) return [];

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
            // Запрашиваем 100 HD-картинок С УЧЕТОМ НОМЕРА СТРАНИЦЫ
            body: JSON.stringify({ q: query, num: 100, page: page, imgSize: "large" }),
            cache: "no-store"
        });

        const data = await response.json();
        
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

        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// ОБРАБОТЧИКИ ДЛЯ ПОИСКА (ВОЗВРАЩАЮТ МАССИВ)
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
