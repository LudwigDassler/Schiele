"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость фотонов, волн и частота колебания струн
  chaos: number;     // C: амплитуда вихрей, дисперсии и струнного резонанса
  tone: number;      // H: сдвиг спектральной фазы
  structure: number; // St: точность анатомического замка FDoG
  symmetry: number;  // Sy: частота ламинарных волн и гармоник
}

type TributeEdition =
  | "SHINE_ON"   // Родной спектр арта + глубокий бархат FDoG + иридисцентные кометы света
  | "DARK_SIDE"  // Обсидиановый вакуум + серебряный луч + радужная дисперсия Коши на гранях
  | "PIPER_67"   // Психоделическое жидкое масло UFO Club 1967 (Маджента / Янтарь / Циан)
  | "POMPEII"    // Вулканическое золото и платина + гравировка резцом
  | "ECHOES"     // Абиссальный биолюминесцентный сонар (Индиго / Изумруд / Аквамарин)
  | "MADCAP";    // Экспрессионистская тушь и гуашь на архивном холсте

type TraceVariation = "SYMPHONIC" | "LASER_HARP" | "GUILLOCHE" | "ENGRAVING";
type AuraFieldType = "COSMIC_BLOOM" | "SONAR_RIPPLES" | "HARMONIC_RAYS" | "PURE_VOID";

interface ArtStudioConfig {
  edition: TributeEdition;
  traceVariation: TraceVariation;
  auraField: AuraFieldType;
  posterFrame: boolean;
  strokeWeight: number;     // 0.4 .. 2.2 (калибр векторного луча/пера)
  detailPrecision: number;  // 0.15 .. 0.95 (чувствительность к микро-деталям и тексту)
  tonalDepth: number;       // 0.0 .. 1.0 (глубина светотеневой основы FDoG)
  luminanceGlow: number;    // 0.0 .. 1.0 (интенсивность свечения и комет)
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
  centerU: number;
  centerV: number;
}

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  smoothRgba: Uint8ClampedArray;
  lum: Float32Array;
  smoothLum: Float32Array;
  fdog: Float32Array;
  edge: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  etfX: Float32Array;
  etfY: Float32Array;
  mask: Float32Array;
  spawnIndices: number[];
  cells: CrystalCell[];
  strokes: ContourStroke[];
  pluckAmps: Float32Array; // Динамический буфер акустического резонанса каждой струны!
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
const SILK_COUNT = 4600;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 45, 75],
  [255, 140, 25],
  [250, 230, 45],
  [40, 240, 130],
  [35, 215, 255],
  [80, 110, 255],
  [200, 60, 255],
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

// Вычисление цвета по выбранной эпохе Pink Floyd (с полным уважением к родным цветам и черному космосу!)
function resolveEditionColor(
  edition: TributeEdition,
  nativeR: number,
  nativeG: number,
  nativeB: number,
  lum: number,
  edge: number,
  phaseShift: number
): [number, number, number] {
  const energy = clip(lum * 0.55 + edge * 0.65, 0.0, 1.0);
  const ph = (phaseShift + energy * 0.65) * Math.PI * 2.0;

  if (edition === "SHINE_ON") {
    // Усиливаем благородную насыщенность родного цвета картинки, а если Ч/Б — даем тонкий сапфирово-янтарный отлив
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
    if (sat > 22) {
      return [
        clip(Math.round(avg + (nativeR - avg) * 1.55 + edge * 45), 15, 255),
        clip(Math.round(avg + (nativeG - avg) * 1.55 + edge * 45), 15, 255),
        clip(Math.round(avg + (nativeB - avg) * 1.55 + edge * 55), 20, 255),
      ];
    }
    return [
      clip(Math.round(140 + energy * 115 + 30 * Math.sin(ph)), 30, 255),
      clip(Math.round(145 + energy * 105 + 25 * Math.sin(ph + 1.5)), 30, 255),
      clip(Math.round(170 + energy * 85 + 35 * Math.cos(ph)), 45, 255),
    ];
  }

  if (edition === "DARK_SIDE") {
    // На острых гранях вспыхивает спектральная призма, а базовые линии — чистое жидкое серебро
    if (edge > 0.32) {
      const bandIdx = Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7);
      const [cr, cg, cb] = CAUCHY_SPECTRUM[Math.max(0, Math.min(6, bandIdx))];
      const mix = smoothstep(0.32, 0.68, edge);
      const baseV = 185 + lum * 70;
      return [
        Math.round(baseV * (1 - mix) + cr * mix),
        Math.round(baseV * (1 - mix) + cg * mix),
        Math.round(baseV * (1 - mix) + cb * mix),
      ];
    }
    const v = Math.round(160 + energy * 95);
    return [v, v, Math.min(255, v + 10)];
  }

  if (edition === "PIPER_67") {
    // Тонкопленочная интерференция масла 1967: Пурпур -> Огненный Янтарь -> Электрический Бирюзовый
    return [
      Math.min(255, Math.round(175 + 80 * Math.cos(ph))),
      Math.min(255, Math.round(65 + 150 * Math.cos(ph - 1.95))),
      Math.min(255, Math.round(195 + 60 * Math.cos(ph + 2.05))),
    ];
  }

  if (edition === "POMPEII") {
    // Вулканический базальт, 24K золото и раскаленная медь
    return [
      Math.min(255, Math.round(185 + energy * 70)),
      Math.min(255, Math.round(120 + energy * 115)),
      Math.min(255, Math.round(30 + Math.pow(energy, 2.0) * 145)),
    ];
  }

  if (edition === "ECHOES") {
    // Глубоководное биолюминесцентное свечение: Индиго -> Аквамарин -> Изумруд
    return [
      Math.min(255, Math.round(20 + Math.pow(energy, 1.8) * 135)),
      Math.min(255, Math.round(135 + energy * 120)),
      Math.min(255, Math.round(165 + energy * 90)),
    ];
  }

  // MADCAP (Гуашь и угольная тушь на теплом архивном холсте)
  const inkShade = clip(1.0 - edge * 0.78 - (1.0 - lum) * 0.4, 0.06, 0.42);
  return [
    Math.round(45 * inkShade),
    Math.round(36 * inkShade),
    Math.round(32 * inkShade),
  ];
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
  const chaos = clip((entropy / 4.5) * 0.14 + 0.12, 0.10, 0.28);
  const tone = 0.0;
  const structure = clip(0.88 + consonantRatio * 0.10, 0.88, 0.98);
  const symmetry = 0.34;

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

function sampleBilinearRGB(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  fx: number,
  fy: number
): [number, number, number] {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;

  const p00 = (y0 * w + x0) * 4;
  const p10 = (y0 * w + x1) * 4;
  const p01 = (y1 * w + x0) * 4;
  const p11 = (y1 * w + x1) * 4;

  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;

  return [
    rgba[p00] * w00 + rgba[p10] * w10 + rgba[p01] * w01 + rgba[p11] * w11,
    rgba[p00 + 1] * w00 + rgba[p10 + 1] * w10 + rgba[p01 + 1] * w01 + rgba[p11 + 1] * w11,
    rgba[p00 + 2] * w00 + rgba[p10 + 2] * w10 + rgba[p01 + 2] * w01 + rgba[p11 + 2] * w11,
  ];
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
// ЯДРО ДЕКОМПОЗИЦИИ: FDoG + CHIAROSCURO + SUB-PIXEL SKELETON SPLINES
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
      edge,
      gx,
      gy,
      etfX,
      etfY,
      mask,
      spawnIndices,
      cells,
      strokes,
      pluckAmps: new Float32Array(0),
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
    const wy = Math.abs(ny) > 0.93 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.93) / 0.07) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.93 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.93) / 0.07) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const normL = clip((rawLArr[i] - minL) / spanL);
      lum[i] = Math.pow(normL, 0.82) * mask[i];
    }
  }

  // Билатеральная фильтрация (создает бархатный художественный градиент без пиксельного шума, сохраняя все грани!)
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
          const weight = Math.exp(-diffL * 16.0);
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

  // Оператор Щарра (по неразмытому lum для 100% захвата мелких букв и глаз!)
  const rawGradMag = new Float32Array(total);
  let globalMaxEdge = 1e-5;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx =
        -3 * lum[(y - 1) * w + (x - 1)] + 3 * lum[(y - 1) * w + (x + 1)] +
        -10 * lum[y * w + (x - 1)] + 10 * lum[y * w + (x + 1)] +
        -3 * lum[(y + 1) * w + (x - 1)] + 3 * lum[(y + 1) * w + (x + 1)];

      const sy =
        -3 * lum[(y - 1) * w + (x - 1)] - 10 * lum[(y - 1) * w + x] - 3 * lum[(y - 1) * w + (x + 1)] +
        3 * lum[(y + 1) * w + (x - 1)] + 10 * lum[(y + 1) * w + x] + 3 * lum[(y + 1) * w + (x + 1)];

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

  const localEnv = gaussianBlurField(rawGradMag, w, h, 6);
  const absFloor = globalMaxEdge * 0.038;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    if (gVal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.16, localEnv[i] * 2.1 + globalMaxEdge * 0.08);
      edge[i] = clip((gVal - absFloor * 0.75) / denom);
    }
    if (edge[i] > 0.12 || (lum[i] > 0.18 && edge[i] > 0.04)) {
      spawnIndices.push(i);
    }
  }

  // Когерентное сглаживание касательного потока ETF
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

  // Анизотропный потоковый фильтр Канга FDoG (чистая светотень без фоновых пятен!)
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const pAdaptive = 20.0 * smoothstep(0.03, 0.25, edge[i]);
    const diff = (1.0 + pAdaptive) * gNarrow[i] - pAdaptive * gWide[i];
    rawDoG[i] = clip(diff * 0.65 + lum[i] * 0.35);
  }

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
      if (e0 < 0.05 || mask[i] < 0.05) continue;

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

        if (align > 0.2) {
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

  const maxStrokes = isMobileDevice ? 2500 : 4000;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const back = tracePixelSkeleton(seed.idx, -1, 95).reverse();
    const fwd = tracePixelSkeleton(seed.idx, 1, 95);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < 3) continue;

    const pts = bilateralCornerPreservingSmooth(rawPts);
    if (pts.length < 3) continue;

    let eSum = 0, lSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0;
    for (let k = 0; k < pts.length; k++) {
      uSum += pts[k].u;
      vSum += pts[k].v;
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
      centerU: uSum / n,
      centerV: vSum / n,
    });
  }

  // Тонкие полутоновые штрихи вдоль поля касательных ETF для скульптурного объема лиц и складок
  for (let y = 5; y < h - 5; y += 4) {
    for (let x = 5; x < w - 5; x += 4) {
      if (strokes.length >= maxStrokes + 750) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.1) continue;
      if (lum[idx] > 0.12 && lum[idx] < 0.72 && edge[idx] > 0.045) {
        const strandPts: { u: number; v: number; nx: number; ny: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        for (let s = 0; s < 12; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          const tx = etfX[cIdx];
          const ty = etfY[cIdx];
          strandPts.push({ u: cx / w, v: cy / h, nx: -ty, ny: tx });
          cx += tx * 1.4;
          cy += ty * 1.4;
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
          importance: clip(edge[idx] * 0.85 + lum[idx] * 0.25),
          phase: (strokes.length * PHI) % (Math.PI * 2),
          speed: 0.55,
          arcLen: 16,
          centerU: x / w,
          centerV: y / h,
        });
      }
    }
  }

  strokes.sort((a, b) => {
    const da = Math.hypot(a.centerU - 0.5, a.centerV - 0.45);
    const db = Math.hypot(b.centerU - 0.5, b.centerV - 0.45);
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
    edge,
    gx,
    gy,
    etfX,
    etfY,
    mask,
    spawnIndices,
    cells,
    strokes,
    pluckAmps: new Float32Array(strokes.length),
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

  // По умолчанию открывается SHINE_ON (сохраняет родной черный космос и палитру любого арта!)
  const [artConfig, setArtConfig] = useState<ArtStudioConfig>({
    edition: "SHINE_ON",
    traceVariation: "SYMPHONIC",
    auraField: "COSMIC_BLOOM",
    posterFrame: true,
    strokeWeight: 0.9,
    detailPrecision: 0.88,
    tonalDepth: 0.58,
    luminanceGlow: 0.72,
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
    needsBaseRebuild: true,
    isPaused: false,
    isMobile: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    smoothYaw: 0,
    smoothPitch: -0.18,
    fluidU: 0.5,
    fluidV: 0.5,
  });

  const applyTributeEdition = (edition: TributeEdition) => {
    let next: ArtStudioConfig = { ...artConfig, edition };
    if (edition === "SHINE_ON") {
      next = {
        ...next,
        traceVariation: "SYMPHONIC",
        auraField: "COSMIC_BLOOM",
        strokeWeight: 0.9,
        detailPrecision: 0.88,
        tonalDepth: 0.58,
        luminanceGlow: 0.72,
      };
    } else if (edition === "DARK_SIDE") {
      next = {
        ...next,
        traceVariation: "LASER_HARP",
        auraField: "PURE_VOID",
        strokeWeight: 0.85,
        detailPrecision: 0.9,
        tonalDepth: 0.32,
        luminanceGlow: 0.88,
      };
    } else if (edition === "PIPER_67") {
      next = {
        ...next,
        traceVariation: "SYMPHONIC",
        auraField: "HARMONIC_RAYS",
        strokeWeight: 1.0,
        detailPrecision: 0.86,
        tonalDepth: 0.65,
        luminanceGlow: 0.78,
      };
    } else if (edition === "POMPEII") {
      next = {
        ...next,
        traceVariation: "GUILLOCHE",
        auraField: "COSMIC_BLOOM",
        strokeWeight: 0.95,
        detailPrecision: 0.88,
        tonalDepth: 0.48,
        luminanceGlow: 0.75,
      };
    } else if (edition === "ECHOES") {
      next = {
        ...next,
        traceVariation: "LASER_HARP",
        auraField: "SONAR_RIPPLES",
        strokeWeight: 0.88,
        detailPrecision: 0.9,
        tonalDepth: 0.42,
        luminanceGlow: 0.82,
      };
    } else if (edition === "MADCAP") {
      next = {
        ...next,
        traceVariation: "ENGRAVING",
        auraField: "PURE_VOID",
        strokeWeight: 1.05,
        detailPrecision: 0.92,
        tonalDepth: 0.82,
        luminanceGlow: 0.25,
      };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsBaseRebuild = true;
    stateRef.current.traceProgress = 0;
    if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("TUNING ACOUSTIC & OPTICAL MANIFOLD [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMob = typeof window !== "undefined" && window.innerWidth < 768;
      stateRef.current.isMobile = isMob;
      const buf = buildMatrixFromImage(img, isMob);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      stateRef.current.needsBaseRebuild = true;
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " RESONANT STRINGS (" + String(buf.w) + "x" + String(buf.h) + ")"
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
    stateRef.current.needsBaseRebuild = true;
  }, [tensor, coeffs, artConfig, topology, isPaused]);

  const handleAxisChange = (axis: keyof Tensor5D, value: number) => {
    setTensor((prev) => {
      const updated = { ...prev, [axis]: value };
      stateRef.current.tensor = updated;
      stateRef.current.needsBaseRebuild = true;
      return updated;
    });
  };

  const updateArt = <K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsBaseRebuild = true;
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
  // ЯДРО СИНТЕЗА BARRETT 10.0 (CRAZY DIAMOND EDITION)
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

    // Буфер бархатной светотеневой основы (FDoG Chiaroscuro)
    const baseCanvas = document.createElement("canvas");
    const baseCtx = baseCanvas.getContext("2d");

    // Буфер для жидкостных и оптических шейдеров (CURRENTS, PIPER, PRISM)
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

    const buildSmoothPath = (coords: { x: number; y: number }[]) => {
      const len = coords.length;
      if (len < 2) return;
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      if (len <= 3) {
        for (let i = 1; i < len; i++) ctx.lineTo(coords[i].x, coords[i].y);
        return;
      }
      for (let i = 1; i < len - 1; i++) {
        const midX = (coords[i].x + coords[i + 1].x) * 0.5;
        const midY = (coords[i].y + coords[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(coords[i].x, coords[i].y, midX, midY);
      }
      ctx.lineTo(coords[len - 1].x, coords[len - 1].y);
    };

    // Сборка адаптивной светотеневой основы (БЕЗ грубых рамок и искусственной перекраски фона!)
    const rebuildChiaroscuroBase = (m: MatrixBuffer, art: ArtStudioConfig, t: Tensor5D) => {
      if (!baseCtx) return;
      baseCanvas.width = m.w;
      baseCanvas.height = m.h;
      const imgData = baseCtx.createImageData(m.w, m.h);
      const dst = imgData.data;
      const sRgba = m.smoothRgba;

      const isMadcap = art.edition === "MADCAP";

      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const p = i * 4;
          const l = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];

          // Мягкая потоковая тушь FDoG подчеркивает рельеф и складки без единой грязной кляксы!
          const inkShade = clip(0.25 + 0.75 * Math.tanh(8.0 * (fd - 0.28)), 0.12, 1.0);

          let outR = 0, outG = 0, outB = 0;

          if (isMadcap) {
            // Музейный 4-тоновый гуашевый этюд на архивном холсте (#dbd6c8)
            const grain = (Math.sin(x * 0.9) * Math.cos(y * 0.4)) * 3.5;
            if (l < 0.22 || (fd < 0.36 && e > 0.14)) {
              outR = 16;
              outG = 13;
              outB = 12;
            } else if (l < 0.48) {
              outR = 118 + grain;
              outG = 122 + grain;
              outB = 118 + grain;
            } else if (l < 0.74) {
              outR = 196 + grain;
              outG = 190 + grain;
              outB = 178 + grain;
            } else {
              outR = 242;
              outG = 236;
              outB = 224;
            }
          } else {
            // Для всех космических и оптических эпох берем родную светотень кадра + палитру эпохи
            const [edR, edG, edB] = resolveEditionColor(
              art.edition,
              sRgba[p],
              sRgba[p + 1],
              sRgba[p + 2],
              l,
              e,
              t.tone
            );

            // В SHINE_ON сохраняем 75% родного цвета картинки, в остальных эпохах — тонируем в спектр эпохи
            const nativeMix = art.edition === "SHINE_ON" ? 0.75 : 0.35;
            const colR = sRgba[p] * nativeMix + edR * (1.0 - nativeMix);
            const colG = sRgba[p + 1] * nativeMix + edG * (1.0 - nativeMix);
            const colB = sRgba[p + 2] * nativeMix + edB * (1.0 - nativeMix);

            // Сохраняем естественную темноту космоса (l), умножая на чистый рельеф FDoG
            const chiaroscuro = clip(Math.pow(l, 0.88) * inkShade + e * 0.25, 0.0, 1.0);
            outR = colR * chiaroscuro;
            outG = colG * chiaroscuro;
            outB = colB * chiaroscuro;
          }

          dst[p] = Math.min(255, Math.max(0, Math.round(outR * vMask)));
          dst[p + 1] = Math.min(255, Math.max(0, Math.round(outG * vMask)));
          dst[p + 2] = Math.min(255, Math.max(0, Math.round(outB * vMask)));
          dst[p + 3] = Math.round(vMask * 255);
        }
      }

      baseCtx.putImageData(imgData, 0, 0);
    };

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const art = s.art;
      const m = s.matrix;

      const isMadcap = art.edition === "MADCAP";
      const bgHex = isMadcap ? "#dbd6c8" : "#030206";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0085 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildChiaroscuroBase(m, art, t);
        s.needsBaseRebuild = false;
      }

      if (m && s.needsSilkReset) {
        resetSilkParticles(m);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
        s.needsSilkReset = false;
      }

      if (s.topology === "SILK" && m) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = isMadcap ? "rgba(219, 214, 200, 0.08)" : "rgba(3, 2, 6, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = isMadcap ? "source-over" : "screen";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 42; l++) {
          ctx.beginPath();
          const [rC, gC, bC] = resolveEditionColor(art.edition, 180, 120, 250, l / 42, 0.6, t.tone);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.45)";
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

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.38) * 0.2;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.5 + Math.sin(time * 0.5) * 0.16;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      // ==========================================
      // РЕЖИМ 1: TRACE 10.0 (СИНЕСТЕТИЧЕСКАЯ КАЛЛИГРАФИЯ + АКУСТИЧЕСКИЕ СТРУНЫ ГИЛМОРА)
      // ==========================================
      if (s.topology === "TRACE") {
        const prog = s.traceProgress;
        const baseReveal = smoothstep(0.0, 0.5, prog);

        // 1. Отрисовка бархатной светотеневой основы (регулируется ползунком Tonal Depth)
        if (art.tonalDepth > 0.02) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.tonalDepth * baseReveal;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        // 2. Атмосферное квантовое поле (Cosmic Bloom / Sonar Ripples / Harmonic Rays) — мягким наложением screen!
        if (art.auraField !== "PURE_VOID" && !isMadcap) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ox, oy, drawW, drawH);
          ctx.clip();
          ctx.globalCompositeOperation = "screen";

          const focusX = ox + s.fluidU * drawW;
          const focusY = oy + s.fluidV * drawH;
          const maxRad = Math.hypot(drawW, drawH) * 0.65;

          if (art.auraField === "COSMIC_BLOOM") {
            const [aR, aG, aB] = resolveEditionColor(art.edition, 168, 85, 247, 0.6, 0.8, t.tone + time * 0.05);
            const radGrad = ctx.createRadialGradient(focusX, focusY, 5, focusX, focusY, maxRad);
            radGrad.addColorStop(0, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String((0.18 * art.luminanceGlow).toFixed(2)) + ")");
            radGrad.addColorStop(0.5, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + ",0.04)");
            radGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = radGrad;
            ctx.fillRect(ox, oy, drawW, drawH);
          } else if (art.auraField === "SONAR_RIPPLES") {
            const [aR, aG, aB] = resolveEditionColor(art.edition, 35, 215, 255, 0.7, 0.8, t.tone);
            for (let rIdx = 0; rIdx < 6; rIdx++) {
              const rNorm = ((time * 0.25 + rIdx / 6) % 1.0);
              const rPx = rNorm * maxRad * 0.85;
              const rAlpha = (1.0 - rNorm) * 0.25 * art.luminanceGlow;
              ctx.strokeStyle = "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String(rAlpha.toFixed(2)) + ")";
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.arc(focusX, focusY, rPx, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (art.auraField === "HARMONIC_RAYS") {
            const numRays = 24;
            const cx = ox + drawW * 0.5;
            const cy = oy + drawH * 0.45;
            for (let rIdx = 0; rIdx < numRays; rIdx++) {
              const ang = time * 0.12 + (rIdx * Math.PI * 2) / numRays;
              const [aR, aG, aB] = resolveEditionColor(art.edition, 255, 160, 40, rIdx / numRays, 0.7, t.tone);
              ctx.strokeStyle = "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String((0.12 * art.luminanceGlow).toFixed(2)) + ")";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(ang) * maxRad, cy + Math.sin(ang) * maxRad);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // 3. ВЕКТОРНАЯ СИМФОНИЯ И АКУСТИЧЕСКИЙ РЕЗОНАНС СТРУН
        const strokes = m.strokes;
        const pluckAmps = m.pluckAmps;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(110, Math.floor(totalStrokes * 0.24));
        const headFloat = prog * (totalStrokes + windowSpan);
        const waveSpeed = time * (2.0 + t.energy * 2.4);
        const importanceGate = 1.0 - art.detailPrecision;

        ctx.globalCompositeOperation = isMadcap ? "source-over" : "screen";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.importance < importanceGate * 0.65) continue;

          // Проверяем, задел ли курсор эту струну (эффект медиатора по струнам гитары!)
          if (s.mouseActive) {
            const dMouse = Math.hypot(st.centerU - mNormX, st.centerV - mNormY);
            if (dMouse < 0.085) {
              pluckAmps[i] = Math.min(1.0, pluckAmps[i] + (1.0 - dMouse / 0.085) * 0.45);
            }
          }
          // Экспоненциальное затухание сорванной струны
          pluckAmps[i] *= 0.93;
          const pAmp = pluckAmps[i];

          const pts = st.pts;
          const nPts = pts.length;

          const rawLocal = prog >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.02) continue;

          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;

          // На коротких буквах и зрачках фоновая волна почти 0, но при касании мышкой они звонко вибрируют!
          const ambientScale = clip((st.arcLen - 14.0) / 55.0, 0.04, 1.0) * t.chaos * 1.35 * (1.05 - t.structure * 0.85);
          const stringPluckPx = pAmp * (5.5 + t.chaos * 8.0) * Math.sin(time * 28.0 + st.phase);

          // ВАРИАЦИЯ GUILLOCHE (Гравировка гармоническим спирографом)
          if (art.traceVariation === "GUILLOCHE") {
            ctx.beginPath();
            const gFreq = 1.15 + t.symmetry * 2.2;
            const gAmp = (1.2 + st.meanEdge * 3.6 + pAmp * 5.0) * art.strokeWeight;

            for (let k = 0; k <= fullIdx && k < nPts; k++) {
              const pt = pts[k];
              const sNorm = k / Math.max(1, nPts - 1);
              const env = Math.sin(sNorm * Math.PI);
              const spiro = Math.sin(k * gFreq - waveSpeed * 1.5 + st.phase) * gAmp * env;
              const sx = ox + pt.u * drawW + pt.nx * spiro;
              const sy = oy + pt.v * drawH + pt.ny * spiro;
              if (k === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            const [rC, gC, bC] = resolveEditionColor(art.edition, st.r, st.g, st.b, st.meanLum, st.meanEdge, t.tone);
            const gAlpha = clip((0.32 + st.meanEdge * 0.58 + pAmp * 0.4) * localProg, 0.15, 0.94);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(gAlpha.toFixed(2)) + ")";
            ctx.lineWidth = (0.68 + pAmp * 0.8) * art.strokeWeight;
            ctx.stroke();
            continue;
          }

          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 3.2 + pt.v * 3.2) * Math.PI + waveSpeed + st.phase * 0.15;
            const totalNormalDisp =
              (Math.sin(spatialPhase) * ambientScale + Math.sin(sNorm * Math.PI * 2.0) * stringPluckPx) * env;

            coords.push({
              x: ox + pt.u * drawW + pt.nx * totalNormalDisp,
              y: oy + pt.v * drawH + pt.ny * totalNormalDisp,
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

          const [rC, gC, bC] = resolveEditionColor(
            art.edition,
            st.r,
            st.g,
            st.b,
            st.meanLum,
            st.meanEdge,
            t.tone + pAmp * 0.25
          );

          const tierAlpha = st.tier === 1 ? 0.92 : st.tier === 2 ? 0.8 : 0.38;
          const baseAlpha = clip((0.26 + st.meanEdge * 0.62 + st.meanLum * 0.22 + pAmp * 0.45) * tierAlpha * localProg, 0.1, 0.96);
          const baseW = (st.tier === 1 ? (0.78 + st.meanEdge * 0.72) : st.tier === 2 ? 0.58 : 0.44) * art.strokeWeight * (1.0 + pAmp * 0.85);

          buildSmoothPath(coords);

          // Мягкий ореол свечения вокруг силовых линий и задетых струн
          if ((st.tier === 1 || pAmp > 0.1) && art.luminanceGlow > 0.05 && !isMadcap) {
            const glowAlpha = clip(baseAlpha * (0.2 + pAmp * 0.35) * art.luminanceGlow, 0.02, 0.45);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(glowAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW * 2.6;
            ctx.stroke();
          }

          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
          ctx.lineWidth = baseW;
          ctx.stroke();

          // В режиме ENGRAVING добавляем академическую перекрестную штриховку
          if (art.traceVariation === "ENGRAVING" && st.tier <= 2 && coords.length >= 6) {
            const hatchLen = (2.8 + (1.0 - st.meanLum) * 4.5) * art.strokeWeight;
            ctx.beginPath();
            for (let k = 1; k < coords.length - 1; k += 4) {
              const pt = pts[k];
              const hx = (pt.nx * 0.707 - pt.ny * 0.707) * hatchLen;
              const hy = (pt.nx * 0.707 + pt.ny * 0.707) * hatchLen;
              ctx.moveTo(coords[k].x - hx, coords[k].y - hy);
              ctx.lineTo(coords[k].x + hx, coords[k].y + hy);
            }
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((baseAlpha * 0.42).toFixed(2)) + ")";
            ctx.lineWidth = 0.45 * art.strokeWeight;
            ctx.stroke();
          }

          // В режиме LASER_HARP при возбуждении струны вокруг нее рождается спектральная гармоника-обертон!
          if ((art.traceVariation === "LASER_HARP" || pAmp > 0.08) && st.tier === 1 && coords.length >= 5) {
            const overtoneShift = (1.8 + pAmp * 6.5) * Math.sin(waveSpeed * 1.4 + st.phase);
            const harmCoords = coords.map((p, idx) => ({
              x: p.x + pts[idx].nx * overtoneShift,
              y: p.y + pts[idx].ny * overtoneShift,
            }));
            buildSmoothPath(harmCoords);
            const [hR, hG, hB] = CAUCHY_SPECTRUM[i % 7];
            ctx.strokeStyle = "rgba(" + String(hR) + "," + String(hG) + "," + String(hB) + "," + String(clip((0.25 + pAmp * 0.6) * art.luminanceGlow, 0.05, 0.85).toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.7;
            ctx.stroke();
          }

          // Бегущие по контурам кометы жидкого света
          if (art.luminanceGlow > 0.1 && coords.length >= 8 && prog >= 0.92 && !isMadcap) {
            const cometSpan = Math.max(3, Math.floor(coords.length * 0.28));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.85) + st.phase) % 1.45) - 0.22;
            const headIdx = Math.floor(cyclePos * coords.length);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(coords.length - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              buildSmoothPath(coords.slice(tailIdx, clampedHead + 1));
              const [cR, cG, cB] = CAUCHY_SPECTRUM[(i + Math.floor(time * 2)) % 7];
              const cometAlpha = clip(baseAlpha * (0.45 + 0.55 * art.luminanceGlow), 0.18, 0.92);
              ctx.strokeStyle =
                art.edition === "DARK_SIDE" || art.edition === "PIPER_67"
                  ? "rgba(" + String(cR) + "," + String(cG) + "," + String(cB) + "," + String(cometAlpha.toFixed(2)) + ")"
                  : "rgba(255, 250, 240, " + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseW * 1.45;
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS (ЛАМИНАРНОЕ ОБТЕКАНИЕ С ЗАЩИТОЙ ЦЕНТРАЛЬНОГО ОБРАЗА)
      // ==========================================
      else if (s.topology === "CURRENTS" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.smoothRgba;

        const wu = s.fluidU;
        const wv = s.fluidV;
        const silkFreq = 14.0 + t.symmetry * 20.0;
        const warpPx = (0.015 + t.chaos * 0.055) * m.w;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const l = m.lum[baseIdx];
            const e = m.edge[baseIdx];
            const smL = m.smoothLum[baseIdx];
            const fd = m.fdog[baseIdx];

            // Защитный щит анатомии объекта (на буквах, астронавте и лицах сохраняем 100% четкость!)
            const anatomyShield = clip((e * 1.65 + (1.0 - fd) * 0.85) * t.structure, 0.0, 0.92);

            const du = u - wu;
            const dv = v - wv;
            const wakeEnv = Math.exp(-(du * du + dv * dv) * 10.0);
            const flowWave = Math.sin((u * 2.5 + v * 3.5) * Math.PI * c.nHarmonic - time * (1.6 + t.energy * 1.5));

            const mobility = 1.0 - anatomyShield * 0.82;
            const sx = clip(x + (flowWave * 0.6 - dv * wakeEnv * 2.0) * warpPx * mobility, 0, m.w - 1);
            const sy = clip(y + (flowWave * 0.6 + du * wakeEnv * 2.0) * warpPx * mobility, 0, m.h - 1);
            const [rAdv, gAdv, bAdv] = sampleBilinearRGB(src, m.w, m.h, sx, sy);

            const psi = (v * 0.78 - u * 0.42) * silkFreq + smL * 2.6 + flowWave * 0.45 - time * (0.75 + t.energy * 1.1);
            const sinPsi = Math.sin(psi * Math.PI * 2.0);
            const cosPsi = Math.cos(psi * Math.PI * 2.0);

            const [edR, edG, edB] = resolveEditionColor(
              art.edition,
              rAdv,
              gAdv,
              bAdv,
              l,
              e,
              t.tone + smL * 0.5 + 0.25 * sinPsi
            );

            const groove = (0.28 + 0.72 * smoothstep(-0.6, 0.4, cosPsi)) * (1.0 - anatomyShield * 0.75) + anatomyShield * 0.75;
            const chromeSpec = Math.pow(Math.max(0.0, sinPsi), 5.5) * art.luminanceGlow * (0.25 + l * 0.75);

            const p = baseIdx * 4;
            const keepOrig = clip(art.tonalDepth * 0.7 + anatomyShield * 0.5, 0.15, 0.92);
            const mixR = (src[p] * keepOrig + edR * (1.0 - keepOrig * 0.65)) * groove + chromeSpec * 215.0;
            const mixG = (src[p + 1] * keepOrig + edG * (1.0 - keepOrig * 0.65)) * groove + chromeSpec * 225.0;
            const mixB = (src[p + 2] * keepOrig + edB * (1.0 - keepOrig * 0.65)) * groove + chromeSpec * 245.0;

            dst[p] = Math.round(acesTonemap(mixR / 255.0) * 255 * vMask);
            dst[p + 1] = Math.round(acesTonemap(mixG / 255.0) * 255 * vMask);
            dst[p + 2] = Math.round(acesTonemap(mixB / 255.0) * 255 * vMask);
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 3: PIPER (1967 UFO CLUB LIQUID OIL PROJECTION)
      // ==========================================
      else if (s.topology === "PIPER" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.smoothRgba;

        const wu = s.fluidU;
        const wv = s.fluidV;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const p = baseIdx * 4;
            const l = m.lum[baseIdx];
            const e = m.edge[baseIdx];
            const smL = m.smoothLum[baseIdx];
            const fd = m.fdog[baseIdx];

            const du = u - wu;
            const dv = v - wv;
            const heat = Math.exp(-(du * du + dv * dv) * 9.0);

            const oil1 = Math.sin(u * 5.5 + smL * 4.2 + time * 1.1) * Math.cos(v * 5.5 - smL * 3.8 - time * 0.9);
            const oil2 = Math.sin((u * 8.0 - v * 6.0) + oil1 * (1.8 + t.chaos * 2.2) + time * 1.4 + heat * 2.5);

            const [oilR, oilG, oilB] = resolveEditionColor(
              art.edition === "SHINE_ON" ? "PIPER_67" : art.edition,
              src[p],
              src[p + 1],
              src[p + 2],
              l,
              e,
              t.tone + oil1 * 0.3 + oil2 * 0.25
            );

            const inkShadow = clip(0.2 + 0.8 * Math.tanh(8.0 * (fd - 0.26)), 0.1, 1.0);
            const lumWeight = (0.18 + Math.pow(l, 0.85) * 0.82 + e * 0.55) * inkShadow;

            const rOut = (src[p] * art.tonalDepth * 0.65 + oilR * (1.0 - art.tonalDepth * 0.45)) * lumWeight;
            const gOut = (src[p + 1] * art.tonalDepth * 0.65 + oilG * (1.0 - art.tonalDepth * 0.45)) * lumWeight;
            const bOut = (src[p + 2] * art.tonalDepth * 0.65 + oilB * (1.0 - art.tonalDepth * 0.45)) * lumWeight;

            dst[p] = Math.round(acesTonemap(rOut / 255.0) * 255 * vMask);
            dst[p + 1] = Math.round(acesTonemap(gOut / 255.0) * 255 * vMask);
            dst[p + 2] = Math.round(acesTonemap(bOut / 255.0) * 255 * vMask);
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 4: PRISM (DARK-FIELD CAUSTICS & CAUCHY DISPERSION)
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

            const darkFieldFactor = (0.28 + art.tonalDepth * 0.45) * (0.45 + e * 0.85) / (1.0 + l * 0.85);
            let rLin = (src[p] / 255.0) * darkFieldFactor;
            let gLin = (src[p + 1] / 255.0) * darkFieldFactor;
            let bLin = (src[p + 2] / 255.0) * darkFieldFactor;

            const glowScale = 0.14 + art.luminanceGlow * 0.24;
            for (let band = 0; band < 7; band++) {
              const bandNorm = (band + 1) / 7.0;
              const dist = bandNorm * maxDispersion;
              const sx = Math.round(x - dirX * dist);
              const sy = Math.round(y - dirY * dist);

              if (sx >= 0 && sx < m.w && sy >= 0 && sy < m.h) {
                const sEdge = m.edge[sy * m.w + sx];
                if (sEdge > 0.16) {
                  const falloff = (1.0 - bandNorm * 0.45) * sEdge * glowScale;
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
        ctx.globalCompositeOperation = isMadcap ? "source-over" : "screen";
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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.smoothRgba[p], m.smoothRgba[p + 1], m.smoothRgba[p + 2], l, e, t.tone);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(3)) + ")";
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
        ctx.globalCompositeOperation = isMadcap ? "source-over" : "screen";

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
          const scanGlow = scanDist < 0.055 ? (1.0 - scanDist / 0.055) * 0.65 * art.luminanceGlow : 0.0;

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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.smoothRgba[p], m.smoothRgba[p + 1], m.smoothRgba[p + 2], l, e, t.tone);
            const alpha = clip((0.28 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.94);

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
        if (art.tonalDepth > 0.02) {
          ctx.globalAlpha = art.tonalDepth * 0.6;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const numLines = Math.floor(95 + art.detailPrecision * 65);
        const numCols = 220;
        const maxElevation = (drawH / numLines) * (2.6 + t.structure * 2.8);

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          ctx.globalCompositeOperation = "source-over";
          ctx.beginPath();
          ctx.moveTo(ox, baseScreenY + 3);

          let rowLum = 0, rowEdge = 0;
          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const uNorm = cIdx / (numCols - 1);
            const sx = Math.min(m.w - 1, Math.floor(uNorm * m.w));
            const cell = sy * m.w + sx;
            const l = m.lum[cell];
            const e = m.edge[cell];
            const vMask = m.mask[cell];
            rowLum += l;
            rowEdge += e;

            const vib = Math.sin(uNorm * (30.0 + e * 55.0) + time * 4.2 + rIdx * 0.5) * (e * 0.45 + t.chaos * 0.2) * vMask;
            const elev = (l * 0.8 + e * 0.45 + vib * 0.35) * maxElevation * vMask;
            ctx.lineTo(ox + uNorm * drawW, baseScreenY - elev);
          }
          ctx.lineTo(ox + drawW, baseScreenY + 3);
          ctx.closePath();
          ctx.fillStyle = isMadcap ? "rgba(219, 214, 200, 0.82)" : "rgba(3, 2, 6, 0.78)";
          ctx.fill();

          const midCell = (sy * m.w + Math.floor(m.w * 0.5)) * 4;
          const [rC, gC, bC] = resolveEditionColor(
            art.edition,
            m.smoothRgba[midCell],
            m.smoothRgba[midCell + 1],
            m.smoothRgba[midCell + 2],
            rowLum / numCols,
            rowEdge / numCols,
            t.tone
          );
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.9)";
          ctx.lineWidth = 1.05 * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 8: CRYSTAL
      // ==========================================
      else if (s.topology === "CRYSTAL") {
        if (art.tonalDepth > 0.02) {
          ctx.globalAlpha = art.tonalDepth * 0.65;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const cells = m.cells;
        for (let i = 0; i < cells.length; i++) {
          const cl = cells[i];
          const phase = (cl.u * 9.0 + cl.v * 9.0) * c.nHarmonic - time * 2.6;
          const shift = Math.sin(phase) * t.chaos * 6.5;

          const cx = ox + cl.u * drawW + cl.tx * shift;
          const cy = oy + cl.v * drawH + cl.ty * shift;
          const rad = cl.size * drawW * (0.52 + cl.lum * 0.48) * art.strokeWeight;
          const rot = Math.atan2(cl.ty, cl.tx) + Math.sin(time + i * 0.03) * t.chaos * 0.6;

          const [rC, gC, bC] = resolveEditionColor(art.edition, cl.r, cl.g, cl.b, cl.lum, cl.edge, t.tone);
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

          ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((0.55 + cl.lum * 0.4).toFixed(2)) + ")";
          ctx.fill();
        }
      }

      // ==========================================
      // РЕЖИМ 9: GLYPH
      // ==========================================
      else if (s.topology === "GLYPH") {
        if (art.tonalDepth > 0.02) {
          ctx.globalAlpha = art.tonalDepth * 0.55;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isMadcap ? "source-over" : "screen";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(54 + art.detailPrecision * 32);
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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.smoothRgba[p], m.smoothRgba[p + 1], m.smoothRgba[p + 2], l, e, t.tone);
            const alpha = clip((0.28 + l * 0.72 + e * 0.45) * vMask, 0.08, 0.95);
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            ctx.fillText(ch, ox + u * drawW, oy + v * drawH);
          }
        }
      }

      // ==========================================
      // ГАЛЕРЕЙНАЯ РАМКА И ПАСПОРТ АРТЕФАКТА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isMadcap ? "rgba(25, 20, 18, 0.4)" : "rgba(255, 255, 255, 0.18)";
        const textFill = isMadcap ? "rgba(25, 20, 18, 0.75)" : "rgba(255, 255, 255, 0.58)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1.1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT // " + (query || "SHINE ON").toUpperCase().slice(0, 22) + " [" + art.edition + " · " + s.topology + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          "H(X)=" + String(c.entropy) + "b | λ=" + String(c.lyapunov) + " | PURE MATH",
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
        .barrett-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.5); border-radius: 99px; }
        .barrett-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.9); }
      `}} />

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[600px] md:h-[760px] rounded-2xl overflow-hidden border border-white/10 bg-[#030206] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
          </div>

          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>TOUCH STRINGS TO PLUCK | H(X): <span className="text-white">{coeffs.entropy}b</span> | λ: <span className="text-[#10b981]">{coeffs.lyapunov}</span></div>
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
              className="h-9 px-2.5 rounded-lg border border-[#a855f7]/60 text-[#a855f7] hover:bg-[#a855f7] hover:text-black font-mono text-[8px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
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
                    ? "border-[#a855f7] scale-105 shadow-[0_0_12px_rgba(168,85,247,0.75)]"
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
                  className="btn-elegant !bg-black/75 backdrop-blur-md border-[#a855f7]/60 text-[#a855f7]"
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

      {/* ПРАВАЯ ПАНЕЛЬ: BARRETT SYNESTHETIC STUDIO 10.0 */}
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
                Floyd Tribute Studio
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
            <span className="font-mono text-[8px] text-[#a855f7] uppercase tracking-widest">ZERO-AI</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {/* 6 ТРИБЬЮТ-ЭПОХ PINK FLOYD */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Pink Floyd Tribute Era:</span>
                  <button
                    type="button"
                    onClick={() => updateArt("posterFrame", !artConfig.posterFrame)}
                    className={
                      "px-2 py-0.5 rounded border text-[8px] cursor-pointer transition-all " +
                      (artConfig.posterFrame
                        ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                        : "border-white/15 text-neutral-400")
                    }
                  >
                    Poster Frame
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "SHINE_ON", label: "Shine On (Velour & Light)", dot: "linear-gradient(135deg,#38bdf8,#f59e0b)" },
                      { id: "DARK_SIDE", label: "Dark Side (Prism Noir)", dot: "linear-gradient(135deg,#ef4444,#3b82f6)" },
                      { id: "PIPER_67", label: "Piper '67 (UFO Liquid)", dot: "linear-gradient(135deg,#ec4899,#eab308)" },
                      { id: "POMPEII", label: "Pompeii (Volcanic Gold)", dot: "linear-gradient(135deg,#f59e0b,#78350f)" },
                      { id: "ECHOES", label: "Echoes (Abyssal Sonar)", dot: "linear-gradient(135deg,#10b981,#1d4ed8)" },
                      { id: "MADCAP", label: "Madcap (Archival Ink)", dot: "linear-gradient(135deg,#dbd6c8,#18181b)" },
                    ] as { id: TributeEdition; label: string; dot: string }[]
                  ).map((ed) => (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => applyTributeEdition(ed.id)}
                      className={
                        "py-2 px-2.5 rounded-lg border text-[8px] tracking-wider flex items-center gap-2 transition-all cursor-pointer " +
                        (artConfig.edition === ed.id
                          ? "bg-white text-black border-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ background: ed.dot }} />
                      <span className="truncate">{ed.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 ПАРАДИГМЫ ВЕКТОРНОЙ ТРАССИРОВКИ */}
              <div>
                <div className="text-neutral-400 mb-1.5">Vector Tracing Architecture:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "SYMPHONIC", label: "Symphonic" },
                      { id: "LASER_HARP", label: "Laser Harp" },
                      { id: "GUILLOCHE", label: "Guilloché" },
                      { id: "ENGRAVING", label: "Engraving" },
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
                          ? "bg-[#a855f7] text-black border-[#a855f7] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {tv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 ОПТИЧЕСКИХ АТМОСФЕРНЫХ ПОЛЯ */}
              <div>
                <div className="text-neutral-400 mb-1.5">Atmospheric Optical Field:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "COSMIC_BLOOM", label: "Nebula" },
                      { id: "SONAR_RIPPLES", label: "Sonar" },
                      { id: "HARMONIC_RAYS", label: "Sunburst" },
                      { id: "PURE_VOID", label: "Pure Void" },
                    ] as { id: AuraFieldType; label: string }[]
                  ).map((af) => (
                    <button
                      key={af.id}
                      type="button"
                      onClick={() => updateArt("auraField", af.id)}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.auraField === af.id
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {af.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки тонкой настройки */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Chiaroscuro Tonal Foundation</span>
                    <span className="text-[#a855f7]">{Math.round(artConfig.tonalDepth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.95"
                    step="0.02"
                    value={artConfig.tonalDepth}
                    onChange={(e) => updateArt("tonalDepth", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Micro-Detail Precision (Faces & Text)</span>
                    <span className="text-[#10b981]">{Math.round(artConfig.detailPrecision * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.98"
                    step="0.02"
                    value={artConfig.detailPrecision}
                    onChange={(e) => updateArt("detailPrecision", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Vector Filament Calibre</span>
                    <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.05"
                    value={artConfig.strokeWeight}
                    onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Photonic Comets & Prism Glow</span>
                    <span className="text-white">{Math.round(artConfig.luminanceGlow * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.luminanceGlow}
                    onChange={(e) => updateArt("luminanceGlow", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 font-mono text-[10px] uppercase tracking-widest">
              {(
                [
                  { key: "energy", label: "Energy (Photon & Wave Velocity)" },
                  { key: "chaos", label: "Chaos (String Resonance & Curl)" },
                  { key: "tone", label: "Tone (Spectral Wavelength Shift)" },
                  { key: "structure", label: "Structure (Anatomy Lock)" },
                  { key: "symmetry", label: "Symmetry (Harmonic Frequency)" },
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
                <div className="text-white uppercase">Acoustic String & FDoG Kernel:</div>
                <div>y_pluck(s,t) = A_0 · exp(-γt) · sin(πs) · cos(ωt)</div>
                <div>I_chiaroscuro = I^0.88 · tanh(8 · (FDoG(x) - ε))</div>
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
            className="btn-elegant w-full !py-3 justify-center border-[#a855f7]/50 text-[#a855f7]"
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
