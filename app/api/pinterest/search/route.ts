import { NextResponse } from 'next/server';

// Принуждаем Next.js никогда не кэшировать этот ответ
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!process.env.SERPER_API_KEY) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 20 }),
    });

    const data = await response.json();
    const formattedImages = (data.images || []).map((img: any) => ({
      id: img.imageUrl,
      title: img.title || query,
      image_url: img.imageUrl,
      source: 'google'
    }));

    return NextResponse.json({ data: formattedImages, pins: formattedImages });
  } catch (error) {
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
