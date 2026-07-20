import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Инициализируем SDK с ключом из переменных окружения
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { category } = await req.json();
    
    // Формируем промпт для нейросети
    const prompt = Напиши короткую, красивую и глубокомысленную цитату (максимум 2 предложения), которая идеально подходит для фотографии в категории "". Выведи только текст цитаты, без кавычек и лишних слов.;

    // Вызываем быструю модель flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const quote = response.text().trim();

    return NextResponse.json({ quote });
  } catch (error) {
    console.error('Ошибка генерации магии:', error);
    return NextResponse.json(
      { error: 'Не удалось сгенерировать цитату' }, 
      { status: 500 }
    );
  }
}
