import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

// Запрещаем искать модели локально на диске сервера (качаем с CDN в браузер)
env.allowLocalModels = false;

let extractor = null;

self.addEventListener("message", async (event) => {
  const { action, imageUrl, id } = event.data;

  if (action === "analyze_taste") {
    try {
      if (!extractor) {
        self.postMessage({ status: "init", message: "Загрузка локальной ИИ-модели в кэш браузера..." });
        // Грузим легковесную квантованную (INT8) версию CLIP
        extractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
          quantized: true,
        });
        self.postMessage({ status: "ready", message: "Локальный ИИ готов. Модель в памяти." });
      }

      self.postMessage({ status: "processing", id });
      
      // Магия: переводим картинку в математический вектор (512 чисел)
      const output = await extractor(imageUrl);
      const embedding = Array.from(output.data);
      
      self.postMessage({ status: "done", id, embedding });
    } catch (error) {
      self.postMessage({ status: "error", error: error.message });
    }
  }
});