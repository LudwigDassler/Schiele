import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    // Поиск идет по:
    // 1. visual_tags (массив тегов, куда попадает и текст с картинки)
    // 2. image_description (полное описание от AI)
    // 3. core_vibe (стиль)
    // 4. title (старое поле)
    
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .or(`
        visual_tags.cs.{${query}}, 
        image_description.ilike.%${query}%, 
        core_vibe.ilike.%${query}%,
        title.ilike.%${query}%
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Ранжирование: поднимаем выше те результаты, где запрос точно совпадает с тегом
    const rankedResults = data?.sort((a, b) => {
      const qLower = query.toLowerCase();
      const aHasExactTag = a.visual_tags?.some((t: string) => t.toLowerCase() === qLower) ? 1 : 0;
      const bHasExactTag = b.visual_tags?.some((t: string) => t.toLowerCase() === qLower) ? 1 : 0;
      
      // Если есть точное совпадение тега - выше
      if (aHasExactTag !== bHasExactTag) return bHasExactTag - aHasExactTag;

      // Иначе приоритет тем, где есть текст на картинке (contains_text логика через теги)
      const aHasText = a.visual_tags?.includes(qLower) ? 1 : 0;
      const bHasText = b.visual_tags?.includes(qLower) ? 1 : 0;
      return bHasText - aHasText;
    });

    return NextResponse.json({ results: rankedResults || [] });

  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
