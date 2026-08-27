from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import numpy as np
import os
import cv2
from io import BytesIO
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def extract_physics_from_bytes(img_data: bytes) -> np.ndarray:
    try:
        img_pil = Image.open(BytesIO(img_data)).convert('RGB')
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
        print(f"[VISION ERROR] {e}")
        return np.array([0.5, 0.5, 0.5, 0.5, 0.5])

def mutate_image(img_tensor: np.ndarray) -> str:
    best_style, min_dist = "default", float('inf')
    for name, tensor in LEXICON.items():
        dist = np.linalg.norm(img_tensor - tensor)
        if dist < min_dist: min_dist, best_style = dist, name
    return best_style

@app.get("/")
def health():
    return {"status": "Kashmir Oracle (Binary Edition) is online"}

@app.post("/api/mutate")
async def mutate_endpoint(request: Request):
    try:
        body_bytes = await request.body()
        if not body_bytes:
            return {"status": "error", "message": "Empty body"}

        real_tensor = extract_physics_from_bytes(body_bytes)
        style = mutate_image(real_tensor)
        
        return {
            "status": "success",
            "style": style,
            "tensor": [round(float(x), 4) for x in real_tensor]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
