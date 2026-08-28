from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from PIL import Image
from io import BytesIO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_consciousness_tensor(img_data: bytes) -> np.ndarray:
    """Извлекает 14-мерный тензор (Матрицу Сознания) на основе физики и спектрального анализа."""
    try:
        img_pil = Image.open(BytesIO(img_data)).convert('RGB')
        img_pil = img_pil.resize((256, 256)) # Строгий квадрат для матричных операций
        img = np.array(img_pil)
        
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

        # 1-3. БАЗОВАЯ ФИЗИКА
        luminance = np.mean(gray) / 255.0
        contrast = np.clip(np.std(gray) / 128.0, 0.0, 1.0)
        
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / (hist.sum() + 1e-7)
        entropy = -np.sum(hist * np.log2(hist + 1e-7)) / 8.0 

        # 4. RHYTHM (Фурье-анализ, высокочастотный шум)
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = np.log(np.abs(f_shift) + 1)
        h, w = magnitude_spectrum.shape
        cy, cx = h // 2, w // 2
        y, x = np.ogrid[:h, :w]
        mask = (x - cx)**2 + (y - cy)**2 > (min(h, w) // 4)**2
        rhythm = np.clip(np.mean(magnitude_spectrum[mask]) / 15.0, 0.0, 1.0)

        # 5-11. СТРУКТУРА, ЦВЕТ И СОСТОЯНИЕ
        edges = cv2.Canny(gray, 100, 200)
        tension = np.clip((np.sum(edges > 0) / (256 * 256)) * 5.0, 0.0, 1.0)
        
        mean_hue = np.mean(hsv[:, :, 0])
        temperature = 1.0 - (np.abs(mean_hue - 110.0) / 110.0)
        volatility = np.mean(hsv[:, :, 1]) / 255.0

        left_half = gray[:, :128]
        right_half = cv2.flip(gray[:, 128:], 1)
        symmetry = np.clip(1.0 - (np.mean((left_half.astype(float) - right_half.astype(float)) ** 2) / (255.0**2)), 0.0, 1.0)

        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        depth = np.clip(1.0 - (laplacian_var / 1000.0), 0.0, 1.0) 
        transcendence = np.clip((entropy * symmetry * volatility) * 2.0, 0.0, 1.0)
        gravity = np.clip((tension * 0.5) + (symmetry * 0.3) + ((1.0 - entropy) * 0.2), 0.0, 1.0)

        # ==========================================
        # НОВЫЕ ИЗМЕРЕНИЯ РАСШИРЕННОГО СОЗНАНИЯ
        # ==========================================
        
        # 12. CHRONOS (Время / Распад)
        # Винтажные фото имеют "faded blacks" (черный цвет смещен вверх) и зерно.
        black_level = np.percentile(gray, 5) / 255.0 # Берем 5-й перцентиль (самые темные участки)
        chronos = np.clip((black_level * 1.5) + (rhythm * 0.5), 0.0, 1.0)

        # 13. GESTALT (Композиционный центр масс)
        # Проверяем, где сосредоточена энергия (грани): в центре или размазана по краям?
        gaussian_mask = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * (64**2)))
        total_edges = np.sum(edges) + 1e-5
        gestalt = np.clip(np.sum(edges * gaussian_mask) / total_edges, 0.0, 1.0)

        # 14. HARMONICS (Цветовой Консонанс / Диссонанс)
        # Изолируем только насыщенные пиксели (серый цвет не имеет тона)
        sat_channel = hsv[:, :, 1]
        hue_channel = hsv[:, :, 0]
        valid_hues = hue_channel[sat_channel > 40]
        
        if len(valid_hues) < 100:
            harmonics = 0.8 # ЧБ или монохром — это высокая гармония по умолчанию
        else:
            hue_std = np.std(valid_hues) # Разброс цветов. В OpenCV hue идет до 180.
            # Если std высокий (цвета раскиданы по всему кругу) — это диссонанс.
            harmonics = np.clip(1.0 - (hue_std / 60.0), 0.0, 1.0)

        return np.array([luminance, contrast, entropy, rhythm, tension, temperature, volatility, symmetry, depth, transcendence, gravity, chronos, gestalt, harmonics])
        
    except Exception as e:
        print(f"[VISION FATAL ERROR] {e}")
        return np.array([0.5] * 14)

def synthesize_query(tensor: np.ndarray) -> str:
    # Распаковываем 14 измерений
    [lum, cont, ent, rhythm, tension, temp, vol, sym, depth, trans, grav, chronos, gestalt, harmonics] = tensor
    
    spell_words = []

    # --- ВИЗУАЛЬНАЯ ФИЗИКА ---
    if rhythm > 0.7 and tension > 0.6: spell_words.append("gritty chaotic")
    elif depth > 0.7 and tension < 0.3: spell_words.append("ethereal soft")
    if lum < 0.3 and cont > 0.6: spell_words.append("chiaroscuro")
    elif lum < 0.4 and temp > 0.6 and vol > 0.5: spell_words.append("neon glowing")
    elif lum > 0.8: spell_words.append("overexposed faded")

    # --- ЭКЗИСТЕНЦИАЛЬНАЯ ЛИНГВИСТИКА (Новые оси) ---
    
    # Измерение Времени (Chronos)
    if chronos > 0.6:
        spell_words.append(np.random.choice(["analog 35mm", "vintage lo-fi", "nostalgic"]))
    elif chronos < 0.2 and tension > 0.6:
        spell_words.append(np.random.choice(["hyper-crisp digital", "unreal engine 8k"]))

    # Измерение Пространства (Gestalt)
    if gestalt > 0.7 and grav > 0.6:
        spell_words.append("isolated focused") # Объект плотно в центре
    elif gestalt < 0.3 and depth > 0.6:
        spell_words.append("expansive panoramic") # Размыто по краям, стена вайба

    # Измерение Консонанса (Harmonics)
    if harmonics > 0.7 and vol > 0.3:
        spell_words.append("cohesive ambient") # Приятные, соседние цвета
    elif harmonics < 0.3 and vol > 0.6:
        spell_words.append("jarring avant-garde striking") # Дикий цветовой диссонанс

    # Измерение REBUS (Измененные состояния)
    if trans > 0.7:
        spell_words.append(np.random.choice(["psychedelic surreal", "mind-bending kaleidoscopic"]))
    elif ent > 0.8 and vol < 0.2:
        spell_words.append(np.random.choice(["liminal space", "melancholic void", "brutalist"]))

    if not spell_words:
        spell_words.append("cinematic")

    # ПРАВИЛО ТРЕХ ГВОЗДЕЙ
    np.random.shuffle(spell_words)
    final_spell = " ".join(spell_words[:3])
    
    if "aesthetic" not in final_spell:
        final_spell += " aesthetic"

    return final_spell

@app.get("/")
def health():
    return {"status": "Oracle 4.0 (Synesthesia Core) Online", "dimensions": 14}

@app.post("/api/mutate")
async def mutate_endpoint(request: Request):
    try:
        body_bytes = await request.body()
        if not body_bytes:
            raise HTTPException(status_code=400, detail="Empty image data")

        tensor = extract_consciousness_tensor(body_bytes)
        refined_query = synthesize_query(tensor)
        
        style_alias = refined_query.split()[0]
        
        # Логируем ключевые экзистенциальные параметры
        print(f"[ORACLE 4.0] Grav: {tensor[10]:.2f} | Chronos: {tensor[11]:.2f} | Gestalt: {tensor[12]:.2f} | Harmonics: {tensor[13]:.2f}")
        print(f"[ORACLE 4.0] Spell formulated: {refined_query}")

        return {
            "status": "success",
            "style": style_alias,
            "refined_query": refined_query,
            "tensor": [round(float(x), 4) for x in tensor]
        }
        
    except Exception as e:
        print(f"[CRITICAL ERROR] {e}")
        return {"status": "error", "message": str(e)}
