import json
import numpy as np
import os
import math

# ==========================================
# 1. ФУНДАМЕНТАЛЬНЫЙ ЛЕКСИКОН (УНИВЕРСАЛЬНЫЕ СТИЛИ)
# Используется ТОЛЬКО для классификации визуала. 
# Никаких имен, групп или брендов — только чистая эстетика.
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
# 2. ИНИЦИАЛИЗАЦИЯ ТЕНЗОРНОГО МОЗГА
# ==========================================
# Загружаем наши 50 000 математически осмысленных слов
BRAIN_PATH = os.path.join(os.path.dirname(__file__), 'tensor_brain.json')

try:
    with open(BRAIN_PATH, 'r', encoding='utf-8') as f:
        TENSOR_BRAIN = json.load(f)
    print(f"[KASHMIR ORACLE] Тензорный Мозг успешно подключен. Загружено {len(TENSOR_BRAIN)} концептов.")
except FileNotFoundError:
    print("[KASHMIR ORACLE] ВНИМАНИЕ: tensor_brain.json не найден. Мозг работает в вакууме.")
    TENSOR_BRAIN = {}


# ==========================================
# 3. СЕМАНТИЧЕСКИЙ СИНТЕЗ (TEXT -> 5D TENSOR)
# ==========================================
def get_vibe_from_text(prompt: str) -> np.ndarray:
    """
    Превращает любой поисковый запрос пользователя в 5D-физику,
    динамически усредняя тензоры всех известных слов.
    """
    if not prompt:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
        
    # Очищаем от спецсимволов и бьем на слова
    clean_prompt = "".join([c if c.isalnum() or c.isspace() else " " for c in prompt])
    words = clean_prompt.lower().split()
    
    tensors = []
    for w in words:
        if w in TENSOR_BRAIN:
            tensors.append(np.array(TENSOR_BRAIN[w]))
            
    # Если слова слишком редкие/с ошибками - выдаем нейтральный центр
    if not tensors:
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])
        
    # Вычисляем геометрический центр смысла запроса
    return np.mean(tensors, axis=0)


# ==========================================
# 4. ВИЗУАЛЬНЫЙ АНАЛИЗ (IMAGE -> 5D TENSOR)
# ==========================================
def extract_physics_from_image(image_path_or_bytes) -> np.ndarray:
    """
    Место для интеграции компьютерного зрения (OpenCV/PIL).
    Возвращает физические свойства конкретной картинки: [E, C, H, ST, SY]
    """
    # Здесь остается твой алгоритм извлечения пикселей, который
    # считает контраст, яркость, доминирующий цвет и симметрию.
    # Временно возвращаем заглушку, чтобы код был валидным:
    return np.array([0.5, 0.5, 0.5, 0.5, 0.5])


# ==========================================
# 5. МУТАЦИЯ И КЛАССИФИКАЦИЯ (БЕЗ ГАЛЛЮЦИНАЦИЙ)
# ==========================================
def mutate_image(img_tensor: np.ndarray) -> str:
    """
    ИСПРАВЛЕННЫЙ БАГ: Находит ближайшее универсальное описание для картинки.
    Сравнивает ТОЛЬКО с базовым LEXICON (без Jimmy Page и прочих имен),
    гарантируя точные описания (minimal, grunge, vintage).
    """
    best_style = "default"
    min_dist = float('inf')
    
    for style_name, style_tensor in LEXICON.items():
        dist = np.linalg.norm(img_tensor - style_tensor)
        if dist < min_dist:
            min_dist = dist
            best_style = style_name
            
    return best_style


# ==========================================
# 6. ВЫЧИСЛЕНИЕ РЕЗОНАНСА (МЕТРИКА БЛИЗОСТИ)
# ==========================================
def calculate_resonance(tensor_a: np.ndarray, tensor_b: np.ndarray) -> float:
    """
    Насколько запрос пользователя (tensor_a) совпадает с картинкой/песней (tensor_b).
    Возвращает значение от 0.0 до 1.0 (или в процентах).
    """
    dist = np.linalg.norm(tensor_a - tensor_b)
    # Максимальное расстояние в 5D пространстве (куб от 0 до 1) = sqrt(5) ~ 2.236
    max_dist = math.sqrt(5)
    
    # Инвертируем расстояние в резонанс
    resonance = max(0.0, 1.0 - (dist / max_dist))
    return round(resonance, 4)