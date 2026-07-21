import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Броня 1: Валидатор URL
function isValidUrl(string: string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// Броня 2: Генератор стабильных ID (вместо Math.random), чтобы React не дублировал элементы
function generateStableId(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

async function getImages(reqUrl: string, body?: any) {
    const urlObj = new URL(reqUrl);
    const searchParams = urlObj.searchParams;

    // ИСПРАВЛЕН БАГ: Фильтруем "undefined" и отдаем высший приоритет поиску
    let queryParam = searchParams.get("query") || searchParams.get("q") || body?.query || body?.q || "";
    let categoryParam = searchParams.get("category") || body?.category || "";
    let pageParam = parseInt(searchParams.get("page") || body?.page || "1");

    if (queryParam === "undefined" || queryParam === "null") queryParam = "";
    if (categoryParam === "undefined" || categoryParam === "null") categoryParam = "";

    let finalQuery = queryParam || categoryParam || "aesthetic";
    if (finalQuery === "All") finalQuery = "aesthetic";

    let images: any[] = [];
    const limit = 30;
    const start = (pageParam - 1) * limit;
    const end = start + limit - 1;

    try {
        // 1. Ищем в твоей БД с ПАГИНАЦИЕЙ (исправляет дубликаты при скролле)
        const { data, error } = await supabase
            .from("images")
            .select("*")
            .or(`category.ilike.%${finalQuery}%,title.ilike.%${finalQuery}%,tags.ilike.%${finalQuery}%`)
            .order("created_at", { ascending: false }) // Строгая сортировка от новых к старым
            .range(start, end);

        if (!error && data) {
            images = data
                .filter(img => isValidUrl(img.src || img.image_url))
                // ИСПРАВЛЕН БАГ 429: Вырезаем Pixabay, так как он запрещает встраивание картинок
                .filter(img => !(img.src || img.image_url).includes("pixabay.com"))
                .map((img: any) => {
                    const imgUrl = img.src || img.image_url;
                    return {
                        id: img.id?.toString() || generateStableId(imgUrl),
                        title: img.title || finalQuery,
                        image_url: imgUrl,
                        url: imgUrl,
                        src: imgUrl,
                        source: img.source || "database",
                        author: img.author || "Schiele"
                    };
                });
        }
    } catch (e) {
        console.error("DB Error:", e);
    }

    // 2. САМООБУЧЕНИЕ: Если в БД пусто или мы на первой странице и картинок мало — парсим Google
    if (images.length < 15 && pageParam === 1 && process.env.SERPER_API_KEY) {
        try {
            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": process.env.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ q: finalQuery, num: 40, imgSize: "large" }), // Только HD картинки
            });

            const googleData = await response.json();
            const parsedImages = (googleData.images || [])
                .filter((img: any) => isValidUrl(img.imageUrl))
                .map((img: any) => ({
                    id: generateStableId(img.imageUrl),
                    title: img.title || finalQuery,
                    image_url: img.imageUrl,
                    url: img.imageUrl,
                    src: img.imageUrl,
                    source: "google",
                    author: "Internet"
                }));

            images = [...images, ...parsedImages];

            // Фоновое сохранение спарсенного в твою БД
            if (parsedImages.length > 0) {
                const insertData = parsedImages.map((img: any) => ({
                    src: img.image_url,
                    title: (img.title || "").substring(0, 150),
                    category: finalQuery,
                    source: "google"
                }));
                supabase.from("images").insert(insertData).then();
            }
        } catch (e) {
            console.error("Serper Error:", e);
        }
    }

    // 3. ФИНАЛЬНАЯ ЗАЧИСТКА: Жестко убиваем любые повторяющиеся URL
    const uniqueImages = Array.from(new Map(images.map(item => [item.image_url, item])).values());
    
    return uniqueImages;
}

export async function GET(req: Request) {
    const images = await getImages(req.url);
    return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const images = await getImages(req.url, body);
        return NextResponse.json({ data: images, photos: images, pins: images, items: images, images: images });
    } catch {
        return NextResponse.json({ data: [], photos: [], pins: [] });
    }
}
