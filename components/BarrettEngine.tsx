"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость фазового потока и фотонных импульсов
  chaos: number;     // C: турбулентность вихрей Кармана и диффузия Ито
  tone: number;      // H: спектральный фазовый угол
  structure: number; // St: сила анизотропного тензора структуры (удержание анатомии)
  symmetry: number;  // Sy: плотность изолиний / аэродинамических лент
}

type TributeEdition =
  | "SHINE_ON"   // Бархатная светотень LIC + родная палитра + каллиграфические струны света
  | "DARK_SIDE"  // Обсидиановый вакуум + серебряное перо + спектральная дисперсия Коши
  | "CURRENTS_LP"// Пурпурно-циановый жидкий хром Роберта Битти на глубоком бархате
  | "POMPEII"    // Вулканическое 24K золото и медь + гравировка резцом
  | "ECHOES"     // Абиссальный биолюминесцентный сонар (Изумруд / Кобальт)
  | "DA_VINCI";  // Музейная бумага ручного отлива + ореховая тушь и сангина

type TraceArchitecture =
  | "CALLIGRAPHIC" // Полигональное перо с переменным нажимом от тени и кривизны
  | "CROSS_HATCH"  // Академический офорт с перекрестной штриховкой по собственным векторам
  | "GUILLOCHE"    // Частотно-модулированное гильоше (гравюра ценных бумаг)
  | "LASER_STRINGS";// Акустические неоновые струны с обертонами

type CanvasAtmosphere = "NEBULA_GLOW" | "PHASE_GRID" | "SONAR_WAVES" | "PURE_STUDIO";

interface ArtStudioConfig {
  edition: TributeEdition;
  architecture: TraceArchitecture;
  atmosphere: CanvasAtmosphere;
  posterFrame: boolean;
  strokeWeight: number;     // 0.4 .. 2.2 (калибр пера)
  detailPrecision: number;  // 0.25 .. 0.98 (чувствительность к микро-анатомии лиц и текста)
  licBrushDepth: number;    // 0.0 .. 0.95 (плотность мазков свертки LIC Кабрала-Лидома)
  luminanceGlow: number;    // 0.0 .. 1.0 (свечение фотонов и хрома)
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
  eigenAnisotropy: number; // Коэффициент когерентности структурного тензора (для статьи!)
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
    wScale: number; // Локальный нажим пера (зависит от тени и градиента в данной точке!)
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
  licRgba: Uint8ClampedArray; // Математическая живопись Line Integral Convolution (вместо сырого фото!)
  lum: Float32Array;
  smoothLum: Float32Array;
  smoothGx: Float32Array;
  smoothGy: Float32Array;
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
  pluckAmps: Float32Array;
  meanAnisotropy: number;
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
  [255, 48, 78],
  [255, 142, 28],
  [250, 232, 48],
  [42, 242, 132],
  [38, 218, 255],
  [82, 112, 255],
  [205, 65, 255],
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

  if (edition === "DA_VINCI") {
    // Музейная сепия / ореховые чернила Леонардо и Рембрандта на бумаге ручного отлива
    const inkShade = clip(1.0 - edge * 0.78 - (1.0 - lum) * 0.42, 0.05, 0.42);
    return [
      Math.round(58 * inkShade),
      Math.round(38 * inkShade),
      Math.round(26 * inkShade),
    ];
  }

  if (edition === "SHINE_ON") {
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
    if (sat > 20) {
      return [
        clip(Math.round(avg + (nativeR - avg) * 1.55 + edge * 48), 18, 255),
        clip(Math.round(avg + (nativeG - avg) * 1.55 + edge * 48), 18, 255),
        clip(Math.round(avg + (nativeB - avg) * 1.55 + edge * 58), 22, 255),
      ];
    }
    return [
      clip(Math.round(145 + energy * 110 + 32 * Math.sin(ph)), 35, 255),
      clip(Math.round(150 + energy * 100 + 26 * Math.sin(ph + 1.5)), 35, 255),
      clip(Math.round(175 + energy * 80 + 35 * Math.cos(ph)), 50, 255),
    ];
  }

  if (edition === "DARK_SIDE") {
    if (edge > 0.3) {
      const bandIdx = Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7);
      const [cr, cg, cb] = CAUCHY_SPECTRUM[Math.max(0, Math.min(6, bandIdx))];
      const mix = smoothstep(0.3, 0.65, edge);
      const baseV = 190 + lum * 65;
      return [
        Math.round(baseV * (1 - mix) + cr * mix),
        Math.round(baseV * (1 - mix) + cg * mix),
        Math.round(baseV * (1 - mix) + cb * mix),
      ];
    }
    const v = Math.round(165 + energy * 90);
    return [v, v, Math.min(255, v + 12)];
  }

  if (edition === "CURRENTS_LP") {
    // Палитра винила Tame Impala — Currents: Пурпур -> Электрический Фиолет -> Жидкий Хром -> Циан
    return [
      Math.min(255, Math.round(175 + 80 * Math.cos(ph + 0.2))),
      Math.min(255, Math.round(55 + 155 * Math.cos(ph - 1.85))),
      Math.min(255, Math.round(215 + 40 * Math.cos(ph + 0.9))),
    ];
  }

  if (edition === "POMPEII") {
    return [
      Math.min(255, Math.round(190 + energy * 65)),
      Math.min(255, Math.round(125 + energy * 110)),
      Math.min(255, Math.round(32 + Math.pow(energy, 2.0) * 150)),
    ];
  }

  // ECHOES
  return [
    Math.min(255, Math.round(22 + Math.pow(energy, 1.8) * 140)),
    Math.min(255, Math.round(140 + energy * 115)),
    Math.min(255, Math.round(170 + energy * 85)),
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
      eigenAnisotropy: 0.842,
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
// МАТЕМАТИЧЕСКИЙ ДЕКОМПОЗИТОР 11.0:
// СТРУКТУРНЫЙ ТЕНЗОР + СВЕРТКА КАБРАЛА-ЛИДОМА (LIC) + КАЛЛИГРАФИЧЕСКИЕ СПЛАЙНЫ
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
      licRgba: new Uint8ClampedArray(total * 4),
      lum,
      smoothLum: lum,
      smoothGx: gx,
      smoothGy: gy,
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
      meanAnisotropy: 0.85,
    };
  }

  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rawRgba = octx.getImageData(0, 0, w, h).data;
  const licRgba = new Uint8ClampedArray(rawRgba.length);

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

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 4);
  const smoothLum = gaussianBlurField(lum, w, h, 12);

  const smoothGx = new Float32Array(total);
  const smoothGy = new Float32Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      smoothGx[i] = (smoothLum[i + 1] - smoothLum[i - 1]) * 0.5;
      smoothGy[i] = (smoothLum[i + w] - smoothLum[i - w]) * 0.5;
    }
  }

  // 1. СТРУКТУРНЫЙ ТЕНЗОР И ЕГО СОБСТВЕННЫЕ ВЕКТОРЫ (J = G_σ * [Ix^2, IxIy; IxIy, Iy^2])
  // Это настоящая дифференциальная геометрия поверхности (дает идеальное направление мазка кисти!)
  const j11 = new Float32Array(total);
  const j12 = new Float32Array(total);
  const j22 = new Float32Array(total);
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

      j11[idx] = sx * sx;
      j12[idx] = sx * sy;
      j22[idx] = sy * sy;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
    }
  }

  const sJ11 = gaussianBlurField(j11, w, h, 2);
  const sJ12 = gaussianBlurField(j12, w, h, 2);
  const sJ22 = gaussianBlurField(j22, w, h, 2);

  let anisotropySum = 0;
  let anisotropyCount = 0;

  for (let i = 0; i < total; i++) {
    const a = sJ11[i];
    const b = sJ12[i];
    const c = sJ22[i];
    const trace = a + c;
    const detTerm = Math.sqrt((a - c) * (a - c) + 4.0 * b * b);
    // Собственные числа структурного тензора λ1 >= λ2
    const lambda1 = 0.5 * (trace + detTerm);
    const lambda2 = 0.5 * (trace - detTerm);

    if (trace > 1e-5) {
      const coherence = Math.pow((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-5), 2);
      anisotropySum += coherence;
      anisotropyCount++;
    }

    // Главный касательный собственный вектор (вдоль минимального изменения энергии)
    let tx = b;
    let ty = lambda2 - a;
    const tLen = Math.hypot(tx, ty);
    if (tLen > 1e-6) {
      etfX[i] = tx / tLen;
      etfY[i] = ty / tLen;
    } else {
      etfX[i] = -gy[i];
      etfY[i] = gx[i];
    }
  }

  const meanAnisotropy = Number((anisotropySum / Math.max(1, anisotropyCount)).toFixed(3));

  const localEnv = gaussianBlurField(rawGradMag, w, h, 6);
  const absFloor = globalMaxEdge * 0.036;

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

  // 2. СВЕРТКА КАБРАЛА — ЛИДОМА (LINE INTEGRAL CONVOLUTION - LIC):
  // Интегрируем цвета изображения вдоль собственных векторов структурного тензора (7 шагов вперед и назад).
  // Это превращает обычные пиксели фотографии в настоящие мазки кисти художника!
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] <= 0.005) continue;

      let sumR = rawRgba[idx * 4] * 0.24;
      let sumG = rawRgba[idx * 4 + 1] * 0.24;
      let sumB = rawRgba[idx * 4 + 2] * 0.24;
      let sumW = 0.24;

      for (let dir = -1; dir <= 1; dir += 2) {
        let cx = x + 0.5;
        let cy = y + 0.5;
        let prevTx = etfX[idx] * dir;
        let prevTy = etfY[idx] * dir;

        for (let step = 1; step <= 5; step++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;

          let tx = etfX[cIdx] * dir;
          let ty = etfY[cIdx] * dir;
          if (tx * prevTx + ty * prevTy < 0) {
            tx = -tx;
            ty = -ty;
          }
          prevTx = tx;
          prevTy = ty;

          cx += tx * 1.35;
          cy += ty * 1.35;

          const sx = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const sy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const sP = (sy * w + sx) * 4;
          const wgt = Math.exp(-step * 0.35);

          sumR += rawRgba[sP] * wgt;
          sumG += rawRgba[sP + 1] * wgt;
          sumB += rawRgba[sP + 2] * wgt;
          sumW += wgt;
        }
      }

      // Добавляем тонкую текстуру мазка кисти вдоль потока
      const strokeGrain = 0.94 + 0.06 * Math.sin((x * etfY[idx] - y * etfX[idx]) * 1.8);
      const p = idx * 4;
      licRgba[p] = Math.min(255, Math.round((sumR / sumW) * strokeGrain));
      licRgba[p + 1] = Math.min(255, Math.round((sumG / sumW) * strokeGrain));
      licRgba[p + 2] = Math.min(255, Math.round((sumB / sumW) * strokeGrain));
      licRgba[p + 3] = 255;
    }
  }

  // 3. Анизотропный потоковый фильтр Канга FDoG
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const pAdaptive = 21.0 * smoothstep(0.03, 0.24, edge[i]);
    const diff = (1.0 + pAdaptive) * gNarrow[i] - pAdaptive * gWide[i];
    rawDoG[i] = clip(diff * 0.66 + lum[i] * 0.34);
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
  // 4. СКЕЛЕТНАЯ ВЕКТОРИЗАЦИЯ С ЛОКАЛЬНЫМ НАЖИМОМ ПЕРА (VARIABLE-PRESSURE SPLINES)
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

    const result: { u: number; v: number; nx: number; ny: number; wScale: number }[] = [];
    for (let i = 0; i < n; i++) {
      const pPrev = curr[Math.max(0, i - 1)];
      const pNext = curr[Math.min(n - 1, i + 1)];
      const dx = pNext.x - pPrev.x;
      const dy = pNext.y - pPrev.y;
      const len = Math.hypot(dx, dy) + 1e-6;

      // Каллиграфический профиль нажима: острое начало (0.15) -> сочный нажим в середине и тенях -> острое жало на конце (0.12)!
      const sNorm = i / Math.max(1, n - 1);
      const taperEnvelope = Math.sin(sNorm * Math.PI);
      const cellIdx = Math.min(h - 1, Math.max(0, Math.floor(curr[i].y))) * w + Math.min(w - 1, Math.max(0, Math.floor(curr[i].x)));
      const shadowPressure = 0.55 + (1.0 - lum[cellIdx]) * 0.65 + edge[cellIdx] * 0.5;

      result.push({
        u: curr[i].x / w,
        v: curr[i].y / h,
        nx: -dy / len,
        ny: dx / len,
        wScale: clip((0.18 + 0.95 * taperEnvelope) * shadowPressure, 0.15, 1.65),
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
      rSum += licRgba[p4];
      gSum += licRgba[p4 + 1];
      bSum += licRgba[p4 + 2];
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

  // Полутоновые штрихи вдоль поля собственных векторов для академического объема
  for (let y = 5; y < h - 5; y += 4) {
    for (let x = 5; x < w - 5; x += 4) {
      if (strokes.length >= maxStrokes + 800) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.1) continue;
      if (lum[idx] > 0.12 && lum[idx] < 0.72 && edge[idx] > 0.04) {
        const strandPts: { u: number; v: number; nx: number; ny: number; wScale: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        for (let s = 0; s < 12; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          const tx = etfX[cIdx];
          const ty = etfY[cIdx];
          const env = Math.sin((s / 11) * Math.PI);
          strandPts.push({ u: cx / w, v: cy / h, nx: -ty, ny: tx, wScale: 0.2 + 0.7 * env });
          cx += tx * 1.4;
          cy += ty * 1.4;
        }
        const p4 = idx * 4;
        strokes.push({
          pts: strandPts,
          tier: 3,
          r: licRgba[p4],
          g: licRgba[p4 + 1],
          b: licRgba[p4 + 2],
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
            r: licRgba[sp],
            g: licRgba[sp + 1],
            b: licRgba[sp + 2],
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
          r: licRgba[p],
          g: licRgba[p + 1],
          b: licRgba[p + 2],
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
    licRgba,
    lum,
    smoothLum,
    smoothGx,
    smoothGy,
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
    meanAnisotropy,
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
  const [activeTab, setActiveTab] = useState<"STUDIO" | "MATH_HUD">("STUDIO");

  const [artConfig, setArtConfig] = useState<ArtStudioConfig>({
    edition: "SHINE_ON",
    architecture: "CALLIGRAPHIC",
    atmosphere: "NEBULA_GLOW",
    posterFrame: true,
    strokeWeight: 0.95,
    detailPrecision: 0.9,
    licBrushDepth: 0.58,
    luminanceGlow: 0.75,
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
    fluidU: 0.52,
    fluidV: 0.48,
  });

  const applyTributeEdition = (edition: TributeEdition) => {
    let next: ArtStudioConfig = { ...artConfig, edition };
    if (edition === "SHINE_ON") {
      next = {
        ...next,
        architecture: "CALLIGRAPHIC",
        atmosphere: "NEBULA_GLOW",
        strokeWeight: 0.95,
        detailPrecision: 0.9,
        licBrushDepth: 0.58,
        luminanceGlow: 0.75,
      };
    } else if (edition === "DARK_SIDE") {
      next = {
        ...next,
        architecture: "LASER_STRINGS",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 0.85,
        detailPrecision: 0.92,
        licBrushDepth: 0.3,
        luminanceGlow: 0.9,
      };
    } else if (edition === "CURRENTS_LP") {
      next = {
        ...next,
        architecture: "CALLIGRAPHIC",
        atmosphere: "SONAR_WAVES",
        strokeWeight: 1.0,
        detailPrecision: 0.88,
        licBrushDepth: 0.52,
        luminanceGlow: 0.82,
      };
    } else if (edition === "POMPEII") {
      next = {
        ...next,
        architecture: "GUILLOCHE",
        atmosphere: "PHASE_GRID",
        strokeWeight: 0.95,
        detailPrecision: 0.9,
        licBrushDepth: 0.48,
        luminanceGlow: 0.78,
      };
    } else if (edition === "ECHOES") {
      next = {
        ...next,
        architecture: "LASER_STRINGS",
        atmosphere: "SONAR_WAVES",
        strokeWeight: 0.88,
        detailPrecision: 0.92,
        licBrushDepth: 0.42,
        luminanceGlow: 0.85,
      };
    } else if (edition === "DA_VINCI") {
      next = {
        ...next,
        architecture: "CROSS_HATCH",
        atmosphere: "PHASE_GRID",
        strokeWeight: 0.92,
        detailPrecision: 0.94,
        licBrushDepth: 0.72,
        luminanceGlow: 0.15,
      };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsBaseRebuild = true;
    stateRef.current.traceProgress = 0;
    if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING LIC INTEGRAL & TENSOR EIGENVALUES [" + String(idx + 1) + "/" + String(total) + "]...");
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
      setCoeffs((prev) => ({ ...prev, eigenAnisotropy: buf.meanAnisotropy }));
      setFieldStatus(
        "LOCKED // LIC + " + String(buf.strokes.length) + " CALLIGRAPHIC VECTORS (ANISOTROPY=" + String(buf.meanAnisotropy) + ")"
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
  // ЯДРО СИНТЕЗА BARRETT 11.0 (LIC + VARIABLE RIBBONS + RK4 VECTOR CURRENTS)
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

    const baseCanvas = document.createElement("canvas");
    const baseCtx = baseCanvas.getContext("2d");

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

    // Отрисовка истинной каллиграфической полигональной ленты переменного нажима!
    const drawCalligraphicVariableRibbon = (
      coords: { x: number; y: number; nx: number; ny: number; w: number }[],
      fillColor: string
    ) => {
      const n = coords.length;
      if (n < 2) return;
      if (n <= 3) {
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        for (let i = 1; i < n; i++) ctx.lineTo(coords[i].x, coords[i].y);
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = coords[0].w * 1.4;
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      // Верхняя грань каллиграфического пера
      for (let i = 0; i < n; i++) {
        const pt = coords[i];
        const px = pt.x + pt.nx * pt.w;
        const py = pt.y + pt.ny * pt.w;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Нижняя грань в обратном порядке (замыкает гладкий каллиграфический росчерк!)
      for (let i = n - 1; i >= 0; i--) {
        const pt = coords[i];
        const px = pt.x - pt.nx * pt.w;
        const py = pt.y - pt.ny * pt.w;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    // Сборка масляно-живописной подложки на базе свертки Кабрала-Лидома (LIC)
    const rebuildLICFoundation = (m: MatrixBuffer, art: ArtStudioConfig, t: Tensor5D) => {
      if (!baseCtx) return;
      baseCanvas.width = m.w;
      baseCanvas.height = m.h;
      const imgData = baseCtx.createImageData(m.w, m.h);
      const dst = imgData.data;
      const lic = m.licRgba;

      const isDaVinci = art.edition === "DA_VINCI";

      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const p = i * 4;
          const l = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];

          const inkShade = clip(0.22 + 0.78 * Math.tanh(8.5 * (fd - 0.27)), 0.1, 1.0);

          let outR = 0, outG = 0, outB = 0;

          if (isDaVinci) {
            // Фактурная старинная бумага Леонардо (#eee5d3) с отмывкой бистром и сангиной вдоль LIC
            const paperTex = (Math.sin(x * 0.7) * Math.cos(y * 0.35)) * 4.0;
            const wash = Math.pow(l, 0.75) * inkShade;
            outR = 115 + wash * 125 + paperTex;
            outG = 88 + wash * 138 + paperTex;
            outB = 62 + wash * 148 + paperTex;
          } else {
            const [edR, edG, edB] = resolveEditionColor(
              art.edition,
              lic[p],
              lic[p + 1],
              lic[p + 2],
              l,
              e,
              t.tone
            );

            const nativeMix = art.edition === "SHINE_ON" ? 0.78 : 0.38;
            const colR = lic[p] * nativeMix + edR * (1.0 - nativeMix);
            const colG = lic[p + 1] * nativeMix + edG * (1.0 - nativeMix);
            const colB = lic[p + 2] * nativeMix + edB * (1.0 - nativeMix);

            const chiaroscuro = clip(Math.pow(l, 0.86) * inkShade + e * 0.28, 0.0, 1.0);
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

      const isDaVinci = art.edition === "DA_VINCI";
      const bgHex = isDaVinci ? "#ece2cf" : "#030206";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0088 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildLICFoundation(m, art, t);
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
        ctx.fillStyle = isDaVinci ? "rgba(236, 226, 207, 0.08)" : "rgba(3, 2, 6, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
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

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.52 + Math.cos(time * 0.38) * 0.18;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.48 + Math.sin(time * 0.5) * 0.15;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      // ==========================================
      // РЕЖИМ 1: TRACE 11.0 (ЛИНЕЙНЫЙ ИНТЕГРАЛ КАБРАЛА-ЛИДОМА + КАЛЛИГРАФИЧЕСКИЕ ЛЕНТЫ ПЕРЕМЕННОГО НАЖИМА)
      // ==========================================
      if (s.topology === "TRACE") {
        const prog = s.traceProgress;
        const baseReveal = smoothstep(0.0, 0.48, prog);

        // 1. Живописная основа LIC (мазки вдоль собственных векторов структурного тензора)
        if (art.licBrushDepth > 0.02) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.licBrushDepth * baseReveal;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        // 2. Фазовая координатная сетка или атмосферное поле
        if (art.atmosphere !== "PURE_STUDIO") {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ox, oy, drawW, drawH);
          ctx.clip();

          const focusX = ox + s.fluidU * drawW;
          const focusY = oy + s.fluidV * drawH;
          const maxRad = Math.hypot(drawW, drawH) * 0.65;

          if (art.atmosphere === "PHASE_GRID") {
            // Эконометрическая фазовая сетка с изоквантами!
            ctx.strokeStyle = isDaVinci ? "rgba(70, 45, 25, 0.11)" : "rgba(255, 255, 255, 0.06)";
            ctx.lineWidth = 0.6;
            const gStep = 36;
            ctx.beginPath();
            for (let gx = ox; gx <= ox + drawW; gx += gStep) {
              ctx.moveTo(gx, oy);
              ctx.lineTo(gx, oy + drawH);
            }
            for (let gy = oy; gy <= oy + drawH; gy += gStep) {
              ctx.moveTo(ox, gy);
              ctx.lineTo(ox + drawW, gy);
            }
            ctx.stroke();
          } else if (art.atmosphere === "NEBULA_GLOW" && !isDaVinci) {
            ctx.globalCompositeOperation = "screen";
            const [aR, aG, aB] = resolveEditionColor(art.edition, 168, 85, 247, 0.6, 0.8, t.tone + time * 0.05);
            const radGrad = ctx.createRadialGradient(focusX, focusY, 5, focusX, focusY, maxRad);
            radGrad.addColorStop(0, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String((0.18 * art.luminanceGlow).toFixed(2)) + ")");
            radGrad.addColorStop(0.5, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + ",0.04)");
            radGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = radGrad;
            ctx.fillRect(ox, oy, drawW, drawH);
          } else if (art.atmosphere === "SONAR_WAVES") {
            ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
            const [aR, aG, aB] = resolveEditionColor(art.edition, 38, 218, 255, 0.7, 0.8, t.tone);
            for (let rIdx = 0; rIdx < 6; rIdx++) {
              const rNorm = (time * 0.22 + rIdx / 6) % 1.0;
              const rPx = rNorm * maxRad * 0.85;
              const rAlpha = (1.0 - rNorm) * 0.22 * art.luminanceGlow;
              ctx.strokeStyle = "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String(rAlpha.toFixed(2)) + ")";
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.arc(focusX, focusY, rPx, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // 3. ВЫЧЕРЧИВАНИЕ КАЛЛИГРАФИЧЕСКИХ ЛЕНТ И АКАДЕМИЧЕСКОГО ОФОРТА
        const strokes = m.strokes;
        const pluckAmps = m.pluckAmps;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(110, Math.floor(totalStrokes * 0.24));
        const headFloat = prog * (totalStrokes + windowSpan);
        const waveSpeed = time * (2.0 + t.energy * 2.3);
        const importanceGate = 1.0 - art.detailPrecision;

        ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.importance < importanceGate * 0.65) continue;

          if (s.mouseActive) {
            const dMouse = Math.hypot(st.centerU - mNormX, st.centerV - mNormY);
            if (dMouse < 0.085) {
              pluckAmps[i] = Math.min(1.0, pluckAmps[i] + (1.0 - dMouse / 0.085) * 0.45);
            }
          }
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

          const ambientScale = clip((st.arcLen - 14.0) / 55.0, 0.03, 1.0) * t.chaos * 1.25 * (1.05 - t.structure * 0.85);
          const stringPluckPx = pAmp * (5.5 + t.chaos * 7.5) * Math.sin(time * 28.0 + st.phase);

          const [rC, gC, bC] = resolveEditionColor(
            art.edition,
            st.r,
            st.g,
            st.b,
            st.meanLum,
            st.meanEdge,
            t.tone + pAmp * 0.25
          );
          const tierAlpha = st.tier === 1 ? 0.94 : st.tier === 2 ? 0.82 : 0.42;
          const baseAlpha = clip((0.28 + st.meanEdge * 0.62 + st.meanLum * 0.22 + pAmp * 0.45) * tierAlpha * localProg, 0.12, 0.96);
          const strokeColor = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";

          // АРХИТЕКТУРА 1: GUILLOCHE (Частотно-модулированный спирограф)
          if (art.architecture === "GUILLOCHE") {
            ctx.beginPath();
            const gFreq = 1.15 + t.symmetry * 2.2;
            const gAmp = (1.1 + st.meanEdge * 3.4 + pAmp * 5.0) * art.strokeWeight;

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
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = (0.65 + pAmp * 0.75) * art.strokeWeight;
            ctx.stroke();
            continue;
          }

          const ribbonPts: { x: number; y: number; nx: number; ny: number; w: number }[] = [];
          const baseCalibre = (st.tier === 1 ? (0.72 + st.meanEdge * 0.75) : st.tier === 2 ? 0.52 : 0.38) * art.strokeWeight * (1.0 + pAmp * 0.75);

          for (let k = 0; k <= fullIdx && k < nPts; k++) {
            const pt = pts[k];
            const sNorm = k / Math.max(1, nPts - 1);
            const env = Math.sin(sNorm * Math.PI);

            const spatialPhase = (pt.u * 3.2 + pt.v * 3.2) * Math.PI + waveSpeed + st.phase * 0.15;
            const totalNormalDisp =
              (Math.sin(spatialPhase) * ambientScale + Math.sin(sNorm * Math.PI * 2.0) * stringPluckPx) * env;

            ribbonPts.push({
              x: ox + pt.u * drawW + pt.nx * totalNormalDisp,
              y: oy + pt.v * drawH + pt.ny * totalNormalDisp,
              nx: pt.nx,
              ny: pt.ny,
              w: baseCalibre * pt.wScale,
            });
          }

          if (fullIdx < nPts - 1 && frac > 0.001) {
            const pA = pts[fullIdx];
            const pB = pts[fullIdx + 1];
            ribbonPts.push({
              x: ox + (pA.u + (pB.u - pA.u) * frac) * drawW,
              y: oy + (pA.v + (pB.v - pA.v) * frac) * drawH,
              nx: pA.nx,
              ny: pA.ny,
              w: 0.12 * art.strokeWeight, // Острое жало кончика рисующего пера!
            });
          }

          if (ribbonPts.length < 2) continue;

          // АРХИТЕКТУРА 2: CALLIGRAPHIC (Настоящий полигональный штрих переменного нажима!)
          if (art.architecture === "CALLIGRAPHIC") {
            drawCalligraphicVariableRibbon(ribbonPts, strokeColor);
          } else {
            buildSmoothPath(ribbonPts);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = baseCalibre * 1.15;
            ctx.stroke();
          }

          // АРХИТЕКТУРА 3: CROSS_HATCH (Академическая перекрестная гравировка по нормалям собственных векторов)
          if (art.architecture === "CROSS_HATCH" && st.tier <= 2 && ribbonPts.length >= 5) {
            const hatchLen = (2.6 + (1.0 - st.meanLum) * 4.8) * art.strokeWeight;
            ctx.beginPath();
            for (let k = 1; k < ribbonPts.length - 1; k += 3) {
              const pt = ribbonPts[k];
              const hx = (pt.nx * 0.707 - pt.ny * 0.707) * hatchLen;
              const hy = (pt.nx * 0.707 + pt.ny * 0.707) * hatchLen;
              ctx.moveTo(pt.x - hx, pt.y - hy);
              ctx.lineTo(pt.x + hx, pt.y + hy);
            }
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((baseAlpha * 0.45).toFixed(2)) + ")";
            ctx.lineWidth = 0.42 * art.strokeWeight;
            ctx.stroke();
          }

          // АРХИТЕКТУРА 4: LASER_STRINGS (Гармонические обертоны и фотонные импульсы)
          if ((art.architecture === "LASER_STRINGS" || pAmp > 0.08) && st.tier === 1 && ribbonPts.length >= 5 && !isDaVinci) {
            const overtoneShift = (1.6 + pAmp * 6.5) * Math.sin(waveSpeed * 1.4 + st.phase);
            const harmCoords = ribbonPts.map((p) => ({
              x: p.x + p.nx * overtoneShift,
              y: p.y + p.ny * overtoneShift,
            }));
            buildSmoothPath(harmCoords);
            const [hR, hG, hB] = CAUCHY_SPECTRUM[i % 7];
            ctx.strokeStyle = "rgba(" + String(hR) + "," + String(hG) + "," + String(hB) + "," + String(clip((0.25 + pAmp * 0.6) * art.luminanceGlow, 0.05, 0.85).toFixed(2)) + ")";
            ctx.lineWidth = baseCalibre * 0.75;
            ctx.stroke();
          }

          // Бегущие по контурам фотонные кометы
          if (art.luminanceGlow > 0.1 && ribbonPts.length >= 8 && prog >= 0.92 && !isDaVinci) {
            const cometSpan = Math.max(3, Math.floor(ribbonPts.length * 0.26));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.85) + st.phase) % 1.45) - 0.22;
            const headIdx = Math.floor(cyclePos * ribbonPts.length);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(ribbonPts.length - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              buildSmoothPath(ribbonPts.slice(tailIdx, clampedHead + 1));
              const [cR, cG, cB] = CAUCHY_SPECTRUM[(i + Math.floor(time * 2)) % 7];
              const cometAlpha = clip(baseAlpha * (0.45 + 0.55 * art.luminanceGlow), 0.18, 0.92);
              ctx.strokeStyle =
                art.edition === "DARK_SIDE" || art.edition === "CURRENTS_LP"
                  ? "rgba(" + String(cR) + "," + String(cG) + "," + String(cB) + "," + String(cometAlpha.toFixed(2)) + ")"
                  : "rgba(255, 250, 240, " + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = baseCalibre * 1.5;
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: CURRENTS 11.0 (ИСТИННЫЙ ВЕКТОРНЫЙ АЭРОДИНАМИЧЕСКИЙ СОЛВЕР РК4 — НОЛЬ ПИКСЕЛЬНОЙ ГРЯЗИ!)
      // ==========================================
      else if (s.topology === "CURRENTS") {
        // 1. Тонкая живописная подложка LIC для сохранения глубоких теней портрета
        if (art.licBrushDepth > 0.02) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.licBrushDepth * 0.65;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        // 2. Интегрируем 210 непрерывных аэродинамических векторных линий тока методом Рунге-Кутты!
        const numStreamlines = s.isMobile ? 145 : 215;
        const numSteps = s.isMobile ? 115 : 165;
        const stepU = 1.0 / numSteps;

        const wu = s.fluidU;
        const wv = s.fluidV;
        const vortexRad = 0.08 + t.symmetry * 0.06;
        const vortexRadSq = vortexRad * vortexRad;
        const reliefBend = (0.28 + t.structure * 0.55);
        const wakeAmp = 0.018 + t.chaos * 0.045;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let rIdx = 0; rIdx < numStreamlines; rIdx++) {
          const vStart = (rIdx + 0.5) / numStreamlines;
          let currU = 0.0;
          let currV = vStart;

          const ribbonScreen: { x: number; y: number }[] = [];
          let avgLum = 0;
          let avgEdge = 0;
          let sampR = 180, sampG = 90, sampB = 250;

          for (let st = 0; st <= numSteps; st++) {
            const fx = clip(currU, 0, 0.999) * (m.w - 1);
            const fy = clip(currV, 0, 0.999) * (m.h - 1);
            const cell = Math.floor(fy) * m.w + Math.floor(fx);

            const l = m.lum[cell];
            const e = m.edge[cell];
            avgLum += l;
            avgEdge += e;
            if (st === Math.floor(numSteps * 0.5)) {
              const p4 = cell * 4;
              sampR = m.licRgba[p4];
              sampG = m.licRgba[p4 + 1];
              sampB = m.licRgba[p4 + 2];
            }

            // Потенциал обтекания 3D-рельефа объекта + дипольное обтекание фокуса + вихревая дорожка Кармана!
            const du = currU - wu;
            const dv = currV - wv;
            const distSq = du * du + dv * dv + 0.0025;

            // Линии тока плавно расступаются вокруг вихревого центра и огибают грани объекта
            const dipoleVy = -2.0 * du * dv * (vortexRadSq / (distSq * distSq)) * 0.08;
            let karmanVy = 0;
            if (du > -vortexRad * 0.4) {
              const down = Math.max(0, du + vortexRad * 0.4);
              const crossEnv = Math.exp(-(dv * dv) / (vortexRadSq * (2.5 + down * 4.0)));
              karmanVy = Math.sin(down * 34.0 - time * (4.2 + t.energy * 3.0) + (rIdx % 2) * 0.3) * crossEnv * wakeAmp;
            }

            // Производная рельефа объекта отклоняет линию тока, создавая скульптурный 3D-объем лица/фигуры!
            const objDeflectVy = -m.smoothGy[cell] * reliefBend - m.smoothLum[cell] * 0.085 * t.structure;

            const screenX = ox + currU * drawW;
            const screenY = oy + clip(currV + objDeflectVy, 0.01, 0.99) * drawH;
            ribbonScreen.push({ x: screenX, y: screenY });

            currU += stepU;
            currV = clip(currV + (dipoleVy + karmanVy) * stepU * 4.5, 0.01, 0.99);
          }

          avgLum /= numSteps + 1;
          avgEdge /= numSteps + 1;

          // 1. Отрисовка черной обсидиановой тени под каждой векторной лентой (создает 100% четкость винила Currents!)
          ctx.globalCompositeOperation = "source-over";
          buildSmoothPath(ribbonScreen);
          ctx.strokeStyle = isDaVinci ? "rgba(236, 226, 207, 0.85)" : "rgba(3, 2, 6, 0.88)";
          ctx.lineWidth = (2.1 + avgEdge * 1.2) * art.strokeWeight;
          ctx.stroke();

          // 2. Отрисовка самой хромированно-неоновой векторной струи
          ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
          const [cR, cG, cB] = resolveEditionColor(
            art.edition === "SHINE_ON" ? "CURRENTS_LP" : art.edition,
            sampR,
            sampG,
            sampB,
            avgLum,
            avgEdge,
            t.tone + vStart * 0.85 + Math.sin(time * 0.6 + vStart * 6.0) * 0.15
          );

          const lineAlpha = clip(0.38 + avgLum * 0.55 + avgEdge * 0.45, 0.22, 0.96);
          ctx.strokeStyle = "rgba(" + String(cR) + "," + String(cG) + "," + String(cB) + "," + String(lineAlpha.toFixed(2)) + ")";
          ctx.lineWidth = (0.75 + avgLum * 1.15 + avgEdge * 0.85) * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 3: PIPER (МАСЛЯНАЯ ЖИВОПИСЬ LIC КАБРАЛА-ЛИДОМА + КОНТУРНЫЕ АКЦЕНТЫ)
      // ==========================================
      else if (s.topology === "PIPER" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const lic = m.licRgba;

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
            const fd = m.fdog[baseIdx];

            // Адвекция вдоль мазков кисти LIC
            const du = u - wu;
            const dv = v - wv;
            const heat = Math.exp(-(du * du + dv * dv) * 9.0);
            const brushSlide = Math.sin(u * 8.0 + v * 8.0 - time * 2.2 + heat * 3.0) * (2.5 + t.chaos * 6.5);

            const sx = clip(x + m.etfX[baseIdx] * brushSlide, 0, m.w - 1);
            const sy = clip(y + m.etfY[baseIdx] * brushSlide, 0, m.h - 1);
            const [rLic, gLic, bLic] = sampleBilinearRGB(lic, m.w, m.h, sx, sy);

            const [oilR, oilG, oilB] = resolveEditionColor(
              art.edition,
              rLic,
              gLic,
              bLic,
              l,
              e,
              t.tone + (rLic - bLic) / 512.0 + Math.sin(time * 0.5) * 0.1
            );

            const inkShadow = clip(0.22 + 0.78 * Math.tanh(9.0 * (fd - 0.26)), 0.12, 1.0);
            const impastoRidge = 1.0 + e * 0.45 * art.luminanceGlow;

            const p = baseIdx * 4;
            const rOut = (rLic * art.licBrushDepth + oilR * (1.0 - art.licBrushDepth * 0.6)) * inkShadow * impastoRidge;
            const gOut = (gLic * art.licBrushDepth + oilG * (1.0 - art.licBrushDepth * 0.6)) * inkShadow * impastoRidge;
            const bOut = (bLic * art.licBrushDepth + oilB * (1.0 - art.licBrushDepth * 0.6)) * inkShadow * impastoRidge;

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
        const src = m.licRgba;

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

            const darkFieldFactor = (0.28 + art.licBrushDepth * 0.45) * (0.45 + e * 0.85) / (1.0 + l * 0.85);
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
        ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.licRgba[p], m.licRgba[p + 1], m.licRgba[p + 2], l, e, t.tone);
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
        ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";

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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.licRgba[p], m.licRgba[p + 1], m.licRgba[p + 2], l, e, t.tone);
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
        if (art.licBrushDepth > 0.02) {
          ctx.globalAlpha = art.licBrushDepth * 0.6;
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
          ctx.fillStyle = isDaVinci ? "rgba(236, 226, 207, 0.84)" : "rgba(3, 2, 6, 0.78)";
          ctx.fill();

          const midCell = (sy * m.w + Math.floor(m.w * 0.5)) * 4;
          const [rC, gC, bC] = resolveEditionColor(
            art.edition,
            m.licRgba[midCell],
            m.licRgba[midCell + 1],
            m.licRgba[midCell + 2],
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
        if (art.licBrushDepth > 0.02) {
          ctx.globalAlpha = art.licBrushDepth * 0.65;
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
        if (art.licBrushDepth > 0.02) {
          ctx.globalAlpha = art.licBrushDepth * 0.55;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = isDaVinci ? "source-over" : "screen";
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
            const [rC, gC, bC] = resolveEditionColor(art.edition, m.licRgba[p], m.licRgba[p + 1], m.licRgba[p + 2], l, e, t.tone);
            const alpha = clip((0.28 + l * 0.72 + e * 0.45) * vMask, 0.08, 0.95);
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
            ctx.fillText(ch, ox + u * drawW, oy + v * drawH);
          }
        }
      }

      // ==========================================
      // ГАЛЕРЕЙНЫЙ ПАСПОРТ И АКАДЕМИЧЕСКАЯ МАРКИРОВКА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isDaVinci ? "rgba(45, 30, 18, 0.4)" : "rgba(255, 255, 255, 0.18)";
        const textFill = isDaVinci ? "rgba(45, 30, 18, 0.78)" : "rgba(255, 255, 255, 0.58)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1.1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT 11.0 // " + (query || "SHINE ON").toUpperCase().slice(0, 20) + " [" + s.topology + " · " + art.architecture + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          "LIC + RK4 | H(X)=" + String(c.entropy) + "b | λ_aniso=" + String(c.eigenAnisotropy),
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
            <div className="text-white font-bold">BARRETT 11.0 // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
          </div>

          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>H(X): <span className="text-white">{coeffs.entropy}b</span> | ANISOTROPY: <span className="text-[#10b981]">{coeffs.eigenAnisotropy}</span></div>
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

      {/* ПРАВАЯ ПАНЕЛЬ: BARRETT STUDIO & ACADEMIC HUD */}
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
                Art Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MATH_HUD")}
                className={
                  "px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "MATH_HUD"
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                Math / Grant HUD
              </button>
            </div>
            <span className="font-mono text-[8px] text-[#10b981] uppercase tracking-widest">RK4 + LIC</span>
          </div>

          {activeTab === "STUDIO" ? (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {/* 6 ТРИБЬЮТ-ЭПОХ */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Tribute Edition:</span>
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
                      { id: "CURRENTS_LP", label: "Currents LP (Liquid Silk)", dot: "linear-gradient(135deg,#c026d3,#38bdf8)" },
                      { id: "POMPEII", label: "Pompeii (24K Gold Etch)", dot: "linear-gradient(135deg,#f59e0b,#78350f)" },
                      { id: "ECHOES", label: "Echoes (Abyssal Sonar)", dot: "linear-gradient(135deg,#10b981,#1d4ed8)" },
                      { id: "DA_VINCI", label: "Da Vinci (Archival Ink)", dot: "linear-gradient(135deg,#ece2cf,#3a2618)" },
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

              {/* 4 АРХИТЕКТУРЫ КАЛЛИГРАФИЧЕСКОГО ПЕРА */}
              <div>
                <div className="text-neutral-400 mb-1.5">Brush & Spline Architecture:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "CALLIGRAPHIC", label: "Calligraphy" },
                      { id: "CROSS_HATCH", label: "Cross-Hatch" },
                      { id: "GUILLOCHE", label: "Guilloché" },
                      { id: "LASER_STRINGS", label: "Laser Harp" },
                    ] as { id: TraceArchitecture; label: string }[]
                  ).map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => {
                        updateArt("architecture", arch.id);
                        stateRef.current.traceProgress = 0;
                      }}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.architecture === arch.id
                          ? "bg-[#a855f7] text-black border-[#a855f7] font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {arch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 ФОНОВЫХ ПОЛЯ */}
              <div>
                <div className="text-neutral-400 mb-1.5">Phase Space & Atmosphere:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "NEBULA_GLOW", label: "Nebula" },
                      { id: "PHASE_GRID", label: "Iso-Grid" },
                      { id: "SONAR_WAVES", label: "Ripples" },
                      { id: "PURE_STUDIO", label: "Pure Void" },
                    ] as { id: CanvasAtmosphere; label: string }[]
                  ).map((atm) => (
                    <button
                      key={atm.id}
                      type="button"
                      onClick={() => updateArt("atmosphere", atm.id)}
                      className={
                        "py-1.5 px-1.5 rounded-lg border text-[8px] tracking-wider transition-all cursor-pointer " +
                        (artConfig.atmosphere === atm.id
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/40 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {atm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ползунки студийной доводки */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>LIC Brushwork Underlay (Cabral-Leedom)</span>
                    <span className="text-[#a855f7]">{Math.round(artConfig.licBrushDepth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.95"
                    step="0.02"
                    value={artConfig.licBrushDepth}
                    onChange={(e) => updateArt("licBrushDepth", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Micro-Anatomy Precision (Faces & Text)</span>
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
                    <span>Calligraphic Pressure & Weight</span>
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
                    <span>Photonic Comets & Specular</span>
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
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              {(
                [
                  { key: "energy", label: "Energy (Drift Velocity μ)" },
                  { key: "chaos", label: "Chaos (Itô Volatility σ)" },
                  { key: "tone", label: "Tone (Spectral Phase θ)" },
                  { key: "structure", label: "Structure (Tensor Lock λ_1)" },
                  { key: "symmetry", label: "Symmetry (Isoquant Density)" },
                ] as { key: keyof Tensor5D; label: string }[]
              ).map((item) => (
                <div key={item.key} className="flex flex-col gap-1">
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

              {/* НАУЧНЫЙ ПАСПОРТ МОДЕЛИ (ДЛЯ СТАТЬИ И ГРАНТА) */}
              <div className="mt-1 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[8px] text-neutral-300 leading-relaxed space-y-1.5">
                <div className="text-[#10b981] font-bold uppercase">Deterministic Non-AI Mathematical Apparatus:</div>
                <div>1. Structure Tensor PCA: J = G_σ * (∇I · ∇Iᵀ)</div>
                <div>2. Coherence Index: ((λ₁ - λ₂)/(λ₁ + λ₂))² = {coeffs.eigenAnisotropy}</div>
                <div>3. Cabral-Leedom LIC: I_lic(x) = ∫ k(s) · I(σ(s)) ds</div>
                <div>4. RK4 Streamline Isoquants: dX_t = (∂Ψ/∂y, -∂Ψ/∂x)dt</div>
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
