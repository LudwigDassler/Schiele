import { NextResponse } from "next/server";

const dynamic = "force-dynamic";

// Р вЂР В»Р С•Р С”Р С‘РЎР‚РЎС“Р ВµР С Р СР ВµРЎР‚РЎвЂљР Р†РЎвЂ№Р Вµ CDN, РЎРѓРЎвЂљР С•Р С”Р С‘ РЎРѓ Р Р†Р С•РЎвЂљР ВµРЎР‚Р СР В°РЎР‚Р С”Р В°Р СР С‘ Р С‘ РЎРѓР В°Р в„–РЎвЂљРЎвЂ№ РЎРѓ Р В·Р В°РЎвЂ°Р С‘РЎвЂљР С•Р в„– Р С•РЎвЂљ РЎвЂ¦Р С•РЎвЂљР В»Р С‘Р Р…Р С”Р С‘Р Р…Р С–Р В°
const BAD_DOMAINS = [
    "pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", 
    "istockphoto.com", "adobestock.com", "adobe.com", "gettyimages.com", 
    "alamy.com", "amazonaws.com", "s3.ap-", "candidcareer.com"
];

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        // Р СџРЎР‚Р С•Р С—РЎС“РЎРѓР С”Р В°Р ВµР С РЎвЂљР С•Р В»РЎРЉР С”Р С• Р Р…Р С•РЎР‚Р СР В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ http/https РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘ (Р Р…Р С‘Р С”Р В°Р С”Р С‘РЎвЂ¦ base64 Р С‘Р В»Р С‘ Р В»Р С•Р С”Р В°Р В»РЎРЉР Р…РЎвЂ№РЎвЂ¦ Р С—РЎС“РЎвЂљР ВµР в„–)
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

// Р вЂќР ВµРЎвЂљР ВµРЎР‚Р СР С‘Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р Р…РЎвЂ№Р в„– Р С–Р ВµР Р…Р ВµРЎР‚Р В°РЎвЂљР С•РЎР‚ ID. 
// Р РЋР С—Р В°РЎРѓР В°Р ВµРЎвЂљ React Р С•РЎвЂљ Р С•РЎв‚¬Р С‘Р В±Р С”Р С‘ 'Duplicate keys', Р В¶Р ВµРЎРѓРЎвЂљР С”Р С• Р С—РЎР‚Р С‘Р Р†РЎРЏР В·РЎвЂ№Р Р†Р В°РЎРЏ ID Р С” Р Р…Р С•Р СР ВµРЎР‚РЎС“ РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ РЎвЂ№.
const generateSafeId = (url: string, page: number) => {
    const str = url + "-page-" + page;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    }
    return Math.abs(hash); 
};

const memoryCache = new Map();

// Р вЂ“Р ВµРЎРѓРЎвЂљР С”Р С‘Р в„– Р В·Р В°Р С—РЎР‚Р ВµРЎвЂљ Р Р…Р В° Р С”РЎРЊРЎв‚¬Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р С•Р С (РЎС“Р В±Р С‘Р Р†Р В°Р ВµРЎвЂљ Р С—РЎР‚Р С‘Р В·РЎР‚Р В°РЎвЂЎР Р…РЎвЂ№Р Вµ Р В±Р В°Р С–Р С‘ Р С—РЎР‚Р С‘ Р С—Р ВµРЎР‚Р ВµРЎвЂ¦Р С•Р Т‘Р В°РЎвЂ¦ Р Р…Р В°Р В·Р В°Р Т‘-Р Р†Р С—Р ВµРЎР‚Р ВµР Т‘)
const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Р вЂ”Р В°РЎвЂЎР С‘РЎРѓРЎвЂљР С”Р В° РЎвЂћРЎР‚Р С•Р Р…РЎвЂљР ВµР Р…Р Т‘-Р СРЎС“РЎРѓР С•РЎР‚Р В°
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
            // Р ТђРЎР‚Р В°Р Р…Р С‘Р С Р Р† Р С”РЎРЊРЎв‚¬Р Вµ 5 Р СР С‘Р Р…РЎС“РЎвЂљ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р Р…Р Вµ Р С—Р ВµРЎР‚Р ВµР С–РЎР‚РЎС“Р В¶Р В°РЎвЂљРЎРЉ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000);
        }
        
        return uniqueImages;
    } catch (e) {
        console.error("Google Parsing Error:", e);
        return [];
    }
}
// ==========================================
// Р В Р С›Р Р€Р СћР В« Р С™Р С’Р СћР вЂўР вЂњР С›Р В Р ВР в„ў (Р вЂ™Р С›Р вЂ”Р вЂ™Р В Р С’Р В©Р С’Р В®Р Сћ Р С›Р вЂР Р„Р вЂўР С™Р Сћ)
// Р СџР В Р С’Р вЂ™Р ВР вЂєР С›: Р С™Р С’Р СћР вЂўР вЂњР С›Р В Р ВР Р‡ Р ВР СљР вЂўР вЂўР Сћ Р С’Р вЂР РЋР С›Р вЂєР В®Р СћР СњР В«Р в„ў Р СџР В Р ВР С›Р В Р ВР СћР вЂўР Сћ
// ==========================================
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = sanitizeQuery(searchParams.get("category"));
    const fallbackQuery = sanitizeQuery(searchParams.get("query") || searchParams.get("q") || searchParams.get("search"));
    
    // Р вЂўРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ - Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С Р ВµРЎвЂ. Р вЂўРЎРѓР В»Р С‘ Р Р…Р ВµРЎвЂљ - Р В±Р ВµРЎР‚Р ВµР С Р С•РЎРѓРЎвЂљР В°РЎвЂљР С”Р С‘ Р С—Р С•Р С‘РЎРѓР С”Р В°.
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
