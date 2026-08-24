import cv2
import numpy as np
import urllib.request
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Инициализация Оракула
app = FastAPI()

# Пул на 15 потоков. Питон будет качать и препарировать 15 картинок ОДНОВРЕМЕННО.
# Твой процессор справится с этим за миллисекунды.
executor = ThreadPoolExecutor(max_workers=15) 

# --- СТРУКТУРЫ ДАННЫХ (Контракт с Node.js) ---
class Artifact(BaseModel):
    id: str
    src: str
    thumb: str
    title: str
    link: str
    isInternal: Optional[bool] = False

class ResonateRequest(BaseModel):
    query: str
    artifacts: List[Artifact]

# --- ТЕНЗОРНЫЙ ЛЕКСИКОН ---
# Пространство из 2 измерений: [Энергия (0..1), Хаос (0..1)]
# Энергия = Яркость. Хаос = Зерно/Глитч/Детализация.
LEXICON = {
    'dark': np.array([0.2, 0.5]),
    'noise': np.array([0.5, 0.8]),
    'vintage': np.array([0.4, 0.7]),
    'neon': np.array([0.8, 0.6]),
    'minimal': np.array([0.8, 0.2]),
    'aesthetic': np.array([0.6, 0.4]),
    'default': np.array([0.5, 0.5])
}

def get_target_tensor(query: str) -> np.ndarray:
    """Переводит глупый текст в строгую геометрию"""
    query_lower = query.lower()
    for word, tensor in LEXICON.items():
        if word in query_lower:
            return tensor
    return LEXICON['default']

def fetch_and_analyze(artifact: Artifact, target_tensor: np.ndarray):
    """Ядро препарирования. Качает, сжимает, считает матрицу."""
    try:
        # 1. Скачиваем картинку в память (Таймаут 3 секунды, чтобы не ждать мертвые серверы)
        req = urllib.request.Request(artifact.thumb, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            image_data = np.asarray(bytearray(response.read()), dtype="uint8")
        
        # 2. Декодируем сразу в ЧБ. Цвет нам не нужен для расчета текстуры.
        img = cv2.imdecode(image_data, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None
            
        # 3. Вектор Котельникова (Жесткое сжатие для скорости)
        img = cv2.resize(img, (64, 64))
        
        # 4. ЭНЕРГИЯ: Математическое ожидание яркости
        energy = np.mean(img) / 255.0
        
        # 5. ХАОС: Дисперсия Лапласиана (ищет резкие границы и шум)
        laplacian_var = cv2.Laplacian(img, cv2.CV_64F).var()
        chaos = min(1.0, laplacian_var / 1000.0) # Нормализация
        
        artifact_tensor = np.array([energy, chaos])
        
        # 6. Упрощенная Метрика Вассерштейна (Евклидово расстояние между векторами)
        # Формула: $ D = \sqrt{(E_1 - E_2)^2 + (C_1 - C_2)^2} $
        # Чем ближе D к нулю, тем идеальнее картинка подходит под запрос.
        distance = np.linalg.norm(target_tensor - artifact_tensor)
        
        return {"artifact": artifact, "distance": distance}
    except Exception:
        # Если картинка битая или не скачалась — она уничтожается.
        return None

@app.post("/resonate")
async def resonate(request: ResonateRequest):
    target_tensor = get_target_tensor(request.query)
    print(f"\n[ORACLE] Целевой тензор для '{request.query[:30]}...': {target_tensor}")
    
    loop = asyncio.get_event_loop()
    
    # Распараллеливаем вычисления. OpenCV работает на C++, поэтому GIL Питона нас не тормозит.
    tasks = [
        loop.run_in_executor(executor, fetch_and_analyze, art, target_tensor)
        for art in request.artifacts
    ]
    results = await asyncio.gather(*tasks)
    
    # Убираем мусор
    valid_results = [r for r in results if r is not None]
    
    # Сортируем картинки от самых идеальных (distance -> 0) к самым плохим
    valid_results.sort(key=lambda x: x["distance"])
    
    # Оставляем только элиту (топ-40% лучших результатов)
    cutoff = max(3, int(len(valid_results) * 0.4))
    elite_artifacts = [r["artifact"] for r in valid_results[:cutoff]]
    
    print(f"[ORACLE] Одобрено {len(elite_artifacts)}/{len(request.artifacts)} артефактов.")
    
    return {"results": elite_artifacts}
