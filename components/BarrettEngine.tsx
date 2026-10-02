"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость ламинарного течения и световых импульсов
  chaos: number;     // C: амплитуда вихревого следа и турбулентности
  tone: number;      // H: фазовый сдвиг спектра
  structure: number; // St: жесткость привязки к микро-анатомии объекта
  symmetry: number;  // Sy: плотность лент Currents и зеркальная ось
}

type PalettePreset =
  | "CURRENTS"
  | "CHROME"
  | "CYBER"
  | "GOLD"
  | "NOIR"
  | "EMERALD"
  | "NATIVE"
  | "CUSTOM";

// 4 кардинально разных математических движка отрисовки
type StyleEnginePreset = "NEON" | "INK_HATCH" | "HALFTONE" | "CHROMATIC";
type FlowAnimationMode = "COMETS" | "LASER_LOOP" | "PULSE" | "STILL";
type CanvasTheme = "VOID" | "PAPER";

interface ArtStudioConfig {
  palette: PalettePreset;
  styleEngine: StyleEnginePreset;
  flowMode: FlowAnimationMode;
  theme: CanvasTheme;
  posterFrame: boolean;
  primaryHex: string;
  secondaryHex: string;
  strokeWeight: number;    // 0.35 .. 2.4
  noiseGate: number;       // 0.02 .. 0.70 (порог мелких деталей)
  underlayOpacity: number; // 0.0 .. 0.75
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
  tier: 1 | 2 | 3; // 1: Силуэт, 2: Микро-анатомия (глаза/гриф/текст), 3: Штриховка объема
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
  lum: Float32Array;
  liftedLum: Float32Array; // Вытянутые тени для гитар, волос и темных глаз
  smoothLum: Float32Array; // Гладкий гидродинамический потенциал для CURRENTS
  smoothGx: Float32Array;  // Гладкий градиент рельефа по X
  smoothGy: Float32Array;  // Гладкий градиент рельефа по Y
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
  | "SILK"
  | "LIDAR"
  | "ACID"
  | "ENGRAVE"
  | "PRISM"
  | "CRYSTAL"
  | "GLYPH";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const SILK_COUNT = 4800;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

const PALETTE_SWATCHES: { id: PalettePreset; label: string; colors: [string, string] }[] = [
  { id: "CURRENTS", label: "Currents", colors: ["#c026d3", "#38bdf8"] },
  { id: "CHROME", label: "Chrome", colors: ["#f8fafc", "#64748b"] },
  { id: "CYBER", label: "Cyber", colors: ["#ff007f", "#00f5ff"] },
  { id: "GOLD", label: "Gold", colors: ["#f59e0b", "#fef08a"] },
  { id: "NOIR", label: "Noir", colors: ["#ef4444", "#ffffff"] },
  { id: "EMERALD", label: "Emerald", colors: ["#10b981", "#a7f3d0"] },
  { id: "NATIVE", label: "Native", colors: ["#a855f7", "#ec4899"] },
  { id: "CUSTOM", label: "Custom", colors: ["#ffffff", "#a855f7"] },
];

const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 50, 50],
  [255, 145, 30],
  [255, 235, 40],
  [50, 245, 110],
  [40, 215, 255],
  [85, 105, 255],
  [195, 65, 255],
];

function clip(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clip((x - edge0) / Math.max(1e-6, edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  if (isNaN(num)) return [168, 85, 247];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Вычисление цвета с сохранением черного вакуума в тенях (исправляет фиолетовую заливку в SILK!)
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
  const energy = clip(lum * 0.6 + edge * 0.65, 0.0, 1.0);
  const darkGate = preserveDarkness ? smoothstep(0.02, 0.22, lum + edge * 0.8) : 1.0;
  const w = clip(energy + (toneShift > 0.02 ? Math.sin(toneShift * Math.PI * 2 + lum * 4) * 0.22 : 0), 0.0, 1.0);

  let rOut = nativeR;
  let gOut = nativeG;
  let bOut = nativeB;

  if (art.palette === "CHROME") {
    if (art.theme === "PAPER") {
      const v = Math.round(12 + (1.0 - w) * 55);
      return [v, v, v + 5];
    }
    const v = Math.min(255, Math.round(150 + w * 105));
    rOut = Math.max(0, v - 8);
    gOut = v;
    bOut = Math.min(255, v + 14);
  } else if (art.palette === "CURRENTS") {
    if (w < 0.48) {
      const t = w / 0.48;
      rOut = Math.round(155 + t * 85);
      gOut = Math.round(20 + t * 65);
      bOut = Math.round(210 + t * 45);
    } else {
      const t = (w - 0.48) / 0.52;
      rOut = Math.round(240 - t * 20);
      gOut = Math.round(85 + t * 165);
      bOut = 255;
    }
  } else if (art.palette === "CYBER") {
    rOut = Math.min(255, Math.round(255 * (1.0 - w * 0.78) + edge * 45));
    gOut = Math.min(255, Math.round(20 + w * 235));
    bOut = Math.min(255, Math.round(155 + w * 100));
  } else if (art.palette === "GOLD") {
    rOut = Math.min(255, Math.round(190 + w * 65));
    gOut = Math.min(255, Math.round(130 + w * 110));
    bOut = Math.min(255, Math.round(30 + w * 150));
  } else if (art.palette === "NOIR") {
    if (edge > 0.25) {
      rOut = 255;
      gOut = Math.round(25 + lum * 55);
      bOut = Math.round(40 + lum * 55);
    } else {
      const v = Math.round(150 + lum * 105);
      rOut = v;
      gOut = v;
      bOut = v;
    }
  } else if (art.palette === "EMERALD") {
    rOut = Math.round(18 + w * 120);
    gOut = Math.min(255, Math.round(160 + w * 95));
    bOut = Math.min(255, Math.round(110 + w * 120));
  } else if (art.palette === "CUSTOM") {
    const [r1, g1, b1] = hexToRgb(art.primaryHex);
    const [r2, g2, b2] = hexToRgb(art.secondaryHex);
    rOut = Math.round(r1 * (1.0 - w) + r2 * w);
    gOut = Math.round(g1 * (1.0 - w) + g2 * w);
    bOut = Math.round(b1 * (1.0 - w) + b2 * w);
  } else {
    // NATIVE
    if (toneShift < 0.03) {
      const boost = art.theme === "PAPER" ? -30 : 55;
      rOut = clip(nativeR + boost, 0, 255);
      gOut = clip(nativeG + boost, 0, 255);
      bOut = clip(nativeB + boost + 12, 0, 255);
    } else {
      const theta = toneShift * Math.PI * 2.0 + lum * 1.5;
      const avg = (nativeR + nativeG + nativeB) * 0.333;
      const dr = nativeR - avg;
      const dg = nativeG - avg;
      const db = nativeB - avg;
      if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 16) {
        const base = Math.max(120, avg + 55);
        rOut = Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta)))));
        gOut = Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta + 2.094)))));
        bOut = Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta + 4.188)))));
      } else {
        const cosT = Math.cos(toneShift * Math.PI * 2.0);
        const sinT = Math.sin(toneShift * Math.PI * 2.0);
        rOut = Math.min(255, Math.max(20, Math.round(avg + dr * cosT - dg * sinT + 45)));
        gOut = Math.min(255, Math.max(20, Math.round(avg + dr * sinT + dg * cosT + 45)));
        bOut = Math.min(255, Math.max(20, Math.round(avg + db * cosT + dr * sinT * 0.5 + 55)));
      }
    }
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.38 + 0.48, 0.48, 0.88);
  const chaos = clip((entropy / 4.5) * 0.14 + 0.10, 0.08, 0.28);
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
// ДЕКОДИРОВАНИЕ С ЛОКАЛЬНЫМ ВЫТЯГИВАНИЕМ ТЕНЕЙ (RETINEX) + 3-МАСШТАБНЫЙ TRACE 6.0
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, isMobileDevice: boolean): MatrixBuffer {
  const baseRes = isMobileDevice ? 460 : 580;
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
  const rawLum = new Float32Array(total);
  const liftedLum = new Float32Array(total);
  const edge = new Float32Array(total);
  const gx = new Float32Array(total);
  const gy = new Float32Array(total);
  const rawTx = new Float32Array(total);
  const rawTy = new Float32Array(total);
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
      lum: rawLum,
      liftedLum,
      smoothLum: rawLum,
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

  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = Math.abs(ny) > 0.91 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.91) / 0.09) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.91 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.91) / 0.09) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const p = i * 4;
      const l = (0.299 * rawRgba[p] + 0.587 * rawRgba[p + 1] + 0.114 * rawRgba[p + 2]) / 255.0;
      rawLum[i] = l * mask[i];
      // Нелинейная гамма-компрессия (вытягивает темный гриф гитары, глаза и складки одежды!)
      liftedLum[i] = Math.pow(l, 0.62) * mask[i];

      sharpRgba[p] = rawRgba[p];
      sharpRgba[p + 1] = rawRgba[p + 1];
      sharpRgba[p + 2] = rawRgba[p + 2];
      sharpRgba[p + 3] = 255;
    }
  }

  // Легкое подавление JPEG-блоков с сохранением микро-резкости
  const cleanLifted = gaussianBlurField(liftedLum, w, h, 1);
  for (let i = 0; i < total; i++) {
    // Смешиваем 65% сглаженного и 35% субпиксельного сигнала для сохранения мелкого шрифта и глаз
    liftedLum[i] = cleanLifted[i] * 0.65 + liftedLum[i] * 0.35;
  }

  // Глубоко сглаженный потенциал и его аналитические производные для CURRENTS 5.0
  const smoothLum = gaussianBlurField(rawLum, w, h, 10);
  const smoothGx = new Float32Array(total);
  const smoothGy = new Float32Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      smoothGx[i] = (smoothLum[i + 1] - smoothLum[i - 1]) * 0.5;
      smoothGy[i] = (smoothLum[i + w] - smoothLum[i - w]) * 0.5;
    }
  }

  // Оператор Щарра по вытянутому полю liftedLum
  const rawGradMag = new Float32Array(total);
  let globalMaxEdge = 1e-5;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx =
        -3 * liftedLum[(y - 1) * w + (x - 1)] + 3 * liftedLum[(y - 1) * w + (x + 1)] +
        -10 * liftedLum[y * w + (x - 1)] + 10 * liftedLum[y * w + (x + 1)] +
        -3 * liftedLum[(y + 1) * w + (x - 1)] + 3 * liftedLum[(y + 1) * w + (x + 1)];

      const sy =
        -3 * liftedLum[(y - 1) * w + (x - 1)] - 10 * liftedLum[(y - 1) * w + x] - 3 * liftedLum[(y - 1) * w + (x + 1)] +
        3 * liftedLum[(y + 1) * w + (x - 1)] + 10 * liftedLum[(y + 1) * w + x] + 3 * liftedLum[(y + 1) * w + (x + 1)];

      const mag = Math.sqrt(sx * sx + sy * sy) * mask[idx];
      rawGradMag[idx] = mag;
      if (mag > globalMaxEdge) globalMaxEdge = mag;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
      rawTx[idx] = -sy / norm;
      rawTy[idx] = sx / norm;
    }
  }

  // ЛОКАЛЬНО-АДАПТИВНАЯ НОРМАЛИЗАЦИЯ ГРАДИЕНТА (RETINEX ENVELOPE):
  // Позволяет одновременно видеть и яркий контур белой куртки, и темный гриф гитары, и мелкие черты лица,
  // но при этом полностью отсекает пустой черный фон!
  const localEnv = gaussianBlurField(rawGradMag, w, h, 6);
  const absNoiseCutoff = globalMaxEdge * 0.032;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    if (gVal < absNoiseCutoff) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.16, localEnv[i] * 2.1 + globalMaxEdge * 0.08);
      edge[i] = clip((gVal - absNoiseCutoff * 0.7) / denom);
    }
  }

  // Поле касательных ETF (1 компактный проход 3x3, чтобы не размывать мелкие буквы и зрачки!)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      let sumX = 0;
      let sumY = 0;
      const refX = rawTx[idx];
      const refY = rawTy[idx];

      for (let ky = -1; ky <= 1; ky++) {
        const rowOffset = (y + ky) * w;
        for (let kx = -1; kx <= 1; kx++) {
          const nIdx = rowOffset + (x + kx);
          const wgt = edge[nIdx] * edge[nIdx] + 0.01;
          const dot = refX * rawTx[nIdx] + refY * rawTy[nIdx];
          const sign = dot >= 0 ? 1 : -1;
          sumX += rawTx[nIdx] * wgt * sign;
          sumY += rawTy[nIdx] * wgt * sign;
        }
      }
      const len = Math.sqrt(sumX * sumX + sumY * sumY) + 1e-6;
      etfX[idx] = sumX / len;
      etfY[idx] = sumY / len;

      if (edge[idx] > 0.12 || (rawLum[idx] > 0.18 && edge[idx] > 0.04)) {
        spawnIndices.push(idx);
      }
    }
  }

  // ==========================================
  // 3-МАСШТАБНЫЙ ТРАССИРОВЩИК TRACE 6.0 (СИЛУЭТ + МИКРО-АНАТОМИЯ ЛИЦ/ГИТАР/ТЕКСТА + ШТРИХОВКА)
  // ==========================================
  const visited = new Uint8Array(total);
  const macroSeeds: { idx: number; score: number }[] = [];
  const microSeeds: { idx: number; score: number }[] = [];
  const shadeSeeds: { idx: number; score: number }[] = [];

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (mask[i] < 0.05) continue;
      const e = edge[i];
      const l = liftedLum[i];

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];
      const isMax = e >= ePrev * 0.96 && e >= eNext * 0.96;

      if (isMax && e > 0.22) {
        macroSeeds.push({ idx: i, score: e * 2.5 });
      } else if (isMax && e > 0.065) {
        // Микро-семена для глаз, губ, пальцев, ладов гитары и мелких букв
        microSeeds.push({ idx: i, score: e * 1.8 + l * 0.3 });
      } else if (l > 0.14 && e > 0.025 && (x % 3 === 0) && (y % 3 === 0)) {
        shadeSeeds.push({ idx: i, score: l * 0.7 + e });
      }
    }
  }

  macroSeeds.sort((a, b) => b.score - a.score);
  microSeeds.sort((a, b) => b.score - a.score);
  shadeSeeds.sort((a, b) => b.score - a.score);

  const traceAdaptiveChain = (
    startX: number,
    startY: number,
    dirSign: number,
    maxSteps: number,
    stepPx: number,
    minEdge: number,
    angleCosCutoff: number,
    markNeighbors: boolean
  ) => {
    const rawChain: { x: number; y: number }[] = [];
    let cx = startX + 0.5;
    let cy = startY + 0.5;

    let prevTx = sampleBilinearScalar(etfX, w, h, cx, cy) * dirSign;
    let prevTy = sampleBilinearScalar(etfY, w, h, cx, cy) * dirSign;
    const initNorm = Math.sqrt(prevTx * prevTx + prevTy * prevTy) + 1e-6;
    prevTx /= initNorm;
    prevTy /= initNorm;

    for (let s = 0; s < maxSteps; s++) {
      const ix = Math.floor(cx);
      const iy = Math.floor(cy);
      if (ix < 2 || ix >= w - 2 || iy < 2 || iy >= h - 2) break;

      const cIdx = iy * w + ix;
      if (mask[cIdx] < 0.04) break;

      const curEdge = sampleBilinearScalar(edge, w, h, cx, cy);
      if (curEdge < minEdge) break;

      let tx = sampleBilinearScalar(etfX, w, h, cx, cy) * dirSign;
      let ty = sampleBilinearScalar(etfY, w, h, cx, cy) * dirSign;
      const tLen = Math.sqrt(tx * tx + ty * ty) + 1e-6;
      tx /= tLen;
      ty /= tLen;

      if (tx * prevTx + ty * prevTy < 0) {
        tx = -tx;
        ty = -ty;
      }
      if (s > 0 && tx * prevTx + ty * prevTy < angleCosCutoff) break;

      const blend = markNeighbors ? 0.45 : 0.22; // На микро-деталях меньше инерция, чтобы точно огибать буквы и зрачки!
      const smoothTx = prevTx * blend + tx * (1.0 - blend);
      const smoothTy = prevTy * blend + ty * (1.0 - blend);
      const normT = Math.sqrt(smoothTx * smoothTx + smoothTy * smoothTy) + 1e-6;
      const finalTx = smoothTx / normT;
      const finalTy = smoothTy / normT;

      prevTx = finalTx;
      prevTy = finalTy;

      visited[cIdx] = 1;
      if (markNeighbors) {
        const nOffX = Math.round(-finalTy);
        const nOffY = Math.round(finalTx);
        visited[(iy + nOffY) * w + (ix + nOffX)] = 1;
        visited[(iy - nOffY) * w + (ix - nOffX)] = 1;
      }

      rawChain.push({ x: cx, y: cy });

      const nX = -finalTy;
      const nY = finalTx;
      const ePlus = sampleBilinearScalar(edge, w, h, cx + nX * 0.7, cy + nY * 0.7);
      const eMinus = sampleBilinearScalar(edge, w, h, cx - nX * 0.7, cy - nY * 0.7);
      const ridgePull = (ePlus - eMinus) * 0.3;

      cx += finalTx * stepPx + nX * ridgePull;
      cy += finalTy * stepPx + nY * ridgePull;
    }
    return rawChain;
  };

  const taubinSmoothAndNormals = (rawPts: { x: number; y: number }[], iterations: number) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;
    if (n < 3) return [];

    const applyLaplacianStep = (pts: { x: number; y: number }[], weight: number) => {
      const next = pts.map((pt) => ({ x: pt.x, y: pt.y }));
      for (let i = 1; i < n - 1; i++) {
        const lapX = 0.5 * (pts[i - 1].x + pts[i + 1].x) - pts[i].x;
        const lapY = 0.5 * (pts[i - 1].y + pts[i + 1].y) - pts[i].y;
        next[i].x = pts[i].x + weight * lapX;
        next[i].y = pts[i].y + weight * lapY;
      }
      return next;
    };

    for (let it = 0; it < iterations; it++) {
      curr = applyLaplacianStep(curr, 0.45);
      curr = applyLaplacianStep(curr, -0.47);
    }

    const result: { u: number; v: number; nx: number; ny: number }[] = [];
    for (let i = 0; i < n; i++) {
      const pPrev = curr[Math.max(0, i - 1)];
      const pNext = curr[Math.min(n - 1, i + 1)];
      const dx = pNext.x - pPrev.x;
      const dy = pNext.y - pPrev.y;
      const len = Math.sqrt(dx * dx + dy * dy) + 1e-6;
      result.push({
        u: curr[i].x / w,
        v: curr[i].y / h,
        nx: -dy / len,
        ny: dx / len,
      });
    }
    return result;
  };

  const buildStrokeTier = (
    seeds: { idx: number; score: number }[],
    tier: 1 | 2 | 3,
    maxCount: number,
    halfSteps: number,
    stepPx: number,
    minEdge: number,
    minPts: number,
    angleCutoff: number,
    taubinIters: number,
    markNeighbors: boolean
  ) => {
    let added = 0;
    for (let i = 0; i < seeds.length && added < maxCount; i++) {
      const seedIdx = seeds[i].idx;
      if (visited[seedIdx]) continue;

      const sx = seedIdx % w;
      const sy = Math.floor(seedIdx / w);

      const back = traceAdaptiveChain(sx, sy, -1, halfSteps, stepPx, minEdge, angleCutoff, markNeighbors).reverse();
      const fwd = traceAdaptiveChain(sx, sy, 1, halfSteps, stepPx, minEdge, angleCutoff, markNeighbors);
      const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

      if (rawPts.length < minPts) continue;

      const pts = taubinSmoothAndNormals(rawPts, taubinIters);
      if (pts.length < minPts) continue;

      let eSum = 0;
      let lSum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let k = 0; k < pts.length; k++) {
        const pxIdx = Math.min(h - 1, Math.max(0, Math.floor(pts[k].v * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(pts[k].u * w)));
        eSum += edge[pxIdx];
        lSum += liftedLum[pxIdx];
        const p4 = pxIdx * 4;
        rSum += sharpRgba[p4];
        gSum += sharpRgba[p4 + 1];
        bSum += sharpRgba[p4 + 2];
      }

      const n = pts.length;
      const meanEdge = eSum / n;
      const arcLen = n * stepPx;
      const importance =
        tier === 1
          ? clip(0.35 + meanEdge * 1.1)
          : tier === 2
          ? clip(0.18 + meanEdge * 0.95)
          : clip(0.08 + meanEdge * 0.7);

      strokes.push({
        pts,
        tier,
        r: Math.round(rSum / n),
        g: Math.round(gSum / n),
        b: Math.round(bSum / n),
        meanEdge,
        meanLum: lSum / n,
        importance,
        phase: (strokes.length * PHI) % (Math.PI * 2),
        speed: 0.6 + ((strokes.length * 7) % 13) * 0.07,
        arcLen,
      });
      added++;
    }
  };

  const budgetMult = isMobileDevice ? 0.65 : 1.0;
  // 1. Силуэт и главные линии (плавные, длинные)
  buildStrokeTier(macroSeeds, 1, Math.floor(1100 * budgetMult), 58, 1.3, 0.08, 4, 0.25, 3, true);
  // 2. Ювелирная микро-детализация (глаза, ноздри, губы, гриф гитары, струны, мелкий шрифт!)
  buildStrokeTier(microSeeds, 2, Math.floor(1550 * budgetMult), 28, 0.85, 0.035, 3, -0.12, 1, false);
  // 3. Внутренняя пластика объема и теней
  buildStrokeTier(shadeSeeds, 3, Math.floor(750 * budgetMult), 16, 1.35, 0.02, 4, 0.2, 2, true);

  // Сортируем от центра к краям для гипнотического раскрытия рисунка
  strokes.sort((a, b) => {
    const da = Math.hypot(a.pts[0].u - 0.5, a.pts[0].v - 0.45);
    const db = Math.hypot(b.pts[0].u - 0.5, b.pts[0].v - 0.45);
    return (da - db) * 0.55 + (b.importance - a.importance) * 0.45;
  });

  const baseStep = 12;
  for (let y = baseStep; y < h - baseStep; y += baseStep) {
    for (let x = baseStep; x < w - baseStep; x += baseStep) {
      const idx = y * w + x;
      if (mask[idx] < 0.06 || (liftedLum[idx] < 0.05 && edge[idx] < 0.06)) continue;

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
            lum: liftedLum[sIdx],
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
          lum: liftedLum[idx],
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
    lum: rawLum,
    liftedLum,
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

  const r = rgba[p00] * w00 + rgba[p10] * w10 + rgba[p01] * w01 + rgba[p11] * w11;
  const g = rgba[p00 + 1] * w00 + rgba[p10 + 1] * w10 + rgba[p01 + 1] * w01 + rgba[p11 + 1] * w11;
  const b = rgba[p00 + 2] * w00 + rgba[p10 + 2] * w10 + rgba[p01 + 2] * w01 + rgba[p11 + 2] * w11;
  return [r, g, b];
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
    palette: "CURRENTS",
    styleEngine: "NEON",
    flowMode: "COMETS",
    theme: "VOID",
    posterFrame: true,
    primaryHex: "#c026d3",
    secondaryHex: "#38bdf8",
    strokeWeight: 1.0,
    noiseGate: 0.14, // Низкий порог по умолчанию, чтобы все черты лица, гриф гитары и текст были видны сразу!
    underlayOpacity: 0.18,
    glowIntensity: 0.75,
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
    wakeU: 0.5,
    wakeV: 0.5,
    wakeVelU: 0.0,
    wakeVelV: 0.0,
  });

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("TRACING MULTI-SCALE ANATOMY [" + String(idx + 1) + "/" + String(total) + "]...");
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
        "LOCKED // " + String(buf.strokes.length) + " MICRO-SPLINES (" + String(buf.w) + "x" + String(buf.h) + ")"
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
  // ЯДРО МАТЕМАТИЧЕСКОГО РЕНДЕРИНГА (60 FPS DESKTOP & MOBILE)
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

    // Кэшированный буфер подложки (не пересчитывается каждый кадр -> 0 фризов на смартфонах!)
    const underlayCanvas = document.createElement("canvas");
    const underlayCtx = underlayCanvas.getContext("2d");

    // Буфер для живых шейдерных режимов (CURRENTS, ACID, PRISM)
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
      if (len === 2) {
        ctx.lineTo(coords[1].x, coords[1].y);
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
      const bgHex = isPaper ? "#f5f2eb" : "#020104";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (art.flowMode === "LASER_LOOP") {
          s.traceProgress = (s.traceProgress + 0.0055 * (0.6 + t.energy)) % 1.35;
        } else if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.012 * (0.65 + t.energy * 1.2));
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
        ctx.fillStyle = isPaper ? "rgba(245, 242, 235, 0.09)" : "rgba(2, 1, 4, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 42; l++) {
          ctx.beginPath();
          const [rC, gC, bC] = resolveArtColor(art, 180, 120, 250, l / 42, 0.6, t.tone);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.45)";
          ctx.lineWidth = 1.3 * art.strokeWeight;
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

      // ==========================================
      // КЭШИРОВАННАЯ СВЕТОТЕНЕВАЯ ПОДЛОЖКА (ПЕРЕСЧИТЫВАЕТСЯ ТОЛЬКО ПРИ СМЕНЕ ПАЛИТРЫ/КАДРА!)
      // ==========================================
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
          const lVal = m.liftedLum[i];
          const eVal = m.edge[i];

          // preserveDarkness = true гарантирует, что черный фон останется ЧЕРНЫМ (никакой фиолетовой стены!)
          const [r, g, b] = resolveArtColor(art, src[p], src[p + 1], src[p + 2], lVal, eVal, t.tone, true);
          uDst[p] = Math.round(r * vMask);
          uDst[p + 1] = Math.round(g * vMask);
          uDst[p + 2] = Math.round(b * vMask);
          uDst[p + 3] = Math.round(clip(lVal * 1.3 + eVal, 0, 1) * vMask * 255);
        }
        underlayCtx.putImageData(uImg, 0, 0);
        s.needsUnderlayRebuild = false;
      }

      // ==========================================
      // РЕЖИМ 1: TRACE 6.0 (МИКРО-АНАТОМИЯ + 4 КАРДИНАЛЬНО РАЗНЫХ ДВИЖКА СТИЛЯ)
      // ==========================================
      if (s.topology === "TRACE") {
        const clampedProg = Math.min(1.0, s.traceProgress);
        const easedGlobal = smoothstep(0.0, 1.0, clampedProg);

        if (art.underlayOpacity > 0.01) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.underlayOpacity * easedGlobal;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
        ctx.lineCap = art.styleEngine === "HALFTONE" ? "butt" : "round";
        ctx.lineJoin = "round";

        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(90, Math.floor(totalStrokes * 0.22));
        const headFloat = clampedProg * (totalStrokes + windowSpan);

        const waveSpeed = time * (1.8 + t.energy * 2.2);
        const foldMirror = t.symmetry > 0.65;

        // В режиме STILL отключаем волновое смещение для 100% хирургической точности
        const coherentAmp =
          art.flowMode === "STILL"
            ? 0.0
            : t.chaos * 1.6 * (1.06 - t.structure * 0.85);

        // Дыхание толщины линий в режиме PULSE
        const breathPulse =
          art.flowMode === "PULSE"
            ? 0.75 + 0.45 * Math.sin(time * 3.8)
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

          // На микро-штрихах (глаза, текст, лады гитары) амплитуда волны снижена в 4 раза, чтобы их не размывало!
          const tierWaveScale = st.tier === 1 ? 1.0 : 0.25;

          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 3.5 + pt.v * 3.5) * Math.PI + waveSpeed;
            const dxWave = Math.sin(spatialPhase) * env * coherentAmp * tierWaveScale;
            const dyWave = Math.cos(spatialPhase * 0.9) * env * coherentAmp * tierWaveScale;

            let mouseXPush = 0;
            let mouseYPush = 0;
            if (s.mouseActive) {
              const dmx = pt.u - mNormX;
              const dmy = pt.v - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.028) {
                const mFactor = Math.exp(-dSq * 90.0) * 9.5 * env;
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
          const tierAlpha = st.tier === 1 ? 0.94 : st.tier === 2 ? 0.84 : 0.45;
          const baseAlpha = clip((0.25 + st.meanEdge * 0.65 + st.meanLum * 0.25) * tierAlpha * (0.4 + 0.6 * localProg), 0.12, 0.96);
          const baseW = (st.tier === 1 ? (1.05 + st.meanEdge * 1.1) : st.tier === 2 ? 0.82 : 0.55) * art.strokeWeight * breathPulse;

          // ==========================================
          // ВЕТВЛЕНИЕ ПО 4 КАРДИНАЛЬНО РАЗНЫМ STYLE ENGINES
          // ==========================================
          if (art.styleEngine === "CHROMATIC") {
            // 1. CHROMATIC: Голографическое RGB-расщепление каждого контура на 3 спектральных слоя
            const splitOffset = (1.6 + t.chaos * 4.5) * Math.sin(waveSpeed * 0.6 + st.phase);
            const midPt = pts[Math.floor(pts.length * 0.5)];
            const offX = midPt.nx * splitOffset;
            const offY = midPt.ny * splitOffset;

            buildSmoothPath(coords);
            ctx.save();
            ctx.translate(-offX, -offY);
            ctx.strokeStyle = "rgba(255, 25, 110, " + String((baseAlpha * 0.7).toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.95;
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(offX, offY);
            ctx.strokeStyle = "rgba(0, 245, 255, " + String((baseAlpha * 0.7).toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.95;
            ctx.stroke();
            ctx.restore();

            ctx.strokeStyle = "rgba(255, 255, 255, " + String((baseAlpha * 0.85).toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.65;
            ctx.stroke();
          } else if (art.styleEngine === "HALFTONE") {
            // 2. HALFTONE: Ритмическая оп-арт гравировка калиброванными штрихами
            const dashLen = Math.max(2, (3.5 + st.meanLum * 8.0) * art.strokeWeight);
            const gapLen = Math.max(2, (5.5 - st.meanEdge * 3.5) * art.strokeWeight);
            ctx.setLineDash([dashLen, gapLen]);
            ctx.lineDashOffset = -time * 18.0 * st.speed;

            buildSmoothPath(coords);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW * 1.45;
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (art.styleEngine === "INK_HATCH") {
            // 3. INK_HATCH: Экспрессионистское перо Эгона Шиле + академическая перекрестная штриховка
            buildSmoothPath(coords);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW * 0.85;
            ctx.stroke();

            // Рисуем косые перекрестные штрихи (cross-hatching) вдоль контура
            if (st.tier <= 2 && coords.length >= 6) {
              const hatchStep = st.tier === 1 ? 3 : 5;
              const hatchLen = (3.2 + (1.0 - st.meanLum) * 5.5) * art.strokeWeight;
              ctx.beginPath();
              for (let k = 1; k < coords.length - 1; k += hatchStep) {
                const pt = pts[k];
                const hx = (pt.nx * 0.707 - pt.ny * 0.707) * hatchLen;
                const hy = (pt.nx * 0.707 + pt.ny * 0.707) * hatchLen;
                ctx.moveTo(coords[k].x - hx, coords[k].y - hy);
                ctx.lineTo(coords[k].x + hx, coords[k].y + hy);
              }
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((baseAlpha * 0.48).toFixed(2)) + ")";
              ctx.lineWidth = 0.6 * art.strokeWeight;
              ctx.stroke();
            }
          } else {
            // 4. NEON (Классический лазер со свечением и кометами)
            buildSmoothPath(coords);
            if (st.tier === 1 && art.glowIntensity > 0.05 && !isPaper) {
              const glowAlpha = clip(baseAlpha * 0.3 * art.glowIntensity, 0.02, 0.42);
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(glowAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseW * 3.2;
              ctx.stroke();
            }
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
            ctx.lineWidth = baseW;
            ctx.stroke();
          }

          // Живые кометы света вдоль всех нарисованных контуров (в режиме COMETS)
          if (art.flowMode === "COMETS" && coords.length >= 7 && clampedProg >= 0.96) {
            const cometSpan = Math.max(3, Math.floor(coords.length * 0.32));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.9) + st.phase) % 1.4) - 0.2;
            const headIdx = Math.floor(cyclePos * coords.length);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(coords.length - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              const cometSlice = coords.slice(tailIdx, clampedHead + 1);
              buildSmoothPath(cometSlice);
              const cometAlpha = clip(baseAlpha * (0.55 + 0.45 * art.glowIntensity), 0.2, 0.95);
              ctx.strokeStyle = isPaper
                ? "rgba(10, 10, 18, " + String(cometAlpha.toFixed(2)) + ")"
                : "rgba(255, 255, 255, " + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseW * 1.4;
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS 5.0 (ИММЕРСИВНЫЙ ЛАМИНАРНЫЙ ПОТОК БЕЗ СФЕРЫ, ОБТЕКАНИЕ ОБЪЕКТА + ВЫРАВНИВАНИЕ ЛИНИЙ)
      // ==========================================
      else if (s.topology === "CURRENTS" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        // Плавная гидродинамическая точка погружения (следует за рукой/мышью без всякого шара!)
        const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.35) * 0.22;
        const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.48 + Math.sin(time * 0.48) * 0.18;

        const prevU = s.wakeU;
        const prevV = s.wakeV;
        s.wakeU += (goalU - s.wakeU) * 0.07;
        s.wakeV += (goalV - s.wakeV) * 0.07;
        s.wakeVelU = s.wakeVelU * 0.85 + (s.wakeU - prevU) * 12.0;
        s.wakeVelV = s.wakeVelV * 0.85 + (s.wakeV - prevV) * 12.0;

        const wu = s.wakeU;
        const wv = s.wakeV;

        // Базовая частота тонких векторных струй Роберта Битти
        const baseFreq = 38.0 + t.symmetry * 55.0;
        // Сила обтекания самого объекта (фигура гитариста/ромб работает как 3D-препятствие в потоке!)
        const objectObstacleStrength = 1.8 + t.structure * 3.2;
        const wakeSwirlStrength = 0.22 + t.chaos * 0.55;

        // Угол ламинарного течения
        const flowAngle = 0.52 + (art.styleEngine === "INK_HATCH" ? 0.35 : 0.0);
        const fCos = Math.cos(flowAngle);
        const fSin = Math.sin(flowAngle);

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;

            // 1. Иммерсивное течение от курсора/пальца (гладкий вихревой след в жидкости без разрывов)
            const du = u - wu;
            const dv = v - wv;
            const distSq = du * du + dv * dv + 0.008;
            const wakeGauss = Math.exp(-distSq * 14.0);

            // Продольная и поперечная координаты относительно потока
            const sCoord = (u - 0.5) * fCos + (v - 0.5) * fSin;
            const nCoord = -(u - 0.5) * fSin + (v - 0.5) * fCos;

            // Гармоническая вихревая дорожка Кармана, рождаемая контурами объекта и рукой пользователя
            const vortexRipple =
              Math.sin(sCoord * 24.0 - time * (2.8 + t.energy * 2.5) + m.smoothLum[baseIdx] * 5.0) *
              (wakeGauss * wakeSwirlStrength + m.edge[baseIdx] * t.chaos * 0.18);

            const cursorPush = (du * s.wakeVelV - dv * s.wakeVelU) * wakeGauss * 0.45;

            // 2. Потенциал обтекания самого объекта: линии плавно огибают силуэт и сгущаются на гранях
            const elev = m.smoothLum[baseIdx];
            const gxObj = m.smoothGx[baseIdx];
            const gyObj = m.smoothGy[baseIdx];

            // Адвекция координат исходного фото вдоль линий тока (жидкий шелк без разрыва черт лица!)
            const advShift = (vortexRipple + cursorPush) * m.w * 0.32;
            const sx = clip(x + (fCos * advShift - gyObj * m.w * 0.8), 0, m.w - 1);
            const sy = clip(y + (fSin * advShift + gxObj * m.h * 0.8), 0, m.h - 1);

            const [rPhoto, gPhoto, bPhoto] = sampleBilinearRGB(src, m.w, m.h, sx, sy);
            const sharpLum = m.liftedLum[baseIdx];
            const sharpEdge = m.edge[baseIdx];

            // 3. Функция тока Ψ(x,y) и ее аналитический градиент |∇Ψ| (гарантирует одинаково четкие линии везде!)
            const psi =
              (nCoord + vortexRipple + cursorPush) * baseFreq +
              elev * objectObstacleStrength -
              time * (0.9 + t.energy * 1.4);

            // Локальная производная частоты препятствует превращению полос в широкие пятна ("зебру")
            const dPsi = 1.0 + Math.abs(gxObj * fCos + gyObj * fSin) * objectObstacleStrength * 18.0;
            const normWave = Math.cos(psi * Math.PI * 2.0);
            const normSin = Math.sin(psi * Math.PI * 2.0);

            // Настройка профиля струи по выбранному Style Engine
            let ribbonMask = smoothstep(-0.45 * dPsi, 0.15 * dPsi, normWave / Math.min(2.2, dPsi * 0.65));
            if (art.styleEngine === "HALFTONE") {
              const dotWave = Math.cos(sCoord * baseFreq * 1.4 * Math.PI * 2.0);
              ribbonMask *= smoothstep(-0.2, 0.2, dotWave);
            }

            // Хромированный блик на гребне каждой струи
            const chromeCrest = Math.pow(Math.max(0.0, normSin), 5.0) * art.glowIntensity;

            // Спектральная фаза вдоль потока (плавный перелив пурпур -> фиолет -> циан -> серебро)
            const streamColorPhase = (t.tone + sCoord * 0.45 + elev * 0.35 + wakeGauss * 0.25 + 1.0) % 1.0;
            const [palR, palG, palB] = resolveArtColor(
              art,
              rPhoto,
              gPhoto,
              bPhoto,
              clip(sharpLum * 0.65 + 0.35 * (0.5 + 0.5 * normSin)),
              sharpEdge,
              streamColorPhase
            );

            // Сохраняем 100% узнаваемость лица, гитары и текста внутри потока
            const subjectPresence = clip(art.underlayOpacity + sharpEdge * 0.65 + sharpLum * 0.45, 0.08, 0.94);

            const coreR = rPhoto * subjectPresence * 0.75 + palR * (1.0 - subjectPresence * 0.45);
            const coreG = gPhoto * subjectPresence * 0.75 + palG * (1.0 - subjectPresence * 0.45);
            const coreB = bPhoto * subjectPresence * 0.75 + palB * (1.0 - subjectPresence * 0.45);

            // Между струями — глубокие черные обсидиановые ложбинки (как на виниле Currents)
            const grooveDepth = 0.08 + sharpEdge * 0.58 + sharpLum * 0.32;
            const finalBand = grooveDepth + (1.0 - grooveDepth) * ribbonMask;

            let rOut = coreR * finalBand + chromeCrest * 235.0;
            let gOut = coreG * finalBand + chromeCrest * 240.0;
            let bOut = coreB * finalBand + chromeCrest * 255.0;

            if (art.styleEngine === "CHROMATIC") {
              const shift = Math.sin(psi * Math.PI * 2.0 + 1.1) * 45.0;
              rOut += shift;
              bOut -= shift;
            }

            const outP = baseIdx * 4;
            dst[outP] = Math.min(255, Math.max(0, Math.round(rOut * vMask)));
            dst[outP + 1] = Math.min(255, Math.max(0, Math.round(gOut * vMask)));
            dst[outP + 2] = Math.min(255, Math.max(0, Math.round(bOut * vMask)));
            dst[outP + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 3: SILK 5.0 (НЕЖНАЯ БИОЛЮМИНЕСЦЕНТНАЯ ВУАЛЬ В ТЕМНОМ ВАКУУМЕ — БЕЗ ЯДОВИТОГО ФОНА!)
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
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
          const l = m.liftedLum[cell0];
          const vMask = m.mask[cell0];

          // Если частица попала в пустой черный фон — не рисуем её, чтобы фон оставался идеально черным!
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
            // Деликатная шелковая прозрачность (0.02 .. 0.16), чтобы глазам было максимально приятно!
            const alpha = clip((0.03 + e * 0.14 + l * 0.08) * fadeLife * vMask, 0.015, 0.18);

            const p = cell0 * 4;
            const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone, true);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(3)) + ")";
            ctx.lineWidth = (0.45 + e * 0.75) * art.strokeWeight;
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
      // РЕЖИМ 4: LIDAR 2.0
      // ==========================================
      else if (s.topology === "LIDAR") {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";

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

            const l = m.liftedLum[idx];
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
            const alpha = clip((0.26 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.96);

            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((alpha * 0.6).toFixed(2)) + ")";
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";

            ctx.lineWidth = 0.95 * art.strokeWeight;
            ctx.beginPath();
            ctx.moveTo(sxBack, syBack);
            ctx.lineTo(sx, sy);
            if (hasPrev && e > 0.14 && Math.abs(sx - prevSx) < 16 && Math.abs(sy - prevSy) < 16) {
              ctx.moveTo(prevSx, prevSy);
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            const ptSize = (1.2 + l * 1.3 + e * 1.2) * (fov * 0.85) * art.strokeWeight;
            ctx.fillRect(sx - ptSize * 0.5, sy - ptSize * 0.5, ptSize, ptSize);

            prevSx = sx;
            prevSy = sy;
            hasPrev = true;
          }
        }
      }

      // ==========================================
      // РЕЖИМ 5: ACID
      // ==========================================
      else if (s.topology === "ACID" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const waveAmp = t.chaos * 12.0;
        const freq1 = 0.02 * c.nHarmonic;
        const freq2 = 0.02 * c.mHarmonic;
        const rgbSplit = t.chaos * 7.5 + t.energy * 2.0;
        const edgeGlowBoost = t.structure * 190.0 * art.glowIntensity;
        const foldMirror = t.symmetry > 0.65;

        for (let y = 0; y < m.h; y++) {
          const rowWaveX = Math.sin(y * freq1 + time * 2.2) * waveAmp;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const srcXBase = foldMirror && x > m.w / 2 ? m.w - 1 - x : x;
            const sx = clip(srcXBase + rowWaveX, 0, m.w - 1);
            const sy = clip(y + Math.cos(srcXBase * freq2 + time * 1.9) * waveAmp * 0.65, 0, m.h - 1);

            const [rR] = sampleBilinearRGB(src, m.w, m.h, clip(sx + rgbSplit, 0, m.w - 1), sy);
            const [, gG] = sampleBilinearRGB(src, m.w, m.h, sx, sy);
            const [, , bB] = sampleBilinearRGB(src, m.w, m.h, clip(sx - rgbSplit, 0, m.w - 1), sy);

            const idx = Math.floor(sy) * m.w + Math.floor(sx);
            const lVal = m.liftedLum[idx];
            const eVal = m.edge[idx];

            let [r, g, b] =
              art.palette === "NATIVE" && t.tone < 0.03
                ? [rR, gG, bB]
                : resolveArtColor(art, rR, gG, bB, lVal, eVal, t.tone, true);

            if (eVal > 0.12) {
              const glow = eVal * edgeGlowBoost;
              r = Math.min(255, r + glow * 0.8);
              g = Math.min(255, g + glow * 0.6);
              b = Math.min(255, b + glow);
            }

            const outP = baseIdx * 4;
            dst[outP] = Math.round(r * vMask);
            dst[outP + 1] = Math.round(g * vMask);
            dst[outP + 2] = Math.round(b * vMask);
            dst[outP + 3] = 255;
          }
        }
        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 6: ENGRAVE
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalAlpha = art.underlayOpacity;
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
            const l = m.liftedLum[cell];
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
          ctx.fillStyle = isPaper ? "rgba(245, 242, 235, 0.84)" : "rgba(2, 1, 4, 0.78)";
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
          ctx.lineWidth = 1.15 * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 7: PRISM
      // ==========================================
      else if (s.topology === "PRISM" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const rayAngle = theta + Math.sin(time * 0.7) * 0.22;
        const dirX = Math.cos(rayAngle);
        const dirY = Math.sin(rayAngle);
        const maxDispersion = 12.0 + t.symmetry * 42.0 + t.chaos * 24.0;
        const crispLock = t.structure;

        for (let y = 0; y < m.h; y++) {
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const p = idx * 4;
            const e = m.edge[idx];

            let rAcc = src[p] * crispLock * (0.78 + e * 0.5);
            let gAcc = src[p + 1] * crispLock * (0.78 + e * 0.5);
            let bAcc = src[p + 2] * crispLock * (0.78 + e * 0.5);

            for (let band = 0; band < 7; band++) {
              const bandNorm = (band + 1) / 7.0;
              const dist = bandNorm * maxDispersion * (0.8 + 0.2 * Math.sin(time * 2.5 + band * 0.6));
              const sx = Math.round(x - dirX * dist);
              const sy = Math.round(y - dirY * dist);

              if (sx >= 0 && sx < m.w && sy >= 0 && sy < m.h) {
                const sIdx = sy * m.w + sx;
                const sEdge = m.edge[sIdx];
                const sLum = m.liftedLum[sIdx];
                const energySource = sEdge * 1.45 + (sLum > 0.55 ? (sLum - 0.55) * 1.2 : 0.0);
                if (energySource > 0.18) {
                  const intensity = energySource * (1.0 - bandNorm * 0.35) * 0.45 * art.glowIntensity;
                  const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                  rAcc += cr * intensity;
                  gAcc += cg * intensity;
                  bAcc += cb * intensity;
                }
              }
            }

            dst[p] = Math.min(255, Math.max(0, Math.round(rAcc * vMask)));
            dst[p + 1] = Math.min(255, Math.max(0, Math.round(gAcc * vMask)));
            dst[p + 2] = Math.min(255, Math.max(0, Math.round(bAcc * vMask)));
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 8: CRYSTAL
      // ==========================================
      else if (s.topology === "CRYSTAL") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalAlpha = art.underlayOpacity;
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
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 9: GLYPH
      // ==========================================
      else if (s.topology === "GLYPH") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalAlpha = art.underlayOpacity;
          ctx.drawImage(underlayCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
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
            const l = m.liftedLum[idx];
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
      // ГАЛЕРЕЙНАЯ РАМКА И ТИПОГРАФИКА ПОСТЕРА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isPaper ? "rgba(20, 20, 25, 0.28)" : "rgba(255, 255, 255, 0.16)";
        const textFill = isPaper ? "rgba(20, 20, 25, 0.65)" : "rgba(255, 255, 255, 0.55)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT // " + (query || "SHINE ON").toUpperCase().slice(0, 26) + " [" + s.topology + " · " + art.styleEngine + "]",
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
        className="lg:col-span-8 relative h-[600px] md:h-[750px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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
              {(["TRACE", "CURRENTS", "SILK", "LIDAR", "ACID", "ENGRAVE", "PRISM", "CRYSTAL", "GLYPH"] as ManifoldTopology[]).map((mode) => (
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
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
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
            <span className="font-mono text-[8px] text-[#a855f7] uppercase tracking-widest">ZERO-AI</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {/* Палитры */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Color Grade:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateArt("theme", artConfig.theme === "VOID" ? "PAPER" : "VOID")}
                      className="px-2 py-0.5 rounded border border-white/15 bg-white/5 text-white text-[8px] cursor-pointer hover:bg-white hover:text-black transition-all"
                    >
                      BG: {artConfig.theme}
                    </button>
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
                      Frame
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {PALETTE_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => updateArt("palette", sw.id)}
                      className={
                        "py-1.5 px-2 rounded-lg border text-[8px] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer " +
                        (artConfig.palette === sw.id
                          ? "bg-white text-black border-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: "linear-gradient(135deg, " + sw.colors[0] + ", " + sw.colors[1] + ")",
                        }}
                      />
                      <span className="truncate">{sw.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {artConfig.palette === "CUSTOM" && (
                <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-black/50 border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.primaryHex}
                      onChange={(e) => updateArt("primaryHex", e.target.value)}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-neutral-300 text-[8px]">Primary</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.secondaryHex}
                      onChange={(e) => updateArt("secondaryHex", e.target.value)}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-neutral-300 text-[8px]">Secondary</span>
                  </label>
                </div>
              )}

              {/* 4 кардинально разных геометрических движка рендеринга */}
              <div>
                <div className="text-neutral-400 mb-1.5">Render Style Engine:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "NEON", label: "Neon Laser" },
                      { id: "INK_HATCH", label: "Schiele Ink" },
                      { id: "HALFTONE", label: "Halftone" },
                      { id: "CHROMATIC", label: "RGB Split" },
                    ] as { id: StyleEnginePreset; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateArt("styleEngine", st.id)}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.styleEngine === st.id
                          ? "bg-white text-black border-white font-bold"
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
                      { id: "COMETS", label: "Comets" },
                      { id: "LASER_LOOP", label: "Laser Loop" },
                      { id: "PULSE", label: "Pulse" },
                      { id: "STILL", label: "Still Crisp" },
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
                          ? "bg-[#a855f7] text-black border-[#a855f7] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {fm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки студийной доводки */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Micro-Detail Gate (Faces & Text)</span>
                    <span className="text-[#10b981]">{Math.round((1.0 - artConfig.noiseGate) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.65"
                    step="0.02"
                    value={artConfig.noiseGate}
                    onChange={(e) => updateArt("noiseGate", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Stroke Weight</span>
                    <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="2.2"
                    step="0.05"
                    value={artConfig.strokeWeight}
                    onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Base Photo Blend</span>
                    <span className="text-white">{Math.round(artConfig.underlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.75"
                    step="0.02"
                    value={artConfig.underlayOpacity}
                    onChange={(e) => updateArt("underlayOpacity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Chrome & Bloom Intensity</span>
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
                  { key: "energy", label: "Energy (Stream & Comet Speed)" },
                  { key: "chaos", label: "Chaos (Vortex Wake & Turbulence)" },
                  { key: "tone", label: "Tone (Spectrum Phase Shift)" },
                  { key: "structure", label: "Structure (Obstacle Relief)" },
                  { key: "symmetry", label: "Symmetry (Ribbon Frequency)" },
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
                <div>∇I_retinex = |∇(I^0.62)| / max(G_σ * |∇I|, ε)</div>
                <div>Ψ_currents = (n + Wake_cursor)·ω + (G_σ^10 * I)·St</div>
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
