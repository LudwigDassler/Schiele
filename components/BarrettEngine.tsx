"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость потоков света, лучей и фазовых волн
  chaos: number;     // C: амплитуда ветра в прядях и частота спирографа Guilloche
  tone: number;      // H: сдвиг спектральной фазы
  structure: number; // St: жесткость анатомического замка FDoG
  symmetry: number;  // Sy: количество лучей Sunburst и плотность лент Currents
}

type MasterPreset =
  | "ESQUIRE_67"      // Оранжево-золотой психоделический поп-арт Сида Барретта (без пятен на фоне!)
  | "MADCAP_STENCIL"  // 4-тоновый гуашевый трафарет на оливковом холсте
  | "ASTRAL_NEON"     // Чистый векторный синтез со световыми кометами в темном вакууме
  | "GUILLOCHE_LUX"   // Королевская гравюра модулированными волнами (Золото / Платина)
  | "SIN_CITY"        // Угольный нуар Фрэнка Миллера с кроваво-красными акцентами
  | "BLUEPRINT";      // Инженерная цианотипия с астролябией

type TraceVariation = "FDOG_COMIC" | "GUILLOCHE" | "ASTRAL_VECTOR" | "WOODCUT";
type BgManifoldType = "SUNBURST" | "SACRED_RINGS" | "LIQUID_AURA" | "CLEAN_SOLID";

interface ArtStudioConfig {
  master: MasterPreset;
  traceVariation: TraceVariation;
  bgManifold: BgManifoldType;
  posterFrame: boolean;
  strokeWeight: number;   // 0.4 .. 2.2
  inkThreshold: number;   // 0.18 .. 0.78 (глубина туши FDoG)
  stippleDensity: number; // 0.0 .. 1.0 (живой тригонометрический растр)
  rippleStrength: number; // 0.0 .. 1.0 (водная гладь и интерактивные волны)
}

interface DifferentialConstants {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  nHarmonic: number;
  mHarmonic: number;
  entropy: number;
  lyapunov: number;
}

interface SilkParticle {
  x: number;
  y: number;
  x0: number;
  y0: number;
  age: number;
  maxAge: number;
  dir: number;
}

interface CrystalCell {
  u: number;
  v: number;
  size: number;
  r: number;
  g: number;
  b: number;
  lum: number;
  edge: number;
  tx: number;
  ty: number;
}

interface ContourStroke {
  pts: {
    u: number;
    v: number;
    nx: number;
    ny: number;
  }[];
  tier: 1 | 2 | 3;
  r: number;
  g: number;
  b: number;
  meanEdge: number;
  meanLum: number;
  importance: number;
  phase: number;
  speed: number;
  arcLen: number;
}

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  smoothRgba: Uint8ClampedArray;
  lum: Float32Array;
  smoothLum: Float32Array;
  fdog: Float32Array;   // Анизотропный потоковый фильтр Канга (0 = чистая тушь, 1 = чистый свет, 0 пятен!)
  bgProb: Float32Array; // Сглаженная маска фона [0 = объект .. 1 = внешний фон]
  edge: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  etfX: Float32Array;
  etfY: Float32Array;
  mask: Float32Array;
  spawnIndices: number[];
  cells: CrystalCell[];
  strokes: ContourStroke[];
}

type ManifoldTopology =
  | "TRACE"
  | "CURRENTS"
  | "PIPER"
  | "PRISM"
  | "SILK"
  | "LIDAR"
  | "ENGRAVE"
  | "CRYSTAL"
  | "GLYPH";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const SILK_COUNT = 4500;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 45, 75],
  [255, 135, 25],
  [245, 225, 45],
  [35, 235, 125],
  [30, 210, 255],
  [75, 105, 255],
  [195, 55, 255],
];

function clip(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clip((x - edge0) / Math.max(1e-6, edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

function acesTonemap(x: number): number {
  const v = Math.max(0.0, x);
  return clip((v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14), 0.0, 1.0);
}

function computeShannonEntropy(str: string): number {
  if (!str) return 0;
  const freq: Record<string, number> = {};
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const ch = str[i];
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let h = 0;
  for (const k in freq) {
    const p = freq[k] / len;
    h -= p * Math.log2(p);
  }
  return h;
}

function compileLexicalManifold(rawText: string): { tensor: Tensor5D; coeffs: DifferentialConstants } {
  const clean = (rawText || "SHINE ON CRAZY DIAMOND").trim().toLowerCase();
  const entropy = computeShannonEntropy(clean);

  let hash1 = 2166136261;
  let hash2 = 5381;
  let vowelCount = 0;
  let consonantCount = 0;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 16777619);
    hash2 = Math.imul(hash2, 33) ^ code;

    const ch = clean[i];
    if (/[a-zа-яё]/i.test(ch)) {
      if (VOWELS.has(ch)) vowelCount++;
      else consonantCount++;
    }
  }

  const abs1 = Math.abs(hash1);
  const abs2 = Math.abs(hash2);
  const totalLetters = Math.max(1, vowelCount + consonantCount);
  const consonantRatio = consonantCount / totalLetters;

  const energy = clip(((abs1 % 1000) / 1000) * 0.35 + 0.52, 0.5, 0.88);
  const chaos = clip((entropy / 4.5) * 0.15 + 0.14, 0.12, 0.32);
  const tone = 0.0;
  const structure = clip(0.88 + consonantRatio * 0.10, 0.88, 0.98);
  const symmetry = 0.36;

  const alpha = Number((Math.sin(abs1 * 0.001 * PHI) * 2.2 + (energy - 0.5)).toFixed(4));
  const beta = Number((Math.cos(abs2 * 0.001 * PHI) * 2.2 - (chaos - 0.5)).toFixed(4));
  const gamma = Number((Math.sin((abs1 ^ abs2) * 0.002) * 1.8 + (structure - 0.5)).toFixed(4));
  const delta = Number((Math.cos((abs1 + abs2) * 0.002) * 1.8 + (symmetry - 0.5)).toFixed(4));

  const nHarmonic = 2 + (abs1 % 6);
  let mHarmonic = 3 + (abs2 % 6);
  if (mHarmonic === nHarmonic) mHarmonic = (mHarmonic % 7) + 2;

  const lyapunov = Number(((Math.abs(alpha * beta) + chaos * 2.1) / 3.2).toFixed(4));

  return {
    tensor: {
      energy: Number(energy.toFixed(3)),
      chaos: Number(chaos.toFixed(3)),
      tone: Number(tone.toFixed(3)),
      structure: Number(structure.toFixed(3)),
      symmetry: Number(symmetry.toFixed(3)),
    },
    coeffs: {
      alpha,
      beta,
      gamma,
      delta,
      nHarmonic,
      mHarmonic,
      entropy: Number(entropy.toFixed(3)),
      lyapunov,
    },
  };
}

function gaussianBlurField(src: Float32Array, w: number, h: number, passes: number): Float32Array {
  let curr = new Float32Array(src);
  const temp = new Float32Array(w * h);

  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const xm2 = Math.max(0, x - 2);
        const xm1 = Math.max(0, x - 1);
        const xp1 = Math.min(w - 1, x + 1);
        const xp2 = Math.min(w - 1, x + 2);
        temp[row + x] =
          (curr[row + xm2] + 4 * curr[row + xm1] + 6 * curr[row + x] + 4 * curr[row + xp1] + curr[row + xp2]) * 0.0625;
      }
    }
    for (let y = 0; y < h; y++) {
      const ym2 = Math.max(0, y - 2) * w;
      const ym1 = Math.max(0, y - 1) * w;
      const y0 = y * w;
      const yp1 = Math.min(h - 1, y + 1) * w;
      const yp2 = Math.min(h - 1, y + 2) * w;
      for (let x = 0; x < w; x++) {
        curr[y0 + x] =
          (temp[ym2 + x] + 4 * temp[ym1 + x] + 6 * temp[y0 + x] + 4 * temp[yp1 + x] + temp[yp2 + x]) * 0.0625;
      }
    }
  }
  return curr;
}

// ==========================================
// ЯДРО FDoG (ANISOTROPIC FLOW-BASED XDoG) + СЕГМЕНТАЦИЯ БЕЗ ФОНОВЫХ КЛЯКС
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, isMobileDevice: boolean): MatrixBuffer {
  const baseRes = isMobileDevice ? 480 : 620;
  const aspect = img.width / Math.max(1, img.height);
  let w = baseRes;
  let h = baseRes;
  if (aspect > 1.2) {
    w = baseRes;
    h = Math.round(baseRes / Math.min(aspect, 1.55));
  } else if (aspect < 0.85) {
    h = baseRes;
    w = Math.round(baseRes * Math.max(aspect, 0.68));
  }

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");

  const total = w * h;
  const lum = new Float32Array(total);
  const fdog = new Float32Array(total);
  const bgProb = new Float32Array(total);
  const edge = new Float32Array(total);
  const gx = new Float32Array(total);
  const gy = new Float32Array(total);
  const etfX = new Float32Array(total);
  const etfY = new Float32Array(total);
  const mask = new Float32Array(total);
  const spawnIndices: number[] = [];
  const cells: CrystalCell[] = [];
  const strokes: ContourStroke[] = [];

  if (!octx) {
    return {
      w,
      h,
      rgba: new Uint8ClampedArray(total * 4),
      smoothRgba: new Uint8ClampedArray(total * 4),
      lum,
      smoothLum: lum,
      fdog,
      bgProb,
      edge,
      gx,
      gy,
      etfX,
      etfY,
      mask,
      spawnIndices,
      cells,
      strokes,
    };
  }

  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rawRgba = octx.getImageData(0, 0, w, h).data;
  const smoothRgba = new Uint8ClampedArray(rawRgba.length);

  let minL = 1.0;
  let maxL = 0.0;
  const rawLArr = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const l = (0.299 * rawRgba[p] + 0.587 * rawRgba[p + 1] + 0.114 * rawRgba[p + 2]) / 255.0;
    rawLArr[i] = l;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }

  const spanL = Math.max(0.2, maxL - minL);
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = Math.abs(ny) > 0.94 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.94) / 0.06) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.94 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.94) / 0.06) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const normL = clip((rawLArr[i] - minL) / spanL);
      lum[i] = Math.pow(normL, 0.84);
    }
  }

  // Билатеральное сглаживание цветовых плоскостей
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      const centerL = lum[idx];
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

      for (let ky = -2; ky <= 2; ky += 2) {
        const row = (y + ky) * w;
        for (let kx = -2; kx <= 2; kx += 2) {
          const nIdx = row + (x + kx);
          const diffL = Math.abs(lum[nIdx] - centerL);
          const weight = Math.exp(-diffL * 15.0);
          const np = nIdx * 4;
          sumR += rawRgba[np] * weight;
          sumG += rawRgba[np + 1] * weight;
          sumB += rawRgba[np + 2] * weight;
          sumW += weight;
        }
      }
      const p = idx * 4;
      smoothRgba[p] = Math.round(sumR / sumW);
      smoothRgba[p + 1] = Math.round(sumG / sumW);
      smoothRgba[p + 2] = Math.round(sumB / sumW);
      smoothRgba[p + 3] = 255;
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 4);
  const smoothLum = gaussianBlurField(lum, w, h, 12);

  // Оператор Щарра
  const rawGradMag = new Float32Array(total);
  let globalMaxEdge = 1e-5;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx =
        -3 * gNarrow[(y - 1) * w + (x - 1)] + 3 * gNarrow[(y - 1) * w + (x + 1)] +
        -10 * gNarrow[y * w + (x - 1)] + 10 * gNarrow[y * w + (x + 1)] +
        -3 * gNarrow[(y + 1) * w + (x - 1)] + 3 * gNarrow[(y + 1) * w + (x + 1)];

      const sy =
        -3 * gNarrow[(y - 1) * w + (x - 1)] - 10 * gNarrow[(y - 1) * w + x] - 3 * gNarrow[(y - 1) * w + (x + 1)] +
        3 * gNarrow[(y + 1) * w + (x - 1)] + 10 * gNarrow[(y + 1) * w + x] + 3 * gNarrow[(y + 1) * w + (x + 1)];

      const mag = Math.sqrt(sx * sx + sy * sy) * mask[idx];
      rawGradMag[idx] = mag;
      if (mag > globalMaxEdge) globalMaxEdge = mag;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
      etfX[idx] = -sy / norm;
      etfY[idx] = sx / norm;
    }
  }

  // Подавление фонового шума с локальной нормализацией
  const localEnv = gaussianBlurField(rawGradMag, w, h, 6);
  const absFloor = globalMaxEdge * 0.042;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    if (gVal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.18, localEnv[i] * 2.2 + globalMaxEdge * 0.08);
      edge[i] = clip((gVal - absFloor * 0.8) / denom);
    }
    if (edge[i] > 0.12 || (lum[i] > 0.18 && edge[i] > 0.04)) {
      spawnIndices.push(i);
    }
  }

  // Сглаживание поля касательных ETF
  const tempTx = new Float32Array(total);
  const tempTy = new Float32Array(total);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      let sumX = 0, sumY = 0;
      const refX = etfX[idx], refY = etfY[idx];
      for (let ky = -1; ky <= 1; ky++) {
        const row = (y + ky) * w;
        for (let kx = -1; kx <= 1; kx++) {
          const nIdx = row + (x + kx);
          const wgt = edge[nIdx] + 0.02;
          const sign = refX * etfX[nIdx] + refY * etfY[nIdx] >= 0 ? 1 : -1;
          sumX += etfX[nIdx] * wgt * sign;
          sumY += etfY[nIdx] * wgt * sign;
        }
      }
      const len = Math.hypot(sumX, sumY) + 1e-6;
      tempTx[idx] = sumX / len;
      tempTy[idx] = sumY / len;
    }
  }
  etfX.set(tempTx);
  etfY.set(tempTy);

  // ==========================================
  // АНИЗОТРОПНЫЙ ОПЕРАТОР КАНГА (FDoG) — УБИРАЕТ КОal-ПЯТНА И ЗВЕЗДНЫЙ МУСОР НА ФОНЕ!
  // ==========================================
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    // Сила вытягивания контуров пропорциональна реальной грани edge[i]
    // В пустом космосе (где edge[i] == 0) pSharp падает до 0, поэтому звездная пыль НЕ превращается в черные пятна!
    const pAdaptive = 22.0 * smoothstep(0.02, 0.22, edge[i] + localEnv[i] / globalMaxEdge);
    const diff = (1.0 + pAdaptive) * gNarrow[i] - pAdaptive * gWide[i];
    rawDoG[i] = clip(diff * 0.68 + lum[i] * 0.32);
  }

  // Интегрируем rawDoG вдоль линий касательного потока ETF (5 точек вдоль штриха)
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      const tx = etfX[i];
      const ty = etfY[i];
      let acc = rawDoG[i] * 0.36;
      for (let step = 1; step <= 2; step++) {
        const wgt = step === 1 ? 0.22 : 0.10;
        const xPlus = Math.min(w - 1, Math.max(0, Math.round(x + tx * step * 1.4)));
        const yPlus = Math.min(h - 1, Math.max(0, Math.round(y + ty * step * 1.4)));
        const xMinus = Math.min(w - 1, Math.max(0, Math.round(x - tx * step * 1.4)));
        const yMinus = Math.min(h - 1, Math.max(0, Math.round(y - ty * step * 1.4)));
        acc += (rawDoG[yPlus * w + xPlus] + rawDoG[yMinus * w + xMinus]) * wgt;
      }
      fdog[i] = clip(acc);
    }
  }

  // Математическое выделение внешнего фона с морфологическим сглаживанием (без дырявых пятен!)
  let borderL = 0;
  let borderCount = 0;
  for (let x = 0; x < w; x += 4) {
    borderL += smoothLum[x] + smoothLum[(h - 1) * w + x];
    borderCount += 2;
  }
  borderL /= Math.max(1, borderCount);

  const edgeDensity = gaussianBlurField(edge, w, h, 10);
  const rawBg = new Float32Array(total);
  for (let y = 0; y < h; y++) {
    const ny = (y / h) - 0.5;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) - 0.5;
      const i = y * w + x;
      const radialDist = Math.sqrt(nx * nx + ny * ny) * 1.45;
      const lumDiff = Math.abs(smoothLum[i] - borderL);
      rawBg[i] =
        (1.0 - smoothstep(0.05, 0.25, edgeDensity[i])) *
        (1.0 - smoothstep(0.08, 0.28, lumDiff)) *
        smoothstep(0.22, 0.62, radialDist);
    }
  }
  const cleanBg = gaussianBlurField(rawBg, w, h, 8);
  bgProb.set(cleanBg);

  // ==========================================
  // СКЕЛЕТНАЯ ВЕКТОРИЗАЦИЯ КЭННИ С СОХРАНЕНИЕМ УГЛОВ И МЕЛКОГО ШРИФТА
  // ==========================================
  const isRidgeMap = new Uint8Array(total);
  const subOffsetX = new Float32Array(total);
  const subOffsetY = new Float32Array(total);
  const ridgeSeeds: { idx: number; score: number; tier: 1 | 2 }[] = [];

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      if (e0 < 0.055 || mask[i] < 0.05) continue;

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      if (nx === 0 && ny === 0) continue;

      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];

      if (e0 >= ePrev && e0 > eNext) {
        isRidgeMap[i] = 1;
        const denom = 2.0 * (ePrev - 2.0 * e0 + eNext);
        const offset = Math.abs(denom) > 1e-4 ? clip((ePrev - eNext) / denom, -0.45, 0.45) : 0.0;
        subOffsetX[i] = gx[i] * offset;
        subOffsetY[i] = gy[i] * offset;

        const tier: 1 | 2 = e0 > 0.2 ? 1 : 2;
        ridgeSeeds.push({ idx: i, score: e0, tier });
      }
    }
  }

  ridgeSeeds.sort((a, b) => b.score - a.score);

  const DIRS_8: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  const visited = new Uint8Array(total);

  const tracePixelSkeleton = (startIdx: number, dirSign: number, maxLen: number) => {
    const chain: { x: number; y: number }[] = [];
    let currIdx = startIdx;
    let cx = currIdx % w;
    let cy = Math.floor(currIdx / w);

    let prevDx = etfX[currIdx] * dirSign;
    let prevDy = etfY[currIdx] * dirSign;

    for (let step = 0; step < maxLen; step++) {
      visited[currIdx] = 1;
      chain.push({
        x: cx + 0.5 + subOffsetX[currIdx],
        y: cy + 0.5 + subOffsetY[currIdx],
      });

      let bestNextIdx = -1;
      let bestScore = -1.0;
      let bestDx = 0;
      let bestDy = 0;

      for (let d = 0; d < 8; d++) {
        const dx = DIRS_8[d][0];
        const dy = DIRS_8[d][1];
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 2 || nx >= w - 2 || ny < 2 || ny >= h - 2) continue;

        const nIdx = ny * w + nx;
        if (visited[nIdx] || !isRidgeMap[nIdx]) continue;

        const dLen = Math.hypot(dx, dy);
        const ndx = dx / dLen;
        const ndy = dy / dLen;
        const align = ndx * prevDx + ndy * prevDy;

        if (align > 0.22) {
          const score = align * 0.65 + edge[nIdx] * 0.35;
          if (score > bestScore) {
            bestScore = score;
            bestNextIdx = nIdx;
            bestDx = ndx;
            bestDy = ndy;
          }
        }
      }

      if (bestNextIdx === -1) break;
      currIdx = bestNextIdx;
      cx = currIdx % w;
      cy = Math.floor(currIdx / w);
      prevDx = prevDx * 0.35 + bestDx * 0.65;
      prevDy = prevDy * 0.35 + bestDy * 0.65;
      const norm = Math.hypot(prevDx, prevDy) + 1e-6;
      prevDx /= norm;
      prevDy /= norm;
    }

    return chain;
  };

  const bilateralCornerPreservingSmooth = (rawPts: { x: number; y: number }[]) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;
    if (n < 3) return [];

    for (let pass = 0; pass < 2; pass++) {
      const next = curr.map((pt) => ({ x: pt.x, y: pt.y }));
      for (let i = 1; i < n - 1; i++) {
        const vx1 = curr[i].x - curr[i - 1].x;
        const vy1 = curr[i].y - curr[i - 1].y;
        const vx2 = curr[i + 1].x - curr[i].x;
        const vy2 = curr[i + 1].y - curr[i].y;
        const l1 = Math.hypot(vx1, vy1) + 1e-5;
        const l2 = Math.hypot(vx2, vy2) + 1e-5;
        const cosAngle = (vx1 * vx2 + vy1 * vy2) / (l1 * l2);

        if (cosAngle > 0.62) {
          next[i].x = 0.25 * curr[i - 1].x + 0.5 * curr[i].x + 0.25 * curr[i + 1].x;
          next[i].y = 0.25 * curr[i - 1].y + 0.5 * curr[i].y + 0.25 * curr[i + 1].y;
        }
      }
      curr = next;
    }

    const result: { u: number; v: number; nx: number; ny: number }[] = [];
    for (let i = 0; i < n; i++) {
      const pPrev = curr[Math.max(0, i - 1)];
      const pNext = curr[Math.min(n - 1, i + 1)];
      const dx = pNext.x - pPrev.x;
      const dy = pNext.y - pPrev.y;
      const len = Math.hypot(dx, dy) + 1e-6;
      result.push({
        u: curr[i].x / w,
        v: curr[i].y / h,
        nx: -dy / len,
        ny: dx / len,
      });
    }
    return result;
  };

  const maxStrokes = isMobileDevice ? 2400 : 3800;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const back = tracePixelSkeleton(seed.idx, -1, 95).reverse();
    const fwd = tracePixelSkeleton(seed.idx, 1, 95);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < 3) continue;

    const pts = bilateralCornerPreservingSmooth(rawPts);
    if (pts.length < 3) continue;

    let eSum = 0, lSum = 0, rSum = 0, gSum = 0, bSum = 0;
    for (let k = 0; k < pts.length; k++) {
      const pxIdx = Math.min(h - 1, Math.max(0, Math.floor(pts[k].v * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(pts[k].u * w)));
      eSum += edge[pxIdx];
      lSum += lum[pxIdx];
      const p4 = pxIdx * 4;
      rSum += smoothRgba[p4];
      gSum += smoothRgba[p4 + 1];
      bSum += smoothRgba[p4 + 2];
    }

    const n = pts.length;
    const meanEdge = eSum / n;
    const importance = clip(meanEdge * 1.15 + Math.min(0.35, n / 75.0));

    strokes.push({
      pts,
      tier: seed.tier,
      r: Math.round(rSum / n),
      g: Math.round(gSum / n),
      b: Math.round(bSum / n),
      meanEdge,
      meanLum: lSum / n,
      importance,
      phase: (strokes.length * PHI) % (Math.PI * 2),
      speed: 0.65 + ((strokes.length * 7) % 13) * 0.06,
      arcLen: n,
    });
  }

  // Дополнительные вылетающие пряди волос и штриховка объема
  for (let y = 5; y < h - 5; y += 4) {
    for (let x = 5; x < w - 5; x += 4) {
      if (strokes.length >= maxStrokes + 750) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.1 || bgProb[idx] > 0.45) continue;
      if (lum[idx] < 0.48 && edge[idx] > 0.05) {
        const strandPts: { u: number; v: number; nx: number; ny: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        for (let s = 0; s < 14; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          const tx = etfX[cIdx];
          const ty = etfY[cIdx];
          strandPts.push({ u: cx / w, v: cy / h, nx: -ty, ny: tx });
          cx += tx * 1.5;
          cy += ty * 1.5;
        }
        const p4 = idx * 4;
        strokes.push({
          pts: strandPts,
          tier: 3,
          r: smoothRgba[p4],
          g: smoothRgba[p4 + 1],
          b: smoothRgba[p4 + 2],
          meanEdge: edge[idx],
          meanLum: lum[idx],
          importance: clip(edge[idx] * 0.8 + (1.0 - lum[idx]) * 0.35),
          phase: (strokes.length * PHI) % (Math.PI * 2),
          speed: 0.55,
          arcLen: 21,
        });
      }
    }
  }

  strokes.sort((a, b) => {
    const da = Math.hypot(a.pts[0].u - 0.5, a.pts[0].v - 0.45);
    const db = Math.hypot(b.pts[0].u - 0.5, b.pts[0].v - 0.45);
    return (da - db) * 0.5 + (b.importance - a.importance) * 0.5;
  });

  const baseStep = 12;
  for (let y = baseStep; y < h - baseStep; y += baseStep) {
    for (let x = baseStep; x < w - baseStep; x += baseStep) {
      const idx = y * w + x;
      if (mask[idx] < 0.06 || (lum[idx] < 0.05 && edge[idx] < 0.06)) continue;

      if (edge[idx] > 0.22) {
        const sub = 5;
        const offsets = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
        for (const [ox, oy] of offsets) {
          const sx = Math.min(w - 1, Math.max(0, x + ox));
          const sy = Math.min(h - 1, Math.max(0, y + oy));
          const sIdx = sy * w + sx;
          const sp = sIdx * 4;
          cells.push({
            u: sx / w,
            v: sy / h,
            size: sub / w,
            r: smoothRgba[sp],
            g: smoothRgba[sp + 1],
            b: smoothRgba[sp + 2],
            lum: lum[sIdx],
            edge: edge[sIdx],
            tx: etfX[sIdx],
            ty: etfY[sIdx],
          });
        }
      } else {
        const p = idx * 4;
        cells.push({
          u: x / w,
          v: y / h,
          size: baseStep / w,
          r: smoothRgba[p],
          g: smoothRgba[p + 1],
          b: smoothRgba[p + 2],
          lum: lum[idx],
          edge: edge[idx],
          tx: etfX[idx],
          ty: etfY[idx],
        });
      }
    }
  }

  return {
    w,
    h,
    rgba: rawRgba,
    smoothRgba,
    lum,
    smoothLum,
    fdog,
    bgProb,
    edge,
    gx,
    gy,
    etfX,
    etfY,
    mask,
    spawnIndices,
    cells,
    strokes,
  };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("TRACE");
  const [activeTab, setActiveTab] = useState<"STUDIO" | "PHYSICS">("STUDIO");

  const [artConfig, setArtConfig] = useState<ArtStudioConfig>({
    master: "ESQUIRE_67",
    traceVariation: "FDOG_COMIC",
    bgManifold: "SUNBURST",
    posterFrame: true,
    strokeWeight: 1.0,
    inkThreshold: 0.46,
    stippleDensity: 0.48,
    rippleStrength: 0.45,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("SYNTHESIZING MANIFOLD...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);
  const [loadedPage, setLoadedPage] = useState<number>(2);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    art: artConfig,
    topology: "TRACE" as ManifoldTopology,
    matrix: null as MatrixBuffer | null,
    time: 0,
    traceProgress: 0,
    needsSilkReset: true,
    needsIllustrationRebuild: true,
    isPaused: false,
    isMobile: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    smoothYaw: 0,
    smoothPitch: -0.18,
    fluidU: 0.5,
    fluidV: 0.86,
  });

  // 6 мастер-пресетов, каждый из которых переключает и палитру, и математический закон трассировки, и живой фон!
  const applyMasterPreset = (preset: MasterPreset) => {
    let next: ArtStudioConfig = { ...artConfig, master: preset };
    if (preset === "ESQUIRE_67") {
      next = {
        ...next,
        traceVariation: "FDOG_COMIC",
        bgManifold: "SUNBURST",
        strokeWeight: 1.0,
        inkThreshold: 0.46,
        stippleDensity: 0.48,
        rippleStrength: 0.48,
      };
    } else if (preset === "MADCAP_STENCIL") {
      next = {
        ...next,
        traceVariation: "FDOG_COMIC",
        bgManifold: "CLEAN_SOLID",
        strokeWeight: 1.15,
        inkThreshold: 0.52,
        stippleDensity: 0.22,
        rippleStrength: 0.0,
      };
    } else if (preset === "ASTRAL_NEON") {
      next = {
        ...next,
        traceVariation: "ASTRAL_VECTOR",
        bgManifold: "SACRED_RINGS",
        strokeWeight: 0.9,
        inkThreshold: 0.38,
        stippleDensity: 0.15,
        rippleStrength: 0.25,
      };
    } else if (preset === "GUILLOCHE_LUX") {
      next = {
        ...next,
        traceVariation: "GUILLOCHE",
        bgManifold: "SACRED_RINGS",
        strokeWeight: 0.95,
        inkThreshold: 0.44,
        stippleDensity: 0.3,
        rippleStrength: 0.2,
      };
    } else if (preset === "SIN_CITY") {
      next = {
        ...next,
        traceVariation: "WOODCUT",
        bgManifold: "LIQUID_AURA",
        strokeWeight: 1.05,
        inkThreshold: 0.55,
        stippleDensity: 0.65,
        rippleStrength: 0.15,
      };
    } else if (preset === "BLUEPRINT") {
      next = {
        ...next,
        traceVariation: "ASTRAL_VECTOR",
        bgManifold: "SACRED_RINGS",
        strokeWeight: 0.8,
        inkThreshold: 0.42,
        stippleDensity: 0.2,
        rippleStrength: 0.0,
      };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsIllustrationRebuild = true;
    stateRef.current.traceProgress = 0;
    if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING ANISOTROPIC FDoG & SPLINES [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMob = typeof window !== "undefined" && window.innerWidth < 768;
      stateRef.current.isMobile = isMob;
      const buf = buildMatrixFromImage(img, isMob);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      stateRef.current.needsIllustrationRebuild = true;
      setFieldStatus(
        "LOCKED // FDoG + " + String(buf.strokes.length) + " KINETIC SPLINES (" + String(buf.w) + "x" + String(buf.h) + ")"
      );
    };
    img.onerror = () => {
      setFieldStatus("TARGET BLOCKED // TRY NEXT MATRIX");
    };
    img.src = rawUrl.startsWith("data:") ? rawUrl : "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  const handleRemoveBrokenUrl = useCallback((brokenUrl: string) => {
    setCandidateUrls((prev) => prev.filter((u) => u !== brokenUrl));
  }, []);

  useEffect(() => {
    const cleanQ = (query || "SHINE ON CRAZY DIAMOND").trim();
    const next = compileLexicalManifold(cleanQ);
    setTensor(next.tensor);
    setCoeffs(next.coeffs);
    stateRef.current.tensor = next.tensor;
    stateRef.current.coeffs = next.coeffs;
    stateRef.current.matrix = null;
    stateRef.current.traceProgress = 0;
    setLoadedPage(2);

    let cancelled = false;
    setFieldStatus("SCANNING WIDE VISUAL SPECTRUM...");

    Promise.all([
      fetch("/api/search?page=1&query=" + encodeURIComponent(cleanQ)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/search?page=2&query=" + encodeURIComponent(cleanQ)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([d1, d2]) => {
      if (cancelled) return;
      const a1 = d1 ? (Array.isArray(d1) ? d1 : d1.data || d1.photos || []) : [];
      const a2 = d2 ? (Array.isArray(d2) ? d2 : d2.data || d2.photos || []) : [];
      const combined = [...a1, ...a2];

      const uniqueUrls: string[] = [];
      const seen = new Set<string>();
      for (const item of combined) {
        const u = item.src || item.image_url || item.thumb;
        if (typeof u === "string" && u.startsWith("http") && !seen.has(u)) {
          seen.add(u);
          uniqueUrls.push(u);
        }
      }

      if (uniqueUrls.length > 0) {
        setCandidateUrls(uniqueUrls);
        setCandidateIdx(0);
        loadMatrixFromUrl(uniqueUrls[0], 0, uniqueUrls.length);
      } else {
        setFieldStatus("NO EXTERNAL TARGET // PARAMETRIC SYNTH");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query, loadMatrixFromUrl]);

  const handleLoadMoreMatrices = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = loadedPage + 1;
    const cleanQ = (query || "SHINE ON CRAZY DIAMOND").trim();
    try {
      const res = await fetch("/api/search?page=" + String(nextPage) + "&query=" + encodeURIComponent(cleanQ));
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.data || data.photos || []);
        const newUrls = arr
          .map((item: any) => item.src || item.image_url || item.thumb)
          .filter((u: any) => typeof u === "string" && u.startsWith("http"));

        setCandidateUrls((prev) => {
          const set = new Set(prev);
          const merged = [...prev];
          for (const u of newUrls) {
            if (!set.has(u)) {
              set.add(u);
              merged.push(u);
            }
          }
          return merged;
        });
        setLoadedPage(nextPage);
      }
    } catch {}
    setLoadingMore(false);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        setCandidateUrls((prev) => {
          const updated = [dataUrl, ...prev];
          setCandidateIdx(0);
          loadMatrixFromUrl(dataUrl, 0, updated.length);
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    stateRef.current.tensor = tensor;
    stateRef.current.coeffs = coeffs;
    stateRef.current.art = artConfig;
    stateRef.current.topology = topology;
    stateRef.current.isPaused = isPaused;
    stateRef.current.needsIllustrationRebuild = true;
  }, [tensor, coeffs, artConfig, topology, isPaused]);

  const handleAxisChange = (axis: keyof Tensor5D, value: number) => {
    setTensor((prev) => {
      const updated = { ...prev, [axis]: value };
      stateRef.current.tensor = updated;
      stateRef.current.needsIllustrationRebuild = true;
      return updated;
    });
  };

  const updateArt = <K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsIllustrationRebuild = true;
      if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
      return next;
    });
  };

  const triggerPhaseShift = useCallback(() => {
    stateRef.current.time += PHI;
    if (candidateUrls.length > 1) {
      const nextIdx = (candidateIdx + 1) % candidateUrls.length;
      setCandidateIdx(nextIdx);
      loadMatrixFromUrl(candidateUrls[nextIdx], nextIdx, candidateUrls.length);
    }
  }, [candidateUrls, candidateIdx, loadMatrixFromUrl]);

  const triggerRedrawContours = useCallback(() => {
    stateRef.current.traceProgress = 0;
    stateRef.current.needsSilkReset = true;
  }, []);

  const handlePointerMove = (clientX: number, clientY: number, rect: DOMRect) => {
    stateRef.current.mouseX = clientX - rect.left;
    stateRef.current.mouseY = clientY - rect.top;
    stateRef.current.mouseActive = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget.getBoundingClientRect());
    }
  };

  const handleMouseLeave = () => {
    stateRef.current.mouseActive = false;
  };

  // ==========================================
  // ЯДРО РЕНДЕРИНГА BARRETT 9.0 (4 ТРАССИРОВЩИКА + ЖИВОЙ ФОН + FDoG БЕЗ ПЯТЕН)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let viewW = 900;
    let viewH = 680;

    // Буфер объекта с прозрачным фоном (чтобы позади объекта вращались живые математические лучи!)
    const subjectCanvas = document.createElement("canvas");
    const subjectCtx = subjectCanvas.getContext("2d");

    const shaderCanvas = document.createElement("canvas");
    const shaderCtx = shaderCanvas.getContext("2d");

    const silkParticles: SilkParticle[] = [];
    for (let i = 0; i < SILK_COUNT; i++) {
      silkParticles.push({ x: 0.5, y: 0.5, x0: 0.5, y0: 0.5, age: 0, maxAge: 90, dir: i % 2 === 0 ? 1 : -1 });
    }

    const resetSilkParticles = (m: MatrixBuffer | null) => {
      for (let i = 0; i < SILK_COUNT; i++) {
        if (m && m.spawnIndices.length > 0) {
          const pick = m.spawnIndices[Math.floor(((i * PHI) % 1) * m.spawnIndices.length)];
          const u = (pick % m.w) / m.w;
          const v = Math.floor(pick / m.w) / m.h;
          silkParticles[i] = {
            x: u,
            y: v,
            x0: u,
            y0: v,
            age: Math.floor(Math.random() * 65),
            maxAge: 65 + Math.floor(Math.random() * 75),
            dir: i % 2 === 0 ? 1 : -1,
          };
        } else {
          const u = Math.random();
          const v = Math.random();
          silkParticles[i] = { x: u, y: v, x0: u, y0: v, age: 0, maxAge: 90, dir: 1 };
        }
      }
    };

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return;
      viewW = Math.floor(rect.width);
      viewH = Math.floor(rect.height);
      const isMob = window.innerWidth < 768;
      stateRef.current.isMobile = isMob;
      const dpr = Math.min(window.devicePixelRatio || 1, isMob ? 1.5 : 2.0);
      if (canvas.width !== Math.floor(viewW * dpr) || canvas.height !== Math.floor(viewH * dpr)) {
        canvas.width = Math.floor(viewW * dpr);
        canvas.height = Math.floor(viewH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(container);
    updateSize();

    const strokeTaperedSpline = (
      coords: { x: number; y: number }[],
      maxW: number,
      strokeStyle: string
    ) => {
      const len = coords.length;
      if (len < 2) return;
      ctx.strokeStyle = strokeStyle;

      if (len <= 4) {
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        for (let i = 1; i < len; i++) ctx.lineTo(coords[i].x, coords[i].y);
        ctx.lineWidth = maxW * 0.75;
        ctx.stroke();
        return;
      }

      const p1 = Math.floor(len * 0.25);
      const p2 = Math.floor(len * 0.72);

      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i <= p1; i++) ctx.lineTo(coords[i].x, coords[i].y);
      ctx.lineWidth = maxW * 0.65;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(coords[p1].x, coords[p1].y);
      for (let i = p1 + 1; i <= p2; i++) ctx.lineTo(coords[i].x, coords[i].y);
      ctx.lineWidth = maxW;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(coords[p2].x, coords[p2].y);
      for (let i = p2 + 1; i < len; i++) ctx.lineTo(coords[i].x, coords[i].y);
      ctx.lineWidth = maxW * 0.38;
      ctx.stroke();
    };

    // ==========================================
    // СБОРКА ЧИСТОГО СЛОЯ СУБЪЕКТА (БЕЗ ЧЕРНЫХ ПЯТЕН НА ФОНЕ!)
    // ==========================================
    const rebuildSubjectLayer = (m: MatrixBuffer, art: ArtStudioConfig, t: Tensor5D) => {
      if (!subjectCtx) return;
      subjectCanvas.width = m.w;
      subjectCanvas.height = m.h;
      const imgData = subjectCtx.createImageData(m.w, m.h);
      const dst = imgData.data;
      const sRgba = m.smoothRgba;

      const inkCutoff = art.inkThreshold;
      const phiSharp = 14.0;

      for (let y = 0; y < m.h; y++) {
        const v = y / m.h;
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const u = x / m.w;
          const p = i * 4;
          const l = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];
          const bgW = m.bgProb[i];

          // ГЛАВНОЕ ИСПРАВЛЕНИЕ ПЯТЕН:
          // На внешнем фоне (bgW > 0.35) мы полностью выключаем черную тушь, если там нет реальной сильной грани!
          const rawInk = fd >= inkCutoff ? 1.0 : clip(1.0 + Math.tanh(phiSharp * (fd - inkCutoff)), 0.0, 1.0);
          const bgCleanShield = smoothstep(0.25, 0.65, bgW) * (1.0 - smoothstep(0.15, 0.45, e));
          let inkTone = rawInk * (1.0 - bgCleanShield) + 1.0 * bgCleanShield;

          // Регулярный тригонометрический поп-арт растр (Halftone Lattice вместо случайной грязи!)
          if (art.stippleDensity > 0.02 && l > 0.16 && l < 0.68 && bgW < 0.35) {
            const screenGrid = 0.5 + 0.5 * Math.sin((x * 0.95 + y * 0.95)) * Math.cos((x * 0.95 - y * 0.95));
            const midShadow = 1.0 - (l - 0.16) / 0.52;
            if (screenGrid < midShadow * art.stippleDensity * 0.88) {
              inkTone *= 0.16;
            }
          }

          let outR = 0, outG = 0, outB = 0;
          let outAlpha = 255;

          if (art.master === "ESQUIRE_67") {
            const quantL = Math.floor(l * 4.5) / 4.0;
            let subjR = sRgba[p];
            let subjG = sRgba[p + 1];
            let subjB = sRgba[p + 2];

            const satCheck = Math.max(subjR, subjG, subjB) - Math.min(subjR, subjG, subjB);
            if (l > 0.68) {
              subjR = Math.round(240 + (l - 0.68) * 45);
              subjG = Math.round(226 + (l - 0.68) * 55);
              subjB = Math.round(214 + (l - 0.68) * 60);
            } else if (satCheck < 28) {
              subjR = Math.round(150 + quantL * 100);
              subjG = Math.round(98 + quantL * 110);
              subjB = Math.round(82 + quantL * 95);
            } else {
              const avg = (subjR + subjG + subjB) * 0.333;
              subjR = clip(Math.round(avg + (subjR - avg) * 1.7), 15, 255);
              subjG = clip(Math.round(avg + (subjG - avg) * 1.7), 15, 255);
              subjB = clip(Math.round(avg + (subjB - avg) * 1.7), 15, 255);
            }

            outR = subjR * inkTone + 10 * (1.0 - inkTone);
            outG = subjG * inkTone + 7 * (1.0 - inkTone);
            outB = subjB * inkTone + 8 * (1.0 - inkTone);
            // Прозрачность для фона, чтобы позади фигуры светилось живое солнце Sunburst!
            outAlpha = Math.round((1.0 - bgCleanShield * 0.92) * vMask * 255);
          } else if (art.master === "MADCAP_STENCIL") {
            const canvasGrain = (Math.sin(x * 0.8) * Math.cos(y * 0.3)) * 3.5;
            if (bgCleanShield > 0.5) {
              outR = 158 + canvasGrain;
              outG = 163 + canvasGrain;
              outB = 157 + canvasGrain;
              outAlpha = Math.round((1.0 - bgCleanShield * 0.7) * vMask * 255);
            } else if (inkTone < 0.38 || l < inkCutoff * 0.68) {
              outR = 13;
              outG = 10;
              outB = 9;
            } else if (l < inkCutoff * 1.08 || inkTone < 0.78) {
              outR = 120 + canvasGrain;
              outG = 128 + canvasGrain;
              outB = 126 + canvasGrain;
            } else {
              outR = 237 + canvasGrain * 0.5;
              outG = 230 + canvasGrain * 0.5;
              outB = 214 + canvasGrain * 0.5;
            }
          } else if (art.master === "SIN_CITY") {
            if (inkTone < 0.45 || l < inkCutoff * 0.72) {
              outR = 6;
              outG = 5;
              outB = 8;
            } else if (e > 0.28 && l > 0.35 && l < 0.75) {
              outR = 238;
              outG = 22;
              outB = 35;
            } else {
              const paperWhite = l > 0.55 ? 245 : 175;
              outR = paperWhite * inkTone;
              outG = paperWhite * inkTone;
              outB = paperWhite * inkTone;
            }
            outAlpha = Math.round((1.0 - bgCleanShield * 0.85) * vMask * 255);
          } else if (art.master === "GUILLOCHE_LUX") {
            const goldL = smoothstep(0.15, 0.85, l) * inkTone;
            outR = 12 + goldL * 243;
            outG = 9 + goldL * 192;
            outB = 6 + Math.pow(goldL, 2.2) * 115;
            outAlpha = Math.round((1.0 - bgCleanShield * 0.85) * vMask * 255);
          } else if (art.master === "BLUEPRINT") {
            const lineVal = (1.0 - inkTone) * 0.85 + e * 0.65;
            outR = 8 + lineVal * 195;
            outG = 24 + lineVal * 225;
            outB = 52 + lineVal * 203;
            outAlpha = Math.round((1.0 - bgCleanShield * 0.8) * vMask * 255);
          } else {
            const phase = (t.tone + u * 0.35 + v * 0.45 + l * 0.6) * Math.PI * 2.0;
            const cR = 165 + 90 * Math.cos(phase);
            const cG = 45 + 140 * Math.cos(phase - 2.094);
            const cB = 215 + 40 * Math.cos(phase + 2.094);
            outR = (sRgba[p] * 0.5 + cR * 0.5) * inkTone;
            outG = (sRgba[p + 1] * 0.5 + cG * 0.5) * inkTone;
            outB = (sRgba[p + 2] * 0.5 + cB * 0.5) * inkTone;
            outAlpha = Math.round((1.0 - bgCleanShield * 0.85) * vMask * 255);
          }

          dst[p] = Math.min(255, Math.max(0, Math.round(outR)));
          dst[p + 1] = Math.min(255, Math.max(0, Math.round(outG)));
          dst[p + 2] = Math.min(255, Math.max(0, Math.round(outB)));
          dst[p + 3] = outAlpha;
        }
      }

      subjectCtx.putImageData(imgData, 0, 0);
    };

    // Отрисовка ЖИВОГО МАТЕМАТИЧЕСКОГО ФОНА (60 FPS) позади объекта!
    const renderLivingBackground = (
      ox: number,
      oy: number,
      drawW: number,
      drawH: number,
      art: ArtStudioConfig,
      t: Tensor5D,
      time: number
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, drawW, drawH);
      ctx.clip();

      const cx = ox + drawW * 0.5;
      const cy = oy + drawH * 0.44;
      const maxR = Math.hypot(drawW, drawH) * 0.75;

      if (art.master === "ESQUIRE_67") {
        // Чистейший психоделический закат Esquire '67 (Огненно-оранжевый -> Солнечно-желтый)
        const bgGrad = ctx.createLinearGradient(ox, oy, ox, oy + drawH);
        bgGrad.addColorStop(0, "#ff4d00");
        bgGrad.addColorStop(0.55, "#ff9900");
        bgGrad.addColorStop(1, "#ffe600");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(ox, oy, drawW, drawH);
      } else if (art.master === "MADCAP_STENCIL") {
        ctx.fillStyle = "#9ea39d";
        ctx.fillRect(ox, oy, drawW, drawH);
      } else if (art.master === "BLUEPRINT") {
        ctx.fillStyle = "#06152d";
        ctx.fillRect(ox, oy, drawW, drawH);
      } else {
        ctx.fillStyle = "#050308";
        ctx.fillRect(ox, oy, drawW, drawH);
      }

      // 1. ЖИВЫЕ ЛУЧИ SUNBURST (Вращающееся геометрическое гало)
      if (art.bgManifold === "SUNBURST") {
        const numRays = Math.floor(16 + t.symmetry * 24);
        const rot = time * 0.15;
        ctx.fillStyle =
          art.master === "ESQUIRE_67"
            ? "rgba(255, 235, 90, 0.22)"
            : art.master === "MADCAP_STENCIL"
            ? "rgba(237, 230, 214, 0.16)"
            : "rgba(168, 85, 247, 0.12)";

        for (let i = 0; i < numRays; i++) {
          const a0 = rot + (i * Math.PI * 2) / numRays;
          const a1 = a0 + (Math.PI / numRays) * 0.9;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, maxR, a0, a1);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 2. САКРАЛЬНЫЕ КОЛЬЦА ЗОЛОТОГО СЕЧЕНИЯ И АСТРОЛЯБИЯ (SACRED_RINGS)
      else if (art.bgManifold === "SACRED_RINGS") {
        ctx.strokeStyle =
          art.master === "BLUEPRINT"
            ? "rgba(56, 189, 248, 0.22)"
            : art.master === "ESQUIRE_67"
            ? "rgba(15, 10, 8, 0.18)"
            : "rgba(245, 158, 11, 0.2)";
        ctx.lineWidth = 1.0;

        for (let rIdx = 1; rIdx <= 8; rIdx++) {
          const rad = (rIdx / 8) * maxR * 0.85;
          ctx.setLineDash(rIdx % 2 === 0 ? [6, 8] : []);
          ctx.lineDashOffset = (rIdx % 2 === 0 ? 1 : -1) * time * 18.0;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // 3. ЖИДКАЯ ГАРМОНИЧЕСКАЯ АУРА (LIQUID_AURA)
      else if (art.bgManifold === "LIQUID_AURA") {
        ctx.strokeStyle =
          art.master === "SIN_CITY"
            ? "rgba(239, 68, 68, 0.18)"
            : "rgba(192, 38, 211, 0.18)";
        ctx.lineWidth = 1.4;
        for (let wIdx = 0; wIdx < 18; wIdx++) {
          const baseY = oy + (wIdx / 17) * drawH;
          ctx.beginPath();
          for (let sx = 0; sx <= 60; sx++) {
            const u = sx / 60;
            const wy = baseY + Math.sin(u * 8.0 + time * 1.8 + wIdx * 0.5) * 16.0 * t.chaos;
            if (sx === 0) ctx.moveTo(ox + u * drawW, wy);
            else ctx.lineTo(ox + u * drawW, wy);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const art = s.art;
      const m = s.matrix;

      const outerBg =
        art.master === "MADCAP_STENCIL"
          ? "#1c1e1c"
          : art.master === "BLUEPRINT"
          ? "#030b18"
          : "#040206";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0075 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsIllustrationRebuild) {
        rebuildSubjectLayer(m, art, t);
        s.needsIllustrationRebuild = false;
      }

      if (m && s.needsSilkReset) {
        resetSilkParticles(m);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = outerBg;
        ctx.fillRect(0, 0, viewW, viewH);
        s.needsSilkReset = false;
      }

      if (s.topology === "SILK" && m) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(4, 2, 6, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = outerBg;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = "screen";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 42; l++) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 145, 35, 0.45)";
          ctx.lineWidth = 1.2 * art.strokeWeight;
          for (let st = 0; st <= 180; st++) {
            const ang = (st / 180) * Math.PI * 2;
            const rMod =
              rad *
              (0.65 +
                0.3 * Math.sin(ang * c.nHarmonic + time + l * 0.12) * Math.cos(ang * c.mHarmonic - time * PHI));
            const px = cx + Math.cos(ang) * rMod;
            const py = cy + Math.sin(ang) * rMod;
            if (st === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        animId = requestAnimationFrame(render);
        return;
      }

      const pad = 24;
      const availW = viewW - pad * 2;
      const availH = viewH - 126;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.41;

      const mNormX = (s.mouseX - ox) / Math.max(1, drawW);
      const mNormY = (s.mouseY - oy) / Math.max(1, drawH);

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.52 + Math.sin(time * 0.4) * 0.08;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.87;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      // ==========================================
      // РЕЖИМ 1: TRACE 9.0 (4 ВАРИАТИВНЫХ ТРАССИРОВЩИКА + ЖИВОЙ ФОН + ВОДНАЯ ГЛАДЬ)
      // ==========================================
      if (s.topology === "TRACE") {
        const prog = s.traceProgress;
        const baseReveal = smoothstep(0.0, 0.45, prog);

        // 1. Рендерим живой математический фон позади объекта
        renderLivingBackground(ox, oy, drawW, drawH, art, t, time);

        // 2. В режимах FDOG_COMIC, GUILLOCHE и WOODCUT накладываем чистый тональный слой субъекта
        const underlayWeight =
          art.traceVariation === "ASTRAL_VECTOR"
            ? 0.22
            : art.traceVariation === "GUILLOCHE"
            ? 0.55
            : 0.96;

        if (art.rippleStrength > 0.02 && shaderCtx) {
          if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
            shaderCanvas.width = m.w;
            shaderCanvas.height = m.h;
          }
          shaderCtx.clearRect(0, 0, m.w, m.h);
          shaderCtx.drawImage(subjectCanvas, 0, 0);

          const baseData = shaderCtx.getImageData(0, 0, m.w, m.h);
          const outData = shaderCtx.createImageData(m.w, m.h);
          const srcPx = baseData.data;
          const dstPx = outData.data;

          const dropU = s.fluidU;
          const dropV = s.fluidV;
          const waterLineV = 0.83;

          for (let y = 0; y < m.h; y++) {
            const v = y / m.h;
            for (let x = 0; x < m.w; x++) {
              const u = x / m.w;
              let sx = x;
              let sy = y;
              let specBoost = 0;

              if (v > waterLineV && !s.mouseActive) {
                const depthV = (v - waterLineV) / (1.0 - waterLineV);
                const du = u - dropU;
                const dv = (v - dropV) * 3.4;
                const rWave = Math.sqrt(du * du + dv * dv);
                const ripple =
                  Math.sin(rWave * 58.0 - time * 6.5) *
                  Math.exp(-rWave * 4.5) *
                  art.rippleStrength *
                  depthV;

                sx = clip(x + ripple * m.w * 0.14, 0, m.w - 1);
                sy = clip(y + ripple * m.h * 0.08, 0, m.h - 1);
                if (ripple > 0.012) specBoost = ripple * 1800.0;
              } else if (s.mouseActive) {
                const du = u - dropU;
                const dv = v - dropV;
                const rWave = Math.sqrt(du * du + dv * dv);
                if (rWave < 0.28) {
                  const ripple =
                    Math.sin(rWave * 52.0 - time * 7.0) *
                    Math.exp(-rWave * 9.5) *
                    art.rippleStrength *
                    0.045;
                  sx = clip(x + (du / (rWave + 0.01)) * ripple * m.w, 0, m.w - 1);
                  sy = clip(y + (dv / (rWave + 0.01)) * ripple * m.h, 0, m.h - 1);
                  if (ripple > 0.008) specBoost = ripple * 2200.0;
                }
              }

              const sIdx = (Math.floor(sy) * m.w + Math.floor(sx)) * 4;
              const dIdx = (y * m.w + x) * 4;
              dstPx[dIdx] = Math.min(255, srcPx[sIdx] + specBoost);
              dstPx[dIdx + 1] = Math.min(255, srcPx[sIdx + 1] + specBoost);
              dstPx[dIdx + 2] = Math.min(255, srcPx[sIdx + 2] + specBoost);
              dstPx[dIdx + 3] = srcPx[sIdx + 3];
            }
          }
          shaderCtx.putImageData(outData, 0, 0);
          ctx.globalAlpha = baseReveal * underlayWeight;
          ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        } else {
          ctx.globalAlpha = baseReveal * underlayWeight;
          ctx.drawImage(subjectCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        // ==========================================
        // 3. ЧЕТЫРЕ МАТЕМАТИЧЕСКИХ ПАРАДИГМЫ ВЕКТОРНОЙ ТРАССИРОВКИ:
        // ==========================================
        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(110, Math.floor(totalStrokes * 0.25));
        const headFloat = prog * (totalStrokes + windowSpan);
        const waveSpeed = time * (1.8 + t.energy * 2.2);
        const breezeAmp = t.chaos * 1.5 * (1.05 - t.structure * 0.85);

        const isDarkInk =
          art.traceVariation === "FDOG_COMIC" ||
          art.traceVariation === "WOODCUT";

        ctx.globalCompositeOperation = isDarkInk ? "source-over" : "screen";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          const pts = st.pts;
          const nPts = pts.length;

          const rawLocal = prog >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.02) continue;

          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;

          const isHairStrand = st.tier === 3 || st.arcLen > 24;
          const strandMove = isHairStrand ? 1.0 : 0.12;

          // ВАРИАЦИЯ 1: GUILLOCHE (Частотно-модулированный спирограф вдоль контуров!)
          if (art.traceVariation === "GUILLOCHE") {
            ctx.beginPath();
            const guillocheFreq = 1.2 + t.chaos * 2.5;
            const guillocheAmp = (1.5 + st.meanEdge * 4.2) * art.strokeWeight;

            for (let k = 0; k <= fullIdx && k < nPts; k++) {
              const pt = pts[k];
              const sNorm = k / Math.max(1, nPts - 1);
              const env = Math.sin(sNorm * Math.PI);
              const spiro = Math.sin(k * guillocheFreq - waveSpeed * 1.6 + st.phase) * guillocheAmp * env;
              const sx = ox + pt.u * drawW + pt.nx * spiro;
              const sy = oy + pt.v * drawH + pt.ny * spiro;
              if (k === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            const gAlpha = clip((0.35 + st.meanEdge * 0.55) * localProg, 0.15, 0.9);
            ctx.strokeStyle =
              art.master === "GUILLOCHE_LUX" || art.master === "ESQUIRE_67"
                ? "rgba(255, 220, 110, " + String(gAlpha.toFixed(2)) + ")"
                : "rgba(" + String(Math.min(255, st.r + 70)) + "," + String(Math.min(255, st.g + 70)) + "," + String(Math.min(255, st.b + 90)) + "," + String(gAlpha.toFixed(2)) + ")";
            ctx.lineWidth = 0.75 * art.strokeWeight;
            ctx.stroke();
            continue;
          }

          // Собираем базовую геометрию сплайна с живым дыханием на ветру
          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const tipFreedom = isHairStrand ? sNorm * sNorm : Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 3.5 + pt.v * 3.5) * Math.PI + waveSpeed + st.phase * 0.2;
            const dxWave = Math.sin(spatialPhase) * tipFreedom * breezeAmp * strandMove;
            const dyWave = Math.cos(spatialPhase * 0.9) * tipFreedom * breezeAmp * strandMove;

            coords.push({
              x: ox + pt.u * drawW + dxWave,
              y: oy + pt.v * drawH + dyWave,
            });
          }

          if (fullIdx < nPts - 1 && frac > 0.001) {
            const pA = pts[fullIdx];
            const pB = pts[fullIdx + 1];
            coords.push({
              x: ox + (pA.u + (pB.u - pA.u) * frac) * drawW,
              y: oy + (pA.v + (pB.v - pA.v) * frac) * drawH,
            });
          }

          if (coords.length < 2) continue;

          // ВАРИАЦИЯ 2: WOODCUT (Академическая перекрестная гравюра Дюрера / Шиле)
          if (art.traceVariation === "WOODCUT") {
            const wAlpha = clip((0.5 + st.meanEdge * 0.45) * localProg, 0.2, 0.95);
            const woodColor =
              art.master === "SIN_CITY" && st.meanEdge > 0.35
                ? "rgba(239, 68, 68, " + String(wAlpha.toFixed(2)) + ")"
                : "rgba(10, 8, 9, " + String(wAlpha.toFixed(2)) + ")";

            strokeTaperedSpline(coords, (0.85 + st.meanEdge * 0.9) * art.strokeWeight, woodColor);

            // Перекрестные насечки резцом (cross-hatching)
            if (st.tier <= 2 && coords.length >= 5) {
              const hatchLen = (3.2 + (1.0 - st.meanLum) * 5.0) * art.strokeWeight;
              ctx.beginPath();
              for (let k = 1; k < coords.length - 1; k += 3) {
                const pt = pts[k];
                const rotAng = 0.785 + Math.sin(time * 2.0 + k) * 0.08;
                const cA = Math.cos(rotAng), sA = Math.sin(rotAng);
                const hx = (pt.nx * cA - pt.ny * sA) * hatchLen;
                const hy = (pt.nx * sA + pt.ny * cA) * hatchLen;
                ctx.moveTo(coords[k].x - hx, coords[k].y - hy);
                ctx.lineTo(coords[k].x + hx, coords[k].y + hy);
              }
              ctx.strokeStyle = woodColor;
              ctx.lineWidth = 0.55 * art.strokeWeight;
              ctx.stroke();
            }
            continue;
          }

          // ВАРИАЦИЯ 3: ASTRAL_VECTOR (Чистый неоново-спектральный вектор с бегущими кометами)
          if (art.traceVariation === "ASTRAL_VECTOR") {
            const vAlpha = clip((0.35 + st.meanEdge * 0.6) * localProg, 0.15, 0.95);
            const rV = Math.min(255, st.r + 65);
            const gV = Math.min(255, st.g + 65);
            const bV = Math.min(255, st.b + 85);
            const vecColor =
              art.master === "BLUEPRINT"
                ? "rgba(125, 211, 252, " + String(vAlpha.toFixed(2)) + ")"
                : "rgba(" + String(rV) + "," + String(gV) + "," + String(bV) + "," + String(vAlpha.toFixed(2)) + ")";

            strokeTaperedSpline(coords, (0.75 + st.meanEdge * 0.85) * art.strokeWeight, vecColor);

            // Живая комета света, бегущая по контуру
            if (coords.length >= 7) {
              const span = Math.max(3, Math.floor(coords.length * 0.3));
              const pos = ((time * st.speed * 0.9 + st.phase) % 1.4) - 0.2;
              const hIdx = Math.min(coords.length - 1, Math.floor(pos * coords.length));
              const tIdx = Math.max(0, hIdx - span);
              if (hIdx - tIdx >= 2) {
                strokeTaperedSpline(
                  coords.slice(tIdx, hIdx + 1),
                  (1.2 + st.meanEdge) * art.strokeWeight,
                  "rgba(255, 255, 255, 0.88)"
                );
              }
            }
            continue;
          }

          // ВАРИАЦИЯ 4: FDOG_COMIC (Каллиграфическая тушь поверх чистого постера Сида Барретта)
          const maxW = (st.tier === 1 ? (1.3 + st.meanEdge * 1.1) : st.tier === 2 ? 0.9 : 1.1) * art.strokeWeight;
          const alpha = clip((0.55 + st.meanEdge * 0.45) * localProg, 0.2, 0.96);
          const inkColor = "rgba(8, 6, 7, " + String(alpha.toFixed(2)) + ")";

          strokeTaperedSpline(coords, maxW, inkColor);

          // Бегущий золотой блик по прядям волос и главным граням!
          if (st.tier === 1 && coords.length >= 8 && prog >= 0.85 && i % 3 === 0) {
            const span = Math.max(3, Math.floor(coords.length * 0.28));
            const pos = ((time * st.speed * 0.65 + st.phase) % 1.5) - 0.25;
            const hIdx = Math.min(coords.length - 1, Math.floor(pos * coords.length));
            const tIdx = Math.max(0, hIdx - span);
            if (hIdx - tIdx >= 2) {
              const hiStyle =
                art.master === "ESQUIRE_67"
                  ? "rgba(255, 235, 140, 0.65)"
                  : "rgba(237, 230, 214, 0.65)";
              strokeTaperedSpline(coords.slice(tIdx, hIdx + 1), maxW * 0.5, hiStyle);
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS (ЛАМИНАРНЫЙ ХРОМ + FDoG СУБЪЕКТ)
      // ==========================================
      else if (s.topology === "CURRENTS" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        shaderCtx.clearRect(0, 0, m.w, m.h);
        shaderCtx.drawImage(subjectCanvas, 0, 0);
        const illData = shaderCtx.getImageData(0, 0, m.w, m.h).data;

        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;

        const wu = s.fluidU;
        const wv = s.fluidV;
        const silkFreq = 16.0 + t.symmetry * 22.0;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const p = baseIdx * 4;
            const bgW = m.bgProb[baseIdx];
            const smL = m.smoothLum[baseIdx];
            const e = m.edge[baseIdx];

            const du = u - wu;
            const dv = v - wv;
            const rDist = Math.sqrt(du * du + dv * dv);
            const wake = Math.sin(rDist * 32.0 - time * 4.5) * Math.exp(-rDist * 4.5) * t.chaos * 0.25;

            const psi = (v * 0.8 - u * 0.4 + wake) * silkFreq + smL * 2.8 - time * (0.9 + t.energy * 1.2);
            const sinPsi = Math.sin(psi * Math.PI * 2.0);
            const chromeSpec = Math.pow(Math.max(0.0, sinPsi), 5.0) * (0.35 + bgW * 0.65);

            const phase = (t.tone + smL * 0.5 + sinPsi * 0.25) * Math.PI * 2.0;
            const ribR = 175 + 80 * Math.cos(phase);
            const ribG = 45 + 140 * Math.cos(phase - 2.094);
            const ribB = 220 + 35 * Math.cos(phase + 2.094);

            const keepPortrait = clip((1.0 - bgW * 0.75) * t.structure + e * 0.6, 0.25, 0.95);
            const rOut = illData[p] * keepPortrait + ribR * (1.0 - keepPortrait) + chromeSpec * 210.0;
            const gOut = illData[p + 1] * keepPortrait + ribG * (1.0 - keepPortrait) + chromeSpec * 220.0;
            const bOut = illData[p + 2] * keepPortrait + ribB * (1.0 - keepPortrait) + chromeSpec * 245.0;

            dst[p] = Math.min(255, Math.max(0, Math.round(rOut * vMask)));
            dst[p + 1] = Math.min(255, Math.max(0, Math.round(gOut * vMask)));
            dst[p + 2] = Math.min(255, Math.max(0, Math.round(bOut * vMask)));
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 3: PIPER
      // ==========================================
      else if (s.topology === "PIPER" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        shaderCtx.clearRect(0, 0, m.w, m.h);
        shaderCtx.drawImage(subjectCanvas, 0, 0);
        const illData = shaderCtx.getImageData(0, 0, m.w, m.h).data;
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const p = baseIdx * 4;
            const smL = m.smoothLum[baseIdx];
            const fd = m.fdog[baseIdx];

            const oil1 = Math.sin(u * 5.5 + smL * 4.2 + time * 1.1) * Math.cos(v * 5.5 - smL * 3.8 - time * 0.9);
            const oil2 = Math.sin((u * 8.0 - v * 6.0) + oil1 * (1.8 + t.chaos * 2.2) + time * 1.4);

            const ph = (t.tone + oil1 * 0.35 + oil2 * 0.25) * Math.PI * 2.0;
            const oilR = 215 + 40 * Math.cos(ph);
            const oilG = 85 + 140 * Math.cos(ph - 1.8);
            const oilB = 45 + 195 * Math.cos(ph + 2.1);

            const inkMask = fd < art.inkThreshold && m.bgProb[baseIdx] < 0.4 ? 0.08 : 1.0;
            dst[p] = Math.min(255, Math.round((illData[p] * 0.55 + oilR * 0.45) * inkMask * vMask));
            dst[p + 1] = Math.min(255, Math.round((illData[p + 1] * 0.55 + oilG * 0.45) * inkMask * vMask));
            dst[p + 2] = Math.min(255, Math.round((illData[p + 2] * 0.55 + oilB * 0.45) * inkMask * vMask));
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 4: PRISM
      // ==========================================
      else if (s.topology === "PRISM" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.smoothRgba;

        const prismAngle = s.mouseActive
          ? Math.atan2(mNormY - 0.5, mNormX - 0.5)
          : t.tone * Math.PI * 2 + Math.sin(time * 0.55) * 0.35;
        const dirX = Math.cos(prismAngle);
        const dirY = Math.sin(prismAngle);
        const maxDispersion = 14.0 + t.symmetry * 38.0 + t.chaos * 22.0;

        for (let y = 0; y < m.h; y++) {
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const p = idx * 4;
            const l = m.lum[idx];
            const e = m.edge[idx];

            const darkFieldFactor = (0.32 * (0.5 + e * 0.85)) / (1.0 + l * 0.85);
            let rLin = (src[p] / 255.0) * darkFieldFactor;
            let gLin = (src[p + 1] / 255.0) * darkFieldFactor;
            let bLin = (src[p + 2] / 255.0) * darkFieldFactor;

            for (let band = 0; band < 7; band++) {
              const bandNorm = (band + 1) / 7.0;
              const dist = bandNorm * maxDispersion;
              const sx = Math.round(x - dirX * dist);
              const sy = Math.round(y - dirY * dist);

              if (sx >= 0 && sx < m.w && sy >= 0 && sy < m.h) {
                const sEdge = m.edge[sy * m.w + sx];
                if (sEdge > 0.16) {
                  const falloff = (1.0 - bandNorm * 0.45) * sEdge * 0.24;
                  const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                  rLin += (cr / 255.0) * falloff;
                  gLin += (cg / 255.0) * falloff;
                  bLin += (cb / 255.0) * falloff;
                }
              }
            }

            const facetRim = e * e * 0.55;
            dst[p] = Math.round(acesTonemap(rLin + facetRim * 0.9) * 255 * vMask);
            dst[p + 1] = Math.round(acesTonemap(gLin + facetRim * 0.95) * 255 * vMask);
            dst[p + 2] = Math.round(acesTonemap(bLin + facetRim * 1.1) * 255 * vMask);
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 5: SILK
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = "screen";
        const stepSize = 0.0028 + t.energy * 0.0035;
        const springPull = 0.065 * t.structure;
        const activeSilk = s.isMobile ? 2600 : SILK_COUNT;

        for (let i = 0; i < activeSilk; i++) {
          const pt = silkParticles[i];
          let currX = pt.x;
          let currY = pt.y;

          const gx0 = Math.min(m.w - 1, Math.max(0, Math.floor(currX * m.w)));
          const gy0 = Math.min(m.h - 1, Math.max(0, Math.floor(currY * m.h)));
          const cell0 = gy0 * m.w + gx0;
          const e = m.edge[cell0];
          const l = m.lum[cell0];
          const vMask = m.mask[cell0];

          if (e < 0.04 && l < 0.08) {
            pt.age += 4;
          } else {
            ctx.beginPath();
            ctx.moveTo(ox + currX * drawW, oy + currY * drawH);

            for (let sub = 0; sub < 3; sub++) {
              const gxi = Math.min(m.w - 1, Math.max(0, Math.floor(currX * m.w)));
              const gyi = Math.min(m.h - 1, Math.max(0, Math.floor(currY * m.h)));
              const ci = gyi * m.w + gxi;

              const tx = m.etfX[ci] * pt.dir;
              const ty = m.etfY[ci] * pt.dir;
              const curl = Math.sin(currX * 12.0 + currY * 12.0 + time * 1.6) * t.chaos * 0.0014;

              currX += tx * stepSize - ty * curl + (pt.x0 - currX) * springPull;
              currY += ty * stepSize + tx * curl + (pt.y0 - currY) * springPull;
              ctx.lineTo(ox + currX * drawW, oy + currY * drawH);
            }

            const fadeLife = Math.sin((pt.age / pt.maxAge) * Math.PI);
            const alpha = clip((0.04 + e * 0.18 + l * 0.09) * fadeLife * vMask, 0.015, 0.24);
            const p = cell0 * 4;
            ctx.strokeStyle =
              "rgba(" +
              String(Math.min(255, m.smoothRgba[p] + 55)) +
              "," +
              String(Math.min(255, m.smoothRgba[p + 1] + 45)) +
              "," +
              String(Math.min(255, m.smoothRgba[p + 2] + 65)) +
              "," +
              String(alpha.toFixed(3)) +
              ")";
            ctx.lineWidth = (0.45 + e * 0.7) * art.strokeWeight;
            ctx.stroke();
          }

          pt.x = currX;
          pt.y = currY;
          pt.age++;

          if (pt.age >= pt.maxAge || currX < 0.02 || currX > 0.98 || currY < 0.02 || currY > 0.98 || vMask < 0.05) {
            if (m.spawnIndices.length > 0) {
              const pick = m.spawnIndices[Math.floor(Math.random() * m.spawnIndices.length)];
              const u = (pick % m.w) / m.w;
              const v = Math.floor(pick / m.w) / m.h;
              pt.x = u;
              pt.y = v;
              pt.x0 = u;
              pt.y0 = v;
              pt.age = 0;
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 6: LIDAR
      // ==========================================
      else if (s.topology === "LIDAR") {
        ctx.globalCompositeOperation = "screen";

        const centerX = viewW * 0.5;
        const centerY = viewH * 0.42;
        const baseScale = Math.min(drawW, drawH) * 0.55;

        const goalYaw = s.mouseActive
          ? (mNormX - 0.5) * 0.95
          : Math.sin(time * 0.5) * (0.26 + t.chaos * 0.32);
        const goalPitch = s.mouseActive
          ? (mNormY - 0.5) * 0.72
          : -0.20 + Math.cos(time * 0.38) * 0.15;

        s.smoothYaw += (goalYaw - s.smoothYaw) * 0.08;
        s.smoothPitch += (goalPitch - s.smoothPitch) * 0.08;

        const cosY = Math.cos(s.smoothYaw);
        const sinY = Math.sin(s.smoothYaw);
        const cosX = Math.cos(s.smoothPitch);
        const sinX = Math.sin(s.smoothPitch);

        const scanPos = ((time * 0.32) % 1.4) - 0.2;
        const step = s.isMobile ? 4 : 3;
        const depthBoost = 0.26 + t.structure * 0.56;

        for (let y = 0; y < m.h; y += step) {
          const ny = (y / (m.h - 1)) * 2.0 - 1.0;
          const scanDist = Math.abs(y / m.h - scanPos);
          const scanGlow = scanDist < 0.055 ? (1.0 - scanDist / 0.055) * 0.65 : 0.0;

          let prevSx = 0;
          let prevSy = 0;
          let hasPrev = false;

          for (let x = 0; x < m.w; x += step) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            const l = m.lum[idx];
            const e = m.edge[idx];
            if (vMask < 0.07 || (l < 0.06 && e < 0.07)) {
              hasPrev = false;
              continue;
            }

            const nx = (x / (m.w - 1)) * 2.0 - 1.0;
            const waveZ = Math.sin(nx * 6.5 + ny * 6.5 + time * 2.3) * t.chaos * 0.11;
            const nz = (l * 0.78 + e * 0.58) * depthBoost + waveZ;

            const x1 = nx * cosY + nz * sinY;
            const z1 = -nx * sinY + nz * cosY;
            const y2 = ny * cosX - z1 * sinX;
            const z2 = ny * sinX + z1 * cosX;

            const fov = 2.4 / (2.4 - z2 * 0.75);
            const sx = centerX + x1 * baseScale * fov;
            const sy = centerY + y2 * baseScale * fov;

            const zBack = z2 - (l * 0.15 + e * 0.22) * depthBoost;
            const fovBack = 2.4 / (2.4 - zBack * 0.75);
            const sxBack = centerX + x1 * baseScale * fovBack;
            const syBack = centerY + y2 * baseScale * fovBack;

            const p = idx * 4;
            const alpha = clip((0.28 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.94);
            const rC = Math.min(255, m.smoothRgba[p] + 55);
            const gC = Math.min(255, m.smoothRgba[p + 1] + 55);
            const bC = Math.min(255, m.smoothRgba[p + 2] + 75);

            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((alpha * 0.6).toFixed(2)) + ")";
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";

            ctx.lineWidth = 0.85 * art.strokeWeight;
            ctx.beginPath();
            ctx.moveTo(sxBack, syBack);
            ctx.lineTo(sx, sy);
            if (hasPrev && e > 0.14 && Math.abs(sx - prevSx) < 16 && Math.abs(sy - prevSy) < 16) {
              ctx.moveTo(prevSx, prevSy);
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            const ptSize = (1.1 + l * 1.2 + e * 1.1) * (fov * 0.85) * art.strokeWeight;
            ctx.fillRect(sx - ptSize * 0.5, sy - ptSize * 0.5, ptSize, ptSize);

            prevSx = sx;
            prevSy = sy;
            hasPrev = true;
          }
        }
      }

      // ==========================================
      // РЕЖИМ 7: ENGRAVE
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(subjectCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        const numLines = 135;
        const numCols = 220;
        const maxElevation = (drawH / numLines) * (2.6 + t.structure * 2.8);

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          ctx.globalCompositeOperation = "source-over";
          ctx.beginPath();
          ctx.moveTo(ox, baseScreenY + 3);

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const uNorm = cIdx / (numCols - 1);
            const sx = Math.min(m.w - 1, Math.floor(uNorm * m.w));
            const cell = sy * m.w + sx;
            const l = m.lum[cell];
            const e = m.edge[cell];
            const vMask = m.mask[cell];

            const vib = Math.sin(uNorm * (30.0 + e * 55.0) + time * 4.2 + rIdx * 0.5) * (e * 0.45 + t.chaos * 0.2) * vMask;
            const elev = (l * 0.8 + e * 0.45 + vib * 0.35) * maxElevation * vMask;
            ctx.lineTo(ox + uNorm * drawW, baseScreenY - elev);
          }
          ctx.lineTo(ox + drawW, baseScreenY + 3);
          ctx.closePath();
          ctx.fillStyle = "rgba(6, 4, 8, 0.78)";
          ctx.fill();

          ctx.strokeStyle = art.master === "ESQUIRE_67" ? "rgba(255, 195, 45, 0.9)" : "rgba(240, 238, 230, 0.9)";
          ctx.lineWidth = 1.05 * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 8: CRYSTAL
      // ==========================================
      else if (s.topology === "CRYSTAL") {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(subjectCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        const cells = m.cells;
        for (let i = 0; i < cells.length; i++) {
          const cl = cells[i];
          const phase = (cl.u * 9.0 + cl.v * 9.0) * c.nHarmonic - time * 2.6;
          const shift = Math.sin(phase) * t.chaos * 6.5;

          const cx = ox + cl.u * drawW + cl.tx * shift;
          const cy = oy + cl.v * drawH + cl.ty * shift;
          const rad = cl.size * drawW * (0.52 + cl.lum * 0.48) * art.strokeWeight;
          const rot = Math.atan2(cl.ty, cl.tx) + Math.sin(time + i * 0.03) * t.chaos * 0.6;

          const sides = cl.edge > 0.28 ? 4 : 6;
          ctx.beginPath();
          for (let k = 0; k < sides; k++) {
            const a = rot + (k * Math.PI * 2) / sides;
            const vx = cx + Math.cos(a) * rad;
            const vy = cy + Math.sin(a) * rad;
            if (k === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();

          ctx.fillStyle = "rgba(" + String(cl.r) + "," + String(cl.g) + "," + String(cl.b) + "," + String((0.55 + cl.lum * 0.4).toFixed(2)) + ")";
          ctx.fill();
        }
      }

      // ==========================================
      // РЕЖИМ 9: GLYPH
      // ==========================================
      else if (s.topology === "GLYPH") {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(subjectCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        ctx.globalCompositeOperation = "screen";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = 72;
        const cellW = drawW / cols;
        const rows = Math.floor(drawH / cellW);

        for (let r = 0; r < rows; r++) {
          const v = (r + 0.5) / rows;
          const sy = Math.min(m.h - 1, Math.floor(v * m.h));
          for (let cIdx = 0; cIdx < cols; cIdx++) {
            const u = (cIdx + 0.5) / cols;
            const sx = Math.min(m.w - 1, Math.floor(u * m.w));
            const idx = sy * m.w + sx;

            const vMask = m.mask[idx];
            const l = m.lum[idx];
            const e = m.edge[idx];
            if ((l < 0.08 && e < 0.1) || vMask < 0.08) continue;

            const glyphIdx = Math.floor((l * 9 + e * 6 + time * 1.6 + (r * 3 + cIdx) * 0.2) % MATH_GLYPHS.length);
            const ch = MATH_GLYPHS[glyphIdx];

            const fontSize = Math.max(7, Math.floor(cellW * (0.6 + l * 0.62 + e * 0.45) * vMask * art.strokeWeight));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            const alpha = clip((0.28 + l * 0.72 + e * 0.45) * vMask, 0.08, 0.95);
            ctx.fillStyle =
              "rgba(" +
              String(Math.min(255, m.smoothRgba[p] + 50)) +
              "," +
              String(Math.min(255, m.smoothRgba[p + 1] + 50)) +
              "," +
              String(Math.min(255, m.smoothRgba[p + 2] + 65)) +
              "," +
              String(alpha.toFixed(2)) +
              ")";
            ctx.fillText(ch, ox + u * drawW, oy + v * drawH);
          }
        }
      }

      // ==========================================
      // ГАЛЕРЕЙНАЯ РАМКА И ПАСПОРТ АРТЕФАКТА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT // " + (query || "SYD BARRETT").toUpperCase().slice(0, 22) + " [" + art.traceVariation + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          "FDoG ∫G(s)ΔI ds | H(X)=" + String(c.entropy) + "b | PURE MATH",
          ox + drawW + 4,
          oy + drawH + 10
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
    };
  }, [query]);

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "barrett-poster-" + String(Date.now()) + ".png";
    a.click();
  };

  const handleRecordWebm = () => {
    const canvas = canvasRef.current as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
    if (!canvas || !canvas.captureStream || isRecording) return;
    try {
      const stream = canvas.captureStream(60);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "barrett-manifold-" + String(Date.now()) + ".webm";
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };
      setIsRecording(true);
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 5000);
    } catch (e) {
      console.error("WebM capture failed:", e);
      setIsRecording(false);
    }
  };

  const handleSecureToArchive = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSecureArtifact) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    onSecureArtifact(dataUrl, "[BARRETT] " + (query || "CRAZY DIAMOND"));
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto mb-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <style dangerouslySetInnerHTML={{ __html: `
        .barrett-scroll::-webkit-scrollbar { height: 3px; }
        .barrett-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 99px; }
        .barrett-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.5); border-radius: 99px; }
        .barrett-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.9); }
      `}} />

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[600px] md:h-[760px] rounded-2xl overflow-hidden border border-white/10 bg-[#040206] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onMouseLeave={handleMouseLeave}
          onTouchEnd={handleMouseLeave}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair", touchAction: "none" }}
        />

        {/* ВЕРХНИЙ ТЕЛЕМЕТРИЧЕСКИЙ ОВЕРЛЕЙ */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-2">
          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300">
            <div className="text-white font-bold">BARRETT PRISM // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#f59e0b] mt-0.5">{fieldStatus}</div>
          </div>

          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>FDoG ANISOTROPIC | H(X): <span className="text-white">{coeffs.entropy} bits</span> | λ: <span className="text-[#10b981]">{coeffs.lyapunov}</span></div>
          </div>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2.5">
          <div className="barrett-scroll flex items-center gap-2 overflow-x-auto py-1.5 px-2.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 self-center max-w-full">
            <span className="font-mono text-[8px] text-neutral-400 uppercase tracking-widest px-1 shrink-0">
              Matrix ({candidateUrls.length}):
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload custom image into Barrett"
              className="h-9 px-2.5 rounded-lg border border-[#f59e0b]/60 text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black font-mono text-[8px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
            >
              + File
            </button>

            {candidateUrls.map((u, idx) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  setCandidateIdx(idx);
                  loadMatrixFromUrl(u, idx, candidateUrls.length);
                }}
                className={
                  "w-9 h-9 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer " +
                  (candidateIdx === idx
                    ? "border-[#f59e0b] scale-105 shadow-[0_0_12px_rgba(245,158,11,0.75)]"
                    : "border-white/15 opacity-55 hover:opacity-100")
                }
              >
                <img
                  src={u}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleRemoveBrokenUrl(u)}
                />
              </button>
            ))}

            <button
              type="button"
              disabled={loadingMore}
              onClick={handleLoadMoreMatrices}
              className="h-9 px-3 rounded-lg border border-white/20 text-white hover:bg-white hover:text-black font-mono text-[8px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
            >
              {loadingMore ? "..." : "+ More"}
            </button>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex flex-wrap gap-1 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-white/10">
              {(["TRACE", "CURRENTS", "PIPER", "PRISM", "SILK", "LIDAR", "ENGRAVE", "CRYSTAL", "GLYPH"] as ManifoldTopology[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopology(mode);
                    if (mode === "TRACE") stateRef.current.traceProgress = 0;
                    if (mode === "SILK") stateRef.current.needsSilkReset = true;
                  }}
                  className={
                    "px-2.5 py-1 rounded-full font-mono text-[9px] tracking-widest uppercase transition-all cursor-pointer " +
                    (topology === mode
                      ? "bg-white text-black font-bold"
                      : "text-neutral-400 hover:text-white bg-transparent")
                  }
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {topology === "TRACE" && (
                <button
                  type="button"
                  onClick={triggerRedrawContours}
                  className="btn-elegant !bg-black/75 backdrop-blur-md border-[#f59e0b]/60 text-[#f59e0b]"
                >
                  Re-Draw
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="btn-elegant !bg-black/75 backdrop-blur-md"
              >
                {isPaused ? "Resume" : "Freeze"}
              </button>
              <button
                type="button"
                onClick={triggerPhaseShift}
                className="btn-elegant !bg-black/75 backdrop-blur-md"
              >
                Next ({candidateUrls.length > 0 ? String(candidateIdx + 1) + "/" + String(candidateUrls.length) : "1/1"})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: BARRETT ILLUSTRATION STUDIO 9.0 */}
      <div className="lg:col-span-4 glass-panel p-6 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("STUDIO")}
                className={
                  "px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "STUDIO"
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                Illustration Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PHYSICS")}
                className={
                  "px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "PHYSICS"
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                5D Tensor
              </button>
            </div>
            <span className="font-mono text-[8px] text-[#f59e0b] uppercase tracking-widest">FDoG 9.0</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {/* 6 МАСТЕР-ПРЕСЕТОВ */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Master Edition (1-Click):</span>
                  <button
                    type="button"
                    onClick={() => updateArt("posterFrame", !artConfig.posterFrame)}
                    className={
                      "px-2 py-0.5 rounded border text-[8px] cursor-pointer transition-all " +
                      (artConfig.posterFrame
                        ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10"
                        : "border-white/15 text-neutral-400")
                    }
                  >
                    Poster Frame
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "ESQUIRE_67", label: "Esquire '67 (Pop-Art)", dot: "linear-gradient(135deg,#ff4d00,#ffe600)" },
                      { id: "MADCAP_STENCIL", label: "Madcap (4-Tone Gouache)", dot: "linear-gradient(135deg,#9ea39d,#0d0a09)" },
                      { id: "ASTRAL_NEON", label: "Astral Pure Vectors", dot: "linear-gradient(135deg,#c026d3,#38bdf8)" },
                      { id: "GUILLOCHE_LUX", label: "Guilloché Spirograph", dot: "linear-gradient(135deg,#f59e0b,#fef08a)" },
                      { id: "SIN_CITY", label: "Sin City Woodcut", dot: "linear-gradient(135deg,#ef4444,#09090b)" },
                      { id: "BLUEPRINT", label: "Astrolabe Blueprint", dot: "linear-gradient(135deg,#0284c7,#e0f2fe)" },
                    ] as { id: MasterPreset; label: string; dot: string }[]
                  ).map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => applyMasterPreset(mp.id)}
                      className={
                        "py-2 px-2.5 rounded-lg border text-[8px] tracking-wider flex items-center gap-2 transition-all cursor-pointer " +
                        (artConfig.master === mp.id
                          ? "bg-white text-black border-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ background: mp.dot }} />
                      <span className="truncate">{mp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 МАТЕМАТИЧЕСКИХ ВАРИАЦИИ ТРАССИРОВКИ */}
              <div>
                <div className="text-neutral-400 mb-1.5">Tracing Paradigm (4 Engines):</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "FDOG_COMIC", label: "FDoG Ink" },
                      { id: "GUILLOCHE", label: "Guilloché" },
                      { id: "ASTRAL_VECTOR", label: "Pure Vec" },
                      { id: "WOODCUT", label: "Woodcut" },
                    ] as { id: TraceVariation; label: string }[]
                  ).map((tv) => (
                    <button
                      key={tv.id}
                      type="button"
                      onClick={() => {
                        updateArt("traceVariation", tv.id);
                        stateRef.current.traceProgress = 0;
                      }}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.traceVariation === tv.id
                          ? "bg-[#f59e0b] text-black border-[#f59e0b] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {tv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 ЖИВЫХ ФОНОВЫХ ПОЛЯ */}
              <div>
                <div className="text-neutral-400 mb-1.5">Living Background Manifold:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "SUNBURST", label: "Sunburst" },
                      { id: "SACRED_RINGS", label: "Astrolabe" },
                      { id: "LIQUID_AURA", label: "Wave Aura" },
                      { id: "CLEAN_SOLID", label: "Clean Canvas" },
                    ] as { id: BgManifoldType; label: string }[]
                  ).map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateArt("bgManifold", bg.id)}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.bgManifold === bg.id
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки доводки */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Anisotropic FDoG Ink Mass</span>
                    <span className="text-[#f59e0b]">{Math.round(artConfig.inkThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.18"
                    max="0.78"
                    step="0.02"
                    value={artConfig.inkThreshold}
                    onChange={(e) => updateArt("inkThreshold", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Screenprint Halftone Lattice</span>
                    <span className="text-white">{Math.round(artConfig.stippleDensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.stippleDensity}
                    onChange={(e) => updateArt("stippleDensity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Calligraphic Spline Weight</span>
                    <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.2"
                    step="0.05"
                    value={artConfig.strokeWeight}
                    onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Liquid Dropper Ripples (Water)</span>
                    <span className="text-white">{Math.round(artConfig.rippleStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.rippleStrength}
                    onChange={(e) => updateArt("rippleStrength", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 font-mono text-[10px] uppercase tracking-widest">
              {(
                [
                  { key: "energy", label: "Energy (Sunburst & Comet Speed)" },
                  { key: "chaos", label: "Chaos (Guilloché & Breeze Amp)" },
                  { key: "tone", label: "Tone (Spectrum Phase Shift)" },
                  { key: "structure", label: "Structure (Portrait Lock)" },
                  { key: "symmetry", label: "Symmetry (Ray & Wave Count)" },
                ] as { key: keyof Tensor5D; label: string }[]
              ).map((item) => (
                <div key={item.key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>{item.label}</span>
                    <span className="text-white">{tensor[item.key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.98"
                    step="0.01"
                    value={tensor[item.key]}
                    onChange={(e) => handleAxisChange(item.key, parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              ))}

              <div className="mt-2 p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[8px] text-neutral-400 leading-relaxed space-y-1">
                <div className="text-white uppercase">Anisotropic FDoG & Guilloché Kernel:</div>
                <div>FDoG(x) = ∫ G_σ(s) · [(1+p)G_1 - pG_2](x + s·t_etf) ds</div>
                <div>Ψ_guilloche(s,t) = r_0(s) + n(s)·A·sin(ωs - vt)</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            className="btn-elegant w-full !py-3 justify-center"
          >
            Download Gallery Poster PNG
          </button>

          <button
            type="button"
            disabled={isRecording}
            onClick={handleRecordWebm}
            className="btn-elegant w-full !py-3 justify-center border-[#f59e0b]/50 text-[#f59e0b]"
          >
            {isRecording ? "Recording 60FPS Loop (5s)..." : "Export 5s WebM Video Loop"}
          </button>

          {onSecureArtifact && (
            <button
              type="button"
              onClick={handleSecureToArchive}
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
              className="btn-elegant w-full !py-3 justify-center font-bold"
            >
              Secure to Saved Resonance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
