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
# Structure (0.0 гладко -> 1.0 плотная геометрия)
# Symmetry (0.0 хаотично -> 1.0 идеальная симметрия фасада/лица)
# ==========================================
LEXICON = {
    'dark': np.array([0.2, 0.5, 0.6, 0.4, 0.5]),       
    'noise': np.array([0.5, 0.8, 0.0, 0.8, 0.3]),      
    'vintage': np.array([0.4, 0.7, 0.1, 0.5, 0.6]),    
    'neon': np.array([0.6, 0.6, 0.8, 0.6, 0.5]),       
    'minimal': np.array([0.8, 0.2, 0.0, 0.1, 0.8]),    # Минимум линий, высокая симметрия
    'aesthetic': np.array([0.6, 0.4, 0.5, 0.4, 0.6]),  
    'grunge': np.array([0.3, 0.9, 0.15, 0.8, 0.4]),    # Много грязи, асимметрично
    'cinematic': np.array([0.4, 0.5, 0.55, 0.5, 0.7]), 
    'ethereal': np.array([0.8, 0.1, 0.7, 0.2, 0.6]),   
    'portrait': np.array([0.5, 0.3, 0.1, 0.3, 0.9]),   # ПОРТРЕТ: Лицо гладкое (Structure 0.3), но идеально симметричное (0.9)
    'architecture': np.array([0.6, 0.4, 0.0, 0.9, 0.9]),# ЗДАНИЕ: Много жестких линий (Structure 0.9) и симметрия (0.9)
    'default': np.array([0.5, 0.5, 0.5, 0.5, 0.5])
}

def get_target_tensor(query: str) -> np.ndarray:
    query_lower = query.lower()
    for word, tensor in LEXICON.items():
        if word in query_lower and word != 'default':
            return tensor
            
    # Динамический 5D-тензор для неизвестных слов
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
    
    # 1. Энергия
    energy = np.mean(img_gray) / 255.0
    
    # 2. Хаос (Микро-шум)
    chaos = min(1.0, cv2.Laplacian(img_gray, cv2.CV_64F).var() / 1000.0)
    
    # 3. Цвет
    hist = cv2.calcHist([img_hsv], [0], None, [18], [0, 180])
    hue = (np.argmax(hist) * 10) / 180.0
    if (np.mean(img_hsv[:, :, 1]) / 255.0) < 0.15: hue = 0.0
        
    # 4. СТРУКТУРНАЯ ПЛОТНОСТЬ (Макро-границы)
    edges = cv2.Canny(img_gray, 50, 150)
    structure = np.mean(edges) / 255.0
    
    # 5. БИЛАТЕРАЛЬНАЯ СИММЕТРИЯ
    img_flipped = cv2.flip(img_gray, 1)
    diff = cv2.absdiff(img_gray, img_flipped)
    symmetry = 1.0 - (np.mean(diff) / 255.0)
        
    return np.array([energy, chaos, hue, structure, symmetry])

def fetch_and_analyze(artifact: Artifact, target_tensor: np.ndarray):
    try:
        req = urllib.request.Request(artifact.thumb, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            tensor = extract_physics(bytearray(response.read()))
            
        # Теперь Оракул считает расстояние в 5-мерном пространстве
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
    try:
        req = urllib.request.Request(request.image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            img_tensor = extract_physics(bytearray(response.read()))
            
        energy, chaos, hue, structure, symmetry = img_tensor
        
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
        
        display_vibe = f"RESONANCE: {best_match.upper()} (E:{energy:.2f} C:{chaos:.2f} H:{hue:.2f} ST:{structure:.2f} SY:{symmetry:.2f})"
        
        return {
            "success": True,
            "smartQuery": smart_query,
            "displayVibe": display_vibe,
            "source": "tensor-5d-projection"
        }
    except Exception as e:
        subject = request.title.strip() if request.title else "aesthetic"
        return {
            "success": False,
            "smartQuery": f"{subject} aesthetic high quality",
            "displayVibe": "TENSOR FAILED",
            "source": "fallback"
        }