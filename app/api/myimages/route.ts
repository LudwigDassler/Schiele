import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OverseerCore } from "@/lib/overseer";

// Инициализация клиента Supabase через переменные окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[CRITICAL] Missing Supabase credentials in environment variables');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

// ==========================================
// 1. ИЗВЛЕЧЕНИЕ (Твоя обновленная галерея)
// ==========================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  // Вычисляем диапазон для пагинации Supabase (вместо offset)
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from('images') // Твоя таблица
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Маппинг данных с защитой от пустых полей
    const photos = (data || []).map((item: any) => ({
      id: item.id,
      src: item.src || item.image_url, 
      thumb: item.src || item.image_url,
      title: item.title || item.core_vibe || item.category || 'UNKNOWN ARTIFACT',
      author: item.author || 'Schiele (Overseer)',
      authorAvatar: '',
      link: '',
      category: item.category || 'synthesized',
      math_constants: item.math_constants || null // Прокидываем математику на фронт
    }));

    return NextResponse.json({ 
      photos, 
      source: 'schiele_db_v2',
      hasMore: count ? (from + limit) < count : false,
      total: count || 0
    });
  } catch (error: any) {
    console.error('[DB GET ERROR]:', error.message);
    return NextResponse.json({ photos: [], error: 'Failed to fetch from matrix' }, { status: 500 });
  }
}

// ==========================================
// 2. ИНЪЕКЦИЯ (Сохранение артефакта + Обучение)
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { artifact, userId = "anon_user" } = body;

    if (!artifact || (!artifact.generated_artifact && !artifact.src)) {
      return NextResponse.json({ error: "Artifact data missing or corrupted" }, { status: 400 });
    }

    const imageUrl = artifact.generated_artifact || artifact.src;

    // A. Физическое сохранение в таблицу
    const { error } = await supabase.from('images').insert({
      src: imageUrl,
      title: artifact.core_vibe || "MUTATED ARTIFACT",
      category: artifact.category || "synthesized",
      author: userId,
      core_vibe: artifact.core_vibe,
      generation_prompt: artifact.generation_prompt,
      math_constants: artifact.math_constants || {},
    });
    
    if (error) {
      console.error('[DB POST ERROR]:', error.message);
      throw new Error("Failed to write artifact to remote database");
    }

    // B. Онтологическое обучение (Fire-and-forget)
    // Запускаем асинхронно, чтобы не тормозить интерфейс пользователя
    setTimeout(() => {
      try {
        const overseer = new OverseerCore();
        overseer.assimilateArtifact(artifact);
      } catch (memoryError) {
        console.warn("[OVERSEER WARNING] Failed to assimilate artifact into local memory.", memoryError);
      }
    }, 0);

    return NextResponse.json({ 
      success: true, 
      message: "Artifact stored physically and assimilated into Overseer memory." 
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Storage failure", details: error.message }, { status: 500 });
  }
}
