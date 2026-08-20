import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeImageWithNvidia } from '@/lib/vision-analyzer';

// Утилита для жесткой очистки JSON от любого мусора
function cleanLLMJSON(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  return cleaned || "{}";
}

// 🔥 Единый текстовый мозг: УМНЫЙ, БЕСПЛАТНЫЙ, СТАБИЛЬНЫЙ
async function callSmartTextBrain(prompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 секунд

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // Используем 70-миллиардную модель. Она гениальна, не льет воду и работает бесплатно.
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==========================================
    // ВЕТКА 3: ВИЗУАЛЬНАЯ МУТАЦИЯ (Nvidia + Умная Llama 70B)
    // ==========================================
    if (body.image_url) {
      console.log(`[MUTATE] Step 1: Nvidia scanning artifact: ${body.image_url}`);

      // 1. Глаза: Nvidia безотказно собирает факты
      let analysis = await analyzeImageWithNvidia(body.image_url);

      if (!analysis) {
        console.warn("[MUTATE] Warning: Nvidia analysis failed (bad JSON). Using fallback.");
        analysis = {
          mood: "mysterious",
          style: "vintage photography",
          colors: ["#000000", "#FFFFFF"],
          contains_text: false,
          description: "Vintage historical artifact",
          tags: ["vintage", "history"]
        };
      }

      console.log(`[MUTATE] Step 2: OpenRouter 70B Brain translating facts... History length:`, Array.isArray(body.history) ? body.history.length : 0);

      const historyText = Array.isArray(body.history) && body.history.length > 0 
        ? `\nПРЕДЫДУЩИЕ ВАЙБЫ (КАТЕГОРИЧЕСКИ НЕ ПОВТОРЯЙ ИХ, ищи новые ассоциации): ${JSON.stringify(body.history)}` 
        : "";

      // 2. Мозг: Жесткий промпт для 70B модели
      const prompt = `
        Ты — элитный арт-директор, историк искусств и куратор приложения Schiele.
        Проанализируй сырые технические данные с картинки и создай концепт.

        ЖЕСТКИЕ ПРАВИЛА:
        1. УЗНАВАЙ КОНТЕКСТ: Если в описании есть известный человек (например, Оппенгеймер, Дэвид Боуи), историческая эпоха или бренд — ИСПОЛЬЗУЙ ЭТО. Никакой абстрактной воды вроде "Whispers of the unknown".
        2. ФАКТУРА: Вайб должен быть материальным и точным. Пример: для старого фото ученого с сигаретой — "Atomic Era Noir", "Manhattan Project" или "Mid-Century Intellectual".
        3. ИСТОРИЯ: Учитывай предыдущие мутации и не повторяйся: ${historyText}

        Сырые данные от визуального анализатора: ${JSON.stringify(analysis)}

        Сгенерируй СТРОГО JSON (без маркдауна и лишних слов) с двумя полями:
        1. "searchQuery": точный запрос для поиска картинок (4-6 слов). Например: "1940s scientist vintage portrait photography".
        2. "displayVibe": эстетичное, хлесткое название вайба для интерфейса (2-4 слова, на английском).

        Формат ответа СТРОГО: {"searchQuery": "...", "displayVibe": "..."}
      `;

      try {
        const curated = await callSmartTextBrain(prompt);
        
        const finalSearchQuery = curated.searchQuery || curated.query || `${analysis.mood} ${analysis.style}`;
        const finalDisplayVibe = curated.displayVibe || curated.vibe || "VINTAGE AURA";

        console.log(`[MUTATE] AI Decision -> Query: "${finalSearchQuery}", Display: "${finalDisplayVibe}"`);

        return NextResponse.json({ 
          success: true, 
          smartQuery: finalSearchQuery, 
          displayVibe: finalDisplayVibe 
        });

      } catch (brainError) {
        console.error("[MUTATE] Text Brain failed, falling back...", brainError);
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
        const mutated = await callSmartTextBrain(systemPrompt);
        return NextResponse.json({ mutated });
      }
      return NextResponse.json({ success: true, message: "Память обновлена" });
    }

    // ==========================================
    // ВЕТКА 2: СТАРЫЙ ФОРМАТ (Кнопка Mutate)
    // ==========================================
    if (body.concept) {
      const systemPrompt = `Ты креативный генератор идей. Концепт: "${body.concept}". Предложи 3 новых вектора. Ответь СТРОГО в JSON: { "mutations": ["вектор 1", "вектор 2", "вектор 3"] }`;
      const result = await callSmartTextBrain(systemPrompt);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid payload format." }, { status: 400 });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
