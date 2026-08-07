import { NextResponse } from "next/server";

const dynamic = "force-dynamic";

// Р В РІР‚ВР В Р’В»Р В РЎвЂўР В РЎвЂќР В РЎвЂР РЋР вЂљР РЋРЎвЂњР В Р’ВµР В РЎВ Р В РЎВР В Р’ВµР РЋР вЂљР РЋРІР‚С™Р В Р вЂ Р РЋРІР‚в„–Р В Р’Вµ CDN, Р РЋР С“Р РЋРІР‚С™Р В РЎвЂўР В РЎвЂќР В РЎвЂ Р РЋР С“ Р В Р вЂ Р В РЎвЂўР РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎВР В Р’В°Р РЋР вЂљР В РЎвЂќР В Р’В°Р В РЎВР В РЎвЂ Р В РЎвЂ Р РЋР С“Р В Р’В°Р В РІвЂћвЂ“Р РЋРІР‚С™Р РЋРІР‚в„– Р РЋР С“ Р В Р’В·Р В Р’В°Р РЋРІР‚В°Р В РЎвЂР РЋРІР‚С™Р В РЎвЂўР В РІвЂћвЂ“ Р В РЎвЂўР РЋРІР‚С™ Р РЋРІР‚В¦Р В РЎвЂўР РЋРІР‚С™Р В Р’В»Р В РЎвЂР В Р вЂ¦Р В РЎвЂќР В РЎвЂР В Р вЂ¦Р В РЎвЂ“Р В Р’В°
const BAD_DOMAINS = [
    "pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", 
    "istockphoto.com", "adobestock.com", "adobe.com", "gettyimages.com", 
    "alamy.com", "amazonaws.com", "s3.ap-", "candidcareer.com"
];

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        // Р В РЎСџР РЋР вЂљР В РЎвЂўР В РЎвЂ”Р РЋРЎвЂњР РЋР С“Р В РЎвЂќР В Р’В°Р В Р’ВµР В РЎВ Р РЋРІР‚С™Р В РЎвЂўР В Р’В»Р РЋР Р‰Р В РЎвЂќР В РЎвЂў Р В Р вЂ¦Р В РЎвЂўР РЋР вЂљР В РЎВР В Р’В°Р В Р’В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ http/https Р РЋР С“Р РЋР С“Р РЋРІР‚в„–Р В Р’В»Р В РЎвЂќР В РЎвЂ (Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р В РЎвЂќР В РЎвЂР РЋРІР‚В¦ base64 Р В РЎвЂР В Р’В»Р В РЎвЂ Р В Р’В»Р В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ Р В РЎвЂ”Р РЋРЎвЂњР РЋРІР‚С™Р В Р’ВµР В РІвЂћвЂ“)
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

// Р В РІР‚СњР В Р’ВµР РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В РЎВР В РЎвЂР В Р вЂ¦Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂ“Р В Р’ВµР В Р вЂ¦Р В Р’ВµР РЋР вЂљР В Р’В°Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљ ID. 
// Р В Р Р‹Р В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р’В°Р В Р’ВµР РЋРІР‚С™ React Р В РЎвЂўР РЋРІР‚С™ Р В РЎвЂўР РЋРІвЂљВ¬Р В РЎвЂР В Р’В±Р В РЎвЂќР В РЎвЂ 'Duplicate keys', Р В Р’В¶Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В РЎвЂќР В РЎвЂў Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В Р вЂ Р РЋР РЏР В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р РЋР РЏ ID Р В РЎвЂќ Р В Р вЂ¦Р В РЎвЂўР В РЎВР В Р’ВµР РЋР вЂљР РЋРЎвЂњ Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋРІР‚В Р РЋРІР‚в„–.
const generateSafeId = (url: string, page: number) => {
    const str = url + "-page-" + page;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash); 
};

const memoryCache = new Map();

// Р В РІР‚вЂњР В Р’ВµР РЋР С“Р РЋРІР‚С™Р В РЎвЂќР В РЎвЂР В РІвЂћвЂ“ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р РЋР вЂљР В Р’ВµР РЋРІР‚С™ Р В Р вЂ¦Р В Р’В° Р В РЎвЂќР РЋР РЉР РЋРІвЂљВ¬Р В РЎвЂР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В Р’В±Р РЋР вЂљР В Р’В°Р РЋРЎвЂњР В Р’В·Р В Р’ВµР РЋР вЂљР В РЎвЂўР В РЎВ (Р РЋРЎвЂњР В Р’В±Р В РЎвЂР В Р вЂ Р В Р’В°Р В Р’ВµР РЋРІР‚С™ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В Р’В·Р РЋР вЂљР В Р’В°Р РЋРІР‚РЋР В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р В Р’В±Р В Р’В°Р В РЎвЂ“Р В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР РЋРІР‚В¦Р В РЎвЂўР В РўвЂР В Р’В°Р РЋРІР‚В¦ Р В Р вЂ¦Р В Р’В°Р В Р’В·Р В Р’В°Р В РўвЂ-Р В Р вЂ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РўвЂ)
const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Р В РІР‚вЂќР В Р’В°Р РЋРІР‚РЋР В РЎвЂР РЋР С“Р РЋРІР‚С™Р В РЎвЂќР В Р’В° Р РЋРІР‚С›Р РЋР вЂљР В РЎвЂўР В Р вЂ¦Р РЋРІР‚С™Р В Р’ВµР В Р вЂ¦Р В РўвЂ-Р В РЎВР РЋРЎвЂњР РЋР С“Р В РЎвЂўР РЋР вЂљР В Р’В°
const sanitizeQuery = (q: string | null) => {
    if (!q || q === "null" || q === "undefined" || q === "All" || q.trim() === "") {
        return null;
    }
    return q.trim();
};

async function fetchFromGoogle(rawQuery: string | null, page: number = 1) {
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
            // Р В РўС’Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР В РЎВ Р В Р вЂ  Р В РЎвЂќР РЋР РЉР РЋРІвЂљВ¬Р В Р’Вµ 5 Р В РЎВР В РЎвЂР В Р вЂ¦Р РЋРЎвЂњР РЋРІР‚С™, Р РЋРІР‚РЋР РЋРІР‚С™Р В РЎвЂўР В Р’В±Р РЋРІР‚в„– Р В Р вЂ¦Р В Р’Вµ Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР В Р’В¶Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р В Р’ВµР РЋР вЂљР В Р вЂ Р В Р’ВµР РЋР вЂљ
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000);
        }
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// ==========================================
// Р В Р’В Р В РЎвЂєР В Р в‚¬Р В РЎС›Р В Р’В« Р В РЎв„ўР В РЎвЂ™Р В РЎС›Р В РІР‚СћР В РІР‚СљР В РЎвЂєР В Р’В Р В Р’ВР В РІвЂћСћ (Р В РІР‚в„ўР В РЎвЂєР В РІР‚вЂќР В РІР‚в„ўР В Р’В Р В РЎвЂ™Р В Р’В©Р В РЎвЂ™Р В Р’В®Р В РЎС› Р В РЎвЂєР В РІР‚ВР В Р вЂћР В РІР‚СћР В РЎв„ўР В РЎС›)
// Р В РЎСџР В Р’В Р В РЎвЂ™Р В РІР‚в„ўР В Р’ВР В РІР‚С”Р В РЎвЂє: Р В РЎв„ўР В РЎвЂ™Р В РЎС›Р В РІР‚СћР В РІР‚СљР В РЎвЂєР В Р’В Р В Р’ВР В Р вЂЎ Р В Р’ВР В РЎС™Р В РІР‚СћР В РІР‚СћР В РЎС› Р В РЎвЂ™Р В РІР‚ВР В Р Р‹Р В РЎвЂєР В РІР‚С”Р В Р’В®Р В РЎС›Р В РЎСљР В Р’В«Р В РІвЂћСћ Р В РЎСџР В Р’В Р В Р’ВР В РЎвЂєР В Р’В Р В Р’ВР В РЎС›Р В РІР‚СћР В РЎС›
// ==========================================
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = sanitizeQuery(searchParams.get("category"));
    const fallbackQuery = sanitizeQuery(searchParams.get("query") || searchParams.get("q") || searchParams.get("search"));
    
    // Р В РІР‚СћР РЋР С“Р В Р’В»Р В РЎвЂ Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’ВµР В РЎвЂ“Р В РЎвЂўР РЋР вЂљР В РЎвЂР РЋР РЏ - Р В РЎвЂР РЋР С“Р В РЎвЂ”Р В РЎвЂўР В Р’В»Р РЋР Р‰Р В Р’В·Р РЋРЎвЂњР В Р’ВµР В РЎВ Р В Р’ВµР РЋРІР‚В. Р В РІР‚СћР РЋР С“Р В Р’В»Р В РЎвЂ Р В Р вЂ¦Р В Р’ВµР РЋРІР‚С™ - Р В Р’В±Р В Р’ВµР РЋР вЂљР В Р’ВµР В РЎВ Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р В РЎвЂќР В РЎвЂ Р В РЎвЂ”Р В РЎвЂўР В РЎвЂР РЋР С“Р В РЎвЂќР В Р’В°.
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
