from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import numpy as np
import os
import math
import requests
import cv2
from io import BytesIO
from PIL import Image

# ==========================================
# 1. ИНИЦИАЛИЗАЦИЯ СЕРВЕРА
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. ФУНДАМЕНТАЛЬНЫЙ ЛЕКСИКОН (5D)
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
    if not prompt:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
    clean_prompt = "".join([c if c.isalnum() or c.isspace() else " " for c in prompt])
    words = clean_prompt.lower().split()
    tensors = [np.array(TENSOR_BRAIN[w]) for w in words if w in TENSOR_BRAIN]
    
    if not tensors:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
    return np.mean(tensors, axis=0)


def extract_physics_from_image(image_url: str) -> np.ndarray:
    try:
        # МАГИЯ АНТИ-БЛОКИРОВКИ: Маскируемся под реальный браузер
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
        
        response = requests.get(image_url, headers=headers, timeout=15)
        response.raise_for_status() # Бросит ошибку, если статус не 200 OK
        
        img_pil = Image.open(BytesIO(response.content)).convert('RGB')
        img_pil = img_pil.resize((256, 256)) 
        
        img = np.array(img_pil)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

        brightness = np.mean(gray) / 255.0
        contrast = np.std(gray) / 128.0
        energy = np.clip((brightness * 0.6) + (contrast * 0.4), 0.0, 1.0)

        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        noise = np.clip(laplacian_var / 1000.0, 0.0, 1.0)
        
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / hist.sum()
        entropy = -np.sum(hist * np.log2(hist + 1e-7)) / 8.0 
        chaos = np.clip((noise * 0.3) + (entropy * 0.7), 0.0, 1.0)

        mean_hue = np.mean(hsv[:, :, 0])
        hue_score = np.abs(mean_hue - 90.0) / 90.0
        saturation = np.mean(hsv[:, :, 1]) / 255.0
        hue = np.clip((hue_score * saturation) + (0.5 * (1 - saturation)), 0.0, 1.0)

        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.sum(edges / 255.0) / (256 * 256)
        structure = np.clip(edge_density * 5.0, 0.0, 1.0)

        left_half = gray[:, :128]
        right_half = cv2.flip(gray[:, 128:], 1) 
        mse = np.mean((left_half - right_half) ** 2)
        symmetry = np.clip(1.0 - (mse / (255.0**2)), 0.0, 1.0)

        return np.array([energy, chaos, hue, structure, symmetry])
        
    except Exception as e:
        print(f"[VISION ERROR] Ошибка обработки пикселей: {e}")
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])


def mutate_image(img_tensor: np.ndarray) -> str:
    best_style = "default"
    min_dist = float('inf')
    for style_name, style_tensor in LEXICON.items():
        dist = np.linalg.norm(img_tensor - style_tensor)
        if dist < min_dist:
            min_dist = dist
            best_style = style_name
    return best_style

# ==========================================
# 5. API ЭНДПОИНТЫ
# ==========================================
class TextQuery(BaseModel):
    prompt: str

class ImageQuery(BaseModel):
    imageUrl: str = Field(alias="image_url", default="")

@app.get("/")
def health_check():
    return {"status": "Kashmir Oracle 5D is online", "brain_size": len(TENSOR_BRAIN)}

@app.post("/api/vibe")
def analyze_text(query: TextQuery):
    tensor = get_vibe_from_text(query.prompt)
    return {"tensor": [round(float(x), 4) for x in tensor]}

@app.post("/api/mutate")
def mutate_endpoint(query: ImageQuery):
    try:
        url = query.imageUrl if query.imageUrl else query.image_url
        real_tensor = extract_physics_from_image(url)
        style = mutate_image(real_tensor)
        
        return {
            "status": "success",
            "style": style,
            "tensor": [round(float(x), 4) for x in real_tensor]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}