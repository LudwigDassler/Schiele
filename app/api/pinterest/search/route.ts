import { NextResponse } from 'next/server';

async function searchAllSources(query: string) {
  const promises = [];

  // 1. Unsplash
  if (process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
    promises.push(
      fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15`, {
        headers: { Authorization: `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}` }
      }).then(res => res.json()).then(data => {
        return (data.results || []).map((img: any) => ({
          id: `un_${img.id}`,
          title: img.alt_description || query,
          image_url: img.urls?.regular || img.urls?.small,
          source: 'unsplash'
        }));
      }).catch((e) => { console.error('Unsplash error', e); return []; })
    );
  }

  // 2. Pexels
  if (process.env.PEXELS_API_KEY) {
    promises.push(
      fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`, {
        headers: { Authorization: process.env.PEXELS_API_KEY }
      }).then(res => res.json()).then(data => {
        return (data.photos || []).map((img: any) => ({
          id: `px_${img.id}`,
          title: img.alt || query,
          image_url: img.src?.large || img.src?.medium,
          source: 'pexels'
        }));
      }).catch((e) => { console.error('Pexels error', e); return []; })
    );
  }

  // 3. Pixabay
  if (process.env.PIXABAY_API_KEY) {
    promises.push(
      fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=15`)
      .then(res => res.json()).then(data => {
        return (data.hits || []).map((img: any) => ({
          id: `pb_${img.id}`,
          title: img.tags || query,
          image_url: img.webformatURL,
          source: 'pixabay'
        }));
      }).catch((e) => { console.error('Pixabay error', e); return []; })
    );
  }

  // Ждем ответы от всех стоков параллельно
  const results = await Promise.all(promises);
  const combined = results.flat();

  // Перемешиваем картинки из разных источников для красивой выдачи
  return combined.sort(() => 0.5 - Math.random());
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || 'aesthetic';
    const images = await searchAllSources(query);

    // Дублируем ключи, чтобы не сломать текущую логику фронтенда
    return NextResponse.json({ data: images, items: images, pins: images, results: images, images: images });
  } catch (error) {
    console.error('Ошибка умного агрегатора:', error);
    return NextResponse.json({ error: 'Search failed', data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || body.q || body.category || body.searchTerm || 'aesthetic';
    const images = await searchAllSources(query);

    return NextResponse.json({ data: images, items: images, pins: images, results: images, images: images });
  } catch (error) {
    console.error('Ошибка умного агрегатора:', error);
    return NextResponse.json({ error: 'Search failed', data: [] }, { status: 500 });
  }
}
