from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import math

app = FastAPI()

# Разрешаем CORS для всех источников (для разработки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. ЭТАЛОННЫЕ ТЕНЗОРЫ (Семантические якоря)
# ==========================================
# [Energy, Chaos, Hue, Structure, Symmetry]
LEXICON = {
    'dark':       np.array([0.20, 0.50, 0.60, 0.40, 0.50]),
    'noise':      np.array([0.50, 0.80, 0.00, 0.80, 0.30]),
    'vintage':    np.array([0.40, 0.70, 0.10, 0.50, 0.60]),
    'neon':       np.array([0.60, 0.60, 0.80, 0.60, 0.50]),
    'minimal':    np.array([0.80, 0.20, 0.00, 0.10, 0.80]),
    'aesthetic':  np.array([0.60, 0.40, 0.50, 0.40, 0.60]),
    'grunge':     np.array([0.30, 0.90, 0.15, 0.80, 0.40]),
    'cinematic':  np.array([0.40, 0.50, 0.55, 0.50, 0.70]),
    'ethereal':   np.array([0.80, 0.10, 0.70, 0.20, 0.60]),
    'portrait':   np.array([0.50, 0.30, 0.10, 0.30, 0.90]),
    'architecture':np.array([0.60, 0.40, 0.00, 0.90, 0.90]),
    'cyberpunk':  np.array([0.30, 0.60, 0.85, 0.70, 0.40]),
    'psychedelic':np.array([0.70, 0.85, 0.90, 0.60, 0.30])
}

# Векторы сдвига для мутаций (Direction Vectors)
SHIFTS = {
    'darker': np.array([-0.3, 0.1, 0.0, 0.1, 0.0]),
    'sharper': np.array([0.0, 0.4, 0.0, 0.3, 0.0]),
    'calmer': np.array([0.1, -0.4, 0.0, -0.2, 0.2])
}

def extract_physics(img_data: bytes) -> np.ndarray:
    """Извлекает 5-мерный тензор физических свойств."""
    try:
        img_pil = Image.open(BytesIO(img_data)).convert('RGB')
        # Нормализуем размер для быстрых вычислений
        img_pil = img_pil.resize((256, 256)) 
        img = np.array(img_pil)
        
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

        # 1. ENERGY (Яркость + Контраст)
        brightness = np.mean(gray) / 255.0
        contrast = np.std(gray) / 128.0
        energy = np.clip((brightness * 0.6) + (contrast * 0.4), 0.0, 1.0)

        # 2. CHAOS (Шум + Энтропия)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        noise = np.clip(laplacian_var / 1000.0, 0.0, 1.0)
        
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / hist.sum()
        entropy = -np.sum(hist * np.log2(hist + 1e-7)) / 8.0 
        chaos = np.clip((noise * 0.3) + (entropy * 0.7), 0.0, 1.0)

        # 3. HUE (Цветовой тон с защитой от ЧБ)
        mean_hue = np.mean(hsv[:, :, 0])
        saturation = np.mean(hsv[:, :, 1]) / 255.0
        
        # Если насыщенность низкая, обнуляем hue (ЧБ фото не имеют цвета)
        if saturation < 0.15:
            hue = 0.5 # Нейтральное значение
        else:
            # Нормализуем hue относительно зеленого (90) для интересной метрики
            hue_score = np.abs(mean_hue - 90.0) / 90.0
            hue = np.clip((hue_score * saturation) + (0.5 * (1 - saturation)), 0.0, 1.0)

        # 4. STRUCTURE (Плотность границ)
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.sum(edges > 0) / (256 * 256)
        structure = np.clip(edge_density * 4.0, 0.0, 1.0)

        # 5. SYMMETRY (Билатеральная симметрия)
        h, w = gray.shape
        mid = w // 2
        left_half = gray[:, :mid]
        right_half = cv2.flip(gray[:, mid:], 1)
        
        # Обрезаем до одинакового размера если ширина нечетная
        min_w = min(left_half.shape[1], right_half.shape[1])
        left_crop = left_half[:, :min_w]
        right_crop = right_half[:, :min_w]
        
        mse = np.mean((left_crop.astype(float) - right_crop.astype(float)) ** 2)
        symmetry = np.clip(1.0 - (mse / (255.0**2)), 0.0, 1.0)

        return np.array([energy, chaos, hue, structure, symmetry])
        
    except Exception as e:
        print(f"[VISION ERROR] {e}")
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])

def mahalanobis_distance(x, y, cov_inv=None):
    """Вычисляет расстояние Махаланобиса (учитывает корреляции)."""
    diff = x - y
    if cov_inv is None:
        # Если нет матрицы ковариации, используем единичную (евклидово)
        return np.linalg.norm(diff)
    return np.sqrt(np.dot(np.dot(diff, cov_inv), diff))

def find_best_match(tensor: np.ndarray) -> tuple[str, float]:
    """Находит ближайший стиль в лексиконе."""
    best_style = "unknown"
    min_dist = float('inf')
    
    # Для простоты пока используем взвешенное Евклидово расстояние
    # Веса можно настроить: например, Symmetry важнее для портретов
    weights = np.array([1.0, 1.2, 0.8, 1.0, 1.5]) 
    
    for name, ref_tensor in LEXICON.items():
        # Взвешенная разница
        diff = (tensor - ref_tensor) * weights
        dist = np.linalg.norm(diff)
        
        if dist < min_dist:
            min_dist = dist
            best_style = name
            
    return best_style, min_dist

def generate_mutated_query(base_style: str, tensor: np.ndarray) -> str:
    """Генерирует описание на основе отклонения от эталона."""
    # Логика: если тензор сильно отличается от эталона по какой-то оси, добавляем модификатор
    modifiers = []
    
    ref = LEXICON.get(base_style, np.zeros(5))
    diff = tensor - ref
    
    # Анализ отклонений
    if diff[0] > 0.2: modifiers.append("bright")
    elif diff[0] < -0.2: modifiers.append("dark")
    
    if diff[1] > 0.25: modifiers.append("chaotic")
    elif diff[1] < -0.25: modifiers.append("smooth")
    
    if diff[3] > 0.3: modifiers.append("detailed")
    
    if diff[4] > 0.4: modifiers.append("symmetrical")

    if not modifiers:
        return f"{base_style} art"
    
    return f"{base_style} {' '.join(modifiers)} aesthetic"

@app.get("/")
def health():
    return {"status": "Kashmir Oracle (Math Core) Online", "lexicon_size": len(LEXICON)}

@app.post("/api/mutate")
async def mutate_endpoint(request: Request):
    try:
        body_bytes = await request.body()
        if not body_bytes:
            raise HTTPException(status_code=400, detail="Empty image data")

        # 1. Извлечение физики
        tensor = extract_physics(body_bytes)
        
        # 2. Поиск базового стиля
        style, distance = find_best_match(tensor)
        
        # Вторичная фильтрация: если расстояние слишком большое, значит стиль не определен
        if distance > 0.6: 
            style = "abstract" # Дефолт для непонятного
            
        # 3. Генерация уточненного запроса
        refined_query = generate_mutated_query(style, tensor)
        
        print(f"[ORACLE] Tensor: {tensor.round(2)} | Style: {style} ({distance:.2f}) | Query: {refined_query}")

        return {
            "status": "success",
            "style": style,
            "refined_query": refined_query,
            "tensor": [round(float(x), 4) for x in tensor],
            "confidence": round(1.0 - distance, 2)
        }
        
    except Exception as e:
        print(f"[CRITICAL] {e}")
        return {"status": "error", "message": str(e)}
