/**
 * ==========================================
 * ТРОИЦА: 1. OVERSEER CORE (Бог-Отец)
 * ==========================================
 * Логистика, парсинг сырья и Байесовская TCP-Гильотина.
 */

export class OverseerCore {
  
  /**
   * Запуск Рейда.
   * @param query Текстовый запрос для парсера
   * @param targetEnergy Идеальная яркость (0.0 - тьма, 1.0 - свет)
   * @param targetChaos Идеальная текстура (0.0 - градиент/вектор, 1.0 - шум/зерно)
   */
  static async executeRaid(query: string, targetEnergy: number, targetChaos: number): Promise<string[]> {
    console.log(`[OVERSEER] Рейд начат: "${query}". Вектор цели -> Энергия: ${targetEnergy}, Хаос: ${targetChaos}`);
    
    // 1. Сбор сырья и инъекция Котельникова
    const rawUrls = await this.scrapeAndDownsample(query);
    console.log(`[OVERSEER] Извлечено ссылок: ${rawUrls.length}. Запуск Байесовской Гильотины...`);

    // 2. Многомерный триаж (Убийство в полете)
    const survivors = await this.bayesianGuillotine(rawUrls, targetEnergy, targetChaos);
    console.log(`[OVERSEER] Гильотина отсекла мусор. Выжило элиты: ${survivors.length}`);

    // Возвращаем выжившие ссылки для передачи Питону
    return survivors;
  }

  /**
   * Скрапер DuckDuckGo + Теорема Котельникова (сжатие на лету)
   */
  private static async scrapeAndDownsample(query: string): Promise<string[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    try {
      // Идем в поисковик, маскируясь под обычный браузер
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
      });
      const html = await res.text();
      
      const imgRegex = /src="(\/\/external-content\.duckduckgo\.com\/iu\/\?u=[^"]+)"/g;
      let match;
      const urls: string[] = [];
      
      while ((match = imgRegex.exec(html)) !== null && urls.length < 50) {
        let url = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
        
        // Котельников: Принудительное сжатие спектра.
        // Заставляем сервера-доноры отдавать нам микро-превью.
        url = url.replace(/([?&])w=\d+/g, '$1w=128').replace(/([?&])h=\d+/g, '$1h=128');
        urls.push(url);
      }
      return urls;
    } catch (e) {
      console.error("[OVERSEER] Ошибка слепого рейда:", e);
      return [];
    }
  }

  /**
   * Априорная вероятность источника P(S)
   */
  private static getPriorProbability(url: string): number {
    let prior = 0.3; 
    const trusted = ['pinterest.com', 'unsplash.com', 'tumblr.com', 'behance.net', 'artstation.com'];
    const trash = ['shutterstock.com', 'alamy.com', 'wikipedia.org', 'dreamstime.com'];

    for (const domain of trusted) {
      if (url.includes(domain)) prior += 0.4;
    }
    for (const domain of trash) {
      if (url.includes(domain)) prior -= 0.2;
    }
    return Math.max(0.01, Math.min(prior, 0.9)); 
  }

  /**
   * Энтропия Шеннона H(X) для первого байтового чанка
   */
  private static calculateShannon(chunk: Uint8Array): number {
    const frequencies = new Int32Array(256);
    for (let i = 0; i < chunk.length; i++) {
      frequencies[chunk[i]]++;
    }

    let entropy = 0;
    const len = chunk.length;
    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const p = frequencies[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy / 8.0; // Нормализация к 0..1
  }

  /**
   * Многомерный Байесовский Триаж (Математическое Сито)
   */
  private static async bayesianGuillotine(urls: string[], targetEnergy: number, targetChaos: number): Promise<string[]> {
    const survivors: string[] = [];
    
    const promises = urls.map(async (url) => {
      const prior = this.getPriorProbability(url);
      if (prior < 0.1) return; // Мгновенная смерть для мусорных доменов

      const controller = new AbortController();
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.body) return;

        const reader = response.body.getReader();
        const { value: chunk, done } = await reader.read(); 
        
        // УБИЙСТВО В ПОЛЕТЕ: Нам нужен только первый пакет данных.
        reader.cancel();
        controller.abort(); 

        if (!done && chunk) {
          // Физика первого чанка
          let energySum = 0;
          for (let i = 0; i < chunk.length; i++) energySum += chunk[i];
          
          const chunkEnergy = (energySum / chunk.length) / 255.0; 
          const chunkEntropy = this.calculateShannon(chunk);      

          // Правдоподобие P(E|S)
          const energyLikelihood = Math.max(0, 1.0 - Math.abs(chunkEnergy - targetEnergy));
          const chaosLikelihood = Math.max(0, 1.0 - Math.abs(chunkEntropy - targetChaos));
          
          // Текстура (хаос) имеет больший вес (0.7), чем сырая яркость (0.3)
          const likelihood = (energyLikelihood * 0.3) + (chaosLikelihood * 0.7);

          // Байесовское обновление P(S|E)
          const posterior = likelihood * prior;

          // Ожидаемая полезность: EU = P(S|E) * Value - Cost
          // Стоимость обработки на Питоне (0.25). Ценность успеха (1.0).
          const expectedUtility = (posterior * 1.0) - 0.25;

          if (expectedUtility > 0.3) {
            survivors.push(url);
          }
        }
      } catch (e) {
        // Сетевое прерывание прошло успешно или ссылка мертва. Забываем про нее.
      }
    });

    // Распараллеливаем удары гильотины. 
    await Promise.all(promises);
    return survivors;
  }
}
