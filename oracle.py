from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import re
import urllib.request

app = FastAPI(title="GELBET Oracle 9.0 (Generative Tensor & Bayesian Lexicon)", version="9.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Аппаратный детектор лиц
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# ==============================================================================
# ЛЕКСИЧЕСКАЯ ЦЕНТРИФУГА (ОЧИСТКА ЯКОРЯ)
# ==============================================================================
CLEANUP_REGEX = re.compile(
    r'\b(wallpaper|hd|4k|image|photo|pic|picture|download|free|vector|stock|source|desktop|background|pinterest|preview)\b',
    re.IGNORECASE
)
CONSONANT_CLUSTER_REGEX = re.compile(r'[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZБВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬ]{5,}')
HASH_REGEX = re.compile(r'^(?=.*[a-zA-Zа-яА-Я])(?=.*\d)[a-zA-Zа-яА-Я\d]{4,}$')

def clean_anchor_title(raw_title: str) -> str:
    if not raw_title or raw_title == "Aesthetic Artifact":
        return ""
    clean = re.sub(r'http\S+|www\S+', '', raw_title)
    clean = re.sub(r'\.(jpg|jpeg|png|webp|gif|mp4|avif)\b', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'\[.*?\]|\(.*?\)', '', clean)
    clean = re.sub(r'[-_]', ' ', clean)
    clean = CLEANUP_REGEX.sub('', clean)
    clean = re.sub(r'[^a-zA-Zа-яА-Я0-9\s]', ' ', clean)
    
    valid_words = []
    for word in clean.split():
        if len(word) > 15: continue
        if HASH_REGEX.match(word): continue
        if CONSONANT_CLUSTER_REGEX.search(word): continue
        if len(word) == 1 and word.lower() not in ['a', 'i', 'о', 'у', 'а', 'я', 'и', 'к', 'в', 'с']: continue
        valid_words.append(word)

    final_anchor = " ".join(valid_words[:3]).strip()
    return "" if len(final_anchor) <= 2 else final_anchor

# ==============================================================================
# БАЗА АРХЕТИПОВ (СИЛЛОГИЗМЫ ДЛЯ ПРЕДИКАТА И КОПУЛЫ)
# ==============================================================================
ARCHETYPE_VECTORS = {
    "COMFORTABLY_NUMB": (
        np.array([0.6, 0.4, 0.3, 0.2, 0.2, 0.4, 0.5, 0.8, 0.9, 0.7, 0.3, 0.4, 0.5, 0.8, 0.2, 0.2, 0.6, 0.8, 0.4, 0.2, 0.5, 0.3, 0.8, 0.2, 
                  0.3, 0.2, 0.90, 0.85, 0.80, 0.70, 0.75, 0.4]),
        {"copula_m": "ethereal glowing fog vaseline lens sensory deprivation", "predicate_p": "transcendental isolation floating dreamscape", "alias": "GILMOUR RESONANCE"}
    ),
    "JOYCEAN_SYLLOGISM": (
        np.array([0.4, 0.8, 0.7, 0.6, 0.8, 0.5, 0.4, 0.6, 0.7, 0.6, 0.8, 0.6, 0.9, 0.5, 0.8, 0.6, 0.3, 0.2, 0.7, 0.6, 0.5, 0.9, 0.3, 0.8, 
                  0.90, 0.95, 0.10, 0.40, 0.50, 0.20, 0.40, 0.6]),
        {"copula_m": "sharp structural composition golden ratio chiaroscuro", "predicate_p": "absolute resolution Q.E.D focal singularity", "alias": "SYLLOGISM Q.E.D."}
    ),
    "SIBERIAN_POST_PUNK": (
        np.array([0.28, 0.65, 0.78, 0.60, 0.70, 0.20, 0.15, 0.50, 0.40, 0.30, 0.85, 0.80, 0.55, 0.80, 0.75, 0.85, 0.20, 0.10, 0.40, 0.70, 0.20, 0.40, 0.50, 0.60,
                  0.4, 0.5, 0.6, 0.3, 0.7, 0.1, 0.8, 0.9]),
        {"copula_m": "soviet 35mm svema film scan gloomy overcast light", "predicate_p": "brutalist concrete monolith decayed industrial void", "alias": "SIBERIAN RESIDUAL"}
    ),
    "ACID_KRAUTROCK": (
        np.array([0.55, 0.75, 0.85, 0.80, 0.65, 0.75, 0.85, 0.70, 0.60, 0.95, 0.40, 0.75, 0.65, 0.25, 0.45, 0.60, 0.85, 0.70, 0.50, 0.10, 0.80, 0.60, 0.20, 0.50,
                  0.5, 0.4, 0.3, 0.7, 0.6, 0.9, 0.2, 0.3]),
        {"copula_m": "1970s liquid light projection chromatic aberration prismatic", "predicate_p": "kaleidoscopic astral vision cosmic psychedelia", "alias": "ACID KALEIDOSCOPE"}
    ),
    "LIMINAL_VOID": (
        np.array([0.50, 0.35, 0.30, 0.20, 0.40, 0.45, 0.20, 0.80, 0.85, 0.40, 0.60, 0.30, 0.40, 0.90, 0.50, 0.15, 0.05, 0.15, 0.20, 0.10, 0.30, 0.70, 0.85, 0.75,
                  0.7, 0.8, 0.85, 0.1, 0.5, 0.1, 0.9, 0.2]),
        {"copula_m": "diffuse sterile fluorescent light liminal large format", "predicate_p": "infinite desolate transitional space uncanny silence", "alias": "LIMINAL VOID"}
    )
}

def extract_32d_consciousness_tensor(img_data: bytes):
    img_pil = Image.open(BytesIO(img_data)).convert('RGB')
    img_pil = img_pil.resize((256, 256))
    img = np.array(img_pil)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    y, x = np.ogrid[:h, :w]
    gauss_kernel = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * (50**2)))

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

    gestalt = np.clip(np.sum(edges * gauss_kernel) / (np.sum(edges) + 1e-5) * 1.5, 0.0, 1.0)

    sat_mask = hsv[:, :, 1] > 35
    if np.sum(sat_mask) < 200: harmonics = 0.85
    else: harmonics = np.clip(1.0 - (np.std(hsv[:, :, 0][sat_mask]) / 55.0), 0.0, 1.0)

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
    else: warm_cool_split = 0.2

    third_mask = np.zeros((h, w), dtype=float)
    for tx in [85, 170]:
        for ty in [85, 170]:
            third_mask[ty-15:ty+15, tx-15:tx+15] = 1.0
    rule_of_thirds = np.clip(np.sum(edges * third_mask) / (np.sum(edges) + 1e-5) * 2.5, 0.0, 1.0)

    gradient_mag = cv2.magnitude(sobel_x, sobel_y)
    void_ratio = np.clip(np.sum(gradient_mag < 15.0) / (256 * 256), 0.0, 1.0)
    edge_sharpness = np.clip(np.mean(laplacian_var) / 600.0, 0.0, 1.0) if np.sum(edges > 0) > 50 else 0.1

    mid_ring_mask = (gauss_kernel < 0.8) & (gauss_kernel > 0.2)
    fg_grad = np.mean(gradient_mag[gauss_kernel >= 0.8])
    mg_grad = np.mean(gradient_mag[mid_ring_mask])
    bg_grad = np.mean(gradient_mag[gauss_kernel <= 0.2]) + 1e-5
    smp_syllogism = np.clip((fg_grad - bg_grad) / (mg_grad + 1e-5) / 5.0, 0.0, 1.0)

    qed_resolution = np.clip(gestalt * vignette * (1.0 - void_ratio) * 2.0, 0.0, 1.0)
    numbness_index = np.clip((depth * (1.0 - rms_contrast) * (1.0 - edge_sharpness)) * 3.0, 0.0, 1.0)

    laplacian_full = cv2.Laplacian(gray, cv2.CV_64F)
    max_lap = np.max(np.abs(laplacian_full))
    mean_lap = np.mean(np.abs(laplacian_full)) + 1e-5
    gilmour_peak = np.clip((max_lap / mean_lap) / 50.0, 0.0, 1.0) * numbness_index

    low_freq_mask = (x - cx)**2 + (y - cy)**2 <= (32**2)
    low_power = np.sum(mag_spectrum[low_freq_mask])
    high_power = np.sum(mag_spectrum[high_freq_mask]) + 1e-5
    pink_noise = np.clip((low_power / high_power) / 5.0, 0.0, 1.0)

    hue_grad_x = cv2.Sobel(hsv[:,:,0], cv2.CV_64F, 1, 0, ksize=3)
    hue_grad_y = cv2.Sobel(hsv[:,:,0], cv2.CV_64F, 0, 1, ksize=3)
    hue_edges = cv2.magnitude(hue_grad_x, hue_grad_y)
    synesthetic_drift = np.clip(np.mean(np.abs(gradient_mag - hue_edges)) / 100.0, 0.0, 1.0)

    solipsism = np.clip(void_ratio * gestalt * 1.5, 0.0, 1.0)

    morph_kernel = np.ones((5,5),np.uint8)
    erosion = cv2.erode(gray, morph_kernel, iterations=1)
    dilation = cv2.dilate(gray, morph_kernel, iterations=1)
    morph_gradient = dilation.astype(float) - erosion.astype(float)
    temporal_decay = np.clip(np.mean(morph_gradient) / 50.0 * chronos, 0.0, 1.0)

    tensor = np.array([
        luminance, rms_contrast, entropy, fft_rhythm, tension, temperature, volatility,
        symmetry, depth, transcendence, gravity, chronos, gestalt, harmonics,
        anisotropy, grain, chromatic_dispersion, halation, vignette,
        bleach_bypass, warm_cool_split, rule_of_thirds, void_ratio, edge_sharpness,
        smp_syllogism, qed_resolution, numbness_index, gilmour_peak, pink_noise,
        synesthetic_drift, solipsism, temporal_decay
    ])

    return tensor, has_human

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-7)

# ==============================================================================
# КОМБИНАТОРНАЯ ГЕНЕРАЦИЯ СМЫСЛА (ВЕРОЯТНОСТНАЯ ЛИНГВИСТИКА)
# ==============================================================================
def synthesize_syllogism_query(tensor: np.ndarray, has_human: bool, raw_title: str, history: list):
    anchor = clean_anchor_title(raw_title)
    depth_iteration = len(history)

    # 1. Проекция на Архитипы (для Предиката и Копулы)
    scores = {}
    for arch_name, (arch_vec, _) in ARCHETYPE_VECTORS.items():
        sim = cosine_similarity(tensor, arch_vec)
        if any(arch_name in h for h in history[-2:]): sim *= 0.5  
        scores[arch_name] = sim
    dominant_name, dominant_score = sorted(scores.items(), key=lambda x: x[1], reverse=True)[0]
    arch_data = ARCHETYPE_VECTORS[dominant_name][1]

    # 2. ДИНАМИЧЕСКИЙ ЛЕГО-КОНСТРУКТОР СУБЪЕКТА (Матрица Гильотины)
    if anchor and depth_iteration <= 2:
        subject_s = anchor
    elif has_human:
        subject_s = "enigmatic portrait silhouette"
    else:
        # Извлекаем параметры из 32D тензора
        luminance = tensor[0]
        entropy = tensor[2]
        tension = tensor[4]
        depth = tensor[8]
        gestalt = tensor[12]
        pink_noise = tensor[28]

        # --- МАТРИЦА 1: СОСТОЯНИЕ (Текстура, Свет, Хаос) ---
        state_tensor = np.array([luminance, entropy, pink_noise])
        # Координаты: [Свет, Хаос, Органика]
        state_lexicon = {
            "luminous ethereal": np.array([0.9, 0.2, 0.4]),
            "fleshy biomechanical": np.array([0.3, 0.8, 0.9]),
            "decaying rust": np.array([0.2, 0.7, 0.6]),
            "sterile clinical": np.array([0.9, 0.1, 0.1]),
            "psychedelic chromatic": np.array([0.6, 0.8, 0.9]),
            "lo-fi vhs": np.array([0.3, 0.7, 0.8]),
            "diffuse liminal": np.array([0.4, 0.1, 0.2]),
            "neon-drenched dystopian": np.array([0.8, 0.7, 0.4]),
            "iridescent opalescent": np.array([0.7, 0.6, 0.5]),
            "subatomic particle": np.array([0.9, 0.9, 0.3])
        }
        
        best_state, max_s_prob = "abstract", -1.0
        for state, vec in state_lexicon.items():
            prob = np.dot(state_tensor, vec) / (np.linalg.norm(state_tensor) * np.linalg.norm(vec) + 1e-7)
            if prob > max_s_prob: 
                max_s_prob = prob; best_state = state

        # --- МАТРИЦА 2: ФОРМА (Геометрия, Глубина, Структура) ---
        form_tensor = np.array([tension, depth, gestalt])
        # Координаты: [Напряжение/Резкость, Глубина, Целостность формы]
        form_lexicon = {
            "geometric construct": np.array([0.9, 0.6, 0.8]),
            "concrete monolith": np.array([0.8, 0.7, 0.9]),
            "fractal topology": np.array([0.5, 0.5, 0.5]), 
            "microscopic cell": np.array([0.2, 0.4, 0.6]),
            "gothic cathedral tracery": np.array([0.8, 0.9, 0.8]),
            "claustrophobic ventilation shaft": np.array([0.7, 0.9, 0.4]),
            "kinetic wireframe matrix": np.array([0.9, 0.8, 0.5]),
            "obscure void": np.array([0.1, 0.9, 0.1]),
            "crystalline anomaly": np.array([0.8, 0.6, 0.7])
        }

        best_form, max_f_prob = "form", -1.0
        for form, vec in form_lexicon.items():
            prob = np.dot(form_tensor, vec) / (np.linalg.norm(form_tensor) * np.linalg.norm(vec) + 1e-7)
            if prob > max_f_prob: 
                max_f_prob = prob; best_form = form

        # Склеиваем идеальную форму и состояние на лету!
        subject_s = f"{best_state} {best_form}"

    copula_m = arch_data["copula_m"]
    predicate_p = arch_data["predicate_p"]

    search_query = f"{subject_s} {copula_m} {predicate_p}"
    
    clean_words = [w for w in search_query.split() if len(w) > 2 and w.lower() not in ["and", "the", "with", "from"]]
    final_query = " ".join(clean_words[:9]) # Расширил до 9 слов, чтобы вся фраза влезла

    if tensor[25] > 0.8:
        display_vibe = f"Q.E.D. // {arch_data['alias']}"
    else:
        display_vibe = arch_data["alias"]

    resonance_pct = int(np.clip(dominant_score * 100.0, 85, 99))
    return final_query, display_vibe, resonance_pct, dominant_name

# ==============================================================================
# СХЕМА И ЭНДПОИНТЫ API
# ==============================================================================
class TensorPayload(BaseModel):
    anchor: str
    visual_tensor: List[float]
    history: Optional[List[str]] = []

@app.get("/")
def health():
    return {"status": "ORACLE_9_ONLINE", "core": "Combinatorial Lexical Generation", "dimensions": 32}

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
            if not image_url: raise HTTPException(status_code=400, detail="Missing image_url")
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                body_bytes = response.read()
        else:
            body_bytes = await request.body()
            if not body_bytes: raise HTTPException(status_code=400, detail="Empty image data")

        tensor, has_human = extract_32d_consciousness_tensor(body_bytes)
        smart_query, display_vibe, resonance_pct, dominant_archetype = synthesize_syllogism_query(tensor, has_human, raw_title, history)

        print(f"\n[ORACLE 9.0: DYNAMIC GENERATOR] ------------------------")
        print(f" > RAW ANCHOR IN   : '{raw_title}'")
        print(f" > PURIFIED ANCHOR : '{clean_anchor_title(raw_title)}'")
        print(f" > NUMBNESS INDEX  : {tensor[26]:.3f} | GILMOUR PEAK: {tensor[27]:.3f}")
        print(f" > DOMINANT ARC    : {dominant_archetype} ({resonance_pct}%)")
        print(f" > FINAL QUERY     : \"{smart_query}\"")
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
        return {"status": "error", "displayVibe": "RESONANCE VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

@app.post("/api/mutate_from_tensor")
async def mutate_from_tensor_endpoint(payload: TensorPayload):
    try:
        if len(payload.visual_tensor) != 32:
            raise HTTPException(status_code=400, detail="Tensor must be exactly 32-dimensional")

        tensor = np.array(payload.visual_tensor)
        has_human = False 

        smart_query, display_vibe, resonance_pct, dominant_archetype = synthesize_syllogism_query(tensor, has_human, payload.anchor, payload.history)

        print(f"\n[ORACLE 9.0: SYNESTHESIA BRIDGE] -----------------")
        print(f" > SONIC ANCHOR IN : '{payload.anchor}'")
        print(f" > DOMINANT ARC    : {dominant_archetype} ({resonance_pct}%)")
        print(f" > FINAL QUERY     : \"{smart_query}\"")
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
        return {"status": "error", "displayVibe": "SONIC VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("oracle_server:app", host="0.0.0.0", port=8000, reload=True)
