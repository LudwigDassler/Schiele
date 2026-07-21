import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Важно: используем SECRET_KEY для обхода правил безопасности БД (RLS)
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getImages(query: string) {
    let images: any[] = [];
    const safeQuery = (!query || query === 'All') ? 'aesthetic' : query;

    try {
        // 1. Сначала ищем в нашей базе Supabase
        const { data, error } = await supabase
            .from('images')
            .select('*')
            .or(`category.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%,tags.ilike.%${safeQuery}%`)
            .limit(50);

        if (!error && data && data.length > 0) {
            images = data.map((img: any) => ({
                ...img,
                id: img.id?.toString() || Math.random().toString(),
                title: img.title || safeQuery,
                image_url: img.src || img.image_url,
                url: img.src || img.image_url,
                src: img.src || img.image_url,
                source: img.source || 'database',
                author: img.author || 'Schiele'
            }));
        }
    } catch (e) {
        console.error('Ошибка БД:', e);
    }

    // 2. Если БД вернула пустоту (например, из-за прав RLS) или ничего не найдено - идем в Google
    if (images.length === 0 && process.env.SERPER_API_KEY) {
        try {
            const response = await fetch('https://google.serper.dev/images', {
                method: 'POST',
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ q: safeQuery, num: 30 }),
            });

            const googleData = await response.json();
            images = (googleData.images || []).map((img: any) => ({
                id: img.imageUrl,
                title: img.title || safeQuery,
                image_url: img.imageUrl,
                url: img.imageUrl,
                src: img.imageUrl,
                source: 'google',
                author: img.source || 'Google'
            }));

            // 3. Фоновое сохранение спарсенных картинок в БД
            if (images.length > 0) {
                const insertData = images.map((img: any) => ({
                    src: img.image_url,
                    title: (img.title || '').substring(0, 150),
                    category: safeQuery,
                    source: 'google'
                }));
                supabase.from('images').insert(insertData).then();
            }
        } catch (e) {
            console.error('Ошибка Serper:', e);
        }
    }

    return images;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('category') || searchParams.get('q') || searchParams.get('query') || '';
    const images = await getImages(query);
    
    // Отдаем во всех ключах сразу, чтобы фронтенд гарантированно нашел данные
    return NextResponse.json({
        data: images,
        photos: images,
        pins: images,
        items: images,
        images: images
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const query = body.category || body.query || body.q || '';
        const images = await getImages(query);
        
        return NextResponse.json({
            data: images,
            photos: images,
            pins: images,
            items: images,
            images: images
        });
    } catch {
        return NextResponse.json({ data: [], photos: [], pins: [] });
    }
}
