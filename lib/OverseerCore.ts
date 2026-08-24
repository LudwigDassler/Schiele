/**
 * ==========================================
 * OVERSEER CORE: Математическое Сито
 * ==========================================
 * Отвечает исключительно за расчет Байесовской вероятности,
 * энтропии Шеннона и аппаратный обрыв TCP-сокетов (Гильотина).
 */

export class OverseerCore {
  
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
   * Многомерный Байесовский Триаж (TCP-Гильотина)
   * Теперь PUBLIC, чтобы твой route.ts мог передавать сюда сырые ссылки из DDG.
   */
  public static async bayesianGuillotine(urls: string[], targetEnergy: number, targetChaos: number): Promise<string[]> {
    const survivors: string[] = [];
    
    // Асинхронно выстреливаем по всем URL сразу
    const promises = urls.map(async (url) => {
      const prior = this.getPriorProbability(url);
      if (prior < 0.1) return; // Мгновенная смерть для мусорных доменов, даже не открываем сокет

      const controller = new AbortController();
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.body) return;

        const reader = response.body.getReader();
        const { value: chunk, done } = await reader.read(); 
        
        // УБИЙСТВО В ПОЛЕТЕ: Мы прочитали первые килобайты. 
        // Немедленно рвем сокет, чтобы не грузить память и процессор.
        reader.cancel();
        controller.abort(); 

        if (!done && chunk) {
          // 1. Извлекаем физику первого чанка
          let energySum = 0;
          for (let i = 0; i < chunk.length; i++) energySum += chunk[i];
          
          const chunkEnergy = (energySum / chunk.length) / 255.0; 
          const chunkEntropy = this.calculateShannon(chunk);      

          // 2. Считаем Правдоподобие P(E|S)
          const energyLikelihood = Math.max(0, 1.0 - Math.abs(chunkEnergy - targetEnergy));
          const chaosLikelihood = Math.max(0, 1.0 - Math.abs(chunkEntropy - targetChaos));
          
          // Текстура (хаос) имеет больший вес (0.7), чем сырая яркость (0.3)
          const likelihood = (energyLikelihood * 0.3) + (chaosLikelihood * 0.7);

          // 3. Байесовское обновление P(S|E) = Likelihood * Prior
          const posterior = likelihood * prior;

          // 4. Ожидаемая полезность (Теория Игр)
          // Стоимость обработки на Питоне (0.25). Ценность успеха (1.0).
          const expectedUtility = (posterior * 1.0) - 0.25;

          // Пропускаем только те активы, чья математическая ставка сыграла в плюс
          if (expectedUtility > 0.3) {
            survivors.push(url);
          }
        }
      } catch (e) {
        // Ошибка сети или успешный аппаратный abort(). Молча списываем актив.
      }
    });

    // Ждем, пока отработают все обрывы сокетов
    await Promise.all(promises);
    return survivors;
  }
}
