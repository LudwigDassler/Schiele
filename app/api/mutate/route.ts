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
  const timeoutId = setTimeout(() => controller.abort(), 8000); // Таймаут 8 секунд

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
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
      throw new Error("AI request timed out (8s limit)");
    }
    console.error("Groq Internal Error:", error.message);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==========================================
    // ВЕТКА 3: ВИЗУАЛЬНАЯ МУТАЦИЯ (Nvidia Vision)
    // ==========================================
    if (body.image_url) {
      console.log(`[MUTATE] Sending artifact to Nvidia: ${body.image_url}`);

      const analysis = await analyzeImageWithNvidia(body.image_url);

      if (!analysis) {
        throw new Error("Nvidia vision analysis failed or returned null.");
      }

      // Нейронка сама формирует идеальный запрос для парсера
      let smartQuery = "";
      if (analysis.contains_text && analysis.text_content) {
        // Если есть текст (например, "Pink Floyd"), ставим его во главу угла
        smartQuery = `${analysis.text_content} ${analysis.style} poster vintage`;
      } else {
         // Иначе опираемся на настроение и стиль
        smartQuery = `${analysis.mood} ${analysis.style} ${analysis.colors?.[0] || ''} aesthetic art`;
      }

      console.log(`[MUTATE] Nvidia generated smart query: "${smartQuery}"`);

      return NextResponse.json({ 
        success: true, 
        smartQuery: smartQuery,
        raw_analysis: analysis
      });
    }

    // ==========================================
    // ВЕТКА 1: НОВЫЙ ФОРМАТ (Mutation Chamber)
    // ==========================================
    if (body.memory_id) {
      const { memory_id, rating, is_curated, mutate_direction, current_palette } = body;

      // 1. Обновление рейтинга/кураторства
      if ((rating !== undefined || is_curated !== undefined) && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const updatePayload: any = {};
        if (rating !== undefined) updatePayload.user_rating = rating;
        if (is_curated !== undefined) updatePayload.is_curated = is_curated;

        await supabase
          .from('synth_memory')
          .update(updatePayload)
          .eq('id', memory_id);
      }

      // 2. Мутация палитры
      if (mutate_direction && current_palette) {
        const systemPrompt = `Ты — колорист-мутатор Aesthetic Nexus. 
        Текущая палитра: ${JSON.stringify(current_palette)}.
        Смести эту палитру в сторону направления: "${mutate_direction}".
        Верни СТРОГО валидный JSON: { "dominant": "#HEX", "accent": "#HEX", "ambient_fog": "#HEX", "style_shift": "описание сдвига" }`;

        const mutated = await callGroq(systemPrompt);
        return NextResponse.json({ mutated });
      }

      return NextResponse.json({ success: true, message: "Память обновлена" });
    }

    // ==========================================
    // ВЕТКА 2: СТАРЫЙ ФОРМАТ (Кнопка Mutate)
    // ==========================================
    if (body.concept) {
      const systemPrompt = `Ты креативный генератор идей. Концепт: "${body.concept}". 
      Предложи 3 новых вектора развития этого вайба.
      Ответь СТРОГО в JSON: { "mutations": ["вектор 1", "вектор 2", "вектор 3"] }`;

      const result = await callGroq(systemPrompt);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid payload format." }, { status: 400 });

  } catch (error: any) {
    console.error("API Route Critical Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: process.env.NODE_ENV === 'development' ? error.message : undefined }, 
      { status: 500 }
    );
  }
}
