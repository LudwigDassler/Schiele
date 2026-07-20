import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getImages(query: string) {
    if (!process.env.SERPER_API_KEY) return [];
    
    // Очищаем запрос: если 'All', ищем что-то общее
    const safeQuery = (query === 'All' || !query) ? 'aesthetic' : query;

    try {
        const response = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: safeQuery, num: 20 }),
        });

        const data = await response.json();
        return (data.images || []).map((img: any) => ({
          id: img.imageUrl,
          title: img.title || safeQuery,
          image_url: img.imageUrl,
          source: 'google'
        }));
    } catch (e) {
        console.error('Ошибка поиска:', e);
        return [];
    }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Теперь ищем 'category' первым делом!
  const query = searchParams.get('category') || searchParams.get('q') || searchParams.get('query') || 'aesthetic';
  const images = await getImages(query);
  return NextResponse.json({ data: images, pins: images, items: images });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.category || body.query || body.q || 'aesthetic';
    const images = await getImages(query);
    return NextResponse.json({ data: images, pins: images, items: images });
  } catch {
    return NextResponse.json({ data: [], pins: [], items: [] });
  }
}
