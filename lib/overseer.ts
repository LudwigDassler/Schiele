import { supabase } from '@/lib/supabase';

// Улучшенная утилита для очистки JSON от маркдауна и мусора
function cleanLLMJSON(text: string): string {
  if (!text) return "{}";
  
  let cleaned = text.trim();
  
  // Удаляем блоки кода с любым языком (json, js, etc.)
  cleaned = cleaned.replace(/^```(?:json|js|typescript)?\s*/, "");
  cleaned = cleaned.replace(/```$/, "");
  
  // Пытаемся найти первую '{' и последнюю '}', если есть лишний текст
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned.trim() || "{}";
}

export class Overseer {
  private readonly timeoutMs = 5000; // Таймаут 5 секунд, чтобы не висло

  async evaluateAndMutate(draftResult: any, trackContext: string) {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile"; // Дефолт на более мощную Llama

    if (!apiKey) {
      console.warn("Overseer: GROQ_API_KEY missing. Returning draft as-is.");
      return draftResult; 
    }

    try {
      // 1. Получаем контекст памяти (быстро и только нужные поля)
      const { data: memory, error: memError } = await supabase
        .from('synth_memory')
        .select('track_title, visual_style, dominant_color, psychological_insight')
        .eq('is_curated', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (memError) console.warn("Overseer: Failed to load memory", memError);

      const memoryContext = memory && memory.length > 0 
        ? `Опирайся на прошлые эталонные разборы:\n${memory.map(m => `- "${m.track_title}": стиль "${m.visual_style}", цвет ${m.dominant_color}. Инсайт: "${m.psychological_insight}"`).join('\n')}`
        : 'У тебя пока нет долгосрочной памяти. Опираться только на глубокий анализ текущего запроса.';

      // 2. Формируем промпт
      const prompt = `Ты — Надзиратель (Overseer), элитный ИИ-критик системы Aesthetic Nexus.
      Твоя задача: улучшить черновик синестезии, сделав инсайт глубже, палитру сложнее, а стиль точнее.
      
      ${memoryContext}
      
      Текущий черновик для запроса "${trackContext}":
      ${JSON.stringify(draftResult)}
      
      Верни ТОЛЬКО валидный JSON в точно таком же формате, как входной черновик. Никаких пояснений, никакого текста вне JSON.`;

      // 3. Настройка запроса с таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "You are a strict JSON generator. Output ONLY valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.4, // Чуть ниже для стабильности формата
          max_tokens: 1024
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!groqRes.ok) {
        if (groqRes.status === 429) {
           console.warn("Overseer: Rate limit hit. Skipping mutation.");
           return draftResult;
        }
        throw new Error(`Groq API error: ${groqRes.statusText}`);
      }

      const data = await groqRes.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) return draftResult;

      // 4. Безопасный парсинг
      const cleanedJson = cleanLLMJSON(rawContent);
      try {
        const mutatedResult = JSON.parse(cleanedJson);
        // Простая валидация: если ключей нет, возвращаем черновик
        if (Object.keys(mutatedResult).length === 0) return draftResult;
        return mutatedResult;
      } catch (parseError) {
        console.error("Overseer: Failed to parse LLM JSON response", parseError);
        return draftResult;
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn("Overseer: Request timed out. Returning draft.");
      } else {
        console.error("Overseer Critical Error:", error);
      }
      return draftResult; 
    }
  }
}

export { Overseer as OverseerCore };
