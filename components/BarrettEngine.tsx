"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость потоков света и фазовых волн
  chaos: number;     // C: амплитуда адвекции жидкого шелка и турбулентности
  tone: number;      // H: фазовый сдвиг спектральной интерференции
  structure: number; // St: сила удержания четкости объекта (Subject Lock)
  symmetry: number;  // Sy: частота ламинарных волн и зеркальная симметрия
}

type MasterPreset = "SYD_1967" | "BLUEPRINT" | "SIN_CITY" | "GOLD_24K" | "DA_VINCI" | "CYBERPUNK";

type PalettePreset =
  | "CURRENTS"
  | "CHROME"
  | "CYBER"
  | "GOLD"
  | "NOIR"
  | "EMERALD"
  | "BLUEPRINT"
  | "SEPIA"
  | "NATIVE"
  | "CUSTOM";

type StyleEnginePreset = "RAZOR_VECTOR" | "INK_HATCH" | "HALFTONE" | "RGB_SPLIT";
type FlowAnimationMode = "COMETS" | "LASER_LOOP" | "PULSE" | "STILL";
type CanvasTheme = "VOID" | "PAPER" | "CYANOTYPE";

interface ArtStudioConfig {
  master: MasterPreset;
  palette: PalettePreset;
  styleEngine: StyleEnginePreset;
  flowMode: FlowAnimationMode;
  theme: CanvasTheme;
  posterFrame: boolean;
  primaryHex: string;
  secondaryHex: string;
  strokeWeight: number;    // 0.35 .. 2.2
  noiseGate: number;       // 0.02 .. 0.65
  subjectClarity: number;  // 0.0 .. 0.85 (четкость исходного образа)
  glowIntensity: number;   // 0.0 .. 1.0
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
  lum: Float32Array;       // Нормализованная яркость без пересветов (Soft-Knee HDR)
  smoothLum: Float32Array; // Глубоко сглаженный потенциал для жидкого шелка CURRENTS
  smoothGx: Float32Array;
  smoothGy: Float32Array;
  edge: Float32Array;      // 100% точный градиент с локальным вытягиванием теней
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
const SILK_COUNT = 4600;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

// 7 сбалансированных длин волн Коши (сумма весов нормирована, чтобы исключить белый пересвет!)
const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 45, 75],   // Ruby Red
  [255, 135, 25],  // Amber Orange
  [245, 225, 45],  // Solar Gold
  [35, 235, 125],  // Emerald Green
  [30, 210, 255],  // Cyan Ice
  [75, 105, 255],  // Cobalt Blue
  [195, 55, 255],  // Deep Violet
];

function clip(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clip((x - edge0) / Math.max(1e-6, edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Кинематографический компрессор яркости ACES Filmic (полностью исключает выгорание в белый цвет!)
function acesTonemap(x: number): number {
  const v = Math.max(0.0, x);
  return clip((v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14), 0.0, 1.0);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  if (isNaN(num)) return [168, 85, 247];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Тонкопленочная интерференция света в жидкой пленке (Syd Barrett Liquid Light / Tame Impala Iridescence)
function thinFilmIridescence(phase: number, lum: number, edge: number): [number, number, number] {
  const p = phase * Math.PI * 2.0;
  const r = 0.52 + 0.48 * Math.cos(p + 0.0);
  const g = 0.42 + 0.48 * Math.cos(p - 2.094);
  const b = 0.58 + 0.42 * Math.cos(p + 2.094);
  const boost = 0.35 + lum * 0.55 + edge * 0.45;
  return [
    Math.min(255, Math.round(acesTonemap(r * boost * 1.4) * 255)),
    Math.min(255, Math.round(acesTonemap(g * boost * 1.3) * 255)),
    Math.min(255, Math.round(acesTonemap(b * boost * 1.55) * 255)),
  ];
}

function resolveArtColor(
  art: ArtStudioConfig,
  nativeR: number,
  nativeG: number,
  nativeB: number,
  lum: number,
  edge: number,
  toneShift: number,
  preserveDarkness = false
): [number, number, number] {
  const energy = clip(lum * 0.55 + edge * 0.65, 0.0, 1.0);
  const darkGate = preserveDarkness ? smoothstep(0.02, 0.2, lum + edge * 0.85) : 1.0;
  const w = clip(energy + (toneShift > 0.02 ? Math.sin(toneShift * Math.PI * 2 + lum * 3.5) * 0.2 : 0), 0.0, 1.0);

  if (art.palette === "SEPIA" || art.theme === "PAPER") {
    // Архивная тушь Да Винчи / Рембрандта на бумаге (темнее там, где сильнее грань)
    const inkDarkness = clip(1.0 - edge * 0.75 - (1.0 - lum) * 0.35, 0.08, 0.45);
    return [
      Math.round(68 * inkDarkness),
      Math.round(42 * inkDarkness),
      Math.round(28 * inkDarkness),
    ];
  }

  if (art.palette === "BLUEPRINT" || art.theme === "CYANOTYPE") {
    // Инженерный чертеж: ослепительно-белый и ледяной циан
    return [
      Math.min(255, Math.round(110 + w * 145)),
      Math.min(255, Math.round(205 + w * 50)),
      255,
    ];
  }

  let rOut = nativeR;
  let gOut = nativeG;
  let bOut = nativeB;

  if (art.palette === "CHROME") {
    const v = Math.min(255, Math.round(145 + w * 110));
    rOut = Math.max(0, v - 10);
    gOut = v;
    bOut = Math.min(255, v + 15);
  } else if (art.palette === "CURRENTS") {
    const [irR, irG, irB] = thinFilmIridescence(0.78 + w * 0.55 + toneShift, lum, edge);
    rOut = irR;
    gOut = irG;
    bOut = irB;
  } else if (art.palette === "CYBER") {
    rOut = Math.min(255, Math.round(255 * (1.0 - w * 0.75) + edge * 50));
    gOut = Math.min(255, Math.round(25 + w * 230));
    bOut = Math.min(255, Math.round(165 + w * 90));
  } else if (art.palette === "GOLD") {
    rOut = Math.min(255, Math.round(195 + w * 60));
    gOut = Math.min(255, Math.round(140 + w * 105));
    bOut = Math.min(255, Math.round(35 + w * 140));
  } else if (art.palette === "NOIR") {
    if (edge > 0.32 && lum < 0.65) {
      rOut = 245;
      gOut = 25;
      bOut = 40;
    } else {
      const v = Math.round(165 + w * 90);
      rOut = v;
      gOut = v;
      bOut = v;
    }
  } else if (art.palette === "EMERALD") {
    rOut = Math.round(20 + w * 115);
    gOut = Math.min(255, Math.round(165 + w * 90));
    bOut = Math.min(255, Math.round(115 + w * 115));
  } else if (art.palette === "CUSTOM") {
    const [r1, g1, b1] = hexToRgb(art.primaryHex);
    const [r2, g2, b2] = hexToRgb(art.secondaryHex);
    rOut = Math.round(r1 * (1.0 - w) + r2 * w);
    gOut = Math.round(g1 * (1.0 - w) + g2 * w);
    bOut = Math.round(b1 * (1.0 - w) + b2 * w);
  } else {
    // NATIVE с мягким усилением насыщенности
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    rOut = clip(Math.round(avg + (nativeR - avg) * 1.45 + 45), 25, 250);
    gOut = clip(Math.round(avg + (nativeG - avg) * 1.45 + 45), 25, 250);
    bOut = clip(Math.round(avg + (nativeB - avg) * 1.45 + 55), 35, 255);
  }

  return [
    Math.round(rOut * darkGate),
    Math.round(gOut * darkGate),
    Math.round(bOut * darkGate),
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.35 + 0.48, 0.48, 0.86);
  const chaos = clip((entropy / 4.5) * 0.14 + 0.12, 0.10, 0.28);
  const tone = 0.0;
  const structure = clip(0.88 + consonantRatio * 0.10, 0.88, 0.98);
  const symmetry = 0.32;

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

function sampleBilinearScalar(field: Float32Array, w: number, h: number, fx: number, fy: number): number {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;

  const i00 = y0 * w + x0;
  const i10 = y0 * w + x1;
  const i01 = y1 * w + x0;
  const i11 = y1 * w + x1;

  return (
    field[i00] * (1 - dx) * (1 - dy) +
    field[i10] * dx * (1 - dy) +
    field[i01] * (1 - dx) * dy +
    field[i11] * dx * dy
  );
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
// ЯДРО ДЕКОМПОЗИЦИИ С ТОЧНОЙ СКЕЛЕТНОЙ ТРАССИРОВКОЙ КЭННИ (БЕЗ РАЗМЫТИЯ БУКВ И УГЛОВ!)
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
      lum,
      smoothLum: lum,
      smoothGx: gx,
      smoothGy: gy,
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
  const sharpRgba = new Uint8ClampedArray(rawRgba.length);

  // 1. HDR-нормализация яркости (Soft-Knee): вытягивает темные гитары/лица И защищает яркие бриллианты от выгорания!
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = Math.abs(ny) > 0.92 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.92) / 0.08) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.92 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.92) / 0.08) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const p = i * 4;
      const rawL = (0.299 * rawRgba[p] + 0.587 * rawRgba[p + 1] + 0.114 * rawRgba[p + 2]) / 255.0;
      // Кривая с подъемом теней и мягким потолком в светах
      const balancedL = Math.pow(rawL, 0.68) / (1.0 + 0.25 * rawL * rawL);
      lum[i] = clip(balancedL * 1.18) * mask[i];

      sharpRgba[p] = rawRgba[p];
      sharpRgba[p + 1] = rawRgba[p + 1];
      sharpRgba[p + 2] = rawRgba[p + 2];
      sharpRgba[p + 3] = 255;
    }
  }

  // Глубоко сглаженный потенциал для жидкого обтекания CURRENTS (14 проходов = идеальный шелк без ряби!)
  const smoothLum = gaussianBlurField(lum, w, h, 14);
  const smoothGx = new Float32Array(total);
  const smoothGy = new Float32Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      smoothGx[i] = (smoothLum[i + 1] - smoothLum[i - 1]) * 0.5;
      smoothGy[i] = (smoothLum[i + w] - smoothLum[i - w]) * 0.5;
    }
  }

  // 2. Оператор Щарра по НЕРАЗМЫТОМУ полю lum (сохраняет 100% четкость мелких букв, зрачков и граней алмаза!)
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

  // Локально-адаптивная нормализация граней (Retinex) с отсечением фонового шума
  const localEnv = gaussianBlurField(rawGradMag, w, h, 7);
  const absFloor = globalMaxEdge * 0.038;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    if (gVal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.18, localEnv[i] * 2.2 + globalMaxEdge * 0.08);
      edge[i] = clip((gVal - absFloor * 0.75) / denom);
    }
    if (edge[i] > 0.12 || (lum[i] > 0.18 && edge[i] > 0.04)) {
      spawnIndices.push(i);
    }
  }

  // ==========================================
  // ТОЧНАЯ 1-ПИКСЕЛЬНАЯ СКЕЛЕТНАЯ ВЕКТОРИЗАЦИЯ КЭННИ С СОХРАНЕНИЕМ УГЛОВ И ШРИФТОВ!
  // ==========================================
  // Вместо интеграции размытого поля ETF (которая скручивала буквы в макароны),
  // мы выделяем строгий 1-пиксельный гребень градиента (Canny Ridge Skeleton) и связываем соседние пиксели
  // с субпиксельной параболической поправкой!
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

      // Строгий локальный максимум вдоль нормали градиента (толщина строго 1 пиксель!)
      if (e0 >= ePrev && e0 > eNext) {
        isRidgeMap[i] = 1;
        // Субпиксельная параболическая интерполяция вершины пика (-0.45 .. +0.45 px)
        const denom = 2.0 * (ePrev - 2.0 * e0 + eNext);
        const offset = Math.abs(denom) > 1e-4 ? clip((ePrev - eNext) / denom, -0.45, 0.45) : 0.0;
        subOffsetX[i] = gx[i] * offset;
        subOffsetY[i] = gy[i] * offset;

        const tier: 1 | 2 = e0 > 0.22 ? 1 : 2;
        ridgeSeeds.push({ idx: i, score: e0, tier });
      }
    }
  }

  ridgeSeeds.sort((a, b) => b.score - a.score);

  // 8-связный обход соседей по касательной с сохранением острых углов граней и букв
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

        // Разрешаем плавные изгибы букв и граней (до 75 градусов за шаг)
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

  // Сглаживание С-сохранением-углов (Bilateral Curve Filter):
  // Убирает микро-ступеньки пиксельной сетки (0.5px), но НЕ скругляет острые вершины ромба и углы букв!
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

        // Если это острый угол буквы или вершина ромба (cosAngle < 0.65) — НЕ трогаем вершину!
        if (cosAngle > 0.65) {
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

    const back = tracePixelSkeleton(seed.idx, -1, 90).reverse();
    const fwd = tracePixelSkeleton(seed.idx, 1, 90);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < 3) continue;

    const pts = bilateralCornerPreservingSmooth(rawPts);
    if (pts.length < 3) continue;

    let eSum = 0;
    let lSum = 0;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;

    for (let k = 0; k < pts.length; k++) {
      const pxIdx = Math.min(h - 1, Math.max(0, Math.floor(pts[k].v * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(pts[k].u * w)));
      eSum += edge[pxIdx];
      lSum += lum[pxIdx];
      const p4 = pxIdx * 4;
      rSum += sharpRgba[p4];
      gSum += sharpRgba[p4 + 1];
      bSum += sharpRgba[p4 + 2];
    }

    const n = pts.length;
    const meanEdge = eSum / n;
    const arcLen = n;
    const importance = clip(meanEdge * 1.15 + Math.min(0.35, arcLen / 80.0));

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
      arcLen,
    });
  }

  // Добавляем деликатную гравировку полутонов (Tier 3) вдоль изофот для объема лиц и одежды
  for (let y = 6; y < h - 6; y += 5) {
    for (let x = 6; x < w - 6; x += 5) {
      if (strokes.length >= maxStrokes + 600) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.1 || lum[idx] < 0.18 || edge[idx] < 0.03) continue;

      const hatchPts: { u: number; v: number; nx: number; ny: number }[] = [];
      let cx = x + 0.5;
      let cy = y + 0.5;
      for (let s = 0; s < 10; s++) {
        const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
        const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
        const cIdx = iy * w + ix;
        const tx = etfX[cIdx];
        const ty = etfY[cIdx];
        hatchPts.push({ u: cx / w, v: cy / h, nx: -ty, ny: tx });
        cx += tx * 1.4;
        cy += ty * 1.4;
      }
      const p4 = idx * 4;
      strokes.push({
        pts: hatchPts,
        tier: 3,
        r: sharpRgba[p4],
        g: sharpRgba[p4 + 1],
        b: sharpRgba[p4 + 2],
        meanEdge: edge[idx],
        meanLum: lum[idx],
        importance: clip(lum[idx] * 0.45),
        phase: (strokes.length * PHI) % (Math.PI * 2),
        speed: 0.5,
        arcLen: 14,
      });
    }
  }

  // Сортируем от центра к краям
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
            r: sharpRgba[sp],
            g: sharpRgba[sp + 1],
            b: sharpRgba[sp + 2],
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
          r: sharpRgba[p],
          g: sharpRgba[p + 1],
          b: sharpRgba[p + 2],
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
    rgba: sharpRgba,
    lum,
    smoothLum,
    smoothGx,
    smoothGy,
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
    master: "SYD_1967",
    palette: "CURRENTS",
    styleEngine: "RAZOR_VECTOR",
    flowMode: "COMETS",
    theme: "VOID",
    posterFrame: true,
    primaryHex: "#c026d3",
    secondaryHex: "#38bdf8",
    strokeWeight: 0.85,    // Изящная бритвенная линия по умолчанию (не слипается на буквах!)
    noiseGate: 0.08,       // Все мелкие детали лица, текста и граней алмаза открыты!
    subjectClarity: 0.36,  // Глубокий рельеф объекта под векторными нитями
    glowIntensity: 0.65,
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
    needsUnderlayRebuild: true,
    isPaused: false,
    isMobile: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    smoothYaw: 0,
    smoothPitch: -0.18,
    fluidU: 0.5,
    fluidV: 0.5,
    fluidVelU: 0.0,
    fluidVelV: 0.0,
  });

  // Применение одного из 6 мастер-пресетов в 1 клик (радикальная смена всего визуального стиля!)
  const applyMasterPreset = (preset: MasterPreset) => {
    let next: ArtStudioConfig = { ...artConfig, master: preset };
    if (preset === "SYD_1967") {
      next = {
        ...next,
        palette: "CURRENTS",
        styleEngine: "RAZOR_VECTOR",
        flowMode: "COMETS",
        theme: "VOID",
        strokeWeight: 0.85,
        noiseGate: 0.08,
        subjectClarity: 0.36,
        glowIntensity: 0.72,
      };
    } else if (preset === "BLUEPRINT") {
      next = {
        ...next,
        palette: "BLUEPRINT",
        styleEngine: "RAZOR_VECTOR",
        flowMode: "LASER_LOOP",
        theme: "CYANOTYPE",
        strokeWeight: 0.75,
        noiseGate: 0.06,
        subjectClarity: 0.22,
        glowIntensity: 0.45,
      };
    } else if (preset === "SIN_CITY") {
      next = {
        ...next,
        palette: "NOIR",
        styleEngine: "INK_HATCH",
        flowMode: "PULSE",
        theme: "VOID",
        strokeWeight: 1.05,
        noiseGate: 0.1,
        subjectClarity: 0.42,
        glowIntensity: 0.55,
      };
    } else if (preset === "GOLD_24K") {
      next = {
        ...next,
        palette: "GOLD",
        styleEngine: "RAZOR_VECTOR",
        flowMode: "COMETS",
        theme: "VOID",
        strokeWeight: 0.9,
        noiseGate: 0.08,
        subjectClarity: 0.32,
        glowIntensity: 0.8,
      };
    } else if (preset === "DA_VINCI") {
      next = {
        ...next,
        palette: "SEPIA",
        styleEngine: "INK_HATCH",
        flowMode: "STILL",
        theme: "PAPER",
        strokeWeight: 0.8,
        noiseGate: 0.05,
        subjectClarity: 0.28,
        glowIntensity: 0.0,
      };
    } else if (preset === "CYBERPUNK") {
      next = {
        ...next,
        palette: "CYBER",
        styleEngine: "RGB_SPLIT",
        flowMode: "COMETS",
        theme: "VOID",
        strokeWeight: 0.95,
        noiseGate: 0.1,
        subjectClarity: 0.35,
        glowIntensity: 0.85,
      };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsUnderlayRebuild = true;
    if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING CORNER-LOCKED SKELETON [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMob = typeof window !== "undefined" && window.innerWidth < 768;
      stateRef.current.isMobile = isMob;
      const buf = buildMatrixFromImage(img, isMob);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      stateRef.current.needsUnderlayRebuild = true;
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " EXACT VECTORS (" + String(buf.w) + "x" + String(buf.h) + ")"
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
    stateRef.current.needsUnderlayRebuild = true;
  }, [tensor, coeffs, artConfig, topology, isPaused]);

  const handleAxisChange = (axis: keyof Tensor5D, value: number) => {
    setTensor((prev) => {
      const updated = { ...prev, [axis]: value };
      stateRef.current.tensor = updated;
      return updated;
    });
  };

  const updateArt = <K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsUnderlayRebuild = true;
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
  // ЯДРО РЕНДЕРИНГА BARRETT PRISM 7.0 (60 FPS, ACES HDR)
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

    const underlayCanvas = document.createElement("canvas");
    const underlayCtx = underlayCanvas.getContext("2d");

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

    const buildCrispPath = (coords: { x: number; y: number }[]) => {
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

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const art = s.art;
      const m = s.matrix;

      const isPaper = art.theme === "PAPER";
      const isCyanotype = art.theme === "CYANOTYPE";
      const bgHex = isPaper ? "#f2eadb" : isCyanotype ? "#06152d" : "#020104";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (art.flowMode === "LASER_LOOP") {
          s.traceProgress = (s.traceProgress + 0.0055 * (0.6 + t.energy)) % 1.35;
        } else if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.013 * (0.65 + t.energy * 1.2));
        }
      }
      const time = s.time;

      if (m && s.needsSilkReset) {
        resetSilkParticles(m);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
        s.needsSilkReset = false;
      }

      if (s.topology === "SILK" && m) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = isPaper
          ? "rgba(242, 234, 219, 0.09)"
          : isCyanotype
          ? "rgba(6, 21, 45, 0.09)"
          : "rgba(2, 1, 4, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 42; l++) {
          ctx.beginPath();
          const [rC, gC, bC] = resolveArtColor(art, 180, 120, 250, l / 42, 0.6, t.tone);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.45)";
          ctx.lineWidth = 1.1 * art.strokeWeight;
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

      const pad = 26;
      const availW = viewW - pad * 2;
      const availH = viewH - 126;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.41;

      const theta = t.tone * Math.PI * 2;
      const mNormX = (s.mouseX - ox) / Math.max(1, drawW);
      const mNormY = (s.mouseY - oy) / Math.max(1, drawH);

      // Плавная гидродинамическая инерция курсора/пальца
      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.36) * 0.22;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.48 + Math.sin(time * 0.48) * 0.18;
      const prevU = s.fluidU;
      const prevV = s.fluidV;
      s.fluidU += (goalU - s.fluidU) * 0.07;
      s.fluidV += (goalV - s.fluidV) * 0.07;
      s.fluidVelU = s.fluidVelU * 0.86 + (s.fluidU - prevU) * 12.0;
      s.fluidVelV = s.fluidVelV * 0.86 + (s.fluidV - prevV) * 12.0;

      // Кэшированная подложка скульптурного рельефа
      if (underlayCtx && s.needsUnderlayRebuild) {
        underlayCanvas.width = m.w;
        underlayCanvas.height = m.h;
        const uImg = underlayCtx.createImageData(m.w, m.h);
        const uDst = uImg.data;
        const src = m.rgba;

        for (let i = 0; i < m.w * m.h; i++) {
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;
          const p = i * 4;
          const lVal = m.lum[i];
          const eVal = m.edge[i];

          if (isPaper) {
            // Легкая графитовая тонировка на старинной бумаге
            const shade = Math.round(235 - (1.0 - lVal) * 45 - eVal * 55);
            uDst[p] = shade;
            uDst[p + 1] = shade - 6;
            uDst[p + 2] = shade - 16;
            uDst[p + 3] = Math.round(vMask * 255);
          } else {
            const [r, g, b] = resolveArtColor(art, src[p], src[p + 1], src[p + 2], lVal, eVal, t.tone, true);
            uDst[p] = Math.round(r * vMask);
            uDst[p + 1] = Math.round(g * vMask);
            uDst[p + 2] = Math.round(b * vMask);
            uDst[p + 3] = Math.round(clip(lVal * 1.15 + eVal * 0.85, 0, 1) * vMask * 255);
          }
        }
        underlayCtx.putImageData(uImg, 0, 0);
        s.needsUnderlayRebuild = false;
      }

      // Инженерная миллиметровая сетка для темы CYANOTYPE (Blueprint)
      if (isCyanotype) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
        ctx.lineWidth = 0.5;
        const gridStep = 28;
        ctx.beginPath();
        for (let gx = ox; gx <= ox + drawW; gx += gridStep) {
          ctx.moveTo(gx, oy);
          ctx.lineTo(gx, oy + drawH);
        }
        for (let gy = oy; gy <= oy + drawH; gy += gridStep) {
          ctx.moveTo(ox, gy);
          ctx.lineTo(ox + drawW, gy);
        }
        ctx.stroke();
      }

      // ==========================================
      // РЕЖИМ 1: TRACE 7.0 (ЮВЕЛИРНАЯ СКЕЛЕТНАЯ ГРАВЮРА БЕЗ БЕЛЫХ ПЯТЕН И МАКАРОН!)
      // ==========================================
      if (s.topology === "TRACE") {
        const clampedProg = Math.min(1.0, s.traceProgress);
        const easedGlobal = smoothstep(0.0, 1.0, clampedProg);

        if (art.subjectClarity > 0.01) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.subjectClarity * easedGlobal;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        // ВАЖНО: используем "screen" вместо "lighter", чтобы соседние штрихи на буквах НИКОГДА не выгорали в белую кашу!
        ctx.globalCompositeOperation = isPaper ? "multiply" : "screen";
        ctx.lineCap = art.styleEngine === "HALFTONE" ? "butt" : "round";
        ctx.lineJoin = "round";

        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(90, Math.floor(totalStrokes * 0.22));
        const headFloat = clampedProg * (totalStrokes + windowSpan);

        const waveSpeed = time * (1.8 + t.energy * 2.0);
        const foldMirror = t.symmetry > 0.68;

        // На буквах и коротких гранях амплитуда деформации сведена к минимуму, чтобы геометрия была 100% точной!
        const baseWaveAmp =
          art.flowMode === "STILL"
            ? 0.0
            : t.chaos * 1.15 * (1.04 - t.structure * 0.88);

        const breathPulse =
          art.flowMode === "PULSE"
            ? 0.8 + 0.35 * Math.sin(time * 3.6)
            : 1.0;

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.importance < art.noiseGate) continue;

          const pts = st.pts;
          const nPts = pts.length;

          const rawLocal = clampedProg >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.01) continue;

          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;

          // Короткие штрихи (буквы, глаза) жестко зафиксированы (scale = 0.08), длинные плавно дышат
          const lengthLock = clip((st.arcLen - 12.0) / 50.0, 0.05, 1.0);

          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 3.2 + pt.v * 3.2) * Math.PI + waveSpeed;
            const dxWave = Math.sin(spatialPhase) * env * baseWaveAmp * lengthLock;
            const dyWave = Math.cos(spatialPhase * 0.9) * env * baseWaveAmp * lengthLock;

            let mouseXPush = 0;
            let mouseYPush = 0;
            if (s.mouseActive) {
              const dmx = pt.u - mNormX;
              const dmy = pt.v - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.025) {
                const mFactor = Math.exp(-dSq * 95.0) * 7.5 * env;
                mouseXPush = (dmx / (Math.sqrt(dSq) + 0.01)) * mFactor;
                mouseYPush = (dmy / (Math.sqrt(dSq) + 0.01)) * mFactor;
              }
            }

            const uDisp = foldMirror && pt.u > 0.5 ? 1.0 - pt.u : pt.u;
            coords.push({
              x: ox + uDisp * drawW + dxWave + mouseXPush,
              y: oy + pt.v * drawH + dyWave + mouseYPush,
            });
          }

          if (fullIdx < nPts - 1 && frac > 0.001) {
            const pA = pts[fullIdx];
            const pB = pts[fullIdx + 1];
            const uInterp = pA.u + (pB.u - pA.u) * frac;
            const vInterp = pA.v + (pB.v - pA.v) * frac;
            const uFinal = foldMirror && uInterp > 0.5 ? 1.0 - uInterp : uInterp;
            coords.push({
              x: ox + uFinal * drawW,
              y: oy + vInterp * drawH,
            });
          }

          if (coords.length < 2) continue;

          const [rC, gC, bC] = resolveArtColor(art, st.r, st.g, st.b, st.meanLum, st.meanEdge, t.tone);
          const tierAlpha = st.tier === 1 ? 0.92 : st.tier === 2 ? 0.82 : 0.35;
          const baseAlpha = clip((0.28 + st.meanEdge * 0.62 + st.meanLum * 0.2) * tierAlpha * (0.4 + 0.6 * localProg), 0.12, 0.94);

          // Тонкая калиброванная толщина: 0.45px .. 1.25px (никаких толстых червяков!)
          const baseW = (st.tier === 1 ? (0.75 + st.meanEdge * 0.65) : st.tier === 2 ? 0.58 : 0.42) * art.strokeWeight * breathPulse;

          if (art.styleEngine === "RGB_SPLIT") {
            const splitOffset = (1.2 + t.chaos * 3.2) * Math.sin(waveSpeed * 0.6 + st.phase);
            const midPt = pts[Math.floor(pts.length * 0.5)];
            const offX = midPt.nx * splitOffset;
            const offY = midPt.ny * splitOffset;

            buildCrispPath(coords);
            ctx.save();
            ctx.translate(-offX, -offY);
            ctx.strokeStyle = "rgba(255, 30, 115, " + String((baseAlpha * 0.72).toFixed(2)) + ")";
            ctx.lineWidth = baseW;
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(offX, offY);
            ctx.strokeStyle = "rgba(0, 235, 255, " + String((baseAlpha * 0.72).toFixed(2)) + ")";
            ctx.lineWidth = baseW;
            ctx.stroke();
            ctx.restore();

            ctx.strokeStyle = "rgba(245, 248, 255, " + String((baseAlpha * 0.88).toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.65;
            ctx.stroke();
          } else if (art.styleEngine === "HALFTONE") {
            const dashLen = Math.max(1.5, (2.5 + st.meanLum * 6.5) * art.strokeWeight);
            const gapLen = Math.max(1.5, (4.5 - st.meanEdge * 2.8) * art.strokeWeight);
            ctx.setLineDash([dashLen, gapLen]);
            ctx.lineDashOffset = -time * 14.0 * st.speed;

            buildCrispPath(coords);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW * 1.35;
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (art.styleEngine === "INK_HATCH") {
            buildCrispPath(coords);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.9;
            ctx.stroke();

            if (st.tier <= 2 && coords.length >= 6) {
              const hatchStep = st.tier === 1 ? 3 : 5;
              const hatchLen = (2.8 + (1.0 - st.meanLum) * 4.8) * art.strokeWeight;
              ctx.beginPath();
              for (let k = 1; k < coords.length - 1; k += hatchStep) {
                const pt = pts[k];
                const hx = (pt.nx * 0.707 - pt.ny * 0.707) * hatchLen;
                const hy = (pt.nx * 0.707 + pt.ny * 0.707) * hatchLen;
                ctx.moveTo(coords[k].x - hx, coords[k].y - hy);
                ctx.lineTo(coords[k].x + hx, coords[k].y + hy);
              }
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((baseAlpha * 0.45).toFixed(2)) + ")";
              ctx.lineWidth = 0.48 * art.strokeWeight;
              ctx.stroke();
            }
          } else {
            // RAZOR_VECTOR: деликатный ореол ТОЛЬКО на длинных внешних силовых контурах + бритвенно-тонкое ядро
            buildCrispPath(coords);
            if (st.tier === 1 && st.arcLen > 22 && art.glowIntensity > 0.05 && !isPaper) {
              const glowAlpha = clip(baseAlpha * 0.18 * art.glowIntensity, 0.02, 0.24);
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(glowAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseW * 2.4;
              ctx.stroke();
            }
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW;
            ctx.stroke();
          }

          // Живые иридисцентные кометы вдоль контуров (в режиме COMETS)
          if (art.flowMode === "COMETS" && coords.length >= 8 && clampedProg >= 0.96) {
            const cometSpan = Math.max(3, Math.floor(coords.length * 0.28));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.85) + st.phase) % 1.4) - 0.2;
            const headIdx = Math.floor(cyclePos * coords.length);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(coords.length - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              const cometSlice = coords.slice(tailIdx, clampedHead + 1);
              buildCrispPath(cometSlice);
              const [irR, irG, irB] = thinFilmIridescence(time * 0.4 + st.phase, 0.85, 0.9);
              const cometAlpha = clip(baseAlpha * (0.5 + 0.5 * art.glowIntensity), 0.2, 0.92);
              ctx.strokeStyle = isPaper
                ? "rgba(25, 15, 10, " + String(cometAlpha.toFixed(2)) + ")"
                : "rgba(" + String(irR) + "," + String(irG) + "," + String(irB) + "," + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseW * 1.35;
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS 6.0 (LIQUID SILK DOMAIN WARPING + SUBJECT CORE PROTECTION — НИКАКОЙ ЗЕБРЫ!)
      // ==========================================
      else if (s.topology === "CURRENTS" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const wu = s.fluidU;
        const wv = s.fluidV;

        // Мягкие, широкие бархатные волны жидкого шелка (14..28 волн вместо 90!)
        const silkFreq = 12.0 + t.symmetry * 18.0;
        const warpStrength = (0.018 + t.chaos * 0.065) * m.w;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const sharpLum = m.lum[baseIdx];
            const sharpEdge = m.edge[baseIdx];
            const smoothL = m.smoothLum[baseIdx];
            const gxS = m.smoothGx[baseIdx];
            const gyS = m.smoothGy[baseIdx];

            // 1. МАСКА ЯДРА ОБЪЕКТА (Subject Core Shield):
            // На четких гранях алмаза, лицах и буквах мы защищаем исходную геометрию от полосатой нарезки!
            const subjectShield = clip((sharpEdge * 1.6 + smoothL * 0.55) * t.structure, 0.0, 0.92);

            // 2. Двухкаскадный Curl-Noise поток (Domain Warping):
            // Цвета картинки буквально тают и стекают вдоль гладких линий тока вокруг объекта!
            const du = u - wu;
            const dv = v - wv;
            const distSq = du * du + dv * dv + 0.01;
            const wakeEnv = Math.exp(-distSq * 10.0);

            const qx = Math.sin((u * 3.2 + v * 2.4) * Math.PI - time * 1.4) + gyS * 12.0;
            const qy = Math.cos((v * 3.2 - u * 2.4) * Math.PI + time * 1.2) - gxS * 12.0;

            const flowWave = Math.sin((u * 2.5 + v * 3.5 + 0.35 * qx) * Math.PI * c.nHarmonic - time * (1.6 + t.energy * 1.5));
            const cursorSwirlX = (-dv * wakeEnv * 1.8 + s.fluidVelU * wakeEnv * 0.5);
            const cursorSwirlY = (du * wakeEnv * 1.8 + s.fluidVelV * wakeEnv * 0.5);

            // Внутри защищенного ядра объекта сдвиг минимален (сохраняет четкость!), а на шлейфах — жидкое течение
            const fluidMobility = 1.0 - subjectShield * 0.78;
            const advX = clip(x + (qx * 0.55 + flowWave * 0.45 + cursorSwirlX) * warpStrength * fluidMobility, 0, m.w - 1);
            const advY = clip(y + (qy * 0.55 - flowWave * 0.45 + cursorSwirlY) * warpStrength * fluidMobility, 0, m.h - 1);

            const [rAdv, gAdv, bAdv] = sampleBilinearRGB(src, m.w, m.h, advX, advY);
            const [rOrig, gOrig, bOrig] = sampleBilinearRGB(src, m.w, m.h, x, y);

            // 3. Гладкая функция тока Ψ для жидких хромовых и неоновых лент (БЕЗ ступенчатого шума!)
            const streamPsi =
              (v * 0.78 - u * 0.42 + cursorSwirlY * 0.12) * silkFreq +
              smoothL * (1.8 + t.structure * 2.2) +
              flowWave * (0.35 + t.chaos * 0.65) -
              time * (0.65 + t.energy * 1.1);

            const sinPsi = Math.sin(streamPsi * Math.PI * 2.0);
            const cosPsi = Math.cos(streamPsi * Math.PI * 2.0);

            // Тонкопленочная радужная интерференция жидкого хрома
            const iridPhase = t.tone + smoothL * 0.65 + (0.5 + 0.5 * sinPsi) * 0.45 + wakeEnv * 0.3;
            const [irR, irG, irB] =
              art.palette === "CURRENTS"
                ? thinFilmIridescence(iridPhase, sharpLum, sharpEdge)
                : resolveArtColor(art, rAdv, gAdv, bAdv, sharpLum, sharpEdge, iridPhase);

            // Бархатные обсидиановые ложбинки (действуют только вне жестких контуров объекта!)
            const ribbonGroove = 0.25 + 0.75 * smoothstep(-0.65, 0.45, cosPsi);
            const effectiveGroove = ribbonGroove * (1.0 - subjectShield * 0.82) + subjectShield * 0.82;

            // Блик жидкой ртути на гребнях волн и гранях кристалла/лица
            const mercurySpec = Math.pow(Math.max(0.0, sinPsi), 6.0) * art.glowIntensity * (1.0 - subjectShield * 0.4);
            const edgeChrome = sharpEdge * sharpEdge * art.glowIntensity * 0.85;

            // Смешиваем четкое ядро объекта и расплавленный шлейф
            const baseR = rOrig * subjectShield + (rAdv * art.subjectClarity + irR * (1.0 - art.subjectClarity * 0.65)) * (1.0 - subjectShield);
            const baseG = gOrig * subjectShield + (gAdv * art.subjectClarity + irG * (1.0 - art.subjectClarity * 0.65)) * (1.0 - subjectShield);
            const baseB = bOrig * subjectShield + (bAdv * art.subjectClarity + irB * (1.0 - art.subjectClarity * 0.65)) * (1.0 - subjectShield);

            // Применяем ACES Filmic Tone Mapping (ноль пересветов!)
            const finalR = acesTonemap((baseR / 255.0) * effectiveGroove + mercurySpec * 0.85 + edgeChrome * 0.7) * 255.0;
            const finalG = acesTonemap((baseG / 255.0) * effectiveGroove + mercurySpec * 0.9 + edgeChrome * 0.8) * 255.0;
            const finalB = acesTonemap((baseB / 255.0) * effectiveGroove + mercurySpec * 1.05 + edgeChrome * 1.0) * 255.0;

            const outP = baseIdx * 4;
            dst[outP] = Math.round(finalR * vMask);
            dst[outP + 1] = Math.round(finalG * vMask);
            dst[outP + 2] = Math.round(finalB * vMask);
            dst[outP + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 3: PIPER (1967 SYD BARRETT UFO CLUB LIQUID LIGHT OIL & DYE PROJECTOR)
      // ==========================================
      else if (s.topology === "PIPER" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const wu = s.fluidU;
        const wv = s.fluidV;

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

            // Симуляция 3 несмешивающихся слоев нагретого минерального масла и анилинового красителя
            const du = u - wu;
            const dv = v - wv;
            const cursorHeat = Math.exp(-(du * du + dv * dv) * 9.0);

            const oil1 = Math.sin(u * 5.5 + smL * 4.2 + time * 1.1) * Math.cos(v * 5.5 - smL * 3.8 - time * 0.9);
            const oil2 = Math.sin((u * 8.5 - v * 6.5) + oil1 * (1.8 + t.chaos * 2.2) + time * 1.5 + cursorHeat * 2.5);
            const oilDrop = smoothstep(-0.3, 0.3, oil2);

            const warpX = clip(x + (oil1 * 8.0 + m.etfX[baseIdx] * 6.0) * t.chaos, 0, m.w - 1);
            const warpY = clip(y + (oil2 * 8.0 + m.etfY[baseIdx] * 6.0) * t.chaos, 0, m.h - 1);
            const [rP, gP, bP] = sampleBilinearRGB(src, m.w, m.h, warpX, warpY);

            const [dyeR1, dyeG1, dyeB1] = thinFilmIridescence(t.tone + oil1 * 0.35 + l * 0.5, l, e);
            const [dyeR2, dyeG2, dyeB2] = thinFilmIridescence(t.tone + 0.42 + oil2 * 0.35 + e * 0.6, l, e);

            const mixDyeR = dyeR1 * oilDrop + dyeR2 * (1.0 - oilDrop);
            const mixDyeG = dyeG1 * oilDrop + dyeG2 * (1.0 - oilDrop);
            const mixDyeB = dyeB1 * oilDrop + dyeB2 * (1.0 - oilDrop);

            // Четкий трафаретный рельеф фотографии проступает сквозь цветное масло проектора
            const stencilLock = clip(art.subjectClarity + e * 0.75, 0.15, 0.92);
            const rawR = (rP * stencilLock + mixDyeR * (1.0 - stencilLock * 0.55)) * (0.35 + l * 0.75 + e * 0.6);
            const rawG = (gP * stencilLock + mixDyeG * (1.0 - stencilLock * 0.55)) * (0.35 + l * 0.75 + e * 0.6);
            const rawB = (bP * stencilLock + mixDyeB * (1.0 - stencilLock * 0.55)) * (0.35 + l * 0.75 + e * 0.6);

            const outP = baseIdx * 4;
            dst[outP] = Math.round(acesTonemap(rawR / 255.0) * 255 * vMask);
            dst[outP + 1] = Math.round(acesTonemap(rawG / 255.0) * 255 * vMask);
            dst[outP + 2] = Math.round(acesTonemap(rawB / 255.0) * 255 * vMask);
            dst[outP + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 4: PRISM 3.0 (DARK-FIELD CAUSTICS & ACES SPECTRAL DISPERSION — НОЛЬ БЕЛЫХ ЗАСВЕТОВ!)
      // ==========================================
      else if (s.topology === "PRISM" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        // Угол преломления управляется курсором мыши или плавным вращением
        const prismAngle = s.mouseActive
          ? Math.atan2(mNormY - 0.5, mNormX - 0.5)
          : theta + Math.sin(time * 0.55) * 0.35;
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

            // 1. ТЕМНОПОЛЬНАЯ ОПТИКА (Dark-Field Compression):
            // Сжимаем яркость плоских засвеченных участков в благородный темный кристалл,
            // оставляя яркими только грани (e), чтобы внутри алмаза были видны ВСЕ детали!
            const darkFieldFactor = (0.18 + art.subjectClarity * 0.45) * (0.45 + e * 0.85) / (1.0 + l * 0.85);
            let rLin = (src[p] / 255.0) * darkFieldFactor;
            let gLin = (src[p + 1] / 255.0) * darkFieldFactor;
            let bLin = (src[p + 2] / 255.0) * darkFieldFactor;

            // 2. СПЕКТРАЛЬНАЯ ДИСПЕРСИЯ КОШИ (7 длин волн с сохранением энергии, без белого пересвета!)
            const glowScale = (0.12 + art.glowIntensity * 0.22);
            for (let band = 0; band < 7; band++) {
              const bandNorm = (band + 1) / 7.0;
              const dist = bandNorm * maxDispersion;
              // Двунаправленный луч (вдоль +dir и -dir)
              const sx = Math.round(x - dirX * dist);
              const sy = Math.round(y - dirY * dist);

              if (sx >= 0 && sx < m.w && sy >= 0 && sy < m.h) {
                const sIdx = sy * m.w + sx;
                // Лучи рождаются СТРОГО от острых граней (sEdge), а не от белых пятен!
                const sEdge = m.edge[sIdx];
                if (sEdge > 0.16) {
                  const falloff = (1.0 - bandNorm * 0.45) * sEdge * glowScale;
                  const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                  rLin += (cr / 255.0) * falloff;
                  gLin += (cg / 255.0) * falloff;
                  bLin += (cb / 255.0) * falloff;
                }
              }
            }

            // Тонкая алмазная искра на самих гранях кристалла
            const facetRim = e * e * 0.55;
            rLin += facetRim * 0.9;
            gLin += facetRim * 0.95;
            bLin += facetRim * 1.1;

            // 3. ACES Filmic Tone Mapping гарантирует отсутствие выгорания в белый цвет!
            dst[p] = Math.round(acesTonemap(rLin) * 255 * vMask);
            dst[p + 1] = Math.round(acesTonemap(gLin) * 255 * vMask);
            dst[p + 2] = Math.round(acesTonemap(bLin) * 255 * vMask);
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 5: SILK 5.0 (ДЕЛИКАТНАЯ ШЕЛКОВАЯ ВУАЛЬ РК4)
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = isPaper ? "multiply" : "screen";
        const stepSize = 0.0028 + t.energy * 0.0035;
        const springPull = 0.065 * t.structure;
        const activeSilk = Math.floor((s.isMobile ? 2600 : SILK_COUNT) * (1.05 - art.noiseGate * 0.65));

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
            const alpha = clip((0.035 + e * 0.16 + l * 0.09) * fadeLife * vMask, 0.015, 0.22);

            const p = cell0 * 4;
            const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone, true);
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
      // РЕЖИМ 6: LIDAR 2.0
      // ==========================================
      else if (s.topology === "LIDAR") {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";

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
        const step = Math.max(2, Math.round((s.isMobile ? 3.5 : 2.5) + art.noiseGate * 2.5));
        const depthBoost = 0.26 + t.structure * 0.56;

        for (let y = 0; y < m.h; y += step) {
          const ny = (y / (m.h - 1)) * 2.0 - 1.0;
          const scanDist = Math.abs(y / m.h - scanPos);
          const scanGlow = scanDist < 0.055 ? (1.0 - scanDist / 0.055) * 0.65 * art.glowIntensity : 0.0;

          let prevSx = 0;
          let prevSy = 0;
          let hasPrev = false;

          for (let x = 0; x < m.w; x += step) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask < 0.07) {
              hasPrev = false;
              continue;
            }

            const l = m.lum[idx];
            const e = m.edge[idx];
            if (l < art.noiseGate * 0.25 && e < art.noiseGate * 0.3) {
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
            const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone);
            const alpha = clip((0.26 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.94);

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
        if (art.subjectClarity > 0.01) {
          ctx.globalAlpha = art.subjectClarity * 0.75;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const numLines = Math.floor(95 + (1.0 - art.noiseGate) * 75);
        const numCols = 220;
        const maxElevation = (drawH / numLines) * (2.6 + t.structure * 2.8);

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          ctx.globalCompositeOperation = "source-over";
          ctx.beginPath();
          ctx.moveTo(ox, baseScreenY + 3);

          let rowLum = 0;
          let rowEdge = 0;
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
          ctx.fillStyle = isPaper
            ? "rgba(242, 234, 219, 0.84)"
            : isCyanotype
            ? "rgba(6, 21, 45, 0.82)"
            : "rgba(2, 1, 4, 0.78)";
          ctx.fill();

          const midCell = (sy * m.w + Math.floor(m.w * 0.5)) * 4;
          const [rC, gC, bC] = resolveArtColor(
            art,
            m.rgba[midCell],
            m.rgba[midCell + 1],
            m.rgba[midCell + 2],
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
        if (art.subjectClarity > 0.01) {
          ctx.globalAlpha = art.subjectClarity;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const cells = m.cells;
        const len = cells.length;

        for (let i = 0; i < len; i++) {
          const cl = cells[i];
          if (cl.edge < art.noiseGate * 0.3 && cl.lum < art.noiseGate * 0.35) continue;

          const phase = (cl.u * 9.0 + cl.v * 9.0) * c.nHarmonic - time * 2.6;
          const shift = Math.sin(phase) * t.chaos * 6.5;

          const cx = ox + cl.u * drawW + cl.tx * shift;
          const cy = oy + cl.v * drawH + cl.ty * shift;
          const rad = cl.size * drawW * (0.52 + cl.lum * 0.48) * art.strokeWeight;

          const rot = Math.atan2(cl.ty, cl.tx) + Math.sin(time + i * 0.03) * t.chaos * 0.6;
          const [r, g, b] = resolveArtColor(art, cl.r, cl.g, cl.b, cl.lum, cl.edge, t.tone, true);

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

          ctx.fillStyle = "rgba(" + String(r) + "," + String(g) + "," + String(b) + "," + String((0.55 + cl.lum * 0.4).toFixed(2)) + ")";
          ctx.fill();

          if (cl.edge > 0.22) {
            ctx.strokeStyle = "rgba(" + String(Math.min(255, r + 65)) + "," + String(Math.min(255, g + 65)) + "," + String(Math.min(255, b + 75)) + "," + String((cl.edge * t.structure).toFixed(2)) + ")";
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 9: GLYPH
      // ==========================================
      else if (s.topology === "GLYPH") {
        if (art.subjectClarity > 0.01) {
          ctx.globalAlpha = art.subjectClarity;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(54 + (1.0 - art.noiseGate) * 38);
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
            if ((l < art.noiseGate * 0.25 && e < art.noiseGate * 0.3) || vMask < 0.08) continue;

            const phase = u * 10.0 + v * 10.0 - time * 3.0;
            const shiftX = m.etfX[idx] * Math.sin(phase) * 4.5 * (0.25 + t.chaos);
            const shiftY = m.etfY[idx] * Math.cos(phase) * 4.5 * (0.25 + t.chaos);

            const glyphIdx = Math.floor((l * 9 + e * 6 + time * 1.6 + (r * 3 + cIdx) * 0.2) % MATH_GLYPHS.length);
            const ch = MATH_GLYPHS[glyphIdx];

            const fontSize = Math.max(7, Math.floor(cellW * (0.6 + l * 0.62 + e * 0.45) * vMask * art.strokeWeight));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone, true);
            const alpha = clip((0.25 + l * 0.72 + e * 0.45) * vMask, 0.06, 0.95);
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            ctx.fillText(ch, ox + u * drawW + shiftX, oy + v * drawH + shiftY);
          }
        }
      }

      // ==========================================
      // ГАЛЕРЕЙНАЯ РАМКА И ПАСПОРТ АРТЕФАКТА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isPaper
          ? "rgba(45, 30, 18, 0.35)"
          : isCyanotype
          ? "rgba(56, 189, 248, 0.35)"
          : "rgba(255, 255, 255, 0.16)";
        const textFill = isPaper
          ? "rgba(45, 30, 18, 0.75)"
          : isCyanotype
          ? "rgba(125, 211, 252, 0.8)"
          : "rgba(255, 255, 255, 0.55)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT // " + (query || "SHINE ON").toUpperCase().slice(0, 24) + " [" + s.topology + " · " + art.master + "]",
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
        .barrett-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.45); border-radius: 99px; }
        .barrett-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.85); }
      `}} />

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[600px] md:h-[760px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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
            <div>SHANNON H(X): <span className="text-white">{coeffs.entropy} bits</span> | λ: <span className="text-[#10b981]">{coeffs.lyapunov}</span></div>
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
              className="h-9 px-2.5 rounded-lg border border-[#a855f7]/50 text-[#a855f7] hover:bg-[#a855f7] hover:text-black font-mono text-[8px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
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
                  className="btn-elegant !bg-black/75 backdrop-blur-md border-[#a855f7]/50 text-[#a855f7]"
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

      {/* ПРАВАЯ ПАНЕЛЬ: BARRETT ART STUDIO PRO */}
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
                Art Studio Pro
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
            <span className="font-mono text-[8px] text-[#a855f7] uppercase tracking-widest">ACES HDR</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {/* 6 КАРДИНАЛЬНО РАЗНЫХ РЕЖИССЕРСКИХ МАСТЕР-ПРЕСЕТОВ */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Master Art Direction (1-Click):</span>
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
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "SYD_1967", label: "Syd 1967", dot: "#c026d3" },
                      { id: "BLUEPRINT", label: "Blueprint", dot: "#38bdf8" },
                      { id: "SIN_CITY", label: "Sin City", dot: "#ef4444" },
                      { id: "GOLD_24K", label: "24K Gold", dot: "#f59e0b" },
                      { id: "DA_VINCI", label: "Da Vinci", dot: "#d6c7b2" },
                      { id: "CYBERPUNK", label: "Cyberpunk", dot: "#00f5ff" },
                    ] as { id: MasterPreset; label: string; dot: string }[]
                  ).map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => applyMasterPreset(mp.id)}
                      className={
                        "py-2 px-2 rounded-lg border text-[8px] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer " +
                        (artConfig.master === mp.id
                          ? "bg-white text-black border-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: mp.dot }} />
                      <span className="truncate">{mp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 геометрических движка рендеринга */}
              <div>
                <div className="text-neutral-400 mb-1.5">Vector Geometry Engine:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "RAZOR_VECTOR", label: "Razor 0.5px" },
                      { id: "INK_HATCH", label: "Cross-Hatch" },
                      { id: "HALFTONE", label: "Halftone" },
                      { id: "RGB_SPLIT", label: "RGB Split" },
                    ] as { id: StyleEnginePreset; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateArt("styleEngine", st.id)}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.styleEngine === st.id
                          ? "bg-[#a855f7] text-black border-[#a855f7] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 режима движения */}
              <div>
                <div className="text-neutral-400 mb-1.5">Motion Choreography:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "COMETS", label: "Liquid Light" },
                      { id: "LASER_LOOP", label: "Laser Plot" },
                      { id: "PULSE", label: "Harmonic" },
                      { id: "STILL", label: "Locked Print" },
                    ] as { id: FlowAnimationMode; label: string }[]
                  ).map((fm) => (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() => {
                        updateArt("flowMode", fm.id);
                        if (fm.id === "LASER_LOOP") stateRef.current.traceProgress = 0;
                      }}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.flowMode === fm.id
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {fm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки тонкой студийной доводки */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Micro-Detail Sensitivity (Text & Eyes)</span>
                    <span className="text-[#10b981]">{Math.round((1.0 - artConfig.noiseGate) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.55"
                    step="0.01"
                    value={artConfig.noiseGate}
                    onChange={(e) => updateArt("noiseGate", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Filament Calibre (Line Weight)</span>
                    <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="1.8"
                    step="0.05"
                    value={artConfig.strokeWeight}
                    onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subject Relief Lock (Clarity)</span>
                    <span className="text-white">{Math.round(artConfig.subjectClarity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.8"
                    step="0.02"
                    value={artConfig.subjectClarity}
                    onChange={(e) => updateArt("subjectClarity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Iridescence & Specular</span>
                    <span className="text-white">{Math.round(artConfig.glowIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.glowIntensity}
                    onChange={(e) => updateArt("glowIntensity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 font-mono text-[10px] uppercase tracking-widest">
              {(
                [
                  { key: "energy", label: "Energy (Fluid & Comet Velocity)" },
                  { key: "chaos", label: "Chaos (Domain Warp & Curl)" },
                  { key: "tone", label: "Tone (Thin-Film Wavelength)" },
                  { key: "structure", label: "Structure (Subject Core Shield)" },
                  { key: "symmetry", label: "Symmetry (Wave Frequency)" },
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
                <div className="text-white uppercase">Active Mathematical Kernel:</div>
                <div>C_aces = x(2.51x + 0.03) / (x(2.43x + 0.59) + 0.14)</div>
                <div>I_currents = I(u + Curl(Ψ)·(1 - Shield_st))</div>
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
