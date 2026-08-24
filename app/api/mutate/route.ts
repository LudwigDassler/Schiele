import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, title } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is strictly required for Tensor Mutation" }, { status: 400 });
    }

    // 1. Очищаем заголовок от мусора еще до отправки в Питон
    const rawTitle = title || body.concept || image_url.split('/').pop() || "";
    const cleanTitle = rawTitle
        .replace(/[-_]/g, ' ')          // Меняем дефисы на пробелы
        .replace(/\d+/g, '')            // Убираем цифры (типа 1977 или 1548)
        .replace(/\.jpg|\.png|\.jpeg|\.webp/i, '') // Убираем расширения
        .replace(/\s+/g, ' ')           // Убираем двойные пробелы
        .trim();

    console.log(`[MUTATE] Трансляция пикселей в Риманово пространство: ${image_url}`);
    console.log(`[MUTATE] Идентифицирован субъект: "${cleanTitle}"`);

    try {
      // 2. Отправляем запрос в твое облако на Render
      const oracleResponse = await fetch('https://kashmir-oracle.onrender.com/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_url: image_url, 
          title: cleanTitle 
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (oracleResponse.ok) {
        const data = await oracleResponse.json();
        console.log(`[MUTATE] Обратная проекция успешна: ${data.smartQuery}`);
        return NextResponse.json(data);
      } else {
        throw new Error(`Oracle HTTP error: ${oracleResponse.status}`);
      }
    } catch (oracleError) {
      console.warn("[MUTATE] Оракул оффлайн или отверг пиксели. Активируем фоллбэк.", oracleError);
      
      // 3. Фоллбэк: если Питон упал, просто ищем по очищенному субъекту
      const fallbackQuery = cleanTitle ? `${cleanTitle} aesthetic high quality` : "aesthetic vintage high quality";

      return NextResponse.json({ 
        success: true, 
        smartQuery: fallbackQuery, 
        displayVibe: "FALLBACK RESONANCE",
        source: "heuristic"
      });
    }

  } catch (error: any) {
    console.error("[MUTATE CRITICAL ERROR]", error);
    return NextResponse.json({ 
      error: "Mutation failed", 
      smartQuery: "aesthetic vintage high quality", 
      displayVibe: "SYSTEM ERROR" 
    }, { status: 500 });
  }
}
