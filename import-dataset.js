const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// 1. НАСТРОЙКИ ПОДКЛЮЧЕНИЯ
const SUPABASE_URL = 'https://kefdjxsmyarwfqqkfgcx.supabase.co'; 
const SUPABASE_KEY = 'sb_secret_2UZY3PLCKoIznRnZoCoPDg_wsv6lYp7'; 

// 2. БЛОК ПРОВЕРКИ НА КИРИЛЛИЦУ
function checkForCyrillic(str, name) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      console.error(`\n❌ НАЙДЕНА ОШИБКА В ${name}!`);
      console.error(`Символ "${str[i]}" на позиции ${i} является кириллицей (код: ${str.charCodeAt(i)}).`);
      return true;
    }
  }
  return false;
}

console.log('🔍 Проверяем конфигурацию перед стартом...');
const hasErrorUrl = checkForCyrillic(SUPABASE_URL, 'SUPABASE_URL');
const hasErrorKey = checkForCyrillic(SUPABASE_KEY, 'SUPABASE_KEY');

if (hasErrorUrl || hasErrorKey) {
  console.log('🛑 Скрипт остановлен. В строках конфигурации осталась кириллица.');
  process.exit(1);
}
console.log('✅ Конфигурация чистая, подключаемся...');

// 3. ИНИЦИАЛИЗАЦИЯ КЛИЕНТА
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CSV_FILE_PATH = path.join(__dirname, 'pinterest-fashion-dataset.csv');

// 4. ФУНКЦИЯ ИМПОРТА
async function importCsv() {
  console.log('🚀 Начинаем чистый импорт датасета в Supabase...');
  
  let batch = [];
  let totalSaved = 0;

  // Проверим, существует ли файл вообще
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Файл не найден по пути: ${CSV_FILE_PATH}`);
    return;
  }

  const parser = fs.createReadStream(CSV_FILE_PATH).pipe(csv());

  try {
    for await (const row of parser) {
      batch.push({
        image_url: row.image_url,
        description: row.image_description,
        category: row.category,
        brand: row.brand,
        price: row['price in $'] ? parseFloat(row['price in $']) : null
      });

      if (batch.length >= 100) {
        const toSave = [...batch];
        batch = [];
        
        totalSaved += toSave.length;
        console.log(`⏳ Сохраняем пачку... Всего обработано: ${totalSaved}`);
        await saveToSupabase(toSave);
      }
    }

    // Записываем остаток
    if (batch.length > 0) {
      totalSaved += batch.length;
      console.log(`⏳ Сохраняем финальную пачку... Всего обработано: ${totalSaved}`);
      await saveToSupabase(batch);
    }

    console.log(`\n🎉 Импорт успешно завершен! Всего пинов добавлено: ${totalSaved}`);
  } catch (streamError) {
    console.error('❌ Ошибка при разборе CSV-потока:', streamError);
  }
}

// 5. ФУНКЦИЯ ОТПРАВКИ
async function saveToSupabase(data) {
  try {
    const { error } = await supabase.from('pins').insert(data);
    if (error) {
      console.error('❌ Ошибка Supabase API:', error.message);
    }
  } catch (err) {
    console.error('❌ Сетевая ошибка:', err.message);
  }
}

// 6. ЯВНЫЙ ЗАПУСК С ПЕРЕХВАТОМ ОШИБОК
importCsv()
  .then(() => console.log('👋 Процесс завершен.'))
  .catch((err) => console.error('💥 Критическая ошибка:', err));