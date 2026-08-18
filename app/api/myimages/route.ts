import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Безопасная инициализация клиента
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('[CRITICAL] Missing Supabase environment variables. Check Render settings.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 1. ИЗВЛЕЧЕНИЕ (Галерея)
// ==========================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from('images')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    const photos = (data || []).map((item: any) => ({
      id: item.id,
      // Приоритет: явное поле src, затем image_url, затем заглушка
      src: item.src || item.image_url || '/placeholder.jpg', 
      thumb: item.src || item.image_url || '/placeholder.jpg',
      title: item.title || item.core_vibe || item.category || 'UNKNOWN ARTIFACT',
      author: item.author || 'Schiele System',
      authorAvatar: '',
      link: '',
      category: item.category || 'synthesized',
      math_constants: item.math_constants || null
    }));

    return NextResponse.json({ 
      photos, 
      source: 'schiele_db_secure',
      hasMore: count ? (from + limit) < count : false,
      total: count || 0
    });
  } catch (error: any) {
    console.error('[DB GET ERROR]:', error.message);
    // Не возвращаем детали ошибки клиенту в продакшене
    return NextResponse.json({ 
      photos: [], 
      error: 'Failed to fetch from matrix' 
    }, { status: 500 });
  }
}

// ==========================================
// 2. ИНЪЕКЦИЯ (Сохранение артефакта)
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { artifact, userId = "anon_user" } = body;

    // Валидация входных данных
    if (!artifact || (!artifact.generated_artifact && !artifact.src)) {
      return NextResponse.json({ 
        error: "Artifact data missing or corrupted",
        received: !!artifact 
      }, { status: 400 });
    }

    const imageUrl = artifact.generated_artifact || artifact.src;

    const { error } = await supabase.from('images').insert({
      src: imageUrl,
      image_url: imageUrl, // Дублируем для совместимости со старыми схемами
      title: artifact.core_vibe || "MUTATED ARTIFACT",
      category: artifact.category || "synthesized",
      author: userId,
      core_vibe: artifact.core_vibe,
      generation_prompt: artifact.generation_prompt,
      math_constants: artifact.math_constants || {},
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('[DB POST ERROR]:', error.message);
      throw new Error("Failed to write artifact to remote database");
    }

    return NextResponse.json({ 
      success: true, 
      message: "Artifact stored physically in database." 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: "Storage failure", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}
