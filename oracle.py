import cv2
import numpy as np
import urllib.request
import hashlib
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Инициализация Оракула
app = FastAPI()
executor = ThreadPoolExecutor(max_workers=15)

# --- СТРУКТУРЫ ДАННЫХ ---
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

class MutateRequest(BaseModel):
    image_url: str
    title: Optional[str] = ""

# --- РАСШИРЕННЫЙ ТЕНЗОРНЫЙ ЛЕКСИКОН ---
LEXICON = {
    'dark': np.array([0.2, 0.5]),
    'noise': np.array([0.5, 0.8]),
    'vintage': np.array([0.4, 0.7]),
    'neon': np.array([0.8, 0.6]),
    'minimal': np.array([0.8, 0.2]),
    'aesthetic': np.array([0.6, 0.4]),
    'grunge': np.array([0.3, 0.9]),
    'cinematic': np.array([0.4, 0.5]),
    'ethereal': np.array([0.8, 0.1]),
    'default': np.array([0.5, 0.5])
}

def get_target_tensor(query: str) -> np.ndarray:
    """Переводит текст в геометрию или генерирует уникальный хэш-тензор"""
    query_lower = query.lower()
    
    # 1. Ищем известные слова
    for word, tensor in LEXICON.items():
        if word in query_lower and word != 'default':
            return tensor
            
    # 2. Динамическая генерация для неизвестных запросов
    hash_val = int(hashlib.md5(query_lower.encode()).hexdigest(), 16)
    energy = (hash_val % 100) / 100.0
    chaos = ((hash_val // 100) % 100) / 100.0
    
    # Смягчаем значения
    energy = 0.3 + (energy * 0.4)
    chaos = 0.3 + (chaos * 0.4)
    return np.array([energy, chaos])

def fetch_and_analyze(artifact: Artifact, target_tensor: np.ndarray):
    """Ядро препарирования для поиска"""
    try:
        req = urllib.request.Request(artifact.thumb, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            image_data = np.asarray(bytearray(response.read()), dtype="uint8")
        
        img = cv2.imdecode(image_data, cv2.IMREAD_GRAYSCALE)
        if img is None: return None
            
        img = cv2.resize(img, (64, 64))
        energy = np.mean(img) / 255.0
        chaos = min(1.0, cv2.Laplacian(img, cv2.CV_64F).var() / 1000.0)
        
        artifact_tensor = np.array([energy, chaos])
        distance = np.linalg.norm(target_tensor - artifact_tensor)
        
        return {"artifact": artifact, "distance": distance}
    except Exception:
        return None

# ==========================================
# ЭНДПОИНТ 1: ПОИСК (СЛИЯНИЕ ВЫДАЧИ)
# ==========================================
@app.post("/resonate")
async def resonate(request: ResonateRequest):
    target_tensor = get_target_tensor(request.query)
    print(f"\n[ORACLE] Целевой тензор для '{request.query[:30]}...': {target_tensor}")
    
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(executor, fetch_and_analyze, art, target_tensor) for art in request.artifacts]
    results = await asyncio.gather(*tasks)
    
    valid_results = [r for r in results if r is not None]
    valid_results.sort(key=lambda x: x["distance"])
    
    cutoff = max(3, int(len(valid_results) * 0.4))
    elite_artifacts = [r["artifact"] for r in valid_results[:cutoff]]
    
    print(f"[ORACLE] Одобрено {len(elite_artifacts)}/{len(request.artifacts)} артефактов.")
    return {"results": elite_artifacts}

# ==========================================
# ЭНДПОИНТ 2: МУТАЦИЯ (ОБРАТНАЯ ПРОЕКЦИЯ)
# ==========================================
@app.post("/mutate")
async def mutate_image(request: MutateRequest):
    """Картинка + Имя -> Тензор -> Идеальный текстовый запрос"""
    try:
        req = urllib.request.Request(request.image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            image_data = np.asarray(bytearray(response.read()), dtype="uint8")
        
        img = cv2.imdecode(image_data, cv2.IMREAD_GRAYSCALE)
        if img is None: raise Exception("Invalid image data")
            
        img = cv2.resize(img, (64, 64))
        energy = np.mean(img) / 255.0
        chaos = min(1.0, cv2.Laplacian(img, cv2.CV_64F).var() / 1000.0)
        img_tensor = np.array([energy, chaos])
        
        best_match = "aesthetic"
        min_dist = 999
        for word, tensor in LEXICON.items():
            if word == 'default': continue
            dist = np.linalg.norm(img_tensor - tensor)
            if dist < min_dist:
                min_dist = dist
                best_match = word
        
        subject = request.title.strip() if request.title else ""
        smart_query = f"{subject} {best_match} aesthetic high quality".strip()
        display_vibe = f"RESONANCE: {best_match.upper()} (E:{energy:.2f} C:{chaos:.2f})"
        
        print(f"[ORACLE MUTATE] Вычислено: {smart_query}")
        
        return {
            "success": True,
            "smartQuery": smart_query,
            "displayVibe": display_vibe,
            "source": "tensor-inverse-projection"
        }
    except Exception as e:
        print(f"[ORACLE MUTATE ERROR] {e}")
        subject = request.title.strip() if request.title else "aesthetic"
        return {
            "success": False,
            "smartQuery": f"{subject} aesthetic high quality",
            "displayVibe": "TENSOR FAILED",
            "source": "fallback"
        }