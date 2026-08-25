export const maxDuration = 60; // Даем парсеру время на борьбу с сетью

import { NextResponse } from 'next/server';

function extractSubjectFromUrl(url: string): string {
  try {
    const cleanUrl = url.split('?')[0]; 
    const filename = cleanUrl.split('/').pop() || "";
    const subject = filename
      .replace(/\.[^/.]+$/, "") 
      .replace(/[-_]/g, ' ')    
      .trim();
    return subject || "unknown entity";
  } catch {
    return "unknown entity";
  }
}

export async function POST(request: Request) {
  let targetUrl = "";
  
  try {
    const body = await request.json();
    targetUrl = body.imageUrl || body.image_url || body.url || body.src;

    if (!targetUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    console.log(`[PARSER] Начинаю захват файла: ${targetUrl}`);

    // 1. ПАРСИНГ: Скачиваем картинку с маскировкой под браузер
    const imageRes = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000) // Ждем ответа сайта до 10 секунд
    });
    
    if (!imageRes.ok) {
      throw new Error(`Сайт отклонил запрос: ${imageRes.status}`);
    }
    
    // 2. СЕРИАЛИЗАЦИЯ: Превращаем файл в сырые байты (Base64)
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    console.log(`[PARSER] Файл захвачен. Отправляю байты Оракулу...`);

    // 3. МАТЕМАТИКА: Обращаемся к изолированному Оракулу
    const oracleUrl = process.env.ORACLE_URL || "https://schiele.onrender.com";
    
    const oracleRes = await fetch(`${oracleUrl}/api/mutate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: base64Image }),
      signal: AbortSignal.timeout(15000) // Ждем расчеты матриц до 15 секунд
    });

    if (!oracleRes.ok) {
      throw new Error(`Оракул вернул ошибку: ${oracleRes.status}`);
    }

    const oracleData = await oracleRes.json();
    console.log(`[ORACLE] Возвращен тензор. Выявленный стиль: "${oracleData.style}"`);
    
    return NextResponse.json({ 
      subject: oracleData.style,
      tensor: oracleData.tensor 
    });

  } catch (error: any) {
    console.log(`[SYSTEM] Сработал эвристический фоллбэк. Причина: ${error.message}`);
    const cleanSubject = extractSubjectFromUrl(targetUrl);
    
    return NextResponse.json({ 
      subject: `${cleanSubject} aesthetic`,
      tensor: [0.5, 0.5, 0.5, 0.5, 0.5] 
    });
  }
}
