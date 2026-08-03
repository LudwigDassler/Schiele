import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isValidImage(url: string) {
    if (!url) return false;
    try {
        const p = new URL(url);
        if (p.protocol !== "http:" && p.protocol !== "https:") return false;
        const BAD_DOMAINS = ["pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", "istockphoto.com"];
        if (BAD_DOMAINS.some(domain => p.hostname.includes(domain))) return false;
        return true; 
    } catch { return false; }
}

const generateSafeId = (url: string, page: number) => {
    let hash = 0; const str = url + "-page-" + page;
    for (let i = 0; i < str.length; i++) hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    return Math.abs(hash).toString(); 
};

export const sanitizeQuery = (q: string | null) => (!q || q === "null" || q.trim() === "") ? null : q.trim();

const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// Простой бесплатный переводчик вместо платного Gemini
async function translateQuery(rawQuery: string) {
    const clean = rawQuery.trim();
    if (/^[a-zA-Z0-9\s\-]+$/.test(clean)) return clean; 
    
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data && data[0] && data[0][0]) return data[0][0][0];
    } catch (e) {
        console.warn("Translation failed");
    }
    return clean;
}

export async function fetchFromDuckDuckGo(rawQuery: string | null, page: number = 1) {
    const query = rawQuery || "aesthetic";
    
    let smartQuery = await translateQuery(query);
    if (!smartQuery.toLowerCase().includes("aesthetic")) {
        smartQuery += " aesthetic";
    }

    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    try {
        const htmlResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(smartQuery)}&ia=images&iax=images`, { headers: { "User-Agent": ua } });
        const html = await htmlResp.text();
        const vqdMatch = html.match(/vqd=["']?([^"'\s&]+)["']?/);
        
        if (!vqdMatch) return [];
        
        const vqd = vqdMatch[1];
        const offset = (page - 1) * 100;
        const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(smartQuery)}&vqd=${vqd}&f=,,,&p=1&s=${offset}`;
        
        const imgResp = await fetch(apiUrl, { headers: { "User-Agent": ua, "Referer": "https://duckduckgo.com/" } });
        if (!imgResp.ok) return [];

        const data = await imgResp.json();
        const cleanImages = (data.results || [])
            .filter((img: any) => isValidImage(img.image))
            .map((img: any) => ({
                id: generateSafeId(img.image, page), title: img.title || query, image_url: img.image, url: img.url, src: img.image, thumb: img.thumbnail || img.image, width: img.width || 600, height: img.height || 800, source: "duckduckgo", author: img.source || "Web"
            }));

        const uniqueImages = Array.from(new Map(cleanImages.map((item: any) => [item.image_url, item])).values());
        return uniqueImages.slice(0, 40); 
    } catch (e) {
        return [];
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = sanitizeQuery(searchParams.get("query") || searchParams.get("q"));
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const images = await fetchFromDuckDuckGo(query, page);
    return NextResponse.json(images, { headers: noCacheHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = sanitizeQuery(body.query || body.q);
        const page = parseInt(body.page || "1", 10) || 1;
        const images = await fetchFromDuckDuckGo(query, page);
        return NextResponse.json(images, { headers: noCacheHeaders });
    } catch {
        return NextResponse.json([], { headers: noCacheHeaders });
    }
}