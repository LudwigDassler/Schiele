import { NextResponse } from "next/server";
import { SonicTensor } from "@/lib/tensor";
import { OverseerCore } from "@/core/overseer";

const MAX_MUTATIONS = 5;

function cleanLLMJSON(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "");
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```/, "");
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
  return cleaned.trim();
}

function generateAIImageUrl(prompt: string): string {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://pollinations.ai/p/${encodedPrompt}?width=1080&height=1350&seed=${seed}&nologo=true&enhance=true`;
}

export async function POST(req: Request) {
  try {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { previous_state, mutation_cycle = 1 } = body;

    if (!previous_state || typeof previous_state !== "object") {
      return NextResponse.json({ error: "Previous state required" }, { status: 400 });
    }
    if (mutation_cycle > MAX_MUTATIONS) {
      return NextResponse.json({ error: "Maximum mutation depth reached." }, { status: 400 });
    }

    // 1. МАТЕМАТИЧЕСКАЯ ПЕРЕГРУЗКА
    const oldDepth = previous_state.math_constants?.fractal_depth || 1.0;
    const newFractalDepth = Number((oldDepth * 1.618033988749).toFixed(4));
    
    const tensor = new SonicTensor(0.9, 0.2, 140);
    const newTVector = tensor.calculateTranscendenceVector(newFractalDepth);
    const mutationHex = tensor.getHexColor();

    // 2. БАЗОВЫЙ СИНТЕЗ ОТ МИКРОСЕРВИСА (Groq)
    const systemPrompt = `
      Ты — ядро Aesthetic Nexus. МУТАЦИЯ АРТЕФАКТА №${mutation_cycle}.
      Старый Вайб: ${previous_state.core_vibe}
      Старый Промпт: ${previous_state.generation_prompt}
      Новая Фрактальная Глубина: ${newFractalDepth}
      Вектор Трансцендентности: ${newTVector}
      
      Разрушь старую форму. Сделай визуал более искаженным, мрачным или абстрактным.
      Верни JSON: { "core_vibe": "...", "sonic_analysis": "...", "color_palette": ["${mutationHex}", ...3 more], "generation_prompt": "..." }
    `;

    // ЗАЩИТА 1: Контроллер таймаута (12 секунд на мутацию)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let mutatedData: any = {};
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Execute mutation." }],
          temperature: 0.6,
          response_format: { type: "json_object" }
        })
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Groq API failed");
      
      mutatedData = JSON.parse(cleanLLMJSON((await res.json()).choices?.[0]?.message?.content || "{}"));
    } catch (err) {
      clearTimeout(timeoutId);
      throw err; // Сработает внешний catch, не роняя весь контейнер
    }

    // ЗАЩИТА 2: Валидатор цветов
    const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    const validColors = Array.isArray(mutatedData.color_palette) ? mutatedData.color_palette.filter(isValidHex) : [];
    if (validColors[0] !== mutationHex) validColors.unshift(mutationHex);
    const fallbackPalette = ["#0A0A0C", "#1A1821", "#d4b896", "#4A3B52"];
    while (validColors.length < 5) validColors.push(fallbackPalette[validColors.length - 1] || "#FFFFFF");

    const genPrompt = mutatedData.generation_prompt || previous_state.generation_prompt;

    const rawMutation = {
      ...previous_state,
      core_vibe: mutatedData.core_vibe?.toUpperCase() || "UNKNOWN MUTATION",
      sonic_analysis: mutatedData.sonic_analysis || "Acoustic distortion threshold breached.",
      color_palette: validColors.slice(0, 5),
      generation_prompt: genPrompt,
      generated_artifact: generateAIImageUrl(genPrompt),
      mutation_cycle: mutation_cycle,
      math_constants: { fractal_depth: newFractalDepth, t_vector: newTVector },
      timestamp: new Date().toISOString()
    };

    // 3. КОНТРОЛЬ НАДЗИРАТЕЛЯ (Локальная Llama 3)
    const overseer = new OverseerCore();
    const enforcedMutation = await overseer.critiqueAndEnforce(rawMutation);

    if (enforcedMutation.overseer_intervention) {
       enforcedMutation.generated_artifact = generateAIImageUrl(enforcedMutation.generation_prompt);
    }

    return NextResponse.json({ source: "mutation_chamber", data: enforcedMutation });

  } catch (criticalError: any) {
    return NextResponse.json({ error: "Mutation failed", details: criticalError.message }, { status: 500 });
  }
}
