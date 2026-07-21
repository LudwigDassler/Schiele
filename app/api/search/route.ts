import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Подключаемся к твоей БД Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Функция 1: Берем картинки из БД для главной страницы
async function getFromDatabase() {
    const { data, error } = await supabase
        .from('images')
        .select('src, title, source')
        .limit(50); // Берем 50 картинок из твоей БД

    if (error || !data) {
        console.error('Ошибка БД:', error);
        return [];
    }

    return data.map((img: any) => ({
        id: img.src,
        title: img.title || 'Image',
        image_url: img.src,
        source: img.source || 'database'
    }));
}

// Функция 2: Нейронка/парсер ищет в Google и сохраняет в БД
async function searchGoogle(query: string) {
    if (!process.env.SERPER_API_KEY) return [];

    try {
        const response = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, num: 30 }),
        });

        const data = await response.json();
        const images = (data.images || []).map((img: any) => ({
          id: img.imageUrl,
          title: img.title || query,
          image_url: img.imageUrl,
          source: 'google'
        }));

        // Асинхронно сохраняем спарсенные результаты в твою БД
        if (images.length > 0) {
           const insertData = images.map((img: any) => ({
               src: img.image_url,
               title: img.title ? img.title.substring(0, 150) : query,
               category: query,
               source: 'google'
           }));
           // Сохраняем в таблицу images без await, чтобы не тормозить выдачу
           supabase.from('images').insert(insertData).then();
        }

        return images;
    } catch {
        return [];
    }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('category') || searchParams.get('q') || searchParams.get('query') || '';

  // Если открыли главную или категорию All - берем из твоей БД
  if (!query || query === 'All' || query === 'aesthetic') {
      const dbImages = await getFromDatabase();
      return NextResponse.json(dbImages);
  }

  // Если конкретный запрос - парсим Google
  const googleImages = await searchGoogle(query);
  return NextResponse.json(googleImages);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.category || body.query || body.q || '';
    
    if (!query || query === 'All' || query === 'aesthetic') {
        const dbImages = await getFromDatabase();
        return NextResponse.json(dbImages);
    }

    const googleImages = await searchGoogle(query);
    return NextResponse.json(googleImages);
  } catch {
    return NextResponse.json([]);
  }
}
