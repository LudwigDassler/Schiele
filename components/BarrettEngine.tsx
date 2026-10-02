"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость отрисовки и частота бегущих импульсов
  chaos: number;     // C: амплитуда колебания нарисованных контуров (струн)
  tone: number;      // H: спектральный сдвиг палитры SO(3)
  structure: number; // St: плотность контуров, 3D-глубина LIDAR и четкость объекта
  symmetry: number;  // Sy: зеркальная симметрия и длина лучей PRISM
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

// Непрерывная векторная цепь контура для режима TRACE
interface ContourStroke {
  pts: {
    u: number;
    v: number;
    nx: number; // Нормаль для поперечного колебания струны
    ny: number;
  }[];
  r: number;
  g: number;
  b: number;
  meanEdge: number;
  meanLum: number;
  phase: number;
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.42 + 0.38, 0.38, 0.85);
  const chaos = clip((entropy / 4.5) * 0.18 + 0.12, 0.10, 0.35);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(0.85 + consonantRatio * 0.12, 0.84, 0.97);
  const symmetry = 0.22;

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

// ==========================================
// ДЕКОДИРОВАНИЕ МАТРИЦЫ + ТРАССИРОВКА НЕПРЕРЫВНЫХ ВЕКТОРНЫХ КОНТУРОВ (TRACE)
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

  // Фильтр Лапласа + Сигмоидальный микроконтраст для вытягивания глаз, лиц и мелких деталей
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
      // Мягкая S-кривая контраста
      const sCurve = sharpened * sharpened * (3.0 - 2.0 * sharpened);
      lum[i] = clip((sharpened * 0.65 + sCurve * 0.35) * mask[i]);

      const p = i * 4;
      const boost = lap * 95.0;
      const avg = (rawRgba[p] + rawRgba[p + 1] + rawRgba[p + 2]) * 0.333;
      sharpRgba[p] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p] - avg) * 1.4 + boost)));
      sharpRgba[p + 1] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 1] - avg) * 1.4 + boost)));
      sharpRgba[p + 2] = Math.min(255, Math.max(0, Math.round(avg + (rawRgba[p + 2] - avg) * 1.4 + boost)));
      sharpRgba[p + 3] = 255;
    }
  }

  let maxEdge = 1e-5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx =
        -lum[(y - 1) * w + (x - 1)] + lum[(y - 1) * w + (x + 1)] +
        -2 * lum[y * w + (x - 1)] + 2 * lum[y * w + (x + 1)] +
        -lum[(y + 1) * w + (x - 1)] + lum[(y + 1) * w + (x + 1)];

      const sy =
        -lum[(y - 1) * w + (x - 1)] - 2 * lum[(y - 1) * w + x] - lum[(y - 1) * w + (x + 1)] +
        lum[(y + 1) * w + (x - 1)] + 2 * lum[(y + 1) * w + x] + lum[(y + 1) * w + (x + 1)];

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

  // Сглаживание касательного поля (ETF 5x5)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      let sumX = 0;
      let sumY = 0;
      const refX = rawTx[idx];
      const refY = rawTy[idx];

      for (let ky = -2; ky <= 2; ky++) {
        const rowOffset = (y + ky) * w;
        for (let kx = -2; kx <= 2; kx++) {
          const nIdx = rowOffset + (x + kx);
          const weight = edge[nIdx] + 0.05;
          const dot = refX * rawTx[nIdx] + refY * rawTy[nIdx];
          const sign = dot >= 0 ? 1 : -1;
          sumX += rawTx[nIdx] * weight * sign;
          sumY += rawTy[nIdx] * weight * sign;
        }
      }
      const len = Math.sqrt(sumX * sumX + sumY * sumY) + 1e-6;
      etfX[idx] = sumX / len;
      etfY[idx] = sumY / len;

      if (edge[idx] > 0.11 || lum[idx] > 0.20) {
        spawnIndices.push(idx);
      }
    }
  }

  // ==========================================
  // АЛГОРИТМ ВЕКТОРНОЙ ТРАССИРОВКИ КОНТУРОВ (ДЛЯ РЕЖИМА TRACE)
  // ==========================================
  const visited = new Uint8Array(total);
  const seedCandidates: { idx: number; score: number }[] = [];

  for (let y = 4; y < h - 4; y += 2) {
    for (let x = 4; x < w - 4; x += 2) {
      const i = y * w + x;
      if (mask[i] < 0.1) continue;
      const e = edge[i];
      const l = lum[i];

      // Проверка локального максимума вдоль нормали градиента (Non-Maximum Suppression)
      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];

      const isRidge = e >= ePrev * 0.92 && e >= eNext * 0.92;
      if ((isRidge && e > 0.08) || (l > 0.25 && e > 0.04 && (x + y) % 4 === 0)) {
        // Приоритет главным контурам и деталям ближе к центру композиции
        const distCenter = Math.sqrt(Math.pow(x / w - 0.5, 2) + Math.pow(y / h - 0.5, 2));
        const centerWeight = 1.3 - distCenter * 0.6;
        seedCandidates.push({ idx: i, score: (e * 2.5 + l * 0.6) * centerWeight });
      }
    }
  }

  // Сортируем семена так, чтобы сначала рисовались самые важные контуры лица/объекта
  seedCandidates.sort((a, b) => b.score - a.score);

  const traceDirection = (startX: number, startY: number, dirSign: number, maxSteps: number) => {
    const chain: { u: number; v: number; nx: number; ny: number }[] = [];
    let cx = startX;
    let cy = startY;
    let prevTx = etfX[Math.floor(cy) * w + Math.floor(cx)] * dirSign;
    let prevTy = etfY[Math.floor(cy) * w + Math.floor(cx)] * dirSign;

    const stepPx = 2.2;
    for (let s = 0; s < maxSteps; s++) {
      const ix = Math.floor(cx);
      const iy = Math.floor(cy);
      if (ix < 3 || ix >= w - 3 || iy < 3 || iy >= h - 3) break;

      const cIdx = iy * w + ix;
      if (mask[cIdx] < 0.06 || (edge[cIdx] < 0.035 && lum[cIdx] < 0.12)) break;

      let tx = etfX[cIdx] * dirSign;
      let ty = etfY[cIdx] * dirSign;
      // Согласуем направление при проходе по хребту
      if (tx * prevTx + ty * prevTy < 0) {
        tx = -tx;
        ty = -ty;
      }
      // Если линия резко ломается под прямым углом — завершаем штрих
      if (tx * prevTx + ty * prevTy < 0.35) break;

      prevTx = tx;
      prevTy = ty;

      // Помечаем окрестность посещенной, чтобы линии не слипались
      visited[cIdx] = 1;
      visited[cIdx + 1] = 1;
      visited[cIdx - 1] = 1;
      visited[cIdx + w] = 1;
      visited[cIdx - w] = 1;

      chain.push({
        u: cx / w,
        v: cy / h,
        nx: -ty,
        ny: tx,
      });

      // Легкое притяжение к гребню контура во время шага
      cx += tx * stepPx;
      cy += ty * stepPx;
    }
    return chain;
  };

  const MAX_STROKES = 1650;
  for (let sIdx = 0; sIdx < seedCandidates.length && strokes.length < MAX_STROKES; sIdx++) {
    const seed = seedCandidates[sIdx].idx;
    if (visited[seed]) continue;

    const sx = seed % w;
    const sy = Math.floor(seed / w);

    const backChain = traceDirection(sx, sy, -1, 32).reverse();
    const fwdChain = traceDirection(sx, sy, 1, 32);
    const fullPts = [...backChain, ...(fwdChain.length > 1 ? fwdChain.slice(1) : [])];

    if (fullPts.length >= 4) {
      const p = seed * 4;
      strokes.push({
        pts: fullPts,
        r: sharpRgba[p],
        g: sharpRgba[p + 1],
        b: sharpRgba[p + 2],
        meanEdge: edge[seed],
        meanLum: lum[seed],
        phase: (strokes.length * PHI) % (Math.PI * 2),
      });
    }
  }

  // Адаптивная сетка для CRYSTAL
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
    traceProgress: 0, // Прогресс пошаговой отрисовки контуров [0..1]
    needsSilkReset: true,
    isPaused: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    smoothYaw: 0,
    smoothPitch: -0.18,
  });

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("TRACING VECTOR CONTOURS [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsSilkReset = true;
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " VECTOR CONTOURS (" + String(buf.w) + "x" + String(buf.h) + ")"
      );
    };
    img.onerror = () => {
      setFieldStatus("TARGET BLOCKED // TRY NEXT MATRIX");
    };
    img.src = rawUrl.startsWith("data:") ? rawUrl : "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
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

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const m = s.matrix;

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          // Скорость пошаговой прорисовки контуров (~2.8 сек до полного портрета)
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0045 * (0.6 + t.energy * 1.1));
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
      if (acidCtx && s.topology !== "LIDAR") {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const isAcid = s.topology === "ACID";
        const waveAmp = isAcid ? t.chaos * 12.0 : t.chaos * 2.8;
        const freq1 = 0.02 * c.nHarmonic;
        const freq2 = 0.02 * c.mHarmonic;
        const rgbSplit = isAcid ? t.chaos * 7.5 + t.energy * 2.0 : t.chaos * 1.5;
        const edgeGlowBoost = t.structure * 195.0;
        const foldMirror = t.symmetry > 0.55;

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
      // РЕЖИМ 1: TRACE (ПОШАГОВАЯ ПРОРИСОВКА ПО КОНТУРАМ + ЖИВЫЕ СТРУНЫ)
      // ==========================================
      if (s.topology === "TRACE") {
        // Бархатная светотеневая подложка проявляется синхронно с прорисовкой контуров для 100% узнаваемости
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = (0.12 + 0.24 * s.traceProgress) * t.structure;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;

        ctx.globalCompositeOperation = "lighter";
        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        // Сколько полилиний активно на текущей миллисекунде развертки
        const activeFloat = s.traceProgress * totalStrokes;
        const activeCount = Math.min(totalStrokes, Math.ceil(activeFloat));

        const stringAmp = t.chaos * 11.0;
        const waveSpeed = time * (3.2 + t.energy * 3.5);
        const foldMirror = t.symmetry > 0.55;

        for (let i = 0; i < activeCount; i++) {
          const st = strokes[i];
          const pts = st.pts;
          const nPts = pts.length;

          // Для самого последнего рисуемого контура вычисляем частичную длину (эффект живого пера)
          let maxPtIdx = nPts;
          let isDrawingTip = false;
          if (i >= activeCount - 28 && s.traceProgress < 1.0) {
            const localProg = clip((activeFloat - (i - 28)) / 28.0, 0.05, 1.0);
            maxPtIdx = Math.max(2, Math.floor(nPts * localProg));
            isDrawingTip = localProg < 0.98;
          }

          // Бегущий синаптический импульс по уже нарисованному контуру
          const pulseWave = 0.55 + 0.45 * Math.sin(waveSpeed * 0.85 - st.phase * 2.0);
          const alpha = clip((0.22 + st.meanEdge * 0.55 + st.meanLum * 0.25) * (0.65 + 0.35 * pulseWave), 0.12, 0.92);

          if (t.tone < 0.05) {
            ctx.strokeStyle =
              "rgba(" +
              String(Math.min(255, st.r + 65)) +
              "," +
              String(Math.min(255, st.g + 65)) +
              "," +
              String(Math.min(255, st.b + 85)) +
              "," +
              String(alpha.toFixed(2)) +
              ")";
          } else {
            const hue = Math.floor((t.tone * 360 + st.meanLum * 115 + st.meanEdge * 85 + (i % 25)) % 360);
            const light = Math.min(88, Math.floor(48 + st.meanLum * 34 + pulseWave * 14));
            ctx.strokeStyle = "hsla(" + String(hue) + ", 88%, " + String(light) + "%, " + String(alpha.toFixed(2)) + ")";
          }

          ctx.lineWidth = (0.85 + st.meanEdge * 1.45) * (0.8 + 0.35 * pulseWave);
          ctx.beginPath();

          let tipX = 0;
          let tipY = 0;

          for (let k = 0; k < maxPtIdx; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            // Формула стоячей струны: sin(π·s) фиксирует концы контура, а середина дышит и вибрирует
            const envelope = Math.sin(sNorm * Math.PI);
            const standingWave =
              Math.sin(sNorm * Math.PI * c.nHarmonic + waveSpeed + st.phase) *
              envelope *
              stringAmp;

            // Реакция нарисованного контура на курсор мыши (упругое отталкивание струны)
            let mousePush = 0;
            if (s.mouseActive) {
              const dmx = pt.u - mNormX;
              const dmy = pt.v - mNormY;
              const dSq = dmx * dmx + dmy * dmy;
              if (dSq < 0.035) {
                mousePush = Math.exp(-dSq * 75.0) * 18.0;
              }
            }

            const totalDisp = standingWave + mousePush;
            const uDisp = foldMirror && pt.u > 0.5 ? 1.0 - pt.u : pt.u;
            const sx = ox + uDisp * drawW + pt.nx * totalDisp;
            const sy = oy + pt.v * drawH + pt.ny * totalDisp;

            if (k === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);

            if (k === maxPtIdx - 1) {
              tipX = sx;
              tipY = sy;
            }
          }
          ctx.stroke();

          // Светящаяся лазерная головка на кончике рисуемой линии
          if (isDrawingTip) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fillRect(tipX - 1.8, tipY - 1.8, 3.6, 3.6);
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: LIDAR 2.0 (3D ГОЛОГРАФИЧЕСКИЙ КАРКАС + ВОКСЕЛИ С ПЛАВНОЙ ИНЕРЦИЕЙ)
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

        // Плавная интерполяция углов камеры (гироскопическая инерция)
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
            // Соединяем соседние 3D-воксели на контурах в непрерывную голографическую 3D-нить
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
      // РЕЖИМ 3: ACID
      // ==========================================
      else if (s.topology === "ACID") {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 4: ENGRAVE (3D PULSAR TOPOGRAPHY)
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
      // РЕЖИМ 5: SILK (ETF-ПОТОК + КОНТУРНЫЙ ЗАМОК)
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
      // РЕЖИМ 6: PRISM (ДИСПЕРСИЯ КОШИ)
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
      // РЕЖИМ 7: CRYSTAL (АДАПТИВНАЯ МИКРО-ПРИЗМАТИЧЕСКАЯ МОЗАИКА)
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
      // РЕЖИМ 8: GLYPH (МАТЕМАТИЧЕСКИЕ СИМВОЛЫ ПОВЕРХ ГОЛОГРАФИЧЕСКОГО СЛЕПКА)
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

        {/* НИЖНЯЯ ПАНЕЛЬ: КАРУСЕЛЬ МАТРИЦ БЕЗ СЕРОГО СКРОЛЛБАРА + 8 РЕЖИМОВ С TRACE И LIDAR */}
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
                key={idx}
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
                <img src={u} alt="matrix" className="w-full h-full object-cover" loading="lazy" />
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
              {(["TRACE", "LIDAR", "ACID", "ENGRAVE", "SILK", "PRISM", "CRYSTAL", "GLYPH"] as ManifoldTopology[]).map((mode) => (
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
                { key: "energy", label: "Energy (Draw & Pulse Speed)" },
                { key: "chaos", label: "Chaos (String Vibration)" },
                { key: "tone", label: "Tone (SO3 & Prism Angle)" },
                { key: "structure", label: "Structure (Clarity & 3D Lock)" },
                { key: "symmetry", label: "Symmetry (Mirror & Ray Span)" },
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
            <div>Γ_trace(s,t) = r_0(s) + n(s)·A·sin(πs/L)·sin(ωs - vt)</div>
            <div>Z_lidar(x,y) = (Lum·0.78 + |∇I|·0.58) · St</div>
            <div>n(λ) = A + B/λ² [Cauchy Spectral Raycast]</div>
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
