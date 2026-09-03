from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import re
import urllib.request

app = FastAPI(title="GELBET Oracle 7.0 (Memory Anchor Core)", version="7.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Загрузка встроенного сверхлегкого детектора лиц OpenCV (CPU, 0 мб памяти, 2мс)
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# ==============================================================================
# СТОП-СЛОВА ДЛЯ ОЧИСТКИ ТЕКСТОВОГО ЯКОРЯ
# ==============================================================================
CLEANUP_REGEX = re.compile(
    r'\b(wallpaper|hd|4k|image|photo|pic|picture|download|free|vector|stock|source|desktop|background|pinterest|preview)\b',
    re.IGNORECASE
)

# ==============================================================================
# БАЗА ЭСТЕТИЧЕСКИХ АРХЕТИПОВ (ТРАНСФОРМАТОРЫ СТИЛЯ)
# ==============================================================================
ARCHETYPE_VECTORS = {
    "SIBERIAN_POST_PUNK": (
        np.array([0.28, 0.65, 0.78, 0.60, 0.70, 0.20, 0.15, 0.50, 0.40, 0.30, 0.85, 0.80, 0.55, 0.80, 0.75, 0.85, 0.20, 0.10, 0.40, 0.70, 0.20, 0.40, 0.50, 0.60]),
        {
            "portrait_optics": "soviet 35mm portrait svema film scan overcast gloom",
            "scene_optics": "bleak winter industrial concrete monolith harsh twilight",
            "alias": "SIBERIAN RESIDUAL"
        }
    ),
    "PSYCHEDELIC_ACID_70S": (
        np.array([0.55, 0.75, 0.85, 0.80, 0.65, 0.75, 0.85, 0.70, 0.60, 0.95, 0.40, 0.75, 0.65, 0.25, 0.45, 0.60, 0.85, 0.70, 0.50, 0.10, 0.80, 0.60, 0.20, 0.50]),
        {
            "portrait_optics": "1970s krautrock gatefold liquid light projection solarized",
            "scene_optics": "kaleidoscopic psychedelic astral prism concert vintage flare",
            "alias": "ACID KALEIDOSCOPE"
        }
    ),
    "LIMINAL_ARCHITECTURAL_VOID": (
        np.array([0.50, 0.35, 0.30, 0.20, 0.40, 0.45, 0.20, 0.80, 0.85, 0.40, 0.60, 0.30, 0.40, 0.90, 0.50, 0.15, 0.05, 0.15, 0.20, 0.10, 0.30, 0.70, 0.85, 0.75]),
        {
            "portrait_optics": "isolated figure clinical sterile fluorescent light uncanny vacancy",
            "scene_optics": "empty infinite transitional corridor minimalist atrium silence",
            "alias": "LIMINAL VOID"
        }
    ),
    "CHIAROSCURO_NEO_NOIR": (
        np.array([0.15, 0.90, 0.65, 0.55, 0.80, 0.40, 0.35, 0.35, 0.70, 0.50, 0.75, 0.45, 0.85, 0.60, 0.60, 0.50, 0.30, 0.35, 0.75, 0.60, 0.65, 0.50, 0.45, 0.80]),
        {
            "portrait_optics": "kodak tri-x 35mm film deep shadow chiaroscuro silhouette",
            "scene_optics": "rain-slicked nocturnal city street sharp rim light mist",
            "alias": "DEEP CHIAROSCURO"
        }
    ),
    "WONG_KAR_WAI_CHROMATIC": (
        np.array([0.38, 0.70, 0.75, 0.50, 0.55, 0.65, 0.80, 0.30, 0.50, 0.70, 0.45, 0.65, 0.60, 0.35, 0.40, 0.60, 0.50, 0.75, 0.45, 0.20, 0.90, 0.55, 0.30, 0.35]),
        {
            "portrait_optics": "step-printed slow-shutter motion blur neon green red haze",
            "scene_optics": "humid nocturnal alleyway atmospheric neon bleed tungsten",
            "alias": "CHROMATIC BLEED"
        }
    ),
    "TARKOVSKY_MIST": (
        np.array([0.42, 0.45, 0.60, 0.35, 0.35, 0.50, 0.30, 0.60, 0.90, 0.80, 0.55, 0.75, 0.45, 0.85, 0.30, 0.55, 0.15, 0.40, 0.35, 0.30, 0.40, 0.75, 0.60, 0.40]),
        {
            "portrait_optics": "polaroid 70mm meditative soft morning fog earth tones",
            "scene_optics": "dense morning mist over overgrown damp grass poetic entropy",
            "alias": "MIST & ENTROPY"
        }
    ),
    "DARKWAVE_INDUSTRIAL": (
        np.array([0.20, 0.85, 0.80, 0.90, 0.85, 0.30, 0.40, 0.40, 0.40, 0.60, 0.80, 0.35, 0.50, 0.40, 0.70, 0.70, 0.60, 0.25, 0.30, 0.80, 0.50, 0.35, 0.40, 0.85]),
        {
            "portrait_optics": "harsh photocopier zine risograph stark flash underground",
            "scene_optics": "biomechanical brutalist wire matrix raw friction sub-bass",
            "alias": "CYBERNETIC RASTER"
        }
    ),
    "ETHEREAL_SHOEGAZE": (
        np.array([0.75, 0.30, 0.50, 0.30, 0.20, 0.60, 0.45, 0.40, 0.75, 0.85, 0.20, 0.50, 0.50, 0.75, 0.40, 0.35, 0.60, 0.90, 0.15, 0.05, 0.60, 0.50, 0.40, 0.20]),
        {
            "portrait_optics": "vaseline lens soft-focus 4AD album cover angelic blur",
            "scene_optics": "translucent shimmering sunlight dust iridescent dreamscape",
            "alias": "ETHEREAL SHIMMER"
        }
    )
}

def clean_anchor_title(raw_title: str) -> str:
    """Очищает заголовок, изолируя конкретную сущность (человека, группу, объект)."""
    if not raw_title or raw_title == "Aesthetic Artifact":
        return ""
    # Удаляем URL, технический мусор и скобки
    clean = re.sub(r'http\S+|www\S+', '', raw_title)
    clean = re.sub(r'\[.*?\]|\(.*?\)', '', clean)
    clean = CLEANUP_REGEX.sub('', clean)
    clean = re.sub(r'[^a-zA-Zа-яА-Я0-9\s\-]', ' ', clean)
    words = clean.split()
    # Берем первые 2-4 самых значимых слова
    return " ".join(words[:4]).strip()

def extract_24d_tensor_and_features(img_data: bytes):
    """Извлекает 24D вектор + аппаратное распознавание человека."""
    img_pil = Image.open(BytesIO(img_data)).convert('RGB')
    img_pil = img_pil.resize((256, 256))
    img = np.array(img_pil)
    
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    y, x = np.ogrid[:h, :w]

    # Аппаратный детектор лиц
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
    has_human = len(faces) > 0

    luminance = np.mean(gray) / 255.0
    rms_contrast = np.clip(np.std(gray) / 128.0, 0.0, 1.0)

    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist / (hist.sum() + 1e-7)
    entropy = -np.sum(hist * np.log2(hist + 1e-7)) / 8.0

    f_transform = np.fft.fft2(gray)
    f_shift = np.fft.fftshift(f_transform)
    mag_spectrum = np.log(np.abs(f_shift) + 1)
    high_freq_mask = (x - cx)**2 + (y - cy)**2 > (64**2)
    fft_rhythm = np.clip(np.mean(mag_spectrum[high_freq_mask]) / 14.0, 0.0, 1.0)

    edges = cv2.Canny(gray, 80, 180)
    tension = np.clip((np.sum(edges > 0) / (256 * 256)) * 6.0, 0.0, 1.0)

    b_channel = lab[:, :, 2].astype(float) - 128.0
    temperature = np.clip((np.mean(b_channel) + 40.0) / 80.0, 0.0, 1.0)
    volatility = np.mean(hsv[:, :, 1]) / 255.0

    left_half = gray[:, :128]
    right_half = cv2.flip(gray[:, 128:], 1)
    symmetry = np.clip(1.0 - (np.mean(np.abs(left_half.astype(float) - right_half.astype(float))) / 128.0), 0.0, 1.0)

    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    depth = np.clip(1.0 - (laplacian_var / 800.0), 0.0, 1.0)
    transcendence = np.clip((entropy * symmetry * (volatility + 0.2)) * 2.5, 0.0, 1.0)

    bottom_mass = np.mean(gray[128:, :])
    top_mass = np.mean(gray[:128, :]) + 1e-5
    gravity = np.clip((bottom_mass / (bottom_mass + top_mass) - 0.3) * 2.5, 0.0, 1.0)

    black_pedestal = np.percentile(gray, 4) / 255.0
    chronos = np.clip((black_pedestal * 2.2) + (fft_rhythm * 0.4), 0.0, 1.0)

    gauss_kernel = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * (50**2)))
    gestalt = np.clip(np.sum(edges * gauss_kernel) / (np.sum(edges) + 1e-5) * 1.5, 0.0, 1.0)

    sat_mask = hsv[:, :, 1] > 35
    if np.sum(sat_mask) < 200:
        harmonics = 0.85
    else:
        harmonics = np.clip(1.0 - (np.std(hsv[:, :, 0][sat_mask]) / 55.0), 0.0, 1.0)

    sobel_x = np.abs(cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3))
    sobel_y = np.abs(cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3))
    anisotropy = np.clip(np.sum(sobel_x) / (np.sum(sobel_x) + np.sum(sobel_y) + 1e-5), 0.0, 1.0)

    blurred_sub = cv2.GaussianBlur(gray, (5, 5), 0)
    grain = np.clip(np.mean(np.abs(gray.astype(float) - blurred_sub.astype(float))) / 18.0, 0.0, 1.0)

    r_edges = cv2.Canny(img[:, :, 0], 80, 160)
    b_edges = cv2.Canny(img[:, :, 2], 80, 160)
    chromatic_dispersion = np.clip((np.mean(np.abs(r_edges.astype(float) - b_edges.astype(float))) / 255.0) * 8.0, 0.0, 1.0)

    bright_mask = gray > 215
    halation = np.clip(np.mean(cv2.GaussianBlur(bright_mask.astype(float), (21, 21), 0)) * 8.0, 0.0, 1.0) if np.sum(bright_mask) > 10 else 0.05

    corner_mask = np.zeros((h, w), dtype=float)
    corner_mask[0:30, 0:30] = corner_mask[0:30, -30:] = corner_mask[-30:, 0:30] = corner_mask[-30:, -30:] = 1.0
    vignette = np.clip((np.mean(gray[gauss_kernel > 0.5]) - np.mean(gray[corner_mask > 0])) / 128.0, 0.0, 1.0)

    bleach_bypass = np.clip((rms_contrast * 1.5) * (1.0 - volatility), 0.0, 1.0)

    shadows, highlights = gray < 60, gray > 180
    if np.sum(shadows) > 100 and np.sum(highlights) > 100:
        warm_cool_split = np.clip(np.abs(np.mean(b_channel[highlights]) - np.mean(b_channel[shadows])) / 50.0, 0.0, 1.0)
    else:
        warm_cool_split = 0.2

    third_mask = np.zeros((h, w), dtype=float)
    for tx in [85, 170]:
        for ty in [85, 170]:
            third_mask[ty-15:ty+15, tx-15:tx+15] = 1.0
    rule_of_thirds = np.clip(np.sum(edges * third_mask) / (np.sum(edges) + 1e-5) * 2.5, 0.0, 1.0)

    gradient_mag = cv2.magnitude(sobel_x, sobel_y)
    void_ratio = np.clip(np.sum(gradient_mag < 15.0) / (256 * 256), 0.0, 1.0)
    edge_sharpness = np.clip(np.mean(laplacian_var) / 600.0, 0.0, 1.0) if np.sum(edges > 0) > 50 else 0.1

    tensor = np.array([
        luminance, rms_contrast, entropy, fft_rhythm, tension, temperature, volatility,
        symmetry, depth, transcendence, gravity, chronos, gestalt, harmonics,
        anisotropy, grain, chromatic_dispersion, halation, vignette,
        bleach_bypass, warm_cool_split, rule_of_thirds, void_ratio, edge_sharpness
    ])

    return tensor, has_human

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-7)

def synthesize_anchored_vector(tensor: np.ndarray, has_human: bool, raw_title: str, history: list):
    anchor = clean_anchor_title(raw_title)
    depth_iteration = len(history) # Сколько раз подряд нажали Mutate

    # 1. Поиск эстетического архетипа
    scores = {}
    for arch_name, (arch_vec, _) in ARCHETYPE_VECTORS.items():
        sim = cosine_similarity(tensor, arch_vec)
        if any(arch_name in h for h in history[-2:]):
            sim *= 0.5  # Анти-зацикливание
        scores[arch_name] = sim

    dominant_name, dominant_score = sorted(scores.items(), key=lambda x: x[1], reverse=True)[0]
    arch_data = ARCHETYPE_VECTORS[dominant_name][1]

    # 2. Выбор оптической трансформации в зависимости от физического детектора лиц
    optics_preset = arch_data["portrait_optics"] if has_human else arch_data["scene_optics"]

    # 3. Синтез запроса с контролем дрейфа (Anchor Coupling)
    if anchor and depth_iteration <= 2:
        # Уровень 1-2: Жесткое удержание сущности + наложение эстетики
        search_query = f"{anchor} {optics_preset}"
        display_vibe = f"{anchor.split()[0].upper()} // {arch_data['alias']}"
    elif anchor and depth_iteration == 3:
        # Уровень 3: Ассоциативный дрейф (сущность отходит на второй план)
        search_query = f"{anchor.split()[0]} {optics_preset}"
        display_vibe = f"ECHO // {arch_data['alias']}"
    else:
        # Уровень 4+ или если якорь пустой: чистый эстетический трансцендент
        search_query = optics_preset
        display_vibe = arch_data["alias"]

    # Очистка стоп-слов для DDG
    clean_words = [w for w in search_query.split() if len(w) > 2 and w.lower() not in ["and", "the", "with", "from"]]
    final_query = " ".join(clean_words[:6])

    resonance_pct = int(np.clip(dominant_score * 100.0, 80, 99))
    return final_query, display_vibe, resonance_pct, dominant_name

# ==============================================================================
# API ENDPOINT
# ==============================================================================
@app.get("/")
def health():
    return {"status": "ORACLE_7_ONLINE", "memory_anchor": "ACTIVE", "face_gate": "ARMED"}

@app.post("/api/mutate")
async def mutate_endpoint(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        raw_title = ""
        history = []
        
        if "application/json" in content_type:
            payload = await request.json()
            image_url = payload.get("image_url")
            raw_title = payload.get("title", "")
            history = payload.get("history", [])
            
            if not image_url:
                raise HTTPException(status_code=400, detail="Missing image_url")
            
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                body_bytes = response.read()
        else:
            body_bytes = await request.body()
            if not body_bytes:
                raise HTTPException(status_code=400, detail="Empty image data")

        # 1. Извлекаем 24D тензор + проверяем лицо в кадре
        tensor, has_human = extract_24d_tensor_and_features(body_bytes)

        # 2. Формулируем запрос, связывая якорь сущности с математикой
        smart_query, display_vibe, resonance_pct, dominant_archetype = synthesize_anchored_vector(
            tensor, has_human, raw_title, history
        )

        print(f"\n[ORACLE 7.0] ---------------------------------------------")
        print(f" > ANCHOR DETECTED: '{raw_title}' -> Filtered: '{clean_anchor_title(raw_title)}'")
        print(f" > HARDWARE GATE  : Has Human = {has_human}")
        print(f" > ARCHETYPE      : {dominant_archetype} ({resonance_pct}%)")
        print(f" > FINAL QUERY    : \"{smart_query}\"")
        print(f" > UI VIBE        : \"{display_vibe}\"")
        print(f"----------------------------------------------------------\n")

        return {
            "status": "success",
            "displayVibe": display_vibe,
            "smartQuery": smart_query,
            "resonanceScore": resonance_pct,
            "hasHuman": has_human,
            "archetype": dominant_archetype
        }

    except Exception as e:
        print(f"[ORACLE 7.0 FAILURE] {e}")
        return {
            "status": "error",
            "displayVibe": "RESONANCE VOID",
            "smartQuery": "cinematic film still",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("oracle_server:app", host="0.0.0.0", port=8000, reload=True)
