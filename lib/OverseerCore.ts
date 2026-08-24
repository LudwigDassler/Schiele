export class OverseerCore {
  private static getPriorProbability(url: string): number {
    let prior = 0.5; // ПРЕЗУМПЦИЯ НЕВИНОВНОСТИ (было 0.3)
    const trusted = ['pinterest.com', 'unsplash.com', 'tumblr.com', 'behance.net', 'artstation.com', 'flickr.com'];
    const trash = ['shutterstock.com', 'alamy.com', 'wikipedia.org', 'dreamstime.com', 'istockphoto.com'];

    for (const domain of trusted) {
      if (url.includes(domain)) prior += 0.3;
    }
    for (const domain of trash) {
      if (url.includes(domain)) prior -= 0.3;
    }
    return Math.max(0.1, Math.min(prior, 0.9)); 
  }

  private static calculateShannon(chunk: Uint8Array): number {
    const frequencies = new Int32Array(256);
    for (let i = 0; i < chunk.length; i++) frequencies[chunk[i]]++;
    let entropy = 0;
    const len = chunk.length;
    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const p = frequencies[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy / 8.0; 
  }

  public static async bayesianGuillotine(urls: string[], targetEnergy: number, targetChaos: number): Promise<string[]> {
    const survivors: string[] = [];
    
    try {
      const promises = urls.map(async (url) => {
        const prior = this.getPriorProbability(url);
        if (prior < 0.15) return; // Моментальная смерть только для откровенного мусора

        const controller = new AbortController();
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.body) return;

          const reader = response.body.getReader();
          const { value: chunk, done } = await reader.read(); 
          reader.cancel();
          controller.abort(); 

          if (!done && chunk) {
            let energySum = 0;
            for (let i = 0; i < chunk.length; i++) energySum += chunk[i];
            
            const chunkEnergy = (energySum / chunk.length) / 255.0; 
            const chunkEntropy = this.calculateShannon(chunk);      

            const energyLikelihood = Math.max(0, 1.0 - Math.abs(chunkEnergy - targetEnergy));
            const chaosLikelihood = Math.max(0, 1.0 - Math.abs(chunkEntropy - targetChaos));
            
            const likelihood = (energyLikelihood * 0.4) + (chaosLikelihood * 0.6);
            const posterior = likelihood * prior;

            // Порог снижен. Теперь качественная картинка с неизвестного сайта (prior 0.5) 
            // может дать posterior ~0.45. Мы пропускаем всё, что больше 0.15.
            const expectedUtility = posterior - 0.2;
            if (expectedUtility > 0.15) {
              survivors.push(url);
            }
          }
        } catch (e) {
          // Игнорируем сетевой шум
        }
      });

      await Promise.all(promises);
    } catch (globalError) {
      console.error("[OVERSEER] Гильотина упала, активирован Bypass:", globalError);
      return urls; // Возвращаем сырой массив, чтобы не ронять весь API-роут
    }

    // Защита от пустой ленты: если Гильотина выкосила ВООБЩЕ всех, пропускаем всех
    return survivors.length > 0 ? survivors : urls; 
  }
}
