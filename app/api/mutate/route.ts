import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, title } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is strictly required for Tensor Mutation" }, { status: 400 });
    }

    // 1. Пытаемся взять нормальный заголовок
    let rawTitle = title || body.concept || "";

    // Если заголовка нет, берем из URL, но пропускаем через жесткий фильтр
    if (!rawTitle && image_url) {
      const filename = image_url.split('/').pop() || "";
      
      // Ловушка для хэшей Pinterest и CDN. 
      // Если имя длиннее 18 символов и в нем нет дефисов/подчеркиваний — это 100% криптографический мусор.
      if (filename.length > 18 && !filename.includes('-') && !filename.includes('_')) {
        rawTitle = ""; 
      } else {
        rawTitle = filename;
      }
    }

    // 2. Очищаем от цифр, расширений и спецсимволов
    let cleanTitle = rawTitle
        .replace(/[-_]/g, ' ')          
        .replace(/\d+/g, '')            
        .replace(/\.jpg|\.png|\.jpeg|\.webp/i, '') 
        .replace(/\s+/g, ' ')           
        .trim();

    // 3. Финальная защита (если какая-то абракадабра всё же проскочила)
    if (cleanTitle.length > 15 && !cleanTitle.includes(' ')) {
      cleanTitle = "";
    }

    console.log(`[MUTATE] Трансляция пикселей в Риманово пространство: ${image_url}`);
    console.log(`[MUTATE] Идентифицирован субъект: "${cleanTitle || 'СУБЪЕКТ ОТСУТСТВУЕТ (ЧИСТЫЙ ВАЙБ)'}"`);

    try {
      // 4. Отправляем в Пекло (наш Python-сервер)
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
      
      // 5. Фоллбэк: если Питон упал, ищем просто эстетику
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
