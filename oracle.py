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
import asyncpg
from contextlib import asynccontextmanager

# АРТЕРИЯ К БАЗЕ ДАННЫХ SUPABASE
DATABASE_URL = "postgresql://postgres:JonasKessler18@db.kefdjxsmyarwfqqkfgcx.supabase.co:5432/postgres"

# Инициализация пула соединений с БД при старте сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    yield
    await app.state.db_pool.close()

app = FastAPI(title="GELBET Oracle 11.0 (Supabase Vector Engine)", version="11.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

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
    final_anchor = " ".join(valid_words[:4]).strip()
    return "" if len(final_anchor) <= 2 else final_anchor

def vector_to_str(vec: np.ndarray) -> str:
    return "[" + ",".join(map(str, vec)) + "]"

# ==============================================================================
# 2. ФИЗИКА ОПТИКИ И ЗВУКА
# ==============================================================================
def extract_32d_consciousness_tensor(img_data: bytes):
    img_pil = Image.open(BytesIO(img_data)).convert('RGB')
    img_pil = img_pil.resize((256, 256))
    img = np.array(img_pil)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
    has_human = len(faces) > 0

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    y, x = np.ogrid[:h, :w]
    gauss_kernel = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * (50**2)))

    luminance = np.mean(gray) / 255.0
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    entropy = -np.sum(hist * np.log2(hist + 1e-7)) / 8.0

    f_transform = np.fft.fft2(gray)
    mag_spectrum = np.log(np.abs(np.fft.fftshift(f_transform)) + 1)
    high_freq_mask = (x - cx)**2 + (y - cy)**2 > (64**2)
    fft_rhythm = np.clip(np.mean(mag_spectrum[high_freq_mask]) / 14.0, 0.0, 1.0)
    
    edges = cv2.Canny(gray, 80, 180)
    tension = np.clip((np.sum(edges > 0) / (256 * 256)) * 6.0, 0.0, 1.0)
    depth = np.clip(1.0 - (cv2.Laplacian(gray, cv2.CV_64F).var() / 800.0), 0.0, 1.0)
    chronos = np.clip((np.percentile(gray, 4) / 255.0 * 2.2) + (fft_rhythm * 0.4), 0.0, 1.0)
    gestalt = np.clip(np.sum(edges * gauss_kernel) / (np.sum(edges) + 1e-5) * 1.5, 0.0, 1.0)

    sat_mask = hsv[:, :, 1] > 35
    harmonics = 0.85 if np.sum(sat_mask) < 200 else np.clip(1.0 - (np.std(hsv[:, :, 0][sat_mask]) / 55.0), 0.0, 1.0)
    grain = np.clip(np.mean(np.abs(gray.astype(float) - cv2.GaussianBlur(gray, (5, 5), 0).astype(float))) / 18.0, 0.0, 1.0)
    
    low_freq_mask = (x - cx)**2 + (y - cy)**2 <= (32**2)
    pink_noise = np.clip((np.sum(mag_spectrum[low_freq_mask]) / (np.sum(mag_spectrum[high_freq_mask]) + 1e-5)) / 5.0, 0.0, 1.0)

    tensor = np.zeros(32)
    tensor[0], tensor[2], tensor[4], tensor[8], tensor[11], tensor[12], tensor[13], tensor[15], tensor[28] = luminance, entropy, tension, depth, chronos, gestalt, harmonics, grain, pink_noise
    return tensor, has_human

# ==============================================================================
# 3. АСИНХРОННЫЙ КОМБИНАТОРНЫЙ SQL-ДВИЖОК
# ==============================================================================
async def synthesize_query_from_db(pool, tensor: np.ndarray, has_human: bool, raw_title: str, history: list, context_text: str):
    anchor = clean_anchor_title(raw_title)
    depth_iteration = len(history)

    async with pool.acquire() as conn:
        # 1. АНАЛИЗ СЕМАНТИКИ СЛОВ ЧЕРЕЗ БД (Вычисляем 8D Тензор Ужаса/Эйфории)
        words = list(set(re.findall(r'\b[a-zа-яё]+\b', (context_text or "").lower())))
        semantic_tensor = np.zeros(8)
        
        if words:
            # SQL высчитывает вес совпавших слов по осям
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

        # 2. ПОИСК ИДЕАЛЬНОГО АРХЕТИПА ЧЕРЕЗ PGVECTOR (<=> Это косинусное расстояние)
        arch_query = "SELECT alias, (1 - (vector_32d <=> $1::vector)) as similarity FROM archetypes ORDER BY vector_32d <=> $1::vector LIMIT 1"
        arch_row = await conn.fetchrow(arch_query, vector_to_str(tensor))
        dominant_alias = arch_row['alias'] if arch_row else "UNKNOWN ANOMALY"
        resonance_pct = int(np.clip(arch_row['similarity'] * 100.0, 85, 99)) if arch_row else 85

        # 3. ФОРМИРОВАНИЕ 5D ТЕНЗОРОВ
        state_t = vector_to_str(np.array([luminance, entropy, pink_noise, dread, euphoria]))
        form_t = vector_to_str(np.array([tension, depth, gestalt, dread, ideational]))
        medium_t = vector_to_str(np.array([chronos, grain, harmonics, dread, nostalgia]))

        # 4. МГНОВЕННЫЙ ЗАПРОС К ЛЕКСИКОНУ В БД
        state_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'STATE' ORDER BY vector_5d <=> $1::vector LIMIT 1", state_t)
        form_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'FORM' ORDER BY vector_5d <=> $1::vector LIMIT 1", form_t)
        medium_row = await conn.fetchrow("SELECT phrase FROM lexicon_matrix WHERE category = 'MEDIUM' ORDER BY vector_5d <=> $1::vector LIMIT 1", medium_t)

        best_state = state_row['phrase'] if state_row else "abstract"
        best_form = form_row['phrase'] if form_row else "form"
        best_medium = medium_row['phrase'] if medium_row else "aesthetic"

    # ==========================================
    # СБОРКА И БРИТВА ОККАМА
    # ==========================================
    if anchor and depth_iteration <= 2:
        search_query = f"{anchor} {best_state} {best_medium}"
    elif has_human:
        search_query = f"enigmatic portrait {best_state} {best_medium}"
    else:
        search_query = f"{best_state} {best_form} {best_medium}"
    
    clean_words = [w for w in search_query.split() if len(w) > 2 and w.lower() not in ["and", "the", "with", "from"]]
    final_query = " ".join(clean_words[:8]) 

    display_vibe = f"Q.E.D. // {dominant_alias}" if (tensor[25] > 0.8 or dread > 0.6 or euphoria > 0.6) else dominant_alias
    return final_query, display_vibe, resonance_pct, dominant_alias, semantic_tensor

# ==============================================================================
# API ЭНДПОИНТЫ
# ==============================================================================
class TensorPayload(BaseModel):
    anchor: str
    visual_tensor: List[float]
    history: Optional[List[str]] = []
    context_text: Optional[str] = None  

@app.get("/")
def health():
    return {"status": "ORACLE_11_0_ONLINE", "core": "PostgreSQL pgvector Engine"}

@app.post("/api/mutate")
async def mutate_endpoint(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        raw_title, history, context_text = "", [], ""
        
        if "application/json" in content_type:
            payload = await request.json()
            image_url = payload.get("image_url")
            raw_title = payload.get("title", "")
            history = payload.get("history", [])
            context_text = payload.get("context_text", "")
            
            if not image_url: raise HTTPException(status_code=400, detail="Missing image_url")
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                body_bytes = response.read()
        else:
            body_bytes = await request.body()
            if not body_bytes: raise HTTPException(status_code=400, detail="Empty image data")

        tensor, has_human = extract_32d_consciousness_tensor(body_bytes)
        text_to_analyze = context_text if context_text else raw_title
        
        # Передаем запрос пулу соединений БД
        smart_query, display_vibe, resonance_pct, dominant_archetype, st = await synthesize_query_from_db(
            request.app.state.db_pool, tensor, has_human, raw_title, history, text_to_analyze
        )

        print(f"\n[ORACLE 11.0: DATABASE GENERATOR] -----------------")
        print(f" > ANCHOR IN       : '{raw_title}'")
        print(f" > DREAD / EUPHORIA: {st[2]:.2f} / {st[3]:.2f}")
        print(f" > FINAL QUERY     : \"{smart_query}\"")
        print(f"----------------------------------------------------------\n")

        return {"status": "success", "displayVibe": display_vibe, "smartQuery": smart_query, "resonanceScore": resonance_pct, "hasHuman": has_human, "archetype": dominant_archetype}
    except Exception as e:
        return {"status": "error", "displayVibe": "RESONANCE VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

@app.post("/api/mutate_from_tensor")
async def mutate_from_tensor_endpoint(request: Request, payload: TensorPayload):
    try:
        if len(payload.visual_tensor) != 32: raise HTTPException(status_code=400, detail="Tensor must be exactly 32-dimensional")
        tensor, has_human = np.array(payload.visual_tensor), False 
        
        text_to_analyze = payload.context_text if payload.context_text else payload.anchor
        
        smart_query, display_vibe, resonance_pct, dominant_archetype, st = await synthesize_query_from_db(
            request.app.state.db_pool, tensor, has_human, payload.anchor, payload.history, text_to_analyze
        )

        return {"status": "success", "displayVibe": display_vibe, "smartQuery": smart_query, "resonanceScore": resonance_pct, "hasHuman": has_human, "archetype": dominant_archetype}
    except Exception as e:
        return {"status": "error", "displayVibe": "SONIC VOID", "smartQuery": "cinematic abstract blur", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("oracle_server:app", host="0.0.0.0", port=8000, reload=True)
