"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость потока, прорисовки и бегущих импульсов
  chaos: number;     // C: амплитуда гидродинамических вихрей и волн
  tone: number;      // H: спектральный сдвиг палитры (Currents / SO3)
  structure: number; // St: точность анатомического замка контуров и 3D-рельефа
  symmetry: number;  // Sy: зеркальная симметрия и плотность ламинарных полос
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
const MATRIX_RES = 560;
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.42 + 0.40, 0.40, 0.86);
  const chaos = clip((entropy / 4.5) * 0.16 + 0.10, 0.08, 0.32);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(0.86 + consonantRatio * 0.11, 0.85, 0.98);
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

// Билинейная выборка скалярного поля (для идеально гладкой трассировки и шейдера Currents)
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
// ДЕКОДИРОВАНИЕ МАТРИЦЫ + C2-ГЛАДКАЯ СПЛАЙН-ВЕКТОРИЗАЦИЯ (TRACE 3.0)
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
    const wy = Math.abs(ny) > 0.88 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.88) / 0.12) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.88 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.88) / 0.12) * (Math.PI * 0.5))) : 1.0;
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

      const sharpened = clip(rawLum[i] + lap * 0.52);
      const sCurve = sharpened * sharpened * (3.0 - 2.0 * sharpened);
      lum[i] = clip((sharpened * 0.65 + sCurve * 0.35) * mask[i]);

      const p = i * 4;
      const boost = lap * 90.0;
      const avg = (rawRgba[p] + rawRgba[p + 1] + rawRgba[p + 2]) * 0.333;
      sharpRgba[p] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p] - avg) * 1.4 + boost)));
      sharpRgba[p + 1] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 1] - avg) * 1.4 + boost)));
      sharpRgba[p + 2] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 2] - avg) * 1.4 + boost)));
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

  for (let i = 0; i < total; i++) {
    edge[i] = clip(edge[i] / maxEdge);
  }

  // Двухпроходное сглаживание касательного поля ETF (обеспечивает плавные векторы вдоль прямых граней и кривых)
  const tempTx = new Float32Array(total);
  const tempTy = new Float32Array(total);

  for (let pass = 0; pass < 2; pass++) {
    const srcX = pass === 0 ? rawTx : tempTx;
    const srcY = pass === 0 ? rawTy : tempTy;
    const dstX = pass === 0 ? tempTx : etfX;
    const dstY = pass === 0 ? tempTy : etfY;

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const idx = y * w + x;
        let sumX = 0;
        let sumY = 0;
        const refX = srcX[idx];
        const refY = srcY[idx];

        for (let ky = -2; ky <= 2; ky++) {
          const rowOffset = (y + ky) * w;
          for (let kx = -2; kx <= 2; kx++) {
            const nIdx = rowOffset + (x + kx);
            const wgt = (edge[nIdx] + 0.04) * (ky === 0 && kx === 0 ? 2.0 : 1.0);
            const dot = refX * srcX[nIdx] + refY * srcY[nIdx];
            const sign = dot >= 0 ? 1 : -1;
            sumX += srcX[nIdx] * wgt * sign;
            sumY += srcY[nIdx] * wgt * sign;
          }
        }
        const len = Math.sqrt(sumX * sumX + sumY * sumY) + 1e-6;
        dstX[idx] = sumX / len;
        dstY[idx] = sumY / len;

        if (pass === 1 && (edge[idx] > 0.10 || lum[idx] > 0.20)) {
          spawnIndices.push(idx);
        }
      }
    }
  }

  // ==========================================
  // БИЛИНЕЙНАЯ СУБПИКСЕЛЬНАЯ ТРАССИРОВКА С 4-КРАТНЫМ ГАУССОВЫМ СГЛАЖИВАНИЕМ КРИВЫХ
  // ==========================================
  const visited = new Uint8Array(total);
  const tier1Seeds: { idx: number; score: number }[] = [];
  const tier2Seeds: { idx: number; score: number }[] = [];
  const tier3Seeds: { idx: number; score: number }[] = [];

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (mask[i] < 0.08) continue;
      const e = edge[i];
      const l = lum[i];

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];
      const isRidge = e >= ePrev * 0.95 && e >= eNext * 0.95;

      const distCenter = Math.sqrt(Math.pow(x / w - 0.5, 2) + Math.pow(y / h - 0.5, 2));
      const focusBoost = 1.35 - distCenter * 0.65;

      if (isRidge && e > 0.14) {
        tier1Seeds.push({ idx: i, score: e * focusBoost * 3.0 });
      } else if (isRidge && e > 0.055 && (x + y) % 2 === 0) {
        tier2Seeds.push({ idx: i, score: (e * 2.0 + l * 0.4) * focusBoost });
      } else if (l > 0.18 && (x % 4 === 0) && (y % 4 === 0)) {
        tier3Seeds.push({ idx: i, score: l * focusBoost });
      }
    }
  }

  tier1Seeds.sort((a, b) => b.score - a.score);
  tier2Seeds.sort((a, b) => b.score - a.score);
  tier3Seeds.sort((a, b) => b.score - a.score);

  const traceBilinearStreamline = (
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
      if (ix < 3 || ix >= w - 3 || iy < 3 || iy >= h - 3) break;

      const cIdx = iy * w + ix;
      if (mask[cIdx] < 0.05) break;

      const curEdge = sampleBilinearScalar(edge, w, h, cx, cy);
      const curLum = sampleBilinearScalar(lum, w, h, cx, cy);
      if (curEdge < minEdge && curLum < 0.14) break;

      // Билинейная выборка касательного вектора (убирает ступенчатый шум пиксельной сетки!)
      let tx = sampleBilinearScalar(etfX, w, h, cx, cy) * dirSign;
      let ty = sampleBilinearScalar(etfY, w, h, cx, cy) * dirSign;
      const tLen = Math.sqrt(tx * tx + ty * ty) + 1e-6;
      tx /= tLen;
      ty /= tLen;

      if (tx * prevTx + ty * prevTy < 0) {
        tx = -tx;
        ty = -ty;
      }
      if (s > 0 && tx * prevTx + ty * prevTy < 0.22) break;

      // Инерционный фильтр направления (превращает ломаную в идеальную дугу)
      const smoothTx = prevTx * 0.55 + tx * 0.45;
      const smoothTy = prevTy * 0.55 + ty * 0.45;
      const normT = Math.sqrt(smoothTx * smoothTx + smoothTy * smoothTy) + 1e-6;
      const finalTx = smoothTx / normT;
      const finalTy = smoothTy / normT;

      prevTx = finalTx;
      prevTy = finalTy;

      visited[cIdx] = 1;
      rawChain.push({ x: cx, y: cy });

      // Мягкое субпиксельное удержание на вершине градиента
      const nX = -finalTy;
      const nY = finalTx;
      const ePlus = sampleBilinearScalar(edge, w, h, cx + nX * 0.85, cy + nY * 0.85);
      const eMinus = sampleBilinearScalar(edge, w, h, cx - nX * 0.85, cy - nY * 0.85);
      const ridgePull = (ePlus - eMinus) * 0.25;

      cx += finalTx * stepPx + nX * ridgePull;
      cy += finalTy * stepPx + nY * ridgePull;
    }
    return rawChain;
  };

  // Многопроходный фильтр Гаусса + расчет аналитических нормалей кривой
  const smoothAndComputeNormals = (rawPts: { x: number; y: number }[], passes: number) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;
    if (n < 3) return [];

    for (let p = 0; p < passes; p++) {
      const next = curr.map((pt) => ({ x: pt.x, y: pt.y }));
      for (let i = 1; i < n - 1; i++) {
        next[i].x = 0.25 * curr[i - 1].x + 0.5 * curr[i].x + 0.25 * curr[i + 1].x;
        next[i].y = 0.25 * curr[i - 1].y + 0.5 * curr[i].y + 0.25 * curr[i + 1].y;
      }
      curr = next;
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
    smoothPasses: number
  ) => {
    let count = 0;
    for (let i = 0; i < seeds.length && count < maxStrokesForTier; i++) {
      const seed = seeds[i].idx;
      if (visited[seed]) continue;

      const sx = seed % w;
      const sy = Math.floor(seed / w);

      const back = traceBilinearStreamline(sx, sy, -1, maxHalfSteps, stepPx, minEdge).reverse();
      const fwd = traceBilinearStreamline(sx, sy, 1, maxHalfSteps, stepPx, minEdge);
      const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

      if (rawPts.length >= minPts) {
        const pts = smoothAndComputeNormals(rawPts, smoothPasses);
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

  // 4 прохода сглаживания на главных контурах делают линии идеально шелковыми!
  processTier(tier1Seeds, 1, 1150, 48, 1.4, 0.075, 5, 4);
  processTier(tier2Seeds, 2, 1250, 26, 1.2, 0.035, 4, 3);
  processTier(tier3Seeds, 3, 700, 18, 1.5, 0.0, 4, 3);

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
    setFieldStatus("SOLVING C2-SMOOTH SPLINES [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " C2-SMOOTH SPLINES (" + String(buf.w) + "x" + String(buf.h) + ")"
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
    stateRef.current.topology = topology;
    stateRef.current.isPaused = isPaused;
  }, [tensor, coeffs, topology, isPaused]);

  const handleAxisChange = (axis: keyof Tensor5D, value: number) => {
    setTensor((prev) => {
      const updated = { ...prev, [axis]: value };
      stateRef.current.tensor = updated;
      return updated;
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
      const m = s.matrix;

      if (!s.isPaused) {
        s.time += 0.015 * (0.35 + t.energy * 1.25);
        if (s.traceProgress < 1.0) {
          // Медленная, гипнотически плавная развертка контуров (~5.5 секунд)
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0024 * (0.5 + t.energy * 1.1));
        }
      }
      const time = s.time;

      if (m && s.needsSilkReset) {
        resetSilkParticles(m);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#020104";
        ctx.fillRect(0, 0, viewW, viewH);
        s.needsSilkReset = false;
      }

      if (s.topology === "SILK" && m) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(2, 1, 4, 0.11)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#020104";
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = "lighter";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 42; l++) {
          ctx.beginPath();
          const hue = Math.floor((t.tone * 360 + l * 4 + time * 20) % 360);
          ctx.strokeStyle = "hsla(" + String(hue) + ", 85%, 65%, 0.45)";
          ctx.lineWidth = 1.3;
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
      const availH = viewH - 122;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.42;

      const theta = t.tone * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const mNormX = (s.mouseX - ox) / Math.max(1, drawW);
      const mNormY = (s.mouseY - oy) / Math.max(1, drawH);

      // ==========================================
      // ГЕНЕРАЦИЯ ОПТИЧЕСКОГО БУФЕРА (ДЛЯ ACID И ПОДЛОЖКИ УЗНАВАЕМОСТИ)
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
        const waveAmp = isAcid ? t.chaos * 12.0 : t.chaos * 1.6;
        const freq1 = 0.02 * c.nHarmonic;
        const freq2 = 0.02 * c.mHarmonic;
        const rgbSplit = isAcid ? t.chaos * 7.5 + t.energy * 2.0 : t.chaos * 1.0;
        const edgeGlowBoost = t.structure * 195.0;
        const foldMirror = t.symmetry > 0.65;

        for (let y = 0; y < m.h; y++) {
          const ny = y / m.h - 0.5;
          const rowWaveX = Math.sin(y * freq1 + time * 2.2) * waveAmp;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const srcXBase = foldMirror && x > m.w / 2 ? m.w - 1 - x : x;
            const nx = srcXBase / m.w - 0.5;
            const radDist = Math.sqrt(nx * nx + ny * ny);

            let lensX = 0;
            let lensY = 0;
            if (s.mouseActive) {
              const dmx = x / m.w - mNormX;
              const dmy = y / m.h - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.055) {
                const factor = Math.exp(-dSq * 48.0) * 16.0;
                lensX = -dmy * factor;
                lensY = dmx * factor;
              }
            }

            const sx = clip(srcXBase + rowWaveX + lensX, 0, m.w - 1);
            const sy = clip(y + Math.cos(srcXBase * freq2 + time * 1.9) * waveAmp * 0.65 + lensY, 0, m.h - 1);

            const [rR] = sampleBilinearRGB(src, m.w, m.h, clip(sx + rgbSplit, 0, m.w - 1), sy);
            const [, gG] = sampleBilinearRGB(src, m.w, m.h, sx, sy);
            const [, , bB] = sampleBilinearRGB(src, m.w, m.h, clip(sx - rgbSplit, 0, m.w - 1), sy);

            let r = rR;
            let g = gG;
            let b = bB;
            const idx = Math.floor(sy) * m.w + Math.floor(sx);

            if (t.tone > 0.03 && s.topology !== "PRISM") {
              const avg = (r + g + b) * 0.333;
              const dr = r - avg;
              const dg = g - avg;
              const db = b - avg;
              if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 14) {
                const lNorm = m.lum[idx];
                const ph = theta + lNorm * Math.PI * 1.5 + radDist * 1.8;
                r = Math.min(255, Math.max(0, avg * (0.8 + 0.5 * Math.sin(ph))));
                g = Math.min(255, Math.max(0, avg * (0.8 + 0.5 * Math.sin(ph + 2.094))));
                b = Math.min(255, Math.max(0, avg * (0.8 + 0.5 * Math.sin(ph + 4.188))));
              } else {
                r = Math.min(255, Math.max(0, avg + dr * cosT - dg * sinT));
                g = Math.min(255, Math.max(0, avg + dr * sinT + dg * cosT));
                b = Math.min(255, Math.max(0, avg + db * cosT + dr * sinT * 0.5));
              }
            }

            const eVal = m.edge[idx];
            if (eVal > 0.12 && s.topology !== "PRISM") {
              const travelingWave = 0.55 + 0.45 * Math.sin(radDist * 20.0 - time * 4.2);
              const glow = eVal * edgeGlowBoost * travelingWave;
              r = Math.min(255, r + glow * (0.75 + 0.25 * Math.cos(theta)));
              g = Math.min(255, g + glow * (0.35 + 0.45 * Math.sin(theta)));
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
      // РЕЖИМ 1: TRACE 3.0 (СУБПИКСЕЛЬНАЯ СПЛАЙН-ИНТЕРПОЛЯЦИЯ + ГЛАДКОЕ ПОЛЕ ВОЛН)
      // ==========================================
      if (s.topology === "TRACE") {
        const easedGlobal = smoothstep(0.0, 1.0, s.traceProgress);

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = (0.12 + 0.22 * easedGlobal) * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        // Широкое окно одновременного рисования (280 контуров рисуются параллельно с S-кривой развертки)
        const windowSpan = 280;
        const headFloat = s.traceProgress * (totalStrokes + windowSpan);

        const waveSpeed = time * (2.2 + t.energy * 2.5);
        const foldMirror = t.symmetry > 0.65;
        // Когерентная амплитуда: плавное дыхание без излома прямых линий!
        const coherentAmp = t.chaos * 3.2 * (1.15 - t.structure * 0.75);

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.tier === 3 && t.structure < 0.45 && i % 2 === 0) continue;

          const pts = st.pts;
          const nPts = pts.length;

          // Вычисляем индивидуальный прогресс штриха [0..1] через гладкую S-кривую smoothstep
          const rawLocal = s.traceProgress >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.01) continue;

          // Точная дробная координата кончика пера между вершинами (никаких рывков!)
          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;
          const isDrawingTip = localProg < 0.995;

          const coords: { x: number; y: number }[] = [];
          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            // Гладкое 2D пространственное поле смещения (не ломает прямые грани в червяков!)
            const spatialPhase = (pt.u * 4.5 + pt.v * 4.5) * Math.PI + waveSpeed + st.phase * 0.25;
            const dxWave = Math.sin(spatialPhase) * env * coherentAmp;
            const dyWave = Math.cos(spatialPhase * 0.85) * env * coherentAmp;

            let mouseXPush = 0;
            let mouseYPush = 0;
            if (s.mouseActive) {
              const dmx = pt.u - mNormX;
              const dmy = pt.v - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.035) {
                const mFactor = Math.exp(-dSq * 75.0) * 14.0 * env;
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

          // Добавляем субпиксельно-интерполированный кончик штриха
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

          const pulse = 0.72 + 0.28 * Math.sin(waveSpeed * 0.75 - st.phase);
          const tierAlphaBoost = st.tier === 1 ? 0.95 : st.tier === 2 ? 0.78 : 0.38;
          const alpha = clip((0.2 + st.meanEdge * 0.58 + st.meanLum * 0.24) * tierAlphaBoost * pulse, 0.06, 0.9);

          const strokeHue = Math.floor((t.tone * 360 + st.meanLum * 105 + st.meanEdge * 75) % 360);
          let coreStyle = "";
          let glowStyle = "";

          if (t.tone < 0.05) {
            const rC = Math.min(255, st.r + 70);
            const gC = Math.min(255, st.g + 70);
            const bC = Math.min(255, st.b + 90);
            coreStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            glowStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((alpha * 0.24).toFixed(2)) + ")";
          } else {
            const light = Math.min(90, Math.floor(52 + st.meanLum * 34));
            coreStyle = "hsla(" + String(strokeHue) + ", 88%, " + String(light) + "%, " + String(alpha.toFixed(2)) + ")";
            glowStyle = "hsla(" + String(strokeHue) + ", 92%, 62%, " + String((alpha * 0.24).toFixed(2)) + ")";
          }

          buildSmoothPath(coords);

          // Мягкий ореол свечения (Bloom) вокруг главных контуров
          if (st.tier === 1) {
            ctx.strokeStyle = glowStyle;
            ctx.lineWidth = 3.2 + st.meanEdge * 2.0;
            ctx.stroke();
          }

          // Четкое каллиграфическое ядро линии
          ctx.strokeStyle = coreStyle;
          ctx.lineWidth = st.tier === 1 ? (1.1 + st.meanEdge * 1.1) : st.tier === 2 ? 0.85 : 0.55;
          ctx.stroke();

          // Нежная лазерная жемчужина на кончике рисуемого сплайна
          if (isDrawingTip) {
            const tip = coords[coords.length - 1];
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, st.tier === 1 ? 1.9 : 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS 2.0 (TAME IMPALA LIQUID CHROME & VORTEX MARBLING SHADER)
      // ==========================================
      else if (s.topology === "CURRENTS" && acidCtx) {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        // Плавно скользящий фокус вихревого обтекания (без резких дыр и наклеенных шаров!)
        const goalU = s.mouseActive && mNormX >= 0 && mNormX <= 1 ? mNormX : 0.5 + Math.cos(time * 0.45) * 0.24;
        const goalV = s.mouseActive && mNormY >= 0 && mNormY <= 1 ? mNormY : 0.5 + Math.sin(time * 0.65) * 0.18;
        s.vortexU += (goalU - s.vortexU) * 0.06;
        s.vortexV += (goalV - s.vortexV) * 0.06;

        const vu = s.vortexU;
        const vv = s.vortexV;

        // Плотность ламинарных полос жидкого хрома и сила завихрения
        const striationFreq = 26.0 + t.symmetry * 48.0;
        const shearAmp = (0.015 + t.chaos * 0.065) * m.w;
        const reliefContourBend = 1.6 + t.structure * 2.8;
        const hueShiftRad = theta;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const baseIdx = y * m.w + x;
            const vMask = m.mask[baseIdx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const lOrig = m.lum[baseIdx];
            const eOrig = m.edge[baseIdx];

            // 1. Векторное поле вихревой дорожки Кармана + обтекание рельефа объекта
            const du = u - vu;
            const dv = v - vv;
            const distSq = du * du + dv * dv + 0.004;
            const dist = Math.sqrt(distSq);

            // Мягкая дипольная закрутка вокруг фокуса (как в расплавленном металле)
            const swirlEnvelope = Math.exp(-distSq * 9.5);
            const vortexAngle = swirlEnvelope * (1.2 + t.chaos * 2.4) * Math.sin(time * 1.5 - dist * 8.0);
            const wakeWave =
              Math.sin((u * 3.5 - v * 1.8) * Math.PI * c.nHarmonic - time * 2.6) *
              Math.cos((v * 4.2 + u * 1.5) * Math.PI * c.mHarmonic + time * 1.9);

            // Сдвиг вдоль касательных самого изображения сохраняет 100% четкость силуэта и деталей!
            const dispX =
              (m.etfX[baseIdx] * wakeWave + (-dv * vortexAngle - du * swirlEnvelope * 0.35)) * shearAmp;
            const dispY =
              (m.etfY[baseIdx] * wakeWave + (du * vortexAngle - dv * swirlEnvelope * 0.35)) * shearAmp;

            const sx = clip(x + dispX * (1.1 - t.structure * 0.45), 0, m.w - 1);
            const sy = clip(y + dispY * (1.1 - t.structure * 0.45), 0, m.h - 1);

            const [rSample, gSample, bSample] = sampleBilinearRGB(src, m.w, m.h, sx, sy);
            const lAdv = sampleBilinearScalar(lum, m.w, m.h, sx, sy);
            const eAdv = sampleBilinearScalar(edge, m.w, m.h, sx, sy);

            // 2. Функция тока Ψ(u,v) для ламинарных серебряно-неоновых полос Роберта Битти
            const streamPsi =
              (v * 0.82 - u * 0.38) * striationFreq +
              lAdv * reliefContourBend +
              eAdv * 1.8 +
              swirlEnvelope * 3.2 * Math.sin(Math.atan2(dv, du) * 2.0 - time * 2.2) +
              wakeWave * (0.4 + t.chaos * 1.4) -
              time * (1.2 + t.energy * 1.8);

            // Гладкая антиалиасинговая гребенка жидкого хрома
            const sinBand = Math.sin(streamPsi * Math.PI);
            const chromeSpecular = Math.pow(0.5 + 0.5 * sinBand, 3.2);
            const darkGroove = 0.32 + 0.68 * (0.5 + 0.5 * Math.cos(streamPsi * Math.PI));

            // 3. Фирменная палитра Tame Impala — Currents (Пурпур / Индиго / Циан / Золото + Жидкое серебро)
            const iridPhase = hueShiftRad + lAdv * 3.4 + swirlEnvelope * 2.5 + sinBand * 0.9;
            const curR = 145 + 110 * Math.sin(iridPhase + 0.2);
            const curG = 55 + 95 * Math.sin(iridPhase + 2.35);
            const curB = 185 + 70 * Math.cos(iridPhase - 0.4);

            // Смешиваем оригинальный детальный образ с жидким хромом и иридисцентным спектром
            const photoBlend = 0.45 + t.structure * 0.35;
            let rOut = (rSample * photoBlend + curR * (1.0 - photoBlend)) * darkGroove;
            let gOut = (gSample * photoBlend + curG * (1.0 - photoBlend)) * darkGroove;
            let bOut = (bSample * photoBlend + curB * (1.0 - photoBlend)) * darkGroove;

            // Блик жидкого серебра на гребнях ламинарных полос и гранях объекта
            const chromeIntensity = chromeSpecular * (0.35 + lOrig * 0.65 + eAdv * 0.85) * 210.0;
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
        ctx.globalCompositeOperation = "lighter";

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
        const step = 3;
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
            const alpha = clip((0.26 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.96);

            if (t.tone < 0.05) {
              const rC = Math.min(255, Math.round(m.rgba[p] + scanGlow * 120 + 40));
              const gC = Math.min(255, Math.round(m.rgba[p + 1] + scanGlow * 180 + 40));
              const bC = Math.min(255, Math.round(m.rgba[p + 2] + scanGlow * 255 + 55));
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((alpha * 0.6).toFixed(2)) + ")";
              ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            } else {
              const hue = Math.floor((t.tone * 360 + z2 * 95 + e * 65) % 360);
              const light = Math.min(92, Math.floor(48 + l * 38 + scanGlow * 30));
              ctx.strokeStyle = "hsla(" + String(hue) + ", 88%, " + String(light) + "%, " + String((alpha * 0.6).toFixed(2)) + ")";
              ctx.fillStyle = "hsla(" + String(hue) + ", 88%, " + String(light) + "%, " + String(alpha.toFixed(2)) + ")";
            }

            ctx.lineWidth = 0.95;
            ctx.beginPath();
            ctx.moveTo(sxBack, syBack);
            ctx.lineTo(sx, sy);
            if (hasPrev && e > 0.14 && Math.abs(sx - prevSx) < 16 && Math.abs(sy - prevSy) < 16) {
              ctx.moveTo(prevSx, prevSy);
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            const ptSize = (1.3 + l * 1.4 + e * 1.3) * (fov * 0.85);
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
        ctx.globalAlpha = 0.28 * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        const numLines = Math.floor(110 + t.structure * 55);
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
          ctx.fillStyle = "rgba(2, 1, 4, 0.76)";
          ctx.fill();

          const hue = Math.floor((t.tone * 360 + vNorm * 110 + time * 10) % 360);
          ctx.strokeStyle =
            t.tone < 0.05
              ? "rgba(240, 242, 255, 0.9)"
              : "hsla(" + String(hue) + ", 88%, 70%, 0.9)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 6: SILK
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.26 * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        ctx.globalCompositeOperation = "lighter";
        const stepSize = 0.0034 + t.energy * 0.004;
        const springPull = 0.055 * t.structure;

        for (let i = 0; i < SILK_COUNT; i++) {
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
          const alpha = clip((0.07 + e * 0.26 + l * 0.15) * fadeLife * vMask, 0.03, 0.34);

          const p = cell0 * 4;
          if (t.tone < 0.05) {
            ctx.strokeStyle =
              "rgba(" +
              String(Math.min(255, m.rgba[p] + 55)) +
              "," +
              String(Math.min(255, m.rgba[p + 1] + 55)) +
              "," +
              String(Math.min(255, m.rgba[p + 2] + 70)) +
              "," +
              String(alpha.toFixed(3)) +
              ")";
          } else {
            const hue = Math.floor((t.tone * 360 + l * 115 + e * 75) % 360);
            const light = Math.min(84, Math.floor(45 + l * 36 + e * 12));
            ctx.strokeStyle = "hsla(" + String(hue) + ", 85%, " + String(light) + "%, " + String(alpha.toFixed(3)) + ")";
          }

          ctx.lineWidth = 0.85 + e * 1.15;
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
                  const intensity = energySource * (1.0 - bandNorm * 0.35) * 0.42;
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
        ctx.globalAlpha = 0.32 * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        const cells = m.cells;
        const len = cells.length;

        for (let i = 0; i < len; i++) {
          const cl = cells[i];
          const phase = (cl.u * 9.0 + cl.v * 9.0) * c.nHarmonic - time * 2.6;
          const shift = Math.sin(phase) * t.chaos * 6.5;

          const cx = ox + cl.u * drawW + cl.tx * shift;
          const cy = oy + cl.v * drawH + cl.ty * shift;
          const rad = cl.size * drawW * (0.52 + cl.lum * 0.48);

          const rot = Math.atan2(cl.ty, cl.tx) + Math.sin(time + i * 0.03) * t.chaos * 0.6;

          let r = cl.r;
          let g = cl.g;
          let b = cl.b;
          if (t.tone > 0.04) {
            const avg = (r + g + b) * 0.333;
            const ph = theta + cl.lum * Math.PI * 1.5;
            r = Math.min(255, Math.max(25, Math.round(avg * (0.78 + 0.52 * Math.sin(ph)))));
            g = Math.min(255, Math.max(25, Math.round(avg * (0.78 + 0.52 * Math.sin(ph + 2.094)))));
            b = Math.min(255, Math.max(25, Math.round(avg * (0.78 + 0.52 * Math.sin(ph + 4.188)))));
          }

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
            ctx.strokeStyle = "rgba(" + String(Math.min(255, r + 85)) + "," + String(Math.min(255, g + 85)) + "," + String(Math.min(255, b + 95)) + "," + String((cl.edge * t.structure).toFixed(2)) + ")";
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 9: GLYPH
      // ==========================================
      else if (s.topology === "GLYPH") {
        ctx.globalAlpha = 0.28 * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        ctx.globalCompositeOperation = "lighter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(58 + t.structure * 34);
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

            const fontSize = Math.max(7, Math.floor(cellW * (0.6 + l * 0.62 + e * 0.45) * vMask));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            const alpha = clip((0.25 + l * 0.72 + e * 0.45) * vMask, 0.06, 0.95);
            if (t.tone < 0.05) {
              ctx.fillStyle =
                "rgba(" +
                String(Math.min(255, m.rgba[p] + 45)) +
                "," +
                String(Math.min(255, m.rgba[p + 1] + 45)) +
                "," +
                String(Math.min(255, m.rgba[p + 2] + 60)) +
                "," +
                String(alpha.toFixed(2)) +
                ")";
            } else {
              const hue = Math.floor((t.tone * 360 + l * 130 + e * 80) % 360);
              ctx.fillStyle = "hsla(" + String(hue) + ", 85%, " + String(Math.floor(48 + l * 42)) + "%, " + String(alpha.toFixed(2)) + ")";
            }

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
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "barrett-prism-" + String(Date.now()) + ".png";
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
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
        className="lg:col-span-8 relative h-[580px] md:h-[720px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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

      {/* ПРАВАЯ ПАНЕЛЬ УПРАВЛЕНИЯ BARRETT */}
      <div className="lg:col-span-4 glass-panel p-6 flex flex-col justify-between gap-6">
        <div>
          <div className="font-sync text-xs tracking-[3px] uppercase text-white font-bold border-b border-white/10 pb-4 mb-5 flex justify-between items-center">
            <span>Barrett Manifold</span>
            <span className="font-mono text-[9px] text-[#a855f7] font-normal">PURE MATH // NO AI</span>
          </div>

          <div className="flex flex-col gap-5 font-mono text-[10px] uppercase tracking-widest">
            {(
              [
                { key: "energy", label: "Energy (Draw & Flow Velocity)" },
                { key: "chaos", label: "Chaos (Vortex Shear & Wave)" },
                { key: "tone", label: "Tone (Spectrum & Prism Shift)" },
                { key: "structure", label: "Structure (Spline & 3D Lock)" },
                { key: "symmetry", label: "Symmetry (Chrome Rib Density)" },
              ] as { key: keyof Tensor5D; label: string }[]
            ).map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
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

          <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/5 font-mono text-[9px] text-neutral-400 leading-relaxed space-y-1">
            <div className="text-white uppercase mb-1">Barrett Differential System:</div>
            <div>P_smooth = (G_σ)^4 * Streamline(ETF_bilinear)</div>
            <div>Ψ_currents(u,v) = ω·(v - u) + Lum·St + Vortex(r,θ)</div>
            <div>I_chrome = I(u+δu, v+δv) + cos^4(π·Ψ)</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            className="btn-elegant w-full !py-3 justify-center"
          >
            Download PNG Frame
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
