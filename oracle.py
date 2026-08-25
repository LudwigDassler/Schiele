import cv2
import numpy as np
import urllib.request
import hashlib
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()
executor = ThreadPoolExecutor(max_workers=15)

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

# ==========================================
# 5D ТЕНЗОРНЫЙ ЛЕКСИКОН: [Energy, Chaos, Hue, Structure, Symmetry]
# ==========================================
LEXICON = {
    'dark': np.array([0.2, 0.5, 0.6, 0.4, 0.5]),       
    'noise': np.array([0.5, 0.8, 0.0, 0.8, 0.3]),      
    'vintage': np.array([0.4, 0.7, 0.1, 0.5, 0.6]),    
    'neon': np.array([0.6, 0.6, 0.8, 0.6, 0.5]),       
    'minimal': np.array([0.8, 0.2, 0.0, 0.1, 0.8]),    
    'aesthetic': np.array([0.6, 0.4, 0.5, 0.4, 0.6]),  
    'grunge': np.array([0.3, 0.9, 0.15, 0.8, 0.4]),    
    'cinematic': np.array([0.4, 0.5, 0.55, 0.5, 0.7]), 
    'ethereal': np.array([0.8, 0.1, 0.7, 0.2, 0.6]),   
    'portrait': np.array([0.5, 0.3, 0.1, 0.3, 0.9]),   
    'architecture': np.array([0.6, 0.4, 0.0, 0.9, 0.9]),
    'default': np.array([0.5, 0.5, 0.5, 0.5, 0.5])
}

# 🚀 СЕМАНТИЧЕСКИЙ МОСТ V1.0 (Культурные Якоря)
SEMANTIC_BRIDGE = {
    "oppenheimer": np.array([0.25, 0.85, 0.1, 0.75, 0.6]),  # Мрачный, технологичный, контрастный
    "pink floyd": np.array([0.3, 0.9, 0.55, 0.4, 0.7]),      # Психоделичный, кинематографичный (Teal)
    "cyberpunk": np.array([0.7, 0.8, 0.85, 0.8, 0.4]),       # Яркий неон, хаос, жесткая геометрия
    "gothic": np.array([0.15, 0.6, 0.2, 0.85, 0.5]),         # Темный, максимальная структура
    "jimmy page": np.array([0.25, 0.9, 0.0, 0.2, 0.8]),      # Концертный ЧБ, контраст, портрет
}

def get_target_tensor(query: str) -> np.ndarray:
    query_lower = query.lower()
    
    # 1. Проверяем Семантический Мост
    for keyword, tensor in SEMANTIC_BRIDGE.items():
        if keyword in query_lower:
            return tensor

    # 2. Проверяем Базовый Лексикон
    for word, tensor in LEXICON.items():
        if word in query_lower and word != 'default':
            return tensor
            
    # 3. Динамический 5D-тензор для неизвестных слов
    hash_val = int(hashlib.md5(query_lower.encode()).hexdigest(), 16)
    energy = 0.3 + (((hash_val % 100) / 100.0) * 0.4)
    chaos = 0.3 + ((((hash_val // 100) % 100) / 100.0) * 0.4)
    hue = ((hash_val // 10000) % 100) / 100.0
    structure = 0.2 + ((((hash_val // 1000000) % 100) / 100.0) * 0.6)
    symmetry = 0.3 + ((((hash_val // 100000000) % 100) / 100.0) * 0.5)
    return np.array([energy, chaos, hue, structure, symmetry])

def extract_physics(image_bytes: bytearray) -> np.ndarray:
    image_data = np.asarray(image_bytes, dtype="uint8")
    img_bgr = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
    if img_bgr is None: raise ValueError("Invalid image")
        
    img_bgr = cv2.resize(img_bgr, (64, 64))
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    energy = np.mean(img_gray) / 255.0
    chaos = min(1.0, cv2.Laplacian(img_gray, cv2.CV_64F).var() / 1000.0)
    
    hist = cv2.calcHist([img_hsv], [0], None, [18], [0, 180])
    hue = (np.argmax(hist) * 10) / 180.0
    if (np.mean(img_hsv[:, :, 1]) / 255.0) < 0.15: hue = 0.0
        
    edges = cv2.Canny(img_gray, 50, 150)
    structure = np.mean(edges) / 255.0
    
    img_flipped = cv2.flip(img_gray, 1)
    diff = cv2.absdiff(img_gray, img_flipped)
    symmetry = 1.0 - (np.mean(diff) / 255.0)
        
    return np.array([energy, chaos, hue, structure, symmetry])

def fetch_and_analyze(artifact: Artifact, target_tensor: np.ndarray):
    try:
        req = urllib.request.Request(artifact.thumb, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=4) as response:
            tensor = extract_physics(bytearray(response.read()))
            
        distance = np.linalg.norm(target_tensor - tensor)
        return {"artifact": artifact, "distance": distance}
    except Exception:
        return None

@app.post("/resonate")
async def resonate(request: ResonateRequest):
    target_tensor = get_target_tensor(request.query)
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(executor, fetch_and_analyze, art, target_tensor) for art in request.artifacts]
    results = await asyncio.gather(*tasks)
    
    valid_results = [r for r in results if r is not None]
    valid_results.sort(key=lambda x: x["distance"])
    
    cutoff = max(3, int(len(valid_results) * 0.4))
    elite_artifacts = [r["artifact"] for r in valid_results[:cutoff]]
    return {"results": elite_artifacts}

@app.post("/mutate")
async def mutate_image(request: MutateRequest):
    subject = request.title.strip() if request.title else ""
    img_tensor = None
    
    try:
        # Улучшенный User-Agent и увеличенный таймаут
        req = urllib.request.Request(
            request.image_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            img_tensor = extract_physics(bytearray(response.read()))
            
    except Exception as e:
        print(f"[ORACLE MUTATE NETWORK/DECODE ERROR] {e}. Инициирован математический фоллбэк.")
        # МЯГКИЙ ФОЛЛБЭК: Если картинка заблокирована, мы берем тензор из названия субъекта
        img_tensor = get_target_tensor(subject)

    energy, chaos, hue, structure, symmetry = img_tensor
    
    best_match = "aesthetic"
    min_dist = 999
    
    # Сравниваем полученный тензор со всем нашим словарем, чтобы найти идеальное описание
    for word, tensor in {**LEXICON, **SEMANTIC_BRIDGE}.items():
        if word == 'default': continue
        dist = np.linalg.norm(img_tensor - tensor)
        if dist < min_dist:
            min_dist = dist
            best_match = word
            
    smart_query = f"{subject} {best_match} aesthetic high quality".strip()
    
    display_vibe = f"RESONANCE: {best_match.upper()} (E:{energy:.2f} C:{chaos:.2f} H:{hue:.2f} ST:{structure:.2f} SY:{symmetry:.2f})"
    
    return {
        "success": True,
        "smartQuery": smart_query,
        "displayVibe": display_vibe,
        "source": "tensor-5d-projection"
    }