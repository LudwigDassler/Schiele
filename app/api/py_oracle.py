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
import urllib.parse
import asyncpg
import base64
import os
import hashlib

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.kefdjxsmyarwfqqkfgcx:LudwigDassler@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
)
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app = FastAPI(title="GELBET Oracle 12.0 (Acid Morph Edition)", version="12.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# ==============================================================================
# СИСТЕМА ЖИЗНЕОБЕСПЕЧЕНИЯ
# ==============================================================================
@app.get("/health")
@app.get("/api/py_oracle/health")
async def health_check():
    return {"status": "AWAKE", "message": "The Acid Oracle is listening."}

@app.get("/")
@app.get("/api/py_oracle")
def health():
    return {"status": "ORACLE_12_0_ONLINE", "core": "PostgreSQL + Acid Math Engine"}

# ==============================================================================
# 1. ЛЕКСИЧЕСКАЯ ЦЕНТРИФУГА
# ==============================================================================
CLEANUP_REGEX = re.compile(r'\b(wallpaper|hd|4k|image|photo|pic|picture|download|free|vector|stock|source|desktop|background|pinterest|preview)\b', re.IGNORECASE)
CONSONANT_CLUSTER_REGEX = re.compile(r'[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZБВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬ]{6,}')
HASH_REGEX = re.compile(r'^(?=.*[a-zA-Zа-яА-ЯёЁ])(?=.*\d)[a-zA-Zа-яА-ЯёЁ\d]{4,}$')

def clean_anchor_title(raw_title: str) -> str:
    if not raw_title or raw_title == "Aesthetic Artifact": return ""
    clean = re.sub(r'http\S+|www\S+', '', raw_title)
    clean = re.sub(r'\.(jpg|jpeg|png|webp|gif|mp4|avif)\b', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'\[.*?\]|\(.*?\)', '', clean)
    clean = re.sub(r'[-_]', ' ', clean)
    clean = CLEANUP_REGEX.sub('', clean)
    clean = re.sub(r'[^a-zA-Zа-яА-ЯёЁ0-9\s]', ' ', clean) 
    
    valid_words = []
    for word in clean.split():
        if len(word) > 15 or HASH_REGEX.match(word) or CONSONANT_CLUSTER_REGEX.search(word): continue
        if len(word) == 1 and word.lower() not in ['a', 'i', 'о', 'у', 'а', 'я', 'и', 'к', 'в', 'с']: continue
        valid_words.append(word)
    final_anchor = " ".join(valid_words[:8]).strip()
    return "" if len(final_anchor) <= 2 else final_anchor

def vector_to_str(vec: np.ndarray) -> str:
    return "[" + ",".join(map(str, vec)) + "]"

# ==============================================================================
# 2. ФИЗИКА ОПТИКИ И ЗВУКА + БАЙЕСОВСКАЯ СЕНСОРИКА
# ==============================================================================
def extract_32d_consciousness_tensor(img_data: bytes):
    img_pil = Image.open(BytesIO(img_data)).convert('RGB')
    img_pil = img_pil.resize((512, 512)) 
    img = np.array(img_pil)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
    has_human = len(faces) > 0

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    y, x = np.ogrid[:h, :w]
    gauss_kernel = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * (50**2)))

    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel()
    hist_norm = hist / (hist.sum() + 1e-7)
    non_zero_hist = hist_norm[hist_norm > 0]
    shannon_entropy = -np.sum(non_zero_hist * np.log2(non_zero_hist))
    
    luminance = np.mean(gray) / 255.0
    entropy_old = -np.sum(hist_norm * np.log2(hist_norm + 1e-7)) / 8.0
    
    f_transform = np.fft.fft2(gray)
    mag_spectrum = np.log(np.abs(np.fft.fftshift(f_transform)) + 1)
    high_freq_mask = (x - cx)**2 + (y - cy)**2 > (64**2)
    fft_rhythm = np.clip(np.mean(mag_spectrum[high_freq_mask]) / 14.0, 0.0, 1.0)
    
    edges = cv2.Canny(gray, 80, 180)
    tension = np.clip((np.sum(edges > 0) / (h * w)) * 6.0, 0.0, 1.0)
    depth = np.clip(1.0 - (laplacian_var / 800.0), 0.0, 1.0)
    chronos = np.clip((np.percentile(gray, 4) / 255.0 * 2.2) + (fft_rhythm * 0.4), 0.0, 1.0)
    gestalt = np.clip(np.sum(edges * gauss_kernel) / (np.sum(edges) + 1e-5) * 1.5, 0.0, 1.0)

    sat_mask = hsv[:, :, 1] > 35
    harmonics = 0.85 if np.sum(sat_mask) < 200 else np.clip(1.0 - (np.std(hsv[:, :, 0][sat_mask]) / 55.0), 0.0, 1.0)
    grain = np.clip(np.mean(np.abs(gray.astype(float) - cv2.GaussianBlur(gray, (5, 5), 0).astype(float))) / 18.0, 0.0, 1.0)
    
    low_freq_mask = (x - cx)**2 + (y - cy)**2 <= (32**2)
    pink_noise = np.clip((np.sum(mag_spectrum[low_freq_mask]) / (np.sum(mag_spectrum[high_freq_mask]) + 1e-5)) / 5.0, 0.0, 1.0)

    tensor = np.zeros(32)
    tensor[0], tensor[2], tensor[4], tensor[8], tensor[11], tensor[12], tensor[13], tensor[15], tensor[28] = luminance, entropy_old, tension, depth, chronos, gestalt, harmonics, grain, pink_noise
    
    img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    return img_bgr, tensor, has_human, shannon_entropy, laplacian_var

# ==============================================================================
# 3. ПРОЦЕДУРНЫЙ МОРФИНГ (КИСЛОТА ШИЛЕ)
# ==============================================================================
def apply_acid_math(img_bgr, tensor_32d, entropy, variance):
    rows, cols, _ = img_bgr.shape
    x_map, y_map = np.meshgrid(np.arange(cols), np.arange(rows))
    x_map = x_map.astype(np.float32)
    y_map = y_map.astype(np.float32)

    delta_x = np.zeros_like(x_map)
    delta_y = np.zeros_like(y_map)

    for i in range(8):
        amplitude = tensor_32d[i] * entropy * 4.0
        frequency = (tensor_32d[i+8] * 100) + 15
        delta_x += amplitude * np.sin(y_map / frequency)
        delta_y += amplitude * np.cos(x_map / frequency)

    map_x = x_map + delta_x
    map_y = y_map + delta_y

    warped_img = cv2.remap(img_bgr, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    float_img = warped_img.astype(np.float32) / 255.0
    theta = (variance / 1500.0) * np.mean(tensor_32d)
    
    color_matrix = np.array([
        [np.cos(theta), -np.sin(theta), np.sin(theta)],
        [np.sin(theta), np.cos(theta), -np.sin(theta)],
        [-np.sin(theta), np.sin(theta), np.cos(theta)]
    ])
    
    mutated_img = np.dot(float_img, color_matrix.T)
    mutated_img = np.clip(mutated_img, 0.0, 1.0) * 255.0
    mutated_img = mutated_img.astype(np.uint8)

    _, buffer = cv2.imencode('.jpg', mutated_img)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_str}"

# ==============================================================================
# 4. АСИНХРОННЫЙ КОМБИНАТОРНЫЙ SQL-ДВИЖОК
# ==============================================================================
async def synthesize_query_from_db(tensor: np.ndarray, has_human: bool, raw_title: str, history: list, context_text: str):
    anchor = clean_anchor_title(raw_title)
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        words = list(set(re.findall(r'\b[a-zа-яё]+\b', (context_text or "").lower())))
        semantic_tensor = np.zeros(8)
        
        if words:
            query = """
                SELECT axis, SUM(weight) as total_weight 
                FROM semantic_ontology 
                WHERE word = ANY($1::varchar[]) 
                GROUP BY axis
            """
            rows = await conn.fetch(query, words)
            total_words = max(len(words), 1)
            axis_map = {'IDEATIONAL': 0, 'SENSATE': 1, 'DREAD': 2, 'EUPHORIA': 3, 'NOSTALGIA': 4}
            for row in rows:
                axis_idx = axis_map.get(row['axis'])
                if axis_idx is not None:
                    semantic_tensor[axis_idx] = np.clip((row['total_weight'] / total_words) * 15, 0, 1)

        ideational, sensate, dread, euphoria, nostalgia = semantic_tensor[0:5]
        luminance, entropy, tension, depth, chronos, gestalt, harmonics, grain, pink_noise = tensor[0], tensor[2], tensor[4], tensor[8], tensor[11], tensor[12], tensor[13], tensor[15], tensor[28]

        arch_query = "SELECT alias, (1 - (vector_32d <=> $1::vector)) as similarity FROM archetypes ORDER BY vector_32d <=> $1::vector LIMIT 1"
        arch_row = await conn.fetchrow(arch_query, vector_to_str(tensor))
        dominant_alias = arch_row['alias'] if arch_row else "UNKNOWN ANOMALY"
        resonance_pct = int(np.clip(arch_row['similarity'] * 100.0, 85, 99)) if arch_row else 85

        state_t = vector_to_str(np.array([luminance, entropy, pink_noise, dread, euphoria]))
        form_t = vector_to_str(np.array([tension, depth, gestalt, dread, ideational]))
        medium_t = vector_to_str(np.array([chronos, grain, harmonics, dread, nostalgia]))

        state_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'STATE' ORDER BY vector_5d <=> $1::vector LIMIT 1", state_t)
        form_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'FORM' ORDER BY vector_5d <=> $1::vector LIMIT 1", form_t)
        medium_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'MEDIUM' ORDER BY vector_5d <=> $1::vector LIMIT 1", medium_t)

        best_state = state_row['phrase'] if state_row else "ethereal"
        best_form = form_row['phrase'] if form_row else "structure"
        best_medium = medium_row['phrase'] if medium_row else "cinematic photography"
    finally:
        await conn.close()

    core_vibe = dominant_alias.lower()
    stop_words = {"and", "the", "with", "from"}

    if anchor:
        final_query = f"{anchor} {best_medium}"
    elif has_human:
        raw_query = f"{core_vibe} {best_state} portrait"
        clean_words = [w for w in raw_query.split() if w.lower() not in stop_words]
        final_query = " ".join(clean_words[:6])
    else:
        raw_query = f"{core_vibe} {best_state} {best_form}"
        clean_words = [w for w in raw_query.split() if w.lower() not in stop_words]
        final_query = " ".join(clean_words[:6])
    
    display_vibe = f"RESONANCE: {dominant_alias}"
    return final_query.strip(), display_vibe, resonance_pct, dominant_alias, semantic_tensor

# ==============================================================================
# API ЭНДПОИНТЫ (УНИВЕРСАЛЬНЫЙ ДИСПЕТЧЕР ДЛЯ VERCEL)
# ==============================================================================
async def handle_mutate(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        raw_title = urllib.parse.unquote(request.headers.get("x-anchor-title", ""))
        history, context_text = [], ""
        
        if "application/json" in content_type:
            payload = await request.json()
            image_url = payload.get("image_url")
            raw_title = payload.get("title", raw_title)
            history = payload.get("history", [])
            context_text = payload.get("context_text", "")
            
            if not image_url: raise HTTPException(status_code=400, detail="Missing image_url")
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                body_bytes = response.read()
        else:
            body_bytes = await request.body()
            if not body_bytes: raise HTTPException(status_code=400, detail="Empty image data")

        img_bgr, tensor, has_human, shannon, variance = extract_32d_consciousness_tensor(body_bytes)
        text_to_analyze = context_text if context_text else raw_title
        
        smart_query, display_vibe, resonance_pct, dominant_archetype, st = await synthesize_query_from_db(
            tensor, has_human, raw_title, history, text_to_analyze
        )

        acid_image_base64 = apply_acid_math(img_bgr, tensor, shannon, variance)

        return {
            "status": "success", 
            "displayVibe": display_vibe, 
            "smartQuery": smart_query, 
            "resonanceScore": resonance_pct, 
            "hasHuman": has_human, 
            "archetype": dominant_archetype,
            "tensor": tensor.tolist(),
            "acidImageBase64": acid_image_base64
        }
    except Exception as e:
        return {"status": "error", "displayVibe": "RESONANCE VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

async def handle_mutate_from_tensor(data: dict):
    try:
        visual_tensor = data.get("visual_tensor", [])
        anchor = data.get("anchor", "")
        history = data.get("history", [])
        context_text = data.get("context_text") or anchor

        if len(visual_tensor) != 32: raise HTTPException(status_code=400, detail="Tensor must be 32D")
        tensor = np.array(visual_tensor)
        
        smart_query, display_vibe, resonance_pct, dominant_archetype, st = await synthesize_query_from_db(
            tensor, False, anchor, history, context_text
        )
        return {"status": "success", "displayVibe": display_vibe, "smartQuery": smart_query, "resonanceScore": resonance_pct, "hasHuman": False, "archetype": dominant_archetype}
    except Exception as e:
        return {"status": "error", "displayVibe": "SONIC VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

async def handle_resonate(data: dict):
    try:
        q = (data.get("query") or "").strip()
        anchor = clean_anchor_title(q.split("-")[0].strip()) or clean_anchor_title(q)
        
        digest = hashlib.sha256(q.lower().encode("utf-8")).digest()
        base_vec = np.frombuffer(digest, dtype=np.uint8).astype(np.float32) / 255.0
        
        phi = 1.618033988749
        tensor = np.clip(np.abs(np.sin(base_vec * np.pi * phi)), 0.05, 0.95)
        
        logs = [
            f"[SONIC ENGINE] Декодирование акустической сигнатуры: {q.upper()}",
            f"[FOURIER] Спектральная плотность: {tensor[0]:.2f} | Энтропия: {tensor[2]:.2f} | Напряжение: {tensor[4]:.2f}",
            f"[MANIFOLD] Проекция 32-мерного тензора завершена. Якорь: '{anchor or q}'"
        ]
        return {
            "status": "success",
            "anchor": anchor,
            "visual_tensor": np.round(tensor, 4).tolist(),
            "logs": logs
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/py_oracle")
@app.post("/{full_path:path}")
async def universal_router(request: Request, full_path: str = ""):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
        if "visual_tensor" in data or full_path.endswith("mutate_from_tensor"):
            return await handle_mutate_from_tensor(data)
        if "query" in data or full_path.endswith("resonate"):
            return await handle_resonate(data)
    return await handle_mutate(request)
