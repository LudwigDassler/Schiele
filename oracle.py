from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import numpy as np
import os
import math

# ==========================================
# 1. ИНИЦИАЛИЗАЦИЯ СЕРВЕРА
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Разрешает запросы с фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. ФУНДАМЕНТАЛЬНЫЙ ЛЕКСИКОН
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
    'architecture': np.array([0.6, 0.4, 0.0, 0.9, 0.9])
}

# ==========================================
# 3. ИНИЦИАЛИЗАЦИЯ ТЕНЗОРНОГО МОЗГА
# ==========================================
BRAIN_PATH = os.path.join(os.path.dirname(__file__), 'tensor_brain.json')
try:
    with open(BRAIN_PATH, 'r', encoding='utf-8') as f:
        TENSOR_BRAIN = json.load(f)
    print(f"[KASHMIR ORACLE] Тензорный Мозг успешно подключен. Загружено {len(TENSOR_BRAIN)} концептов.")
except FileNotFoundError:
    print("[KASHMIR ORACLE] ВНИМАНИЕ: tensor_brain.json не найден. Мозг работает в вакууме.")
    TENSOR_BRAIN = {}

# ==========================================
# 4. ЯДРО СИНТЕЗА И АНАЛИЗА
# ==========================================
def get_vibe_from_text(prompt: str) -> np.ndarray:
    """Переводит текст в 5D-тензор."""
    if not prompt:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
    clean_prompt = "".join([c if c.isalnum() or c.isspace() else " " for c in prompt])
    words = clean_prompt.lower().split()
    tensors = [np.array(TENSOR_BRAIN[w]) for w in words if w in TENSOR_BRAIN]
    
    if not tensors:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
    return np.mean(tensors, axis=0)

def extract_physics_from_image(image_path_or_bytes) -> np.ndarray:
    """(Заглушка) Извлечение физики из картинки."""
    return np.array([0.5, 0.5, 0.5, 0.5, 0.5])

def mutate_image(img_tensor: np.ndarray) -> str:
    """Находит ближайший стиль из базового лексикона."""
    best_style = "default"
    min_dist = float('inf')
    for style_name, style_tensor in LEXICON.items():
        dist = np.linalg.norm(img_tensor - style_tensor)
        if dist < min_dist:
            min_dist = dist
            best_style = style_name
    return best_style

def calculate_resonance(tensor_a: np.ndarray, tensor_b: np.ndarray) -> float:
    """Считает процент совпадения двух 5D-тензоров."""
    dist = np.linalg.norm(tensor_a - tensor_b)
    max_dist = math.sqrt(5)
    resonance = max(0.0, 1.0 - (dist / max_dist))
    return round(resonance, 4)

# ==========================================
# 5. API ЭНДПОИНТЫ
# ==========================================
class TextQuery(BaseModel):
    prompt: str

@app.get("/")
def health_check():
    return {"status": "Kashmir Oracle 5D is online", "brain_size": len(TENSOR_BRAIN)}

@app.post("/api/vibe")
def analyze_text(query: TextQuery):
    tensor = get_vibe_from_text(query.prompt)
    # Numpy массивы нужно переводить в обычные списки для выдачи JSON
    return {"tensor": [round(float(x), 4) for x in tensor]}