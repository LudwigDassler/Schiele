import { NextResponse } from 'next/server';
import ollama from 'ollama';

export async function POST(req) {
  try {
    // Получаем текст песни и данные от сайта (фронтенда)
    const { lyrics, title, artist } = await req.json();

    // Системный манифест, который делает из Llama 3 синестетика
    const systemPrompt = `
    Ты — нейросетевой синестетик и музыкальный терапевт. 
    Песня: "${title}" — ${artist}.
    Текст:
    ${lyrics}

    Проанализируй настроение, скрытые смыслы и переведи их в визуальный код.
    Ответь СТРОГО в формате JSON без лишнего текста:
    {
      "track_atmosphere": "краткое описание вайба",
      "palette": {
        "dominant": "HEX-код (например, #1A1B2F)",
        "accent": "HEX-код",
        "ambient_fog": "HEX-код"
      },
      "visual_tempo": {
        "animation_speed_multiplier": "число от 0.1 до 2.0",
        "style": "строка (например: пленочное зерно, мягкий блюр, резкий неон)"
      },
      "imagery_search_vectors": ["3 коротких фразы для поиска фоновых видео"],
      "psychological_insight": "одно эмпатичное предложение поддержки для слушателя"
    }
    `;

    // Стучимся в локальную нейросеть (которая висит на порту 11434 в твоей винде)
    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: systemPrompt }],
      format: 'json', // Заставляем выдать чистый код, а не текст
    });

    // Отправляем готовую палитру и разбор обратно на сайт
    const analysis = JSON.parse(response.message.content);
    return NextResponse.json(analysis);

  } catch (error) {
    console.error("Ошибка Надзирателя:", error);
    return NextResponse.json(
      { error: "Нейросеть недоступна или произошел сбой логики." }, 
      { status: 500 }
    );
  }
}
