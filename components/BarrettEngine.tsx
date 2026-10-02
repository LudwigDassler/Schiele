"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость развертки и динамики волн
  chaos: number;     // C: амплитуда живого дыхания линий и вихрей
  tone: number;      // H: фазовый сдвиг спектра
  structure: number; // St: жесткость привязки к анатомии объекта
  symmetry: number;  // Sy: зеркальная симметрия и частота лент
}

type PalettePreset = "NATIVE" | "CYBER" | "GOLD" | "NOIR" | "EMERALD" | "MONO" | "CUSTOM";
type BrushPreset = "NEON" | "INK" | "ETCH" | "RIBBON";
type CanvasTheme = "VOID" | "PAPER";

interface ArtStudioConfig {
  palette: PalettePreset;
  brush: BrushPreset;
  theme: CanvasTheme;
  primaryHex: string;
  secondaryHex: string;
  strokeWeight: number;   // 0.3 .. 2.5
  detailDensity: number;  // 0.2 .. 1.0 (до 4200 полилиний)
  underlayOpacity: number;// 0.0 .. 0.75 (прозрачность исходника)
  glowIntensity: number;  // 0.0 .. 1.0
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
  phase: number;
  arcLen: number;
}

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  lum: Float32Array;
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
  | "LIDAR"
  | "ACID"
  | "ENGRAVE"
  | "SILK"
  | "PRISM"
  | "CRYSTAL"
  | "GLYPH";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const MATRIX_RES = 600;
const SILK_COUNT = 4800;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

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

// Вычисление RGB штриха по выбранной палитре Art Studio
function resolveArtColor(
  art: ArtStudioConfig,
  nativeR: number,
  nativeG: number,
  nativeB: number,
  lum: number,
  edge: number,
  toneShift: number
): [number, number, number] {
  const weight = clip(lum * 0.65 + edge * 0.55, 0.0, 1.0);

  if (art.palette === "MONO") {
    if (art.theme === "PAPER") {
      const v = Math.round(15 + (1.0 - weight) * 55);
      return [v, v, v + 5];
    }
    const v = Math.min(255, Math.round(155 + weight * 100));
    return [v, v, Math.min(255, v + 12)];
  }

  if (art.palette === "CYBER") {
    // От глубокого неона мадженты (#ff007f) к электрическому циану (#00f5ff)
    const r = Math.round(255 * (1.0 - weight * 0.75) + edge * 45);
    const g = Math.round(25 + weight * 225);
    const b = Math.round(165 + weight * 90);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  if (art.palette === "GOLD") {
    // Имперское золото и теплая платина
    const r = Math.min(255, Math.round(185 + weight * 70));
    const g = Math.min(255, Math.round(125 + weight * 110));
    const b = Math.min(255, Math.round(35 + weight * 135));
    return [r, g, b];
  }

  if (art.palette === "NOIR") {
    // Sin City / Эгон Шиле: контрастный алый на гранях и чистое серебро в светах
    if (edge > 0.26) {
      return [255, Math.round(35 + lum * 60), Math.round(45 + lum * 60)];
    }
    const v = Math.round(140 + lum * 115);
    return [v, v, v];
  }

  if (art.palette === "EMERALD") {
    const r = Math.round(20 + weight * 110);
    const g = Math.min(255, Math.round(160 + weight * 95));
    const b = Math.min(255, Math.round(110 + weight * 115));
    return [r, g, b];
  }

  if (art.palette === "CUSTOM") {
    const [r1, g1, b1] = hexToRgb(art.primaryHex);
    const [r2, g2, b2] = hexToRgb(art.secondaryHex);
    const r = Math.round(r1 * (1.0 - weight) + r2 * weight);
    const g = Math.round(g1 * (1.0 - weight) + g2 * weight);
    const b = Math.round(b1 * (1.0 - weight) + b2 * weight);
    return [r, g, b];
  }

  // NATIVE (родной цвет кадра + вращение спектра TONE)
  if (toneShift < 0.03) {
    const boost = art.theme === "PAPER" ? -25 : 55;
    return [
      clip(nativeR + boost, 0, 255),
      clip(nativeG + boost, 0, 255),
      clip(nativeB + boost + 10, 0, 255),
    ];
  }

  const theta = toneShift * Math.PI * 2.0 + lum * 1.6 + edge * 1.2;
  const avg = (nativeR + nativeG + nativeB) * 0.333;
  const dr = nativeR - avg;
  const dg = nativeG - avg;
  const db = nativeB - avg;

  if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 15) {
    const base = Math.max(110, avg + 50);
    return [
      Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta))))),
      Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta + 2.094))))),
      Math.min(255, Math.max(20, Math.round(base * (0.78 + 0.48 * Math.sin(theta + 4.188))))),
    ];
  }

  const cosT = Math.cos(toneShift * Math.PI * 2.0);
  const sinT = Math.sin(toneShift * Math.PI * 2.0);
  return [
    Math.min(255, Math.max(20, Math.round(avg + dr * cosT - dg * sinT + 45))),
    Math.min(255, Math.max(20, Math.round(avg + dr * sinT + dg * cosT + 45))),
    Math.min(255, Math.max(20, Math.round(avg + db * cosT + dr * sinT * 0.5 + 55))),
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.40 + 0.45, 0.45, 0.88);
  const chaos = clip((entropy / 4.5) * 0.12 + 0.06, 0.05, 0.22);
  const tone = 0.0; // По умолчанию сохраняем благородный спектр выбранной палитры
  const structure = clip(0.88 + consonantRatio * 0.10, 0.88, 0.98);
  const symmetry = 0.24;

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

// ==========================================
// ДЕКОДИРОВАНИЕ 600P + ЛОКАЛЬНО-АДАПТИВНЫЙ ГРАДИЕНТ + ФИЛЬТР ТАУБИНА БЕЗ УСАДКИ
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement): MatrixBuffer {
  const aspect = img.width / Math.max(1, img.height);
  let w = MATRIX_RES;
  let h = MATRIX_RES;
  if (aspect > 1.2) {
    w = MATRIX_RES;
    h = Math.round(MATRIX_RES / Math.min(aspect, 1.55));
  } else if (aspect < 0.85) {
    h = MATRIX_RES;
    w = Math.round(MATRIX_RES * Math.max(aspect, 0.68));
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
  const rawTx = new Float32Array(total);
  const rawTy = new Float32Array(total);
  const etfX = new Float32Array(total);
  const etfY = new Float32Array(total);
  const mask = new Float32Array(total);
  const spawnIndices: number[] = [];
  const cells: CrystalCell[] = [];
  const strokes: ContourStroke[] = [];

  if (!octx) {
    return { w, h, rgba: new Uint8ClampedArray(total * 4), lum, edge, gx, gy, etfX, etfY, mask, spawnIndices, cells, strokes };
  }

  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rawRgba = octx.getImageData(0, 0, w, h).data;
  const sharpRgba = new Uint8ClampedArray(rawRgba.length);

  const rawLum = new Float32Array(total);
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = Math.abs(ny) > 0.9 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.9) / 0.1) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.9 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.9) / 0.1) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const p = i * 4;
      rawLum[i] = (0.299 * rawRgba[p] + 0.587 * rawRgba[p + 1] + 0.114 * rawRgba[p + 2]) / 255.0;
    }
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * rawLum[i] -
        rawLum[i - 1] -
        rawLum[i + 1] -
        rawLum[i - w] -
        rawLum[i + w];

      const sharpened = clip(rawLum[i] + lap * 0.55);
      lum[i] = clip(sharpened * mask[i]);

      const p = i * 4;
      const boost = lap * 92.0;
      const avg = (rawRgba[p] + rawRgba[p + 1] + rawRgba[p + 2]) * 0.333;
      sharpRgba[p] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p] - avg) * 1.42 + boost)));
      sharpRgba[p + 1] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 1] - avg) * 1.42 + boost)));
      sharpRgba[p + 2] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 2] - avg) * 1.42 + boost)));
      sharpRgba[p + 3] = 255;
    }
  }

  // Оператор Щарра
  let maxEdge = 1e-5;
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
      edge[idx] = mag;
      if (mag > maxEdge) maxEdge = mag;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
      rawTx[idx] = -sy / norm;
      rawTy[idx] = sx / norm;
    }
  }

  // Локально-адаптивное усиление граней (чтобы темные черты лица и гитары читались так же четко, как внешний силуэт!)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      const globalNorm = edge[idx] / maxEdge;
      let localMax = 1e-4;
      for (let ky = -2; ky <= 2; ky += 2) {
        for (let kx = -2; kx <= 2; kx += 2) {
          const v = edge[(y + ky) * w + (x + kx)];
          if (v > localMax) localMax = v;
        }
      }
      const localNorm = edge[idx] / (localMax + maxEdge * 0.12);
      edge[idx] = clip(globalNorm * 0.55 + localNorm * 0.45);
    }
  }

  // Билинейно-сглаженное поле касательных ETF
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
          const wgt = edge[nIdx] * edge[nIdx] + 0.03;
          const dot = refX * rawTx[nIdx] + refY * rawTy[nIdx];
          const sign = dot >= 0 ? 1 : -1;
          sumX += rawTx[nIdx] * wgt * sign;
          sumY += rawTy[nIdx] * wgt * sign;
        }
      }
      const len = Math.sqrt(sumX * sumX + sumY * sumY) + 1e-6;
      etfX[idx] = sumX / len;
      etfY[idx] = sumY / len;

      if (edge[idx] > 0.10 || lum[idx] > 0.20) {
        spawnIndices.push(idx);
      }
    }
  }

  // ==========================================
  // ВЫСОКОТОЧНАЯ ВЕКТОРИЗАЦИЯ С ФИЛЬТРОМ ТАУБИНА (НУЛЕВАЯ УСАДКА УГЛОВ И БУКВ)
  // ==========================================
  const visited = new Uint8Array(total);
  const tier1Seeds: { idx: number; score: number }[] = [];
  const tier2Seeds: { idx: number; score: number }[] = [];
  const tier3Seeds: { idx: number; score: number }[] = [];

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (mask[i] < 0.06) continue;
      const e = edge[i];
      const l = lum[i];

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];
      const isRidge = e >= ePrev * 0.94 && e >= eNext * 0.94;

      const distCenter = Math.sqrt(Math.pow(x / w - 0.5, 2) + Math.pow(y / h - 0.5, 2));
      const focusBoost = 1.35 - distCenter * 0.6;

      if (isRidge && e > 0.14) {
        tier1Seeds.push({ idx: i, score: e * focusBoost * 3.0 });
      } else if (isRidge && e > 0.05 && (x + y) % 2 === 0) {
        tier2Seeds.push({ idx: i, score: (e * 2.2 + l * 0.4) * focusBoost });
      } else if (l > 0.14 && (x % 3 === 0) && (y % 3 === 0)) {
        tier3Seeds.push({ idx: i, score: (l + e) * focusBoost });
      }
    }
  }

  tier1Seeds.sort((a, b) => b.score - a.score);
  tier2Seeds.sort((a, b) => b.score - a.score);
  tier3Seeds.sort((a, b) => b.score - a.score);

  const traceExactStreamline = (
    startX: number,
    startY: number,
    dirSign: number,
    maxSteps: number,
    stepPx: number,
    minEdge: number
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
      const curLum = sampleBilinearScalar(lum, w, h, cx, cy);
      if (curEdge < minEdge && curLum < 0.11) break;

      let tx = sampleBilinearScalar(etfX, w, h, cx, cy) * dirSign;
      let ty = sampleBilinearScalar(etfY, w, h, cx, cy) * dirSign;
      const tLen = Math.sqrt(tx * tx + ty * ty) + 1e-6;
      tx /= tLen;
      ty /= tLen;

      if (tx * prevTx + ty * prevTy < 0) {
        tx = -tx;
        ty = -ty;
      }
      if (s > 0 && tx * prevTx + ty * prevTy < 0.18) break;

      const smoothTx = prevTx * 0.4 + tx * 0.6;
      const smoothTy = prevTy * 0.4 + ty * 0.6;
      const normT = Math.sqrt(smoothTx * smoothTx + smoothTy * smoothTy) + 1e-6;
      const finalTx = smoothTx / normT;
      const finalTy = smoothTy / normT;

      prevTx = finalTx;
      prevTy = finalTy;

      visited[cIdx] = 1;
      rawChain.push({ x: cx, y: cy });

      // Субпиксельный захват гребня градиента (точность контура до 0.2 пикселя)
      const nX = -finalTy;
      const nY = finalTx;
      const ePlus = sampleBilinearScalar(edge, w, h, cx + nX * 0.75, cy + nY * 0.75);
      const eMinus = sampleBilinearScalar(edge, w, h, cx - nX * 0.75, cy - nY * 0.75);
      const ridgePull = (ePlus - eMinus) * 0.35;

      cx += finalTx * stepPx + nX * ridgePull;
      cy += finalTy * stepPx + nY * ridgePull;
    }
    return rawChain;
  };

  // Фильтр Таубина (λ = +0.45, μ = -0.47): убирает пиксельную лесенку БЕЗ стягивания углов и букв!
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

  const processTier = (
    seeds: { idx: number; score: number }[],
    tier: 1 | 2 | 3,
    maxStrokesForTier: number,
    maxHalfSteps: number,
    stepPx: number,
    minEdge: number,
    minPts: number,
    taubinIters: number
  ) => {
    let count = 0;
    for (let i = 0; i < seeds.length && count < maxStrokesForTier; i++) {
      const seed = seeds[i].idx;
      if (visited[seed]) continue;

      const sx = seed % w;
      const sy = Math.floor(seed / w);

      const back = traceExactStreamline(sx, sy, -1, maxHalfSteps, stepPx, minEdge).reverse();
      const fwd = traceExactStreamline(sx, sy, 1, maxHalfSteps, stepPx, minEdge);
      const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

      if (rawPts.length >= minPts) {
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
          lSum += lum[pxIdx];
          const p4 = pxIdx * 4;
          rSum += sharpRgba[p4];
          gSum += sharpRgba[p4 + 1];
          bSum += sharpRgba[p4 + 2];
        }

        const n = pts.length;
        strokes.push({
          pts,
          tier,
          r: Math.round(rSum / n),
          g: Math.round(gSum / n),
          b: Math.round(bSum / n),
          meanEdge: eSum / n,
          meanLum: lSum / n,
          phase: (strokes.length * PHI) % (Math.PI * 2),
          arcLen: n * stepPx,
        });
        count++;
      }
    }
  };

  // До 4 200 ювелирных векторных сплайнов (внутренние детали лица, струны, волосы и шрифты)
  processTier(tier1Seeds, 1, 1450, 52, 1.3, 0.065, 4, 3);
  processTier(tier2Seeds, 2, 1650, 28, 1.15, 0.03, 3, 2);
  processTier(tier3Seeds, 3, 1100, 18, 1.4, 0.0, 4, 2);

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

  return { w, h, rgba: sharpRgba, lum, edge, gx, gy, etfX, etfY, mask, spawnIndices, cells, strokes };
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
    palette: "NATIVE",
    brush: "NEON",
    theme: "VOID",
    primaryHex: "#a855f7",
    secondaryHex: "#00f5ff",
    strokeWeight: 1.0,
    detailDensity: 0.92,
    underlayOpacity: 0.22,
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
    isPaused: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    smoothYaw: 0,
    smoothPitch: -0.18,
    vortexU: 0.5,
    vortexV: 0.5,
  });

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("TRACING TAUBIN SPLINES [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " TAUBIN VECTORS (" + String(buf.w) + "x" + String(buf.h) + ")"
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    stateRef.current.mouseX = e.clientX - rect.left;
    stateRef.current.mouseY = e.clientY - rect.top;
    stateRef.current.mouseActive = true;
  };

  const handleMouseLeave = () => {
    stateRef.current.mouseActive = false;
  };

  // ==========================================
  // ЯДРО МАТЕМАТИЧЕСКОГО РЕНДЕРИНГА В RETINA HD (60 FPS)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let viewW = 900;
    let viewH = 660;

    const acidCanvas = document.createElement("canvas");
    const acidCtx = acidCanvas.getContext("2d");

    const silkParticles: SilkParticle[] = [];
    for (let i = 0; i < SILK_COUNT; i++) {
      silkParticles.push({ x: 0.5, y: 0.5, x0: 0.5, y0: 0.5, age: 0, maxAge: 80, dir: i % 2 === 0 ? 1 : -1 });
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
            age: Math.floor(Math.random() * 55),
            maxAge: 55 + Math.floor(Math.random() * 65),
            dir: i % 2 === 0 ? 1 : -1,
          };
        } else {
          const u = Math.random();
          const v = Math.random();
          silkParticles[i] = { x: u, y: v, x0: u, y0: v, age: 0, maxAge: 80, dir: 1 };
        }
      }
    };

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return;
      viewW = Math.floor(rect.width);
      viewH = Math.floor(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== viewW * dpr || canvas.height !== viewH * dpr) {
        canvas.width = viewW * dpr;
        canvas.height = viewH * dpr;
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
      const bgHex = isPaper ? "#f4f1ea" : "#020104";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          // Ускоренная в 3.5 раза шелковая прорисовка (~1.3 секунды до полного шедевра)
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0085 * (0.65 + t.energy * 1.25));
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
        ctx.fillStyle = isPaper ? "rgba(244, 241, 234, 0.12)" : "rgba(2, 1, 4, 0.11)";
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

      const pad = 22;
      const availW = viewW - pad * 2;
      const availH = viewH - 122;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.42;

      const theta = t.tone * Math.PI * 2;
      const mNormX = (s.mouseX - ox) / Math.max(1, drawW);
      const mNormY = (s.mouseY - oy) / Math.max(1, drawH);

      // ==========================================
      // ГЕНЕРАЦИЯ ОПТИЧЕСКОГО БУФЕРА
      // ==========================================
      if (acidCtx && s.topology !== "LIDAR" && s.topology !== "CURRENTS") {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const isAcid = s.topology === "ACID";
        const waveAmp = isAcid ? t.chaos * 12.0 : t.chaos * 1.2;
        const freq1 = 0.02 * c.nHarmonic;
        const freq2 = 0.02 * c.mHarmonic;
        const rgbSplit = isAcid ? t.chaos * 7.5 + t.energy * 2.0 : 0.0;
        const edgeGlowBoost = t.structure * 185.0 * art.glowIntensity;
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
            const lVal = m.lum[idx];
            const eVal = m.edge[idx];

            let [r, g, b] =
              art.palette === "NATIVE" && t.tone < 0.03
                ? [rR, gG, bB]
                : resolveArtColor(art, rR, gG, bB, lVal, eVal, t.tone);

            if (eVal > 0.14 && isAcid) {
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
        acidCtx.putImageData(outImg, 0, 0);
      }

      // ==========================================
      // РЕЖИМ 1: TRACE 4.0 (ТАУБИН-СПЛАЙНЫ БЕЗ БЕЛЫХ ТОЧЕК + СТИЛИ КИСТЕЙ И ПАЛИТР)
      // ==========================================
      if (s.topology === "TRACE") {
        const easedGlobal = smoothstep(0.0, 1.0, s.traceProgress);

        if (art.underlayOpacity > 0.01) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.underlayOpacity * easedGlobal;
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const strokes = m.strokes;
        // Сколько штрихов активно согласно ползунку Detail Density
        const maxAllowedStrokes = Math.max(250, Math.floor(strokes.length * art.detailDensity));
        const windowSpan = Math.max(80, Math.floor(maxAllowedStrokes * 0.18));
        const headFloat = s.traceProgress * (maxAllowedStrokes + windowSpan);

        const waveSpeed = time * (2.0 + t.energy * 2.2);
        const foldMirror = t.symmetry > 0.65;
        // Деликатная когерентная волна: сохраняет 100% точность букв и лиц
        const coherentAmp = t.chaos * 2.4 * (1.1 - t.structure * 0.82);

        const brushMult =
          art.brush === "ETCH"
            ? 0.52
            : art.brush === "RIBBON"
            ? 1.85
            : art.brush === "INK"
            ? 1.35
            : 1.05;

        for (let i = 0; i < maxAllowedStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          const pts = st.pts;
          const nPts = pts.length;

          const rawLocal = s.traceProgress >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.01) continue;

          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;

          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 4.0 + pt.v * 4.0) * Math.PI + waveSpeed + st.phase * 0.2;
            const dxWave = Math.sin(spatialPhase) * env * coherentAmp;
            const dyWave = Math.cos(spatialPhase * 0.9) * env * coherentAmp;

            let mouseXPush = 0;
            let mouseYPush = 0;
            if (s.mouseActive) {
              const dmx = pt.u - mNormX;
              const dmy = pt.v - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.03) {
                const mFactor = Math.exp(-dSq * 85.0) * 11.0 * env;
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
          const pulse = 0.78 + 0.22 * Math.sin(waveSpeed * 0.7 - st.phase);
          const tierAlpha = st.tier === 1 ? 0.95 : st.tier === 2 ? 0.82 : 0.45;
          // Плавное проявление штриха во время рисования (вместо белых точек-бусинок!)
          const drawFade = 0.35 + 0.65 * localProg;
          const alpha = clip((0.25 + st.meanEdge * 0.6 + st.meanLum * 0.25) * tierAlpha * pulse * drawFade, 0.08, 0.95);

          const coreColor = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";

          buildSmoothPath(coords);

          // Мягкий неоновый ореол свечения (управляется ползунком Glow Aura)
          if (st.tier === 1 && art.glowIntensity > 0.05 && !isPaper && art.brush !== "ETCH") {
            const glowAlpha = clip(alpha * 0.32 * art.glowIntensity, 0.02, 0.45);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(glowAlpha.toFixed(2)) + ")";
            ctx.lineWidth = (3.0 + st.meanEdge * 2.2) * art.strokeWeight * brushMult;
            ctx.stroke();
          }

          const baseW = st.tier === 1 ? (1.1 + st.meanEdge * 1.15) : st.tier === 2 ? 0.82 : 0.52;
          ctx.strokeStyle = coreColor;
          ctx.lineWidth = baseW * art.strokeWeight * brushMult * (0.65 + 0.35 * localProg);
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS 3.0 (ЧИСТЫЙ АНАЛИТИЧЕСКИЙ ШЕЙДЕР ПОТОКА БЕЗ РВАНОГО ШУМА НА ВОЛОСАХ)
      // ==========================================
      else if (s.topology === "CURRENTS" && acidCtx) {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const goalU = s.mouseActive && mNormX >= 0 && mNormX <= 1 ? mNormX : 0.5 + Math.cos(time * 0.42) * 0.22;
        const goalV = s.mouseActive && mNormY >= 0 && mNormY <= 1 ? mNormY : 0.5 + Math.sin(time * 0.6) * 0.16;
        s.vortexU += (goalU - s.vortexU) * 0.06;
        s.vortexV += (goalV - s.vortexV) * 0.06;

        const vu = s.vortexU;
        const vv = s.vortexV;

        const striationFreq = 24.0 + t.symmetry * 46.0;
        const shearAmp = (0.008 + t.chaos * 0.038) * m.w;
        const reliefContourBend = 1.4 + t.structure * 2.2;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const lOrig = m.lum[baseIdx];
            const eOrig = m.edge[baseIdx];

            const du = u - vu;
            const dv = v - vv;
            const distSq = du * du + dv * dv + 0.006;
            const dist = Math.sqrt(distSq);

            // Гладкое аналитическое поле Гельмгольца (НИКАКОГО шумного etfX на кудрявых волосах и лице!)
            const swirlEnvelope = Math.exp(-distSq * 8.5);
            const vortexAngle = swirlEnvelope * (1.0 + t.chaos * 2.0) * Math.sin(time * 1.4 - dist * 7.0);
            const laminarWaveX = Math.sin(v * Math.PI * c.nHarmonic * 2.0 + time * 1.8) * Math.cos(u * Math.PI * 2.0);
            const laminarWaveY = Math.cos(u * Math.PI * c.mHarmonic * 2.0 - time * 1.5) * Math.sin(v * Math.PI * 2.0);

            const dispX = (laminarWaveX * 0.65 - dv * vortexAngle) * shearAmp * (1.05 - t.structure * 0.55);
            const dispY = (laminarWaveY * 0.65 + du * vortexAngle) * shearAmp * (1.05 - t.structure * 0.55);

            const sx = clip(x + dispX, 0, m.w - 1);
            const sy = clip(y + dispY, 0, m.h - 1);

            const [rSample, gSample, bSample] = sampleBilinearRGB(src, m.w, m.h, sx, sy);
            const lAdv = sampleBilinearScalar(m.lum, m.w, m.h, sx, sy);

            const streamPsi =
              (v * 0.85 - u * 0.35) * striationFreq +
              lAdv * reliefContourBend +
              swirlEnvelope * 2.8 * Math.sin(Math.atan2(dv, du) * 2.0 - time * 2.0) +
              laminarWaveX * (0.3 + t.chaos * 0.9) -
              time * (1.1 + t.energy * 1.6);

            const sinBand = Math.sin(streamPsi * Math.PI);
            const chromeSpecular = Math.pow(0.5 + 0.5 * sinBand, 3.0) * art.glowIntensity;
            const darkGroove = 0.42 + 0.58 * (0.5 + 0.5 * Math.cos(streamPsi * Math.PI));

            const [palR, palG, palB] = resolveArtColor(
              art,
              rSample,
              gSample,
              bSample,
              lAdv,
              eOrig,
              (t.tone + sinBand * 0.12 + 1.0) % 1.0
            );

            const photoBlend = clip(0.35 + art.underlayOpacity * 0.75, 0.15, 0.88);
            let rOut = (rSample * photoBlend + palR * (1.0 - photoBlend)) * darkGroove;
            let gOut = (gSample * photoBlend + palG * (1.0 - photoBlend)) * darkGroove;
            let bOut = (bSample * photoBlend + palB * (1.0 - photoBlend)) * darkGroove;

            const chromeIntensity = chromeSpecular * (0.35 + lOrig * 0.65 + eOrig * 0.75) * 195.0;
            rOut += chromeIntensity * 0.96;
            gOut += chromeIntensity * 0.98;
            bOut += chromeIntensity * 1.05;

            const outP = baseIdx * 4;
            dst[outP] = Math.min(255, Math.max(0, Math.round(rOut * vMask)));
            dst[outP + 1] = Math.min(255, Math.max(0, Math.round(gOut * vMask)));
            dst[outP + 2] = Math.min(255, Math.max(0, Math.round(bOut * vMask)));
            dst[outP + 3] = 255;
          }
        }

        acidCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 3: LIDAR 2.0
      // ==========================================
      else if (s.topology === "LIDAR") {
        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";

        const centerX = viewW * 0.5;
        const centerY = viewH * 0.43;
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
        const step = Math.max(2, Math.round(4.5 - art.detailDensity * 2.0));
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
            if (l < 0.06 && e < 0.07) {
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
      // РЕЖИМ 4: ACID
      // ==========================================
      else if (s.topology === "ACID") {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 5: ENGRAVE
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalAlpha = art.underlayOpacity;
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const numLines = Math.floor(85 + art.detailDensity * 90);
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
          ctx.fillStyle = isPaper ? "rgba(244, 241, 234, 0.82)" : "rgba(2, 1, 4, 0.78)";
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
      // РЕЖИМ 6: SILK
      // ==========================================
      else if (s.topology === "SILK") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.underlayOpacity * 0.85;
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
        const stepSize = 0.0034 + t.energy * 0.004;
        const springPull = 0.055 * t.structure;
        const activeSilk = Math.floor(SILK_COUNT * art.detailDensity);

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

          ctx.beginPath();
          ctx.moveTo(ox + currX * drawW, oy + currY * drawH);

          for (let sub = 0; sub < 3; sub++) {
            const gxi = Math.min(m.w - 1, Math.max(0, Math.floor(currX * m.w)));
            const gyi = Math.min(m.h - 1, Math.max(0, Math.floor(currY * m.h)));
            const ci = gyi * m.w + gxi;

            const tx = m.etfX[ci] * pt.dir;
            const ty = m.etfY[ci] * pt.dir;
            const wave = Math.sin(currX * 10.0 + currY * 10.0 + time * 2.0) * t.chaos * 0.0018;

            currX += tx * stepSize - ty * wave + (pt.x0 - currX) * springPull;
            currY += ty * stepSize + tx * wave + (pt.y0 - currY) * springPull;
            ctx.lineTo(ox + currX * drawW, oy + currY * drawH);
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
            continue;
          }

          const fadeLife = Math.sin((pt.age / pt.maxAge) * Math.PI);
          const alpha = clip((0.08 + e * 0.28 + l * 0.16) * fadeLife * vMask, 0.03, 0.38);

          const p = cell0 * 4;
          const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(3)) + ")";
          ctx.lineWidth = (0.8 + e * 1.15) * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 7: PRISM
      // ==========================================
      else if (s.topology === "PRISM" && acidCtx) {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
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
                const sLum = m.lum[sIdx];
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

        acidCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 8: CRYSTAL
      // ==========================================
      else if (s.topology === "CRYSTAL") {
        if (art.underlayOpacity > 0.01) {
          ctx.globalAlpha = art.underlayOpacity;
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const cells = m.cells;
        const len = Math.floor(cells.length * art.detailDensity);

        for (let i = 0; i < len; i++) {
          const cl = cells[i];
          const phase = (cl.u * 9.0 + cl.v * 9.0) * c.nHarmonic - time * 2.6;
          const shift = Math.sin(phase) * t.chaos * 6.5;

          const cx = ox + cl.u * drawW + cl.tx * shift;
          const cy = oy + cl.v * drawH + cl.ty * shift;
          const rad = cl.size * drawW * (0.52 + cl.lum * 0.48) * art.strokeWeight;

          const rot = Math.atan2(cl.ty, cl.tx) + Math.sin(time + i * 0.03) * t.chaos * 0.6;
          const [r, g, b] = resolveArtColor(art, cl.r, cl.g, cl.b, cl.lum, cl.edge, t.tone);

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
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isPaper ? "source-over" : "lighter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(48 + art.detailDensity * 44);
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

            const phase = u * 10.0 + v * 10.0 - time * 3.0;
            const shiftX = m.etfX[idx] * Math.sin(phase) * 4.5 * (0.25 + t.chaos);
            const shiftY = m.etfY[idx] * Math.cos(phase) * 4.5 * (0.25 + t.chaos);

            const glyphIdx = Math.floor((l * 9 + e * 6 + time * 1.6 + (r * 3 + cIdx) * 0.2) % MATH_GLYPHS.length);
            const ch = MATH_GLYPHS[glyphIdx];

            const fontSize = Math.max(7, Math.floor(cellW * (0.6 + l * 0.62 + e * 0.45) * vMask * art.strokeWeight));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            const [rC, gC, bC] = resolveArtColor(art, m.rgba[p], m.rgba[p + 1], m.rgba[p + 2], l, e, t.tone);
            const alpha = clip((0.25 + l * 0.72 + e * 0.45) * vMask, 0.06, 0.95);
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            ctx.fillText(ch, ox + u * drawW + shiftX, oy + v * drawH + shiftY);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "barrett-art-" + String(Date.now()) + ".png";
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
        className="lg:col-span-8 relative h-[580px] md:h-[740px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
        />

        {/* ВЕРХНИЙ ТЕЛЕМЕТРИЧЕСКИЙ ОВЕРЛЕЙ */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-2">
          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300">
            <div className="text-white font-bold">BARRETT PRISM // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
            <div className="text-neutral-500 mt-0.5">
              α={coeffs.alpha} | β={coeffs.beta} | γ={coeffs.gamma} | δ={coeffs.delta}
            </div>
          </div>

          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>SHANNON H(X): <span className="text-white">{coeffs.entropy} bits</span></div>
            <div>LYAPUNOV λ: <span className="text-[#10b981]">{coeffs.lyapunov}</span> | MODES ({coeffs.nHarmonic},{coeffs.mHarmonic})</div>
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
              {(["TRACE", "CURRENTS", "LIDAR", "ACID", "ENGRAVE", "SILK", "PRISM", "CRYSTAL", "GLYPH"] as ManifoldTopology[]).map((mode) => (
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
                Next Matrix ({candidateUrls.length > 0 ? String(candidateIdx + 1) + "/" + String(candidateUrls.length) : "1/1"})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: BARRETT ART STUDIO & 5D PHYSICS */}
      <div className="lg:col-span-4 glass-panel p-6 flex flex-col justify-between gap-5">
        <div>
          {/* Переключатель вкладок ART STUDIO / 5D PHYSICS */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-5">
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
                Art Studio
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
                5D Physics
              </button>
            </div>
            <span className="font-mono text-[8px] text-[#a855f7] uppercase tracking-widest">PURE MATH</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-4 font-mono text-[9px] uppercase tracking-widest">
              {/* Выбор цветовой палитры */}
              <div>
                <div className="text-neutral-400 mb-2">Color Palette:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["NATIVE", "CYBER", "GOLD", "NOIR", "EMERALD", "MONO", "CUSTOM"] as PalettePreset[]).map((pal) => (
                    <button
                      key={pal}
                      type="button"
                      onClick={() => updateArt("palette", pal)}
                      className={
                        "py-1.5 px-2 rounded border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.palette === pal
                          ? "bg-[#a855f7] text-black border-[#a855f7] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {pal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateArt("theme", artConfig.theme === "VOID" ? "PAPER" : "VOID")}
                    className="py-1.5 px-2 rounded border border-white/20 bg-white/5 text-white text-[8px] tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer"
                    title="Toggle Background: Obsidian Void / Archival Paper"
                  >
                    BG: {artConfig.theme}
                  </button>
                </div>
              </div>

              {/* Кастомные пикеры цвета при выборе CUSTOM */}
              {artConfig.palette === "CUSTOM" && (
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/50 border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.primaryHex}
                      onChange={(e) => updateArt("primaryHex", e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-neutral-300 text-[8px]">Shadow Tone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.secondaryHex}
                      onChange={(e) => updateArt("secondaryHex", e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-neutral-300 text-[8px]">Highlight Tone</span>
                  </label>
                </div>
              )}

              {/* Выбор стиля кисти */}
              <div>
                <div className="text-neutral-400 mb-2">Vector Brush Style:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["NEON", "INK", "ETCH", "RIBBON"] as BrushPreset[]).map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => updateArt("brush", br)}
                      className={
                        "py-1.5 px-2 rounded border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.brush === br
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {br}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки кастомизации арта */}
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Brush Weight (Line Width)</span>
                    <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="2.4"
                    step="0.05"
                    value={artConfig.strokeWeight}
                    onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Detail Density (Vectors)</span>
                    <span className="text-white">{Math.round(artConfig.detailDensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.02"
                    value={artConfig.detailDensity}
                    onChange={(e) => updateArt("detailDensity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Photo Underlay (Base Blend)</span>
                    <span className="text-white">{Math.round(artConfig.underlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.7"
                    step="0.02"
                    value={artConfig.underlayOpacity}
                    onChange={(e) => updateArt("underlayOpacity", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Glow Aura & Specular</span>
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
                  { key: "energy", label: "Energy (Draw & Flow Speed)" },
                  { key: "chaos", label: "Chaos (Wave & Vortex Shear)" },
                  { key: "tone", label: "Tone (Spectrum Rotation)" },
                  { key: "structure", label: "Structure (Anatomy Lock)" },
                  { key: "symmetry", label: "Symmetry (Mirror & Rib Freq)" },
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
            </div>
          )}

          <div className="mt-5 p-3.5 rounded-xl bg-black/50 border border-white/5 font-mono text-[8px] text-neutral-400 leading-relaxed space-y-1">
            <div className="text-white uppercase">Taubin Zero-Shrinkage Operator:</div>
            <div>P&apos; = (I + μL)(I + λL) · Streamline(CLAHE_Scharr)</div>
            <div>Ψ_helmholtz(u,v) = ω(v - u) + Lum·St + Swirl(r,θ)</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            className="btn-elegant w-full !py-3 justify-center"
          >
            Download Poster PNG
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
