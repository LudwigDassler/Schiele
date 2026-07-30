import { useEffect, useRef } from "react";

export function useTasteProfile() {
  const aiWorker = useRef<Worker | null>(null);
  const userTasteProfile = useRef<number[] | null>(null);

  useEffect(() => {
    aiWorker.current = new Worker(new URL("/ai-worker.js", window.location.origin), { type: "module" });
    
    const savedTaste = localStorage.getItem("schiele_taste_vector");
    if (savedTaste) userTasteProfile.current = JSON.parse(savedTaste);

    aiWorker.current.onmessage = (e) => {
      const { status, message, embedding } = e.data;
      
      if (status === "init" || status === "ready") {
        console.log(`[Local AI]: ${message}`);
      } else if (status === "done") {
        console.log(`[Local AI]: Вектор рассчитан (${embedding.length} параметров).`);
        
        if (!userTasteProfile.current) {
          userTasteProfile.current = embedding;
        } else {
          // 1. Складываем векторы (объединяем опыт)
          const merged = userTasteProfile.current.map((val: number, i: number) => val + embedding[i]);
          
          // 2. L2 Нормализация (высчитываем длину и нормализуем, чтобы вектор не "затухал")
          const magnitude = Math.sqrt(merged.reduce((sum, val) => sum + val * val, 0));
          userTasteProfile.current = merged.map(val => val / magnitude);
        }
        
        localStorage.setItem("schiele_taste_vector", JSON.stringify(userTasteProfile.current));
        console.log("[Local AI]: Профиль вкуса откалиброван и нормализован.");
      }
    };

    return () => aiWorker.current?.terminate();
  }, []);

  function feedLocalAI(imageUrl: string, id: string) {
    if (aiWorker.current) {
      aiWorker.current.postMessage({ action: "analyze_taste", imageUrl, id });
    }
  }

  return { feedLocalAI };
}