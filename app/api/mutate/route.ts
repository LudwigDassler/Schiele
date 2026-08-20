import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Утилита для безопасной очистки JSON
function cleanLLMJSON(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?\s*/, "").replace(/```$/, "").trim();
  
  // Дополнительная чистка на случай, если бесплатная модель добавит текст до/после JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  return cleaned;
}

// 🔥 ЕДИНЫЙ УМНЫЙ МОЗГ (БЕСПЛАТНЫЙ): Зрение и логика в одном запросе
async function callSmartVisionBrain(imageUrl: string, historyText: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 секунд

  const prompt = `
    Ты — элитный арт-директор, историк искусств и куратор приложения Schiele.
    Внимательно посмотри на прикрепленное изображение и выдай концепт.

    ЖЕСТКИЕ ПРАВИЛА:
    1. УЗНАВАЙ КОНТЕКСТ: Если на фото известный человек (например, Оппенгеймер, Джимми Пейдж), историческая эпоха или конкретный стиль — ИСПОЛЬЗУЙ ЭТО. Никакой абстрактной воды вроде "Whispers of the unknown".
    2. ФАКТУРА: Вайб должен быть материальным и точным. Пример: для старого фото ученого с сигаретой — "Atomic Era Noir" или "Mid-Century Intellectual".
    3. ИСТОРИЯ: Учитывай предыдущие мутации и не повторяйся: ${historyText}

    Сгенерируй СТРОГО JSON (без маркдауна и лишних слов) с двумя полями:
    1. "searchQuery": точный запрос для поиска картинок (4-6 слов). Например: "1940s scientist vintage portrait photography".
    2. "displayVibe": эстетичное, хлесткое название вайба для интерфейса (2-4 слова, на английском).

    Формат ответа СТРОГО: {"searchQuery": "...", "displayVibe": "..."}
  `;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // 🔥 Используем БЕСПЛАТНУЮ зрячую модель от Meta
        model: "meta-llama/llama-3.2-11b-vision-instruct:free", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`OpenRouter Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(cleanLLMJSON(rawContent));
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Обычный текстовый мозг для веток без картинок (БЕСПЛАТНЫЙ)
async function callTextBrain(prompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // 🔥 Бесплатная, быстрая текстовая Llama
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Text Brain Error");
    const data = await res.json();
    return JSON.parse(cleanLLMJSON(data.choices?.[0]?.message?.content || "{}"));
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==========================================
    // ВЕТКА 3: ВИЗУАЛЬНАЯ МУТАЦИЯ (Картинка напрямую в Multimodal AI)
    // ==========================================
    if (body.image_url) {
      console.log(`[MUTATE] Step 1: Multimodal scanning artifact: ${body.image_url}`);

      const historyText = Array.isArray(body.history) && body.history.length > 0 
        ? JSON.stringify(body.history) 
        : "Это первый запуск.";

      try {
        const curated = await callSmartVisionBrain(body.image_url, historyText);
        
        // Фолбэки на случай непредвиденных сбоев
        const finalSearchQuery = curated.searchQuery || curated.query || "vintage noir portrait";
        const finalDisplayVibe = curated.displayVibe || curated.vibe || "VINTAGE AURA";

        console.log(`[MUTATE] AI Decision -> Query: "${finalSearchQuery}", Display: "${finalDisplayVibe}"`);

        return NextResponse.json({ 
          success: true, 
          smartQuery: finalSearchQuery, 
          displayVibe: finalDisplayVibe 
        });

      } catch (visionError) {
        console.error("[MUTATE] Multimodal failed, falling back...", visionError);
        return NextResponse.json({ 
          success: true, 
          smartQuery: "aesthetic vintage portrait", 
          displayVibe: "SIGNAL RECOVERED" 
        });
      }
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
        const mutated = await callTextBrain(systemPrompt);
        return NextResponse.json({ mutated });
      }
      return NextResponse.json({ success: true, message: "Память обновлена" });
    }

    // ==========================================
    // ВЕТКА 2: СТАРЫЙ ФОРМАТ (Кнопка Mutate)
    // ==========================================
    if (body.concept) {
      const systemPrompt = `Ты креативный генератор идей. Концепт: "${body.concept}". Предложи 3 новых вектора. Ответь СТРОГО в JSON: { "mutations": ["вектор 1", "вектор 2", "вектор 3"] }`;
      const result = await callTextBrain(systemPrompt);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid payload format." }, { status: 400 });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
