export const maxDuration = 60; // Даем серверу время на парсинг и холодный старт Python

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.image_url || body.imageUrl || body.url || body.src;
    let rawTitle = body.title || body.concept || "";

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is strictly required" }, { status: 400 });
    }

    // ==========================================
    // 1. ЛИНГВИСТИКА И ЗАЩИТА ОТ МУСОРА
    // ==========================================
    if (!rawTitle && imageUrl) {
      const filename = imageUrl.split('/').pop() || "";
      // Ловушка для хэшей Pinterest и CDN
      if (filename.length > 18 && !filename.includes('-') && !filename.includes('_')) {
        rawTitle = ""; 
      } else {
        rawTitle = filename;
      }
    }

    // Очищаем от цифр, расширений и параметров
    let cleanTitle = rawTitle
        .split('?')[0]
        .replace(/[-_]/g, ' ')          
        .replace(/\d+/g, '')            
        .replace(/\.jpg|\.png|\.jpeg|\.webp/i, '') 
        .replace(/\s+/g, ' ')           
        .trim();

    if (cleanTitle.length > 15 && !cleanTitle.includes(' ')) {
      cleanTitle = "";
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);
    console.log(`[MUTATE] Идентифицирован субъект: "${cleanTitle || 'СУБЪЕКТ ОТСУТСТВУЕТ'}"`);

    // ==========================================
    // 2. БИНАРНЫЙ ПАРСИНГ И МАТЕМАТИКА
    // ==========================================
    let baseVibe = "aesthetic"; 
    let tensor = [0.5, 0.5, 0.5, 0.5, 0.5]; 

    // 🔥 ПЕРЕНЕСЛИ СЮДА: Теперь переменная живет во всей функции
    const oracleUrl = "https://schiele.onrender.com"; 

    try {
      // Парсер скачивает файл сам
      const imageRes = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!imageRes.ok) throw new Error(`Сайт отклонил запрос: ${imageRes.status}`);
      
      // Проверка типа контента (защита от HTML вместо картинки)
      const contentType = imageRes.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Получен не image, а ${contentType}`);
      }

      // Берем сырые байты
      const arrayBuffer = await imageRes.arrayBuffer();
      console.log(`[PARSER] Файл захвачен. Байт: ${arrayBuffer.byteLength}. Отправка в Оракул...`);

      if (!oracleUrl || oracleUrl.includes("your-")) {
        throw new Error("ORACLE_URL не настроен! Укажите реальный адрес Python сервиса.");
      }

      const targetEndpoint = `${oracleUrl}/api/mutate`;
      console.log(`[NETWORK] Стреляем в: ${targetEndpoint}`);

      // Отправляем байты в Питон (чистая математика)
      const oracleResponse = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'X-Source': 'NextJS-Frontend' // Маркер, чтобы Питон понял, что это мы
        },
        body: arrayBuffer,
        signal: AbortSignal.timeout(50000) // 50 сек на холодный старт Render
      });

      if (oracleResponse.ok) {
        const data = await oracleResponse.json();
        baseVibe = data.style || baseVibe;
        tensor = data.tensor || tensor;
        console.log(`[ORACLE] Математика отработала. Стиль: ${baseVibe}, Тензор: ${JSON.stringify(tensor)}`);
      } else {
        const errText = await oracleResponse.text();
        console.error(`[ORACLE] HTTP Error ${oracleResponse.status}: ${errText}`);
        // Не выбрасываем ошибку, а просто игнорируем стиль (fallback сработает ниже)
      }
    } catch (e: any) {
      console.warn(`[MUTATE] Ошибка сети или Оракула. Активируем фоллбэк: ${e.message}`);
      // Логируем стек только если это не таймаут, чтобы не спамить
      if (e.name !== 'AbortError') {
         console.error(e.stack);
      }
    }

    // ==========================================
    // 3. СБОРКА И ВОЗВРАТ ВО ФРОНТЕНД
    // ==========================================
    const smartQuery = cleanTitle ? `${cleanTitle} ${baseVibe}` : `${baseVibe} vintage high quality`;

    console.log(`[MUTATE] Обратная проекция успешна. Запрос: "${smartQuery}"`);

    return NextResponse.json({
      success: true,
      smartQuery: smartQuery,
      displayVibe: baseVibe.toUpperCase(),
      tensor: tensor,
      source: oracleUrl.includes("localhost") ? "local_loop" : "oracle_remote"
    });

  } catch (error: any) {
    console.error("[MUTATE CRITICAL ERROR]", error);
    return NextResponse.json({ 
      error: "Mutation failed", 
      smartQuery: "aesthetic vintage high quality", 
      displayVibe: "SYSTEM ERROR",
      tensor: [0.5, 0.5, 0.5, 0.5, 0.5]
    }, { status: 500 });
  }
}
