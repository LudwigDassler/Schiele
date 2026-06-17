import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'photography';
  const page = searchParams.get('page') || '1';
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  if (!key) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${page}&client_id=${key}`
    );
    
    if (!res.ok) {
      throw new Error(`Unsplash API error: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}