import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент Supabase (используем серверные переменные из .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // или используй свой секретный sb_secret

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    // Если запрос пустой, можно вернуть пустой массив или первые 20 пинов
    const { data, error } = await supabase.from('pins').select('*').limit(20);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pins: data });
  }

  // Преобразуем поисковую строку (например, "white sneakers" -> "white & sneakers")
  // Это нужно для корректной работы оператора @@ в to_tsquery
  const formattedQuery = query
    .trim()
    .split(/\s+/)
    .map(word => `${word}:*`) // :* позволяет искать по части слова (например, "conv" найдет "converse")
    .join(' & ');

  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .textSearch('fts_tokens', formattedQuery);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pins: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
