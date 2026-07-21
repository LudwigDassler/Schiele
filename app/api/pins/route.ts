import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function getImages(query: string) {
    let images: any[] = [];
    const safeQuery = (!query || query === "All") ? "aesthetic" : query;

    try {
        // 1. МОЗГ: Ищем в БД ТОЛЬКО те картинки, которые нашел наш умный парсер
        // Это отсекает весь старый мусор с Pixabay/Pexels, который выдает 429 ошибку
        const { data, error } = await supabase
            .from("images")
            .select("*")
            .eq("source", "google")
            .or(`category.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%,tags.ilike.%${safeQuery}%`)
            .limit(50);

        if (!error && data && data.length > 0) {
            images = data.map((img: any) => ({
                id: img.id?.toString() || Math.random().toString(36).substring(2, 15),
                title: img.title || safeQuery,
                image_url: img.src || img.image_url,
                url: img.src || img.image_url,
                src: img.src || img.image_url,
                source: img.source,
                author: img.author || "Schiele Brain"
            }));
        }
    } catch (e) {
        console.error("Ошибка БД:", e);
    }

    // 2. САМООБУЧЕНИЕ: Если картинок по запросу нет - парсим интернет (Google)
    if (images.length === 0 && process.env.SERPER_API_KEY) {
        try {
            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": process.env.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ q: safeQuery, num: 40 }),
            });

            const googleData = await response.json();
            images = (googleData.images || []).map((img: any) => ({
                id: Math.random().toString(36).substring(2, 15), 
                title: img.title || safeQuery,
                image_url: img.imageUrl,
                url: img.imageUrl,
                src: img.imageUrl,
                source: "google",
                author: "Schiele Brain"
            }));

            // Сохраняем найденное в БД для будущих запросов
            if (images.length > 0) {
                const insertData = images.map((img: any) => ({
                    src: img.image_url,
                    title: (img.title || "").substring(0, 150),
                    category: safeQuery,
                    source: "google"
                }));
                supabase.from("images").insert(insertData).then();
            }
        } catch (e) {
            console.error("Ошибка парсера:", e);
        }
    }

    // 3. АНТИ-ДУБЛИКАТ: оставляем только уникальные URL, чтобы не было одинаковых фото
    const uniqueImages = Array.from(new Map(images.map(item => [item.image_url, item])).values());
    
    // ПЕРЕМЕШИВАНИЕ: чтобы лента выглядела органично
    return uniqueImages.sort(() => Math.random() - 0.5);
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("category") || searchParams.get("q") || searchParams.get("query") || "";
    const images = await getImages(query);
    return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = body.category || body.query || body.q || "";
        const images = await getImages(query);
        return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
    } catch {
        return NextResponse.json({ data: [], photos: [], pins: [] });
    }
}
