import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!process.env.SERPER_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 20 }), // Запрашиваем 20 картинок
    });

    const data = await response.json();
    
    // Форматируем ответ, чтобы фронтенд его "понял" (используем images из Serper)
    const formattedImages = (data.images || []).map((img: any) => ({
      id: img.imageUrl,
      title: img.title || query,
      image_url: img.imageUrl,
      source: 'google'
    }));

    return NextResponse.json({ data: formattedImages, pins: formattedImages });
  } catch (error) {
    console.error('Ошибка Serper API:', error);
    return NextResponse.json({ error: 'Search failed', data: [] }, { status: 500 });
  }
}
