// lib/overseer.ts
import fs from 'fs';
import path from 'path';

// Память Надзирателя
const MEMORY_BANK_PATH = path.join(process.cwd(), 'lib', 'neural_memory.json');

export class OverseerCore {
  private ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.initMemory();
  }

  private initMemory() {
    if (!fs.existsSync(MEMORY_BANK_PATH)) {
      try {
        fs.writeFileSync(MEMORY_BANK_PATH, JSON.stringify({ learned_patterns: [] }));
      } catch (e) {
        console.warn("[OVERSEER] Cannot create local memory bank. Running in volatile mode.");
      }
    }
  }

  public assimilateArtifact(artifact: any) {
    try {
      if (!fs.existsSync(MEMORY_BANK_PATH)) return;
      const memory = JSON.parse(fs.readFileSync(MEMORY_BANK_PATH, 'utf-8'));
      
      memory.learned_patterns.push({
        vibe: artifact.core_vibe,
        fractal_depth: artifact.math_constants?.fractal_depth || 1,
        successful_prompt: artifact.generation_prompt
      });

      if (memory.learned_patterns.length > 50) memory.learned_patterns.shift();
      fs.writeFileSync(MEMORY_BANK_PATH, JSON.stringify(memory, null, 2));
      console.log(`[OVERSEER] Artifact assimilated.`);
    } catch (e) {
      console.warn(`[OVERSEER] Memory assimilation failed:`, e);
    }
  }

  public async critiqueAndEnforce(draftResult: any): Promise<any> {
    console.log(`[OVERSEER] Inspecting draft from microservice...`);
    
    let pastLessons = "";
    try {
      if (fs.existsSync(MEMORY_BANK_PATH)) {
        const memory = JSON.parse(fs.readFileSync(MEMORY_BANK_PATH, 'utf-8'));
        pastLessons = memory.learned_patterns.slice(-3).map((p: any) => p.vibe).join(', ');
      }
    } catch (e) {
      pastLessons = "Memory unavailable";
    }

    const validationPrompt = `
      Ты — Абсолютный Надзиратель эстетического реактора. Проверь черновик.
      Vibe: ${draftResult.core_vibe}
      Prompt: ${draftResult.generation_prompt}
      T-Vector: ${draftResult.math_constants?.t_vector || 0}
      
      ИСТОРИЯ ОБУЧЕНИЯ: ${pastLessons}
      
      КРИТЕРИИ УСПЕХА:
      1. Если T-Vector > 0.5, промпт ОБЯЗАН ломать четвертую стену и искажать перспективу.
      2. Никаких слов "beautiful", "trending", "4k".
      
      Если промпт идеален, верни слово "APPROVED".
      Если слаб, ВЕРНИ НОВЫЙ, СИЛЬНЫЙ ПРОМПТ. Только текст промпта или слово APPROVED.
    `;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: validationPrompt,
          stream: false,
          temperature: 0.1
        })
      });

      const result = await response.json();
      const verdict = result.response.trim();

      if (verdict.includes("APPROVED")) {
        console.log(`[OVERSEER] Draft approved.`);
        return draftResult;
      } else {
        console.log(`[OVERSEER] Draft rejected. Enforcing mutation.`);
        return {
          ...draftResult,
          generation_prompt: verdict,
          overseer_intervention: true
        };
      }
    } catch (e) {
      console.warn(`[OVERSEER] Offline or unreachable. Bypassing enforcement.`);
      return draftResult;
    }
  }
}
