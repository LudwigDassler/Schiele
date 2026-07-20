import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getImages(query: string) {
    if (!process.env.SERPER_API_KEY) return [];
    
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 20 }),
    });

    const data = await response.json();
    return (data.images || []).map((img: any) => ({
      id: img.imageUrl,
      title: img.title || query,
      image_url: img.imageUrl,
      source: 'google'
    }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || searchParams.get('query') || 'aesthetic';
  const images = await getImages(query);
  return NextResponse.json({ data: images, pins: images, items: images });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || body.q || 'aesthetic';
    const images = await getImages(query);
    return NextResponse.json({ data: images, pins: images, items: images });
  } catch {
    return NextResponse.json({ data: [], pins: [], items: [] });
  }
}
