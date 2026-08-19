import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeImageWithNvidia, saveVisualAnalysis } from '@/lib/vision-analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, user_id, category } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 });
    }

    // 1. Сохраняем базовую запись
    const { data: insertData, error: insertError } = await supabase
      .from('images')
      .insert({
        src: image_url,
        author: user_id || 'anon',
        category: category || 'unknown',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Запускаем анализ в фоне (не блокируя ответ пользователю)
    // Используем .then().catch(), чтобы ошибка анализа не ломала весь запрос загрузки
    analyzeImageWithNvidia(image_url)
      .then(async (analysis) => {
        if (analysis && insertData.id) {
          await saveVisualAnalysis(insertData.id, analysis);
        }
      })
      .catch(err => console.error("Background analysis failed:", err));

    return NextResponse.json({ 
      success: true, 
      id: insertData.id,
      message: "Image uploaded. AI analysis started." 
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
