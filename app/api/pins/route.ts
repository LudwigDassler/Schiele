import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Броня: Проверяем, что ссылка настоящая, иначе Next.js упадет
function isValidUrl(string: string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;  
    }
}

async function getImages(rawQuery: string) {
    let images: any[] = [];
    const safeQuery = (!rawQuery || rawQuery === "All") ? "aesthetic" : rawQuery;

    try {
        // 1. Ищем в нашей базе (быстрый старт)
        const { data, error } = await supabase
            .from("images")
            .select("*")
            .or(`category.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%,tags.ilike.%${safeQuery}%`)
            .limit(40);

        if (!error && data) {
            images = data.filter(img => isValidUrl(img.src || img.image_url)).map((img: any) => ({
                id: (img.id || Math.random()).toString(),
                title: img.title || safeQuery,
                image_url: img.src || img.image_url,
                url: img.src || img.image_url,
                src: img.src || img.image_url,
                source: img.source || "database",
                author: "Schiele Brain"
            }));
        }
    } catch (e) {
        console.error("DB Error:", e);
    }

    // 2. УМНЫЙ ПАРСИНГ: если в базе мало картинок (< 15), докачиваем в высоком качестве из Google
    if (images.length < 15 && process.env.SERPER_API_KEY) {
        try {
            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": process.env.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                // Запрашиваем только крупные и качественные изображения!
                body: JSON.stringify({ q: safeQuery, num: 40, imgSize: "large" }),
            });

            const googleData = await response.json();
            const parsedImages = (googleData.images || [])
                .filter((img: any) => isValidUrl(img.imageUrl)) // Защита от крашей
                .map((img: any) => ({
                    id: Math.random().toString(36).substring(2, 15), 
                    title: img.title || safeQuery,
                    image_url: img.imageUrl,
                    url: img.imageUrl,
                    src: img.imageUrl,
                    source: "google",
                    author: "Internet"
                }));

            images = [...images, ...parsedImages];

            // Асинхронно сохраняем спарсенное в БД для будущих быстрых загрузок
            if (parsedImages.length > 0) {
                const insertData = parsedImages.map((img: any) => ({
                    src: img.image_url,
                    title: (img.title || "").substring(0, 150),
                    category: safeQuery,
                    source: "google"
                }));
                supabase.from("images").insert(insertData).then();
            }
        } catch (e) {
            console.error("Serper Error:", e);
        }
    }

    // 3. АНТИ-ДУБЛИКАТ: удаляем любые повторяющиеся картинки
    const uniqueImages = Array.from(new Map(images.map(item => [item.image_url, item])).values());
    
    // Рандомизируем ленту, чтобы она всегда выглядела свежей
    return uniqueImages.sort(() => Math.random() - 0.5);
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // ИСПРАВЛЕН БАГ ПОИСКА: Сначала проверяем точный запрос (q/query), и только потом категорию
    let query = searchParams.get("query") || searchParams.get("q");
    if (!query || query === "All") {
        query = searchParams.get("category");
    }
    
    const images = await getImages(query || "");
    return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // ИСПРАВЛЕН БАГ ПОИСКА ДЛЯ POST
        let query = body.query || body.q;
        if (!query || query === "All") {
            query = body.category;
        }
        
        const images = await getImages(query || "");
        return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
    } catch {
        return NextResponse.json({ data: [], photos: [], pins: [] });
    }
}
