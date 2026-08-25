import { NextResponse } from 'next/server';

// Идеальный экстрактор: режет параметры, расширения и символы
function extractSubjectFromUrl(url: string): string {
  try {
    const cleanUrl = url.split('?')[0]; // Отрезаем ?v=1566941362
    const filename = cleanUrl.split('/').pop() || "";
    const subject = filename
      .replace(/\.[^/.]+$/, "") // Убираем .jpg/.png
      .replace(/[-_]/g, ' ')    // Заменяем - и _ на пробелы
      .trim();
    return subject || "unknown entity";
  } catch {
    return "unknown entity";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    // URL твоего Оракула на Render (проверь, чтобы в .env лежал правильный)
    const oracleUrl = process.env.ORACLE_URL || "https://schiele.onrender.com";
    
    try {
      const oracleRes = await fetch(`${oracleUrl}/api/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
        // Ограничиваем ожидание Оракула до 5 секунд
        signal: AbortSignal.timeout(5000) 
      });

      if (!oracleRes.ok) {
        throw new Error(`Oracle HTTP error: ${oracleRes.status}`);
      }

      const oracleData = await oracleRes.json();
      console.log(`[MUTATE] Оракул распознал стиль: "${oracleData.style}"`);
      
      return NextResponse.json({ 
        subject: oracleData.style,
        tensor: oracleData.tensor 
      });

    } catch (error: any) {
      console.log(`[MUTATE] Оракул недоступен или сработал таймаут. Активация эвристического фоллбэка. Error: ${error.message}`);
      
      // Фоллбэк активируется только если Python-сервер упал/не ответил
      const cleanSubject = extractSubjectFromUrl(imageUrl);
      console.log(`[MUTATE] Кристаллизованный субъект: "${cleanSubject}"`);
      
      return NextResponse.json({ 
        subject: `${cleanSubject} aesthetic high quality`,
        tensor: [0.5, 0.5, 0.5, 0.5, 0.5] // Нейтральный тензор
      });
    }

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
