import os
import cv2
import dlib
import numpy as np
import io
import urllib.request
import bz2
from PIL import Image

MODEL_URL = "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
MODEL_FILE = "shape_predictor_68_face_landmarks.dat"

# ==============================================================================
# СИСТЕМА САМООБЕСПЕЧЕНИЯ: Авто-загрузка весов dlib
# ==============================================================================
def ensure_model_exists():
    if not os.path.exists(MODEL_FILE):
        print(f"[BIOMETRIC ENGINE] Модель {MODEL_FILE} не найдена. Начинаю загрузку из Матрицы (это займет пару минут)...")
        try:
            # Скачиваем bz2 архив
            req = urllib.request.Request(MODEL_URL, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                compressed_data = response.read()
            
            # Распаковываем на лету и сохраняем
            print("[BIOMETRIC ENGINE] Распаковка геометрии...")
            uncompressed_data = bz2.decompress(compressed_data)
            with open(MODEL_FILE, 'wb') as f:
                f.write(uncompressed_data)
            print("[BIOMETRIC ENGINE] Абсолютная геометрия успешно загружена.")
        except Exception as e:
            print(f"[FATAL ERROR] Ошибка загрузки модели: {e}")

ensure_model_exists()

# Инициализация детекторов dlib (Чистая математика градиентов)
try:
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(MODEL_FILE)
except Exception as e:
    print(f"[FATAL] Ошибка инициализации dlib: {e}")

# ==============================================================================
# АБСОЛЮТНАЯ ГЕОМЕТРИЯ
# ==============================================================================
def euclidean_distance(p1, p2):
    return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def extract_biometric_tensor(image_bytes: bytes) -> np.ndarray:
    """
    GELBET ORACLE: BIOMETRIC GEOMETRY EXTRACTOR
    Превращает 68 точек лица в уникальный 16-мерный инвариантный тензор.
    Если лицо не найдено, возвращает массив нулей.
    """
    # 1. Загрузка и подготовка манифольда
    img_pil = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = np.array(img_pil)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # 2. Детекция лица
    faces = detector(gray)
    if len(faces) == 0:
        return np.zeros(16)
    
    # Берем самое крупное лицо (фокус)
    face = max(faces, key=lambda rect: rect.width() * rect.height())
    shape = predictor(gray, face)
    
    # 3. Базовые расстояния (Опорные оси)
    face_width = euclidean_distance(shape.part(0), shape.part(16))
    if face_width == 0: face_width = 1e-7
    
    face_height = euclidean_distance(shape.part(8), shape.part(27))
    if face_height == 0: face_height = 1e-7
        
    jaw_width = euclidean_distance(shape.part(3), shape.part(13))
    
    left_eye_center = dlib.point(
        int(sum([shape.part(i).x for i in range(36, 42)])/6),
        int(sum([shape.part(i).y for i in range(36, 42)])/6)
    )
    right_eye_center = dlib.point(
        int(sum([shape.part(i).x for i in range(42, 48)])/6),
        int(sum([shape.part(i).y for i in range(42, 48)])/6)
    )
    interocular_dist = euclidean_distance(left_eye_center, right_eye_center)
    
    nose_length = euclidean_distance(shape.part(27), shape.part(33))
    nose_width = euclidean_distance(shape.part(31), shape.part(35))
    mouth_width = euclidean_distance(shape.part(48), shape.part(54))
    mouth_height = euclidean_distance(shape.part(51), shape.part(57))
    cheek_drop = euclidean_distance(left_eye_center, shape.part(3))

    # 4. ФОРМИРОВАНИЕ ИНВАРИАНТНОГО ТЕНЗОРА (16D)
    tensor = np.zeros(16)
    
    tensor[0] = np.clip((face_height / face_width) / 2.0, 0, 1)
    tensor[1] = np.clip(jaw_width / face_width, 0, 1)
    tensor[2] = np.clip((interocular_dist / face_width) * 2.0, 0, 1)
    tensor[3] = np.clip((nose_length / face_height) * 2.0, 0, 1)
    tensor[4] = np.clip(nose_width / interocular_dist, 0, 1)
    tensor[5] = np.clip((mouth_width / jaw_width) * 1.5, 0, 1)
    tensor[6] = np.clip((mouth_height / mouth_width) * 2.0, 0, 1)
    tensor[7] = np.clip((cheek_drop / face_height) * 1.5, 0, 1)
    
    left_jaw = euclidean_distance(shape.part(8), shape.part(3))
    right_jaw = euclidean_distance(shape.part(8), shape.part(13))
    tensor[8] = np.clip(1.0 - (min(left_jaw, right_jaw) / (max(left_jaw, right_jaw) + 1e-7)), 0, 1)
    
    brow_height_l = euclidean_distance(shape.part(19), left_eye_center)
    brow_height_r = euclidean_distance(shape.part(24), right_eye_center)
    tensor[9] = np.clip(((brow_height_l + brow_height_r) / face_height) * 3.0, 0, 1)
    
    # Искусственное расширение до 16D для стабильности в pgvector
    tensor[10] = np.clip(tensor[0] * tensor[1], 0, 1)
    tensor[11] = np.clip(tensor[3] * tensor[4], 0, 1)
    tensor[12] = np.clip(tensor[5] * tensor[2], 0, 1)
    tensor[13] = np.clip(tensor[7] * tensor[9], 0, 1)
    tensor[14] = np.clip(np.mean(tensor[0:9]), 0, 1)
    tensor[15] = np.clip(np.std(tensor[0:9]) * 2.0, 0, 1)
    
    return np.round(tensor, 4)
