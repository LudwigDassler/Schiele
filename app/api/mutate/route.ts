import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeImageWithNvidia } from '@/lib/vision-analyzer';

// Утилита для безопасной очистки JSON от маркдауна
function cleanLLMJSON(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?\s*/, "").replace(/```$/, "").trim();
  return cleaned;
}

// Единая функция вызова Groq с таймаутом и обработкой ошибок
async function callGroq(prompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Даем 20 секунд (защита от холодных стартов)

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // 🔥 Возвращаем управление в Render, дефолт - железобетонная модель
        model: process.env.GROQ_MODEL || "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Groq API Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    
    return JSON.parse(cleanLLMJSON(rawContent));
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("AI request timed out (20s limit)");
    }
    console.error("Groq Internal Error:", error.message);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==========================================
    // ВЕТКА 3: ВИЗУАЛЬНАЯ МУТАЦИЯ (Nvidia + Groq)
    // ==========================================
    if (body.image_url) {
      console.log(`[MUTATE] Step 1: Nvidia scanning artifact: ${body.image_url}`);

      // 1. Глаза: Nvidia собирает сырые факты
      let analysis = await analyzeImageWithNvidia(body.image_url);

      if (!analysis) {
        console.warn("[MUTATE] Warning: Nvidia analysis failed (bad JSON). Using fallback aesthetics.");
        analysis = {
          mood: "mysterious",
          style: "abstract visual art",
          colors: ["#000000", "#FFFFFF"],
          contains_text: false,
          description: "Unknown visual artifact",
          tags: ["abstract", "unknown"]
        };
      }

      console.log(`[MUTATE] Step 2: Groq translating facts... History length:`, Array.isArray(body.history) ? body.history.length : 0);

      // 2. Мозг: Groq осмысляет факты, учитывает контекст и историю
      const historyText = Array.isArray(body.history) && body.history.length > 0 
        ? `\nПРЕДЫДУЩИЕ ВАЙБЫ (КАТЕГОРИЧЕСКИ НЕ ПОВТОРЯЙ ИХ, ищи новые ассоциации): ${JSON.stringify(body.history)}` 
        : "";

      const prompt = `
        Ты — музыкальный и эстетический ИИ-куратор приложения Schiele.
        Твоя задача — проанализировать сырые технические данные с картинки и создать концепт.
        Важно: избегай буквальных ошибок машинного перевода (например, если в тексте "Jimmy Page gear", имеется в виду гитарное оборудование великого музыканта, а не запчасти от машин. Заменяй двусмысленные слова на точные, например, gear -> guitars/equipment).

        Сырые данные с картинки: ${JSON.stringify(analysis)} ${historyText}

        Сгенерируй строго JSON с двумя полями:
        1. "searchQuery": оптимизированный запрос для поиска картинок (максимум 5-6 слов, без хешкодов цветов). Он должен выдавать релевантные, крутые картинки. Уточняй контекст (например, добавляй 'concert', 'guitar', если речь о музыкантах).
        2. "displayVibe": короткое, загадочное и эстетичное название этого вайба для интерфейса (2-4 слова, на английском, например "70s Rock Aura" или "Surreal Pink Floyd Art").

        Формат ответа СТРОГО JSON: {"searchQuery": "...", "displayVibe": "..."}
      `;

      const curated = await callGroq(prompt);

      // БРОНЯ: Фолбэки
      const finalSearchQuery = curated.searchQuery || curated.query || `${analysis.mood} ${analysis.style} art`;
      const finalDisplayVibe = curated.displayVibe || curated.vibe || "NEW RESONANCE";

      console.log(`[MUTATE] AI Decision -> Query: "${finalSearchQuery}", Display: "${finalDisplayVibe}"`);

      return NextResponse.json({ 
        success: true, 
        smartQuery: finalSearchQuery, 
        displayVibe: finalDisplayVibe 
      });
    }

    // ==========================================
    // ВЕТКА 1: НОВЫЙ ФОРМАТ (Mutation Chamber)
    // ==========================================
    if (body.memory_id) {
      const { memory_id, rating, is_curated, mutate_direction, current_palette } = body;

      if ((rating !== undefined || is_curated !== undefined) && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const updatePayload: any = {};
        if (rating !== undefined) updatePayload.user_rating = rating;
        if (is_curated !== undefined) updatePayload.is_curated = is_curated;

        await supabase.from('synth_memory').update(updatePayload).eq('id', memory_id);
      }

      if (mutate_direction && current_palette) {
        const systemPrompt = `Ты — колорист-мутатор Aesthetic Nexus. Текущая палитра: ${JSON.stringify(current_palette)}. Смести эту палитру в сторону направления: "${mutate_direction}". Верни СТРОГО JSON: { "dominant": "#HEX", "accent": "#HEX", "ambient_fog": "#HEX", "style_shift": "описание" }`;
        const mutated = await callGroq(systemPrompt);
        return NextResponse.json({ mutated });
      }

      return NextResponse.json({ success: true, message: "Память обновлена" });
    }

    // ==========================================
    // ВЕТКА 2: СТАРЫЙ ФОРМАТ (Кнопка Mutate)
    // ==========================================
    if (body.concept) {
      const systemPrompt = `Ты креативный генератор идей. Концепт: "${body.concept}". Предложи 3 новых вектора. Ответь СТРОГО в JSON: { "mutations": ["вектор 1", "вектор 2", "вектор 3"] }`;
      const result = await callGroq(systemPrompt);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid payload format." }, { status: 400 });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
