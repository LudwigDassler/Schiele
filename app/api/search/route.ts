import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { kashmir } from "../../../lib/kashmir";

export const dynamic = "force-dynamic";

function isValidImage(url: string) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    const BAD_DOMAINS = ["pixabay.com", "picsum.photos", "fbsbx.com", "shutterstock.com", "istockphoto.com"];
    try {
        const p = new URL(url);
        return !BAD_DOMAINS.some(domain => p.hostname.includes(domain));
    } catch { return false; }
}

const generateSafeId = (url: string, page: number) => {
    let hash = 0; const str = url + page;
    for (let i = 0; i < str.length; i++) hash = Math.imul(31 * hash + str.charCodeAt(i) | 0, 1);
    return Math.abs(hash).toString(); 
};

const memoryCache = new Map();

export const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export const sanitizeQuery = (q: string | null) => (!q || q === "null" || q.trim() === "") ? null : q.trim();

const fetchWithTimeout = async (url: string, options: any, timeout = 4000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export async function fetchFromEngines(rawQuery: string | null, page: number = 1, userId: string | null = null) {
    const query = rawQuery || "aesthetic";
    
    // Кэш теперь персональный, чтобы не смешивать выдачу разных людей!
    const cacheKey = `${query}-page-${page}-user-${userId || 'anon'}`;
    
    if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey); 

    const smartQuery = await kashmir.processQuery(query, userId);
    
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const searchDDG = async () => {
        const htmlResp = await fetchWithTimeout(`https://duckduckgo.com/?q=${encodeURIComponent(smartQuery)}&ia=images&iax=images`, { headers: { "User-Agent": ua } });
        const html = await htmlResp.text();
        const vqdMatch = html.match(/vqd=["']?([^"'\s&]+)["']?/);
        if (!vqdMatch) throw new Error("DDG VQD Error");
        
        const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(smartQuery)}&vqd=${vqdMatch[1]}&f=,,,&p=1&s=${(page - 1) * 50}`;
        const imgResp = await fetchWithTimeout(apiUrl, { headers: { "User-Agent": ua, "Referer": "https://duckduckgo.com/" } });
        const data = await imgResp.json();
        
        const imgs = (data.results || []).map((img: any) => ({
            id: generateSafeId(img.image, page), title: img.title || query, image_url: img.image, url: img.url, src: img.image, thumb: img.thumbnail || img.image, width: img.width || 600, height: img.height || 800, source: "duckduckgo", author: img.source || "Web"
        })).filter((img: any) => isValidImage(img.image_url));
        
        if (imgs.length === 0) throw new Error("DDG Empty");
        return imgs;
    };

    try {
        const images: any = await searchDDG();
        const uniqueImages = Array.from(new Map(images.map((item: any) => [item.image_url, item])).values());
        if (uniqueImages.length > 0) {
            memoryCache.set(cacheKey, uniqueImages);
            setTimeout(() => memoryCache.delete(cacheKey), 5 * 60 * 1000); 
        }
        return uniqueImages.slice(0, 40); 
    } catch (e) {
        return [];
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = sanitizeQuery(searchParams.get("query") || searchParams.get("q"));
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    
    // Пытаемся достать токен авторизации
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const userId = token?.sub || searchParams.get("userId") || null;

    const images = await fetchFromEngines(query, page, userId);
    return NextResponse.json(images, { headers: noCacheHeaders });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = sanitizeQuery(body.query || body.q);
        const page = parseInt(body.page || "1", 10) || 1;

        // Пытаемся достать токен авторизации
        const token = await getToken({ req, secret: process.env.AUTH_SECRET });
        const userId = token?.sub || body.userId || null;

        const images = await fetchFromEngines(query, page, userId);
        return NextResponse.json(images, { headers: noCacheHeaders });
    } catch { return NextResponse.json([], { headers: noCacheHeaders }); }
}