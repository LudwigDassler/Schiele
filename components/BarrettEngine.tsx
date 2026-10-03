"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость фазового потока, фотонов и бликов света
  chaos: number;     // C: турбулентность вихрей Кармана и глубина рельефа мазков
  tone: number;      // H: спектральный фазовый угол
  structure: number; // St: сила удержания микро-анатомии и букв (Kuwahara-FDoG Lock)
  symmetry: number;  // Sy: частота ламинарных лент и растровых решеток
}

type TributeEdition =
  | "SHINE_ON"    // Бархатная светотень + родная палитра + адаптивные струны света
  | "KODAK_800T"  // Кинопленка 35mm CineStill 800T (теплый вольфрам, циан и красная галяция)
  | "ARCANE_OIL"  // Живописный концепт-арт маслом с контрастным контровым светом
  | "REMBRANDT"   // Музейный кьяроскуро: глубокий умбристый бархат и золотисто-серебряные рефлексы на лицах
  | "VOGUE_NOIR"  // Журнальный Ч/Б глянец с серебряным зерном и алым акцентом
  | "WARHOL_POP"  // Шелкография фабрики Уорхола (высокий контраст, электрический неон)
  | "CURRENTS_LP" // Tame Impala: Жидкая ртуть, пурпурный бархат, фиолет и циан
  | "DARK_SIDE"   // Pink Floyd: Обсидиановый вакуум и радужная дисперсия Коши
  | "POMPEII"     // 24K Имперское золото и вулканический базальт
  | "DA_VINCI";   // Музейная бумага ручного отлива: уголь, сангина и белый мел (Trois Crayons)

type TraceArchitecture =
  | "HYPER_ADAPTIVE" // Хирургическое перо (0.24px на мелком тексте -> 1.6px на широких волнах)
  | "TROIS_CRAYONS"  // Академическая техника 3 карандашей (темная тушь + светлый мел на бликах)
  | "CROSS_HATCH"    // Умный академический офорт
  | "GUILLOCHE"      // Частотно-модулированное гильоше
  | "LASER_STRINGS"; // Акустические неоновые струны с обертонами

type CanvasAtmosphere = "NEBULA_GLOW" | "PHASE_GRID" | "SONAR_WAVES" | "PURE_STUDIO";

interface ArtStudioConfig {
  edition: TributeEdition;
  architecture: TraceArchitecture;
  atmosphere: CanvasAtmosphere;
  posterFrame: boolean;
  strokeWeight: number;      // 0.4 .. 2.2
  detailPrecision: number;   // 0.25 .. 0.99
  foundationDepth: number;   // 0.0 .. 0.98
  luminanceGlow: number;     // 0.0 .. 1.0
  highlightBoost: number;    // 0.0 .. 1.0 (сила светлых рефлексов на лицах и гранях)
  shadowGamma: number;       // 0.5 .. 1.6 (глубина и контраст теней)
  // Параметры вкладки COLOR LAB:
  customGrading: boolean;
  shadowHex: string;
  midtoneHex: string;
  highlightHex: string;
  vignetteStrength: number;  // 0.0 .. 1.0
  canvasGrain: number;       // 0.0 .. 1.0
  chromaAberration: number;  // 0.0 .. 1.0
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
  eigenAnisotropy: number;
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
  u: Float32Array;
  v: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nPts: number;
  tier: 0 | 1 | 2 | 3 | 4; // 0: Микро-текст/зрачки, 1: Контур, 2: Детали, 3: Шелк полутонов, 4: Световые блики (Chalk/Rim)
  r: number;
  g: number;
  b: number;
  meanEdge: number;
  meanLum: number;
  featureScale: number;
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
  kuwaharaRgba: Uint8ClampedArray;
  lum: Float32Array;
  smoothLum: Float32Array;
  smoothGx: Float32Array;
  smoothGy: Float32Array;
  fdog: Float32Array;
  edge: Float32Array;
  scaleMap: Float32Array;
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
  | "PAINT"
  | "CINEMA"
  | "SKETCH"
  | "CURRENTS"
  | "HALFTONE"
  | "PRISM"
  | "SILK"
  | "LIDAR"
  | "PIPER"
  | "ENGRAVE"
  | "CRYSTAL";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const SILK_COUNT = 4800;
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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  if (isNaN(num)) return [168, 85, 247];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function resolveEditionColor(
  art: ArtStudioConfig,
  nativeR: number,
  nativeG: number,
  nativeB: number,
  lum: number,
  edge: number,
  phaseShift: number,
  isHighlightStroke = false
): [number, number, number] {
  const energy = clip(lum * 0.55 + edge * 0.65, 0.0, 1.0);

  // Если включен 3-точечный кастомный грейдинг в COLOR LAB:
  if (art.customGrading) {
    const [r1, g1, b1] = hexToRgb(art.shadowHex);
    const [r2, g2, b2] = hexToRgb(art.midtoneHex);
    const [r3, g3, b3] = hexToRgb(art.highlightHex);
    if (energy < 0.5) {
      const t = energy * 2.0;
      return [
        Math.round(r1 * (1 - t) + r2 * t),
        Math.round(g1 * (1 - t) + g2 * t),
        Math.round(b1 * (1 - t) + b2 * t),
      ];
    }
    const t = (energy - 0.5) * 2.0;
    return [
      Math.round(r2 * (1 - t) + r3 * t),
      Math.round(g2 * (1 - t) + g3 * t),
      Math.round(b2 * (1 - t) + b3 * t),
    ];
  }

  const edition = art.edition;
  const ph = (phaseShift + energy * 0.65) * Math.PI * 2.0;

  if (edition === "DA_VINCI") {
    if (isHighlightStroke || lum > 0.72) {
      // Белый мел (Chalk Highlight) для бликов на лице и ткани в технике Trois Crayons!
      return [250, 245, 235];
    }
    if (lum > 0.38 && edge < 0.35) {
      // Терракотовая сангина Да Винчи / Рубенса в полутонах
      return [148, 68, 42];
    }
    // Глубокий прессованный уголь и ореховая тушь в тенях
    const inkShade = clip(1.0 - edge * 0.75 - (1.0 - lum) * 0.45, 0.06, 0.38);
    return [
      Math.round(52 * inkShade),
      Math.round(36 * inkShade),
      Math.round(28 * inkShade),
    ];
  }

  if (edition === "REMBRANDT") {
    // Музейный портретный кьяроскуро: теплая умбра, старое золото и жемчужные блики на скулах/глазах
    if (isHighlightStroke) {
      return [255, 238, 195];
    }
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const warmR = avg * 0.45 + (55 + Math.pow(energy, 0.85) * 200) * 0.55;
    const warmG = avg * 0.45 + (38 + Math.pow(energy, 0.95) * 175) * 0.55;
    const warmB = avg * 0.45 + (22 + Math.pow(energy, 1.25) * 135) * 0.55;
    return [
      clip(Math.round(warmR + art.highlightBoost * 35), 15, 255),
      clip(Math.round(warmG + art.highlightBoost * 28), 12, 245),
      clip(Math.round(warmB + art.highlightBoost * 18), 10, 225),
    ];
  }

  if (edition === "WARHOL_POP") {
    // Шелкография Энди Уорхола: квантование на 4 взрывных поп-арт цвета
    if (lum < 0.26) return [18, 12, 28];
    if (lum < 0.52) return [255, 20, 118]; // Hot Magenta
    if (lum < 0.76) return [0, 235, 245];  // Electric Cyan
    return [255, 238, 25];                 // Acid Yellow
  }

  if (edition === "KODAK_800T") {
    if (isHighlightStroke) {
      return [255, 225, 185];
    }
    const shadowWeight = 1.0 - smoothstep(0.15, 0.65, lum);
    const hiWeight = smoothstep(0.42, 0.92, lum);
    const r = nativeR * 0.52 + (25 + shadowWeight * 15 + hiWeight * 230 + edge * 55) * 0.48;
    const g = nativeG * 0.52 + (68 + shadowWeight * 58 + hiWeight * 170 + edge * 38) * 0.48;
    const b = nativeB * 0.52 + (98 + shadowWeight * 98 + hiWeight * 95 + edge * 28) * 0.48;
    return [clip(Math.round(r), 15, 255), clip(Math.round(g), 18, 255), clip(Math.round(b), 25, 255)];
  }

  if (edition === "ARCANE_OIL") {
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const r = avg + (nativeR - avg) * 1.75 + (lum > 0.58 ? 48 : 16);
    const g = avg + (nativeG - avg) * 1.65 + (edge > 0.24 ? 42 : 14);
    const b = avg + (nativeB - avg) * 1.75 + (lum < 0.42 ? 58 : 26);
    return [clip(Math.round(r), 18, 255), clip(Math.round(g), 18, 255), clip(Math.round(b), 24, 255)];
  }

  if (edition === "VOGUE_NOIR") {
    if (edge > 0.36 && lum > 0.25 && lum < 0.75) {
      return [245, 28, 45];
    }
    const v = clip(Math.round(145 + energy * 110), 25, 255);
    return [v, v, Math.min(255, v + 6)];
  }

  if (edition === "SHINE_ON") {
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
    if (sat > 16) {
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
    return [
      Math.min(255, Math.round(175 + 80 * Math.cos(ph + 0.2))),
      Math.min(255, Math.round(55 + 155 * Math.cos(ph - 1.85))),
      Math.min(255, Math.round(215 + 40 * Math.cos(ph + 0.9))),
    ];
  }

  return [
    Math.min(255, Math.round(190 + energy * 65)),
    Math.min(255, Math.round(125 + energy * 110)),
    Math.min(255, Math.round(32 + Math.pow(energy, 2.0) * 150)),
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
  const structure = clip(0.90 + consonantRatio * 0.08, 0.90, 0.99);
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
      eigenAnisotropy: 0.882,
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
// МАТЕМАТИЧЕСКОЕ ЯДРО 14.0:
// ОПЕРАТОР КУВАХАРЫ + МАТРИЦА ГЕССЕ + 5-СЛОЙНАЯ ТРАССИРОВКА С БЛИКАМИ (SPECULAR RIM)
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, isMobileDevice: boolean): MatrixBuffer {
  const baseRes = isMobileDevice ? 520 : 800;
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
  const scaleMap = new Float32Array(total);
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
      kuwaharaRgba: new Uint8ClampedArray(total * 4),
      lum,
      smoothLum: lum,
      smoothGx: gx,
      smoothGy: gy,
      fdog,
      edge,
      scaleMap,
      gx,
      gy,
      etfX,
      etfY,
      mask,
      spawnIndices,
      cells,
      strokes,
      pluckAmps: new Float32Array(0),
      meanAnisotropy: 0.88,
    };
  }

  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rawRgba = octx.getImageData(0, 0, w, h).data;
  const kuwaharaRgba = new Uint8ClampedArray(rawRgba.length);

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
      // Локально вытягиваем полутона, чтобы темные лица (как на скрине с гитаристом) имели богатый внутренний рельеф!
      lum[i] = Math.pow(normL, 0.78) * mask[i];
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 4);
  const smoothLum = gaussianBlurField(lum, w, h, 12);

  // Локально-адаптивное выравнивание теней на лице: если область в глубокой полутени, поднимаем локальный контраст!
  for (let i = 0; i < total; i++) {
    const shadowLift = (1.0 - smoothLum[i]) * 0.22;
    lum[i] = clip(lum[i] * (1.0 + shadowLift));
  }

  const smoothGx = new Float32Array(total);
  const smoothGy = new Float32Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      smoothGx[i] = (smoothLum[i + 1] - smoothLum[i - 1]) * 0.5;
      smoothGy[i] = (smoothLum[i + w] - smoothLum[i - w]) * 0.5;
    }
  }

  const j11 = new Float32Array(total);
  const j12 = new Float32Array(total);
  const j22 = new Float32Array(total);
  const rawGradMag = new Float32Array(total);
  const hessianRidge = new Float32Array(total);
  const positiveRidge = new Float32Array(total); // Светлые хребты для бликов мелом/серебром!
  let globalMaxEdge = 1e-5;
  let globalMaxRidge = 1e-5;

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

      const cVal = lum[idx];
      const ixx = lum[idx + 1] - 2.0 * cVal + lum[idx - 1];
      const iyy = lum[idx + w] - 2.0 * cVal + lum[idx - w];
      const ixy = 0.25 * (lum[(y + 1) * w + (x + 1)] - lum[(y + 1) * w + (x - 1)] - lum[(y - 1) * w + (x + 1)] + lum[(y - 1) * w + (x - 1)]);
      const hTrace = ixx + iyy;
      const hDet = Math.sqrt((ixx - iyy) * (ixx - iyy) + 4.0 * ixy * ixy);
      const eigMin = 0.5 * (hTrace - hDet);
      const ridgeStrength = Math.max(Math.abs(0.5 * (hTrace + hDet)), Math.abs(eigMin)) * mask[idx];
      hessianRidge[idx] = ridgeStrength;
      // Если eigMin сильно отрицательный — это яркий световой гребень (блик на носу, скуле, струне, букве!)
      positiveRidge[idx] = eigMin < 0 ? -eigMin * mask[idx] : 0;
      if (ridgeStrength > globalMaxRidge) globalMaxRidge = ridgeStrength;

      j11[idx] = sx * sx;
      j12[idx] = sx * sy;
      j22[idx] = sy * sy;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
    }
  }

  const sJ11 = gaussianBlurField(j11, w, h, 1);
  const sJ12 = gaussianBlurField(j12, w, h, 1);
  const sJ22 = gaussianBlurField(j22, w, h, 1);

  let anisotropySum = 0;
  let anisotropyCount = 0;

  for (let i = 0; i < total; i++) {
    const a = sJ11[i];
    const b = sJ12[i];
    const c = sJ22[i];
    const trace = a + c;
    const detTerm = Math.sqrt((a - c) * (a - c) + 4.0 * b * b);
    const lambda1 = 0.5 * (trace + detTerm);
    const lambda2 = 0.5 * (trace - detTerm);

    if (trace > 1e-5) {
      const coherence = Math.pow((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-5), 2);
      anisotropySum += coherence;
      anisotropyCount++;
    }

    const tx = b;
    const ty = lambda2 - a;
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

  const localEnv = gaussianBlurField(rawGradMag, w, h, 5);
  const absFloor = globalMaxEdge * 0.028;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    const rVal = (hessianRidge[i] / globalMaxRidge) * globalMaxEdge * 0.48;
    const combinedSignal = Math.max(gVal, rVal);

    if (combinedSignal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.13, localEnv[i] * 1.95 + globalMaxEdge * 0.06);
      edge[i] = clip((combinedSignal - absFloor * 0.65) / denom);
    }
    if (edge[i] > 0.09 || (lum[i] > 0.15 && edge[i] > 0.03)) {
      spawnIndices.push(i);
    }
  }

  const edgeDensity = gaussianBlurField(edge, w, h, 4);
  for (let i = 0; i < total; i++) {
    const normRidge = hessianRidge[i] / globalMaxRidge;
    const crowding = edgeDensity[i] * 3.4 + normRidge * 4.8;
    scaleMap[i] = clip(1.0 / (0.82 + crowding), 0.2, 1.35);
  }

  // Нелинейный фильтр минимальной дисперсии Кувахары
  const qBounds: [number, number, number, number][] = [
    [-2, 0, -2, 0],
    [0, 2, -2, 0],
    [-2, 0, 0, 2],
    [0, 2, 0, 2],
  ];

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      if (mask[idx] <= 0.005) continue;

      let bestVar = 1e9;
      let bestR = rawRgba[idx * 4];
      let bestG = rawRgba[idx * 4 + 1];
      let bestB = rawRgba[idx * 4 + 2];

      for (let q = 0; q < 4; q++) {
        const [x0, x1, y0, y1] = qBounds[q];
        let sumL = 0;
        let sumL2 = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (let ky = y0; ky <= y1; ky++) {
          const row = (y + ky) * w;
          for (let kx = x0; kx <= x1; kx++) {
            const nIdx = row + (x + kx);
            const lVal = lum[nIdx];
            sumL += lVal;
            sumL2 += lVal * lVal;
            const np = nIdx * 4;
            sumR += rawRgba[np];
            sumG += rawRgba[np + 1];
            sumB += rawRgba[np + 2];
          }
        }
        const meanL = sumL / 9.0;
        const variance = sumL2 / 9.0 - meanL * meanL;
        if (variance < bestVar) {
          bestVar = variance;
          bestR = sumR / 9.0;
          bestG = sumG / 9.0;
          bestB = sumB / 9.0;
        }
      }

      const p = idx * 4;
      kuwaharaRgba[p] = Math.min(255, Math.round(bestR));
      kuwaharaRgba[p + 1] = Math.min(255, Math.round(bestG));
      kuwaharaRgba[p + 2] = Math.min(255, Math.round(bestB));
      kuwaharaRgba[p + 3] = 255;
    }
  }

  // Субпиксельный FDoG
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const microDiff = lum[i] - gNarrow[i];
    const macroDiff = gNarrow[i] - gWide[i];
    const pAdaptive = 24.0 * smoothstep(0.02, 0.2, edge[i]);
    rawDoG[i] = clip(lum[i] + (microDiff * 0.65 + macroDiff * 0.35) * pAdaptive);
  }

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      const tx = etfX[i];
      const ty = etfY[i];
      const stepScale = scaleMap[i];
      let acc = rawDoG[i] * 0.44;
      for (let step = 1; step <= 2; step++) {
        const wgt = step === 1 ? 0.19 : 0.09;
        const dist = step * stepScale * 1.2;
        const xPlus = Math.min(w - 1, Math.max(0, Math.round(x + tx * dist)));
        const yPlus = Math.min(h - 1, Math.max(0, Math.round(y + ty * dist)));
        const xMinus = Math.min(w - 1, Math.max(0, Math.round(x - tx * dist)));
        const yMinus = Math.min(h - 1, Math.max(0, Math.round(y - ty * dist)));
        acc += (rawDoG[yPlus * w + xPlus] + rawDoG[yMinus * w + xMinus]) * wgt;
      }
      fdog[i] = clip(acc);
    }
  }

  // ==========================================
  // 5-СЛОЙНАЯ ТРАССИРОВКА (ВКЛЮЧАЯ TIER 4: SPECULAR RIM HIGHLIGHTS НА ЛИЦАХ И СТРУНАХ!)
  // ==========================================
  const isRidgeMap = new Uint8Array(total);
  const subOffsetX = new Float32Array(total);
  const subOffsetY = new Float32Array(total);
  const ridgeSeeds: { idx: number; score: number; tier: 0 | 1 | 2 | 4 }[] = [];

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      if (e0 < 0.036 || mask[i] < 0.05) continue;

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      if (nx === 0 && ny === 0) continue;

      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];

      if (e0 >= ePrev * 0.98 && e0 >= eNext * 0.98) {
        isRidgeMap[i] = 1;
        const denom = 2.0 * (ePrev - 2.0 * e0 + eNext);
        const offset = Math.abs(denom) > 1e-4 ? clip((ePrev - eNext) / denom, -0.45, 0.45) : 0.0;
        subOffsetX[i] = gx[i] * offset;
        subOffsetY[i] = gy[i] * offset;

        const isBrightHighlight = positiveRidge[i] > globalMaxRidge * 0.12 && lum[i] > gWide[i] + 0.03;
        const tier: 0 | 1 | 2 | 4 =
          scaleMap[i] < 0.48
            ? 0
            : isBrightHighlight
            ? 4
            : e0 > 0.19
            ? 1
            : 2;
        ridgeSeeds.push({ idx: i, score: e0 * (tier === 0 || tier === 4 ? 1.45 : 1.0), tier });
      }
    }
  }

  ridgeSeeds.sort((a, b) => b.score - a.score);

  const DIRS_8: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  const visited = new Uint8Array(total);

  const tracePixelSkeleton = (startIdx: number, dirSign: number, maxLen: number, isMicroTier: boolean) => {
    const chain: { x: number; y: number }[] = [];
    let currIdx = startIdx;
    let cx = currIdx % w;
    let cy = Math.floor(currIdx / w);

    let prevDx = etfX[currIdx] * dirSign;
    let prevDy = etfY[currIdx] * dirSign;
    const minAlign = isMicroTier ? -0.28 : 0.18;

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

        if (align > minAlign) {
          const score = align * 0.55 + edge[nIdx] * 0.45;
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
      const inertia = isMicroTier ? 0.14 : 0.35;
      prevDx = prevDx * inertia + bestDx * (1.0 - inertia);
      prevDy = prevDy * inertia + bestDy * (1.0 - inertia);
      const norm = Math.hypot(prevDx, prevDy) + 1e-6;
      prevDx /= norm;
      prevDy /= norm;
    }

    return chain;
  };

  const packAdaptiveStroke = (rawPts: { x: number; y: number }[], tier: 0 | 1 | 2 | 3 | 4) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;

    const passes = tier === 0 ? 1 : 2;
    const angleThreshold = tier === 0 ? 0.84 : 0.6;

    for (let pass = 0; pass < passes; pass++) {
      const next = curr.map((pt) => ({ x: pt.x, y: pt.y }));
      for (let i = 1; i < n - 1; i++) {
        const vx1 = curr[i].x - curr[i - 1].x;
        const vy1 = curr[i].y - curr[i - 1].y;
        const vx2 = curr[i + 1].x - curr[i].x;
        const vy2 = curr[i + 1].y - curr[i].y;
        const l1 = Math.hypot(vx1, vy1) + 1e-5;
        const l2 = Math.hypot(vx2, vy2) + 1e-5;
        const cosAngle = (vx1 * vx2 + vy1 * vy2) / (l1 * l2);

        if (cosAngle > angleThreshold) {
          next[i].x = 0.22 * curr[i - 1].x + 0.56 * curr[i].x + 0.22 * curr[i + 1].x;
          next[i].y = 0.22 * curr[i - 1].y + 0.56 * curr[i].y + 0.22 * curr[i + 1].y;
        }
      }
      curr = next;
    }

    const uArr = new Float32Array(n);
    const vArr = new Float32Array(n);
    const nxArr = new Float32Array(n);
    const nyArr = new Float32Array(n);

    let eSum = 0, lSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0, scaleSum = 0;

    for (let i = 0; i < n; i++) {
      const pPrev = curr[Math.max(0, i - 1)];
      const pNext = curr[Math.min(n - 1, i + 1)];
      const dx = pNext.x - pPrev.x;
      const dy = pNext.y - pPrev.y;
      const len = Math.hypot(dx, dy) + 1e-6;

      const uVal = curr[i].x / w;
      const vVal = curr[i].y / h;
      uArr[i] = uVal;
      vArr[i] = vVal;
      nxArr[i] = -dy / len;
      nyArr[i] = dx / len;
      uSum += uVal;
      vSum += vVal;

      const pxIdx = Math.min(h - 1, Math.max(0, Math.floor(curr[i].y))) * w + Math.min(w - 1, Math.max(0, Math.floor(curr[i].x)));
      scaleSum += scaleMap[pxIdx];
      eSum += edge[pxIdx];
      lSum += lum[pxIdx];
      const p4 = pxIdx * 4;
      rSum += kuwaharaRgba[p4];
      gSum += kuwaharaRgba[p4 + 1];
      bSum += kuwaharaRgba[p4 + 2];
    }

    const meanEdge = eSum / n;
    const meanScale = scaleSum / n;
    const importance = clip(meanEdge * 1.2 + (tier === 0 || tier === 4 ? 0.4 : Math.min(0.35, n / 75.0)));

    strokes.push({
      u: uArr,
      v: vArr,
      nx: nxArr,
      ny: nyArr,
      nPts: n,
      tier,
      r: Math.round(rSum / n),
      g: Math.round(gSum / n),
      b: Math.round(bSum / n),
      meanEdge,
      meanLum: lSum / n,
      featureScale: meanScale,
      importance,
      phase: (strokes.length * PHI) % (Math.PI * 2),
      speed: 0.65 + ((strokes.length * 7) % 13) * 0.06,
      arcLen: n,
      centerU: uSum / n,
      centerV: vSum / n,
    });
  };

  const maxRidgeStrokes = isMobileDevice ? 3800 : 6800;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxRidgeStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const isMicro = seed.tier === 0;
    const maxHalf = isMicro ? 42 : 95;
    const back = tracePixelSkeleton(seed.idx, -1, maxHalf, isMicro).reverse();
    const fwd = tracePixelSkeleton(seed.idx, 1, maxHalf, isMicro);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < (isMicro ? 2 : 3)) continue;
    packAdaptiveStroke(rawPts, seed.tier);
  }

  const gridStep = isMobileDevice ? 4 : 3;
  const maxTotalStrokes = isMobileDevice ? 5000 : 8800;

  for (let y = 4; y < h - 4; y += gridStep) {
    for (let x = 4; x < w - 4; x += gridStep) {
      if (strokes.length >= maxTotalStrokes) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.08) continue;

      const lVal = lum[idx];
      const eVal = edge[idx];
      if (lVal > 0.08 && (eVal > 0.018 || lVal > 0.2)) {
        const rawFilament: { x: number; y: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        const filSteps = Math.max(4, Math.min(12, Math.round(scaleMap[idx] * 11)));

        for (let s = 0; s < filSteps; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          visited[cIdx] = 1;
          rawFilament.push({ x: cx, y: cy });
          cx += etfX[cIdx] * 1.35;
          cy += etfY[cIdx] * 1.35;
        }
        if (rawFilament.length >= 3) {
          packAdaptiveStroke(rawFilament, 3);
        }
      }
    }
  }

  strokes.sort((a, b) => {
    const tierDiff = (a.tier === 3 ? 1 : 0) - (b.tier === 3 ? 1 : 0);
    if (tierDiff !== 0) return tierDiff;
    const da = Math.hypot(a.centerU - 0.5, a.centerV - 0.48);
    const db = Math.hypot(b.centerU - 0.5, b.centerV - 0.48);
    return (da - db) * 0.45 + (b.importance - a.importance) * 0.55;
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
            r: kuwaharaRgba[sp],
            g: kuwaharaRgba[sp + 1],
            b: kuwaharaRgba[sp + 2],
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
          r: kuwaharaRgba[p],
          g: kuwaharaRgba[p + 1],
          b: kuwaharaRgba[p + 2],
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
    kuwaharaRgba,
    lum,
    smoothLum,
    smoothGx,
    smoothGy,
    fdog,
    edge,
    scaleMap,
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
  const [activeTab, setActiveTab] = useState<"STUDIO" | "COLOR_LAB" | "MATH_HUD">("STUDIO");

  const [artConfig, setArtConfig] = useState<ArtStudioConfig>({
    edition: "SHINE_ON",
    architecture: "HYPER_ADAPTIVE",
    atmosphere: "NEBULA_GLOW",
    posterFrame: true,
    strokeWeight: 0.92,
    detailPrecision: 0.96,
    foundationDepth: 0.68,
    luminanceGlow: 0.78,
    highlightBoost: 0.55,
    shadowGamma: 0.88,
    customGrading: false,
    shadowHex: "#18122b",
    midtoneHex: "#a855f7",
    highlightHex: "#fde047",
    vignetteStrength: 0.25,
    canvasGrain: 0.28,
    chromaAberration: 0.22,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("INITIALIZING PRISM OPTICS...");
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
    let next: ArtStudioConfig = { ...artConfig, edition, customGrading: false };
    if (edition === "SHINE_ON") {
      next = {
        ...next,
        architecture: "HYPER_ADAPTIVE",
        atmosphere: "NEBULA_GLOW",
        strokeWeight: 0.92,
        detailPrecision: 0.96,
        foundationDepth: 0.68,
        luminanceGlow: 0.78,
        highlightBoost: 0.55,
        shadowGamma: 0.88,
      };
    } else if (edition === "KODAK_800T") {
      next = {
        ...next,
        architecture: "HYPER_ADAPTIVE",
        atmosphere: "NEBULA_GLOW",
        strokeWeight: 0.9,
        detailPrecision: 0.96,
        foundationDepth: 0.72,
        luminanceGlow: 0.85,
        highlightBoost: 0.65,
        shadowGamma: 0.85,
      };
    } else if (edition === "REMBRANDT") {
      next = {
        ...next,
        architecture: "TROIS_CRAYONS",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 0.95,
        detailPrecision: 0.97,
        foundationDepth: 0.74,
        luminanceGlow: 0.65,
        highlightBoost: 0.82,
        shadowGamma: 0.92,
      };
    } else if (edition === "ARCANE_OIL") {
      next = {
        ...next,
        architecture: "HYPER_ADAPTIVE",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 1.05,
        detailPrecision: 0.95,
        foundationDepth: 0.82,
        luminanceGlow: 0.68,
        highlightBoost: 0.6,
        shadowGamma: 0.9,
      };
    } else if (edition === "WARHOL_POP") {
      next = {
        ...next,
        architecture: "HYPER_ADAPTIVE",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 1.0,
        detailPrecision: 0.95,
        foundationDepth: 0.78,
        luminanceGlow: 0.75,
        highlightBoost: 0.7,
        shadowGamma: 0.95,
      };
    } else if (edition === "VOGUE_NOIR") {
      next = {
        ...next,
        architecture: "CROSS_HATCH",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 0.9,
        detailPrecision: 0.96,
        foundationDepth: 0.58,
        luminanceGlow: 0.65,
        highlightBoost: 0.75,
        shadowGamma: 0.95,
      };
    } else if (edition === "CURRENTS_LP") {
      next = {
        ...next,
        architecture: "HYPER_ADAPTIVE",
        atmosphere: "SONAR_WAVES",
        strokeWeight: 1.0,
        detailPrecision: 0.94,
        foundationDepth: 0.58,
        luminanceGlow: 0.86,
        highlightBoost: 0.6,
        shadowGamma: 0.88,
      };
    } else if (edition === "DARK_SIDE") {
      next = {
        ...next,
        architecture: "LASER_STRINGS",
        atmosphere: "PURE_STUDIO",
        strokeWeight: 0.85,
        detailPrecision: 0.97,
        foundationDepth: 0.38,
        luminanceGlow: 0.92,
        highlightBoost: 0.7,
        shadowGamma: 0.9,
      };
    } else if (edition === "POMPEII") {
      next = {
        ...next,
        architecture: "GUILLOCHE",
        atmosphere: "PHASE_GRID",
        strokeWeight: 0.92,
        detailPrecision: 0.95,
        foundationDepth: 0.52,
        luminanceGlow: 0.8,
        highlightBoost: 0.72,
        shadowGamma: 0.9,
      };
    } else if (edition === "DA_VINCI") {
      next = {
        ...next,
        architecture: "TROIS_CRAYONS",
        atmosphere: "PHASE_GRID",
        strokeWeight: 0.92,
        detailPrecision: 0.97,
        foundationDepth: 0.72,
        luminanceGlow: 0.2,
        highlightBoost: 0.85,
        shadowGamma: 0.95,
      };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsBaseRebuild = true;
    stateRef.current.traceProgress = 0;
    if (stateRef.current.topology === "SILK") stateRef.current.needsSilkReset = true;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING 800P KUWAHARA & HESSIAN TENSOR [" + String(idx + 1) + "/" + String(total) + "]...");
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
        "LOCKED // " + String(buf.strokes.length) + " ADAPTIVE VECTORS (" + String(buf.w) + "x" + String(buf.h) + " HD)"
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
    setFieldStatus("REFRACTING SPECTRUM TARGETS...");

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
        setFieldStatus("PURE OPTICAL PRISM SYNTHESIS");
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
  // ЯДРО СИНТЕЗА BARRETT 14.0 (12 ТОПОЛОГИЙ + TROIS CRAYONS + KUWAHARA IMPASTO)
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

    const traceDirectAdaptiveSpline = (
      st: ContourStroke,
      startIdx: number,
      endIdx: number,
      fracTip: number,
      ox: number,
      oy: number,
      drawW: number,
      drawH: number,
      waveSpeed: number,
      ambientAmp: number,
      pluckPx: number
    ) => {
      const u = st.u;
      const v = st.v;
      const nx = st.nx;
      const ny = st.ny;
      const nPts = st.nPts;

      ctx.beginPath();
      let prevX = 0;
      let prevY = 0;

      for (let k = startIdx; k <= endIdx && k < nPts; k++) {
        const sNorm = k / Math.max(1, nPts - 1);
        const env = Math.sin(sNorm * Math.PI);
        const spPhase = (u[k] * 3.2 + v[k] * 3.2) * Math.PI + waveSpeed + st.phase * 0.15;
        const disp = (Math.sin(spPhase) * ambientAmp + Math.sin(sNorm * Math.PI * 2.0) * pluckPx) * env;

        const curX = ox + u[k] * drawW + nx[k] * disp;
        const curY = oy + v[k] * drawH + ny[k] * disp;

        if (k === startIdx) {
          ctx.moveTo(curX, curY);
        } else if (k === startIdx + 1) {
          ctx.lineTo(curX, curY);
        } else {
          const midX = (prevX + curX) * 0.5;
          const midY = (prevY + curY) * 0.5;
          ctx.quadraticCurveTo(prevX, prevY, midX, midY);
        }
        prevX = curX;
        prevY = curY;
      }

      if (fracTip > 0.005 && endIdx < nPts - 1) {
        const nextK = endIdx + 1;
        const tipX = ox + (u[endIdx] + (u[nextK] - u[endIdx]) * fracTip) * drawW;
        const tipY = oy + (v[endIdx] + (v[nextK] - v[endIdx]) * fracTip) * drawH;
        ctx.lineTo(tipX, tipY);
      } else if (endIdx >= startIdx) {
        ctx.lineTo(prevX, prevY);
      }
    };

    // Сборка Kuwahara + FDoG основы с учетом новых ползунков Highlight Boost, Shadow Gamma, Vignette и Grain!
    const rebuildKuwaharaFoundation = (m: MatrixBuffer, art: ArtStudioConfig, t: Tensor5D) => {
      if (!baseCtx) return;
      baseCanvas.width = m.w;
      baseCanvas.height = m.h;
      const imgData = baseCtx.createImageData(m.w, m.h);
      const dst = imgData.data;
      const kuw = m.kuwaharaRgba;
      const isDaVinci = art.edition === "DA_VINCI" && !art.customGrading;

      for (let y = 0; y < m.h; y++) {
        const ny = (y / m.h) * 2.0 - 1.0;
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const nx = (x / m.w) * 2.0 - 1.0;
          const p = i * 4;
          const rawL = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];

          // Применяем ползунок Shadow Contrast Gamma и Highlight Boost (вытягивает полутени лица!)
          const l = clip(Math.pow(rawL, art.shadowGamma) + art.highlightBoost * 0.22 * smoothstep(0.25, 0.85, rawL));
          const inkShade = clip(0.24 + 0.76 * Math.tanh(9.5 * (fd - 0.24)), 0.1, 1.0);

          // Оптическая виньетка и фактура холста из вкладки Color Lab
          const radDistSq = nx * nx + ny * ny;
          const vigFactor = 1.0 - art.vignetteStrength * 0.65 * radDistSq;
          const grainTex = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1.0;
          const canvasWeave = Math.sin(x * 1.1) * Math.cos(y * 1.1) * 0.5 + (grainTex - 0.5);
          const grainOffset = canvasWeave * art.canvasGrain * 24.0;

          let outR = 0, outG = 0, outB = 0;

          if (isDaVinci) {
            const wash = Math.pow(l, 0.78) * inkShade;
            outR = (115 + wash * 125) * vigFactor + grainOffset;
            outG = (88 + wash * 138) * vigFactor + grainOffset;
            outB = (62 + wash * 148) * vigFactor + grainOffset;
          } else {
            const [edR, edG, edB] = resolveEditionColor(
              art,
              kuw[p],
              kuw[p + 1],
              kuw[p + 2],
              l,
              e,
              t.tone
            );

            const nativeMix =
              art.customGrading
                ? 0.25
                : art.edition === "SHINE_ON" || art.edition === "ARCANE_OIL"
                ? 0.78
                : 0.42;
            const colR = kuw[p] * nativeMix + edR * (1.0 - nativeMix);
            const colG = kuw[p + 1] * nativeMix + edG * (1.0 - nativeMix);
            const colB = kuw[p + 2] * nativeMix + edB * (1.0 - nativeMix);

            const microBoost = (1.0 - m.scaleMap[i]) * e * 0.58 + art.highlightBoost * e * 0.35;
            const chiaroscuro = clip(l * inkShade + e * 0.32 + microBoost, 0.0, 1.0);
            outR = colR * chiaroscuro * vigFactor + grainOffset;
            outG = colG * chiaroscuro * vigFactor + grainOffset;
            outB = colB * chiaroscuro * vigFactor + grainOffset;
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

      const isPaperTheme = (art.edition === "DA_VINCI" && !art.customGrading) || s.topology === "SKETCH";
      const bgHex = isPaperTheme ? "#d8ccb8" : "#030206";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.0092 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildKuwaharaFoundation(m, art, t);
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
        ctx.fillStyle = isPaperTheme ? "rgba(216, 204, 184, 0.08)" : "rgba(3, 2, 6, 0.08)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        ctx.globalCompositeOperation = "screen";
        const cx = viewW * 0.46;
        const cy = viewH * 0.5;
        const prismR = Math.min(viewW, viewH) * 0.14;

        const beamY = cy + Math.sin(time * 1.5) * 6.0;
        const inGrad = ctx.createLinearGradient(0, beamY, cx - prismR * 0.45, cy);
        inGrad.addColorStop(0, "rgba(255,255,255,0.05)");
        inGrad.addColorStop(0.7, "rgba(255,255,255,0.65)");
        inGrad.addColorStop(1, "rgba(255,255,255,0.98)");
        ctx.strokeStyle = inGrad;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, beamY);
        ctx.lineTo(cx - prismR * 0.45, cy);
        ctx.stroke();

        for (let b = 0; b < 7; b++) {
          const [cr, cg, cb] = CAUCHY_SPECTRUM[b];
          const spreadAngle = -0.32 + (b / 6) * 0.64 + Math.sin(time * 1.2 + b * 0.4) * 0.025;
          const endX = viewW;
          const endY = cy + Math.tan(spreadAngle) * (viewW - cx);

          for (let sub = -2; sub <= 2; sub++) {
            ctx.beginPath();
            ctx.moveTo(cx + prismR * 0.35, cy + b * 2.2 - 7.0);
            const ctrlX = cx + (viewW - cx) * 0.45;
            const ctrlY = cy + Math.tan(spreadAngle) * (viewW - cx) * 0.42 + Math.sin(time * 2.5 + b + sub) * 14.0;
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY + sub * 9.0);
            const alpha = sub === 0 ? 0.85 : 0.22;
            ctx.strokeStyle = "rgba(" + String(cr) + "," + String(cg) + "," + String(cb) + "," + String(alpha) + ")";
            ctx.lineWidth = sub === 0 ? 2.2 : 4.5;
            ctx.stroke();
          }
        }

        const rot = time * 0.35;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = rot + (k * Math.PI * 2) / 3 - Math.PI * 0.5;
          const vx = cx + Math.cos(a) * prismR;
          const vy = cy + Math.sin(a) * prismR;
          if (k === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.stroke();

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
      // РЕЖИМ 1 И 4: TRACE 14.0 & SKETCH (TROIS CRAYONS: УГОЛЬ + САНГИНА + СВЕТОВОЙ МЕЛ НА БЛИКАХ!)
      // ==========================================
      if (s.topology === "TRACE" || s.topology === "SKETCH") {
        const prog = s.traceProgress;
        const baseReveal = smoothstep(0.0, 0.42, prog);
        const isSketchMode = s.topology === "SKETCH";

        if (art.foundationDepth > 0.02) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = (isSketchMode ? 0.35 : art.foundationDepth) * baseReveal;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        if (art.atmosphere !== "PURE_STUDIO" && !isSketchMode) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ox, oy, drawW, drawH);
          ctx.clip();

          const focusX = ox + s.fluidU * drawW;
          const focusY = oy + s.fluidV * drawH;
          const maxRad = Math.hypot(drawW, drawH) * 0.65;

          if (art.atmosphere === "PHASE_GRID") {
            ctx.strokeStyle = isPaperTheme ? "rgba(70, 45, 25, 0.12)" : "rgba(255, 255, 255, 0.06)";
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
          } else if (art.atmosphere === "NEBULA_GLOW" && !isPaperTheme) {
            ctx.globalCompositeOperation = "screen";
            const [aR, aG, aB] = resolveEditionColor(art, 168, 85, 247, 0.6, 0.8, t.tone + time * 0.05);
            const radGrad = ctx.createRadialGradient(focusX, focusY, 5, focusX, focusY, maxRad);
            radGrad.addColorStop(0, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + "," + String((0.18 * art.luminanceGlow).toFixed(2)) + ")");
            radGrad.addColorStop(0.5, "rgba(" + String(aR) + "," + String(aG) + "," + String(aB) + ",0.04)");
            radGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = radGrad;
            ctx.fillRect(ox, oy, drawW, drawH);
          } else if (art.atmosphere === "SONAR_WAVES") {
            ctx.globalCompositeOperation = isPaperTheme ? "source-over" : "screen";
            const [aR, aG, aB] = resolveEditionColor(art, 38, 218, 255, 0.7, 0.8, t.tone);
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

        const strokes = m.strokes;
        const pluckAmps = m.pluckAmps;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(120, Math.floor(totalStrokes * 0.22));
        const headFloat = prog * (totalStrokes + windowSpan);
        const waveSpeed = time * (2.0 + t.energy * 2.3);
        const importanceGate = 1.0 - art.detailPrecision;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.importance < importanceGate * 0.65) continue;

          if (s.mouseActive) {
            const dMouse = Math.hypot(st.centerU - mNormX, st.centerV - mNormY);
            if (dMouse < 0.08) {
              pluckAmps[i] = Math.min(1.0, pluckAmps[i] + (1.0 - dMouse / 0.08) * 0.45);
            }
          }
          pluckAmps[i] *= 0.93;
          const pAmp = pluckAmps[i];

          const nPts = st.nPts;
          const rawLocal = prog >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.02) continue;

          const exactPtFloat = localProg * (nPts - 1);
          const fullIdx = Math.floor(exactPtFloat);
          const frac = exactPtFloat - fullIdx;

          const isMicroFeature = st.tier === 0 || st.featureScale < 0.54;
          const isHighlight = st.tier === 4 || (art.architecture === "TROIS_CRAYONS" && st.meanLum > 0.62);

          // В режиме Sketch / Trois Crayons темные штрихи рисуются в source-over, а светлый мел (isHighlight) — в screen!
          ctx.globalCompositeOperation =
            isPaperTheme && !isHighlight ? "source-over" : "screen";

          const ambientScale =
            isMicroFeature || isSketchMode
              ? 0.0
              : clip((st.arcLen - 16.0) / 55.0, 0.0, 1.0) * t.chaos * 1.05 * (1.05 - t.structure * 0.88);
          const stringPluckPx = pAmp * (isMicroFeature ? 1.5 : 5.5 + t.chaos * 7.0) * Math.sin(time * 28.0 + st.phase);

          let [rC, gC, bC] = isSketchMode
            ? isHighlight
              ? [252, 248, 240] // Белый мел на светах
              : st.meanLum > 0.36 && st.meanEdge < 0.35
              ? [142, 62, 38]   // Сангина в полутонах
              : [26, 20, 18]    // Уголь в тенях
            : resolveEditionColor(
                art,
                st.r,
                st.g,
                st.b,
                st.meanLum,
                st.meanEdge,
                t.tone + pAmp * 0.25,
                isHighlight
              );

          // Усиливаем световые рефлексы на лицах согласно ползунку Highlight & Rim Boost!
          if (isHighlight && !isPaperTheme) {
            const hiMix = art.highlightBoost * 0.65;
            rC = Math.min(255, Math.round(rC + (255 - rC) * hiMix));
            gC = Math.min(255, Math.round(gC + (248 - gC) * hiMix));
            bC = Math.min(255, Math.round(bC + (235 - bC) * hiMix));
          }

          const tierAlpha =
            st.tier === 0
              ? 0.96
              : st.tier === 4
              ? clip(0.55 + art.highlightBoost * 0.4, 0.2, 0.96)
              : st.tier === 1
              ? 0.92
              : st.tier === 2
              ? 0.8
              : 0.42;
          const baseAlpha = clip((0.28 + st.meanEdge * 0.64 + st.meanLum * 0.22 + pAmp * 0.45) * tierAlpha * localProg, 0.12, 0.96);
          const strokeColor = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";

          const adaptiveWidth =
            (st.tier === 0
              ? 0.34
              : st.tier === 4
              ? 0.55 * st.featureScale * (0.7 + art.highlightBoost * 0.6)
              : st.tier === 1
              ? (0.65 + st.meanEdge * 0.72) * st.featureScale
              : st.tier === 2
              ? 0.48 * st.featureScale
              : 0.34 * st.featureScale) *
            art.strokeWeight *
            (1.0 + pAmp * 0.75);

          if (art.architecture === "GUILLOCHE" && !isMicroFeature && !isSketchMode) {
            ctx.beginPath();
            const gFreq = 1.15 + t.symmetry * 2.2;
            const gAmp = (1.0 + st.meanEdge * 3.0 + pAmp * 4.5) * art.strokeWeight * st.featureScale;

            for (let k = 0; k <= fullIdx && k < nPts; k++) {
              const sNorm = k / Math.max(1, nPts - 1);
              const env = Math.sin(sNorm * Math.PI);
              const spiro = Math.sin(k * gFreq - waveSpeed * 1.5 + st.phase) * gAmp * env;
              const sx = ox + st.u[k] * drawW + st.nx[k] * spiro;
              const sy = oy + st.v[k] * drawH + st.ny[k] * spiro;
              if (k === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = Math.max(0.32, adaptiveWidth * 0.85);
            ctx.stroke();
            continue;
          }

          traceDirectAdaptiveSpline(st, 0, fullIdx, frac, ox, oy, drawW, drawH, waveSpeed, ambientScale, stringPluckPx);

          if (!isMicroFeature && (st.tier === 1 || pAmp > 0.12) && art.luminanceGlow > 0.08 && !isPaperTheme) {
            const glowAlpha = clip(baseAlpha * (0.16 + pAmp * 0.35) * art.luminanceGlow, 0.02, 0.38);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(glowAlpha.toFixed(2)) + ")";
            ctx.lineWidth = adaptiveWidth * 2.5;
            ctx.stroke();
          }

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(0.24, adaptiveWidth);
          ctx.stroke();

          if ((art.architecture === "CROSS_HATCH" || isSketchMode) && !isMicroFeature && st.featureScale > 0.68 && st.meanLum < 0.58 && fullIdx >= 6) {
            const hatchLen = (2.2 + (1.0 - st.meanLum) * 4.2) * art.strokeWeight * st.featureScale;
            ctx.beginPath();
            for (let k = 2; k < fullIdx - 1; k += 3) {
              const px = ox + st.u[k] * drawW;
              const py = oy + st.v[k] * drawH;
              const hx = (st.nx[k] * 0.707 - st.ny[k] * 0.707) * hatchLen;
              const hy = (st.nx[k] * 0.707 + st.ny[k] * 0.707) * hatchLen;
              ctx.moveTo(px - hx, py - hy);
              ctx.lineTo(px + hx, py + hy);
            }
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((baseAlpha * 0.35).toFixed(2)) + ")";
            ctx.lineWidth = 0.35 * art.strokeWeight;
            ctx.stroke();
          }

          if (!isMicroFeature && art.luminanceGlow > 0.1 && nPts >= 8 && prog >= 0.92 && !isPaperTheme && st.tier <= 2) {
            const cometSpan = Math.max(3, Math.floor(nPts * 0.26));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.85) + st.phase) % 1.45) - 0.22;
            const headIdx = Math.floor(cyclePos * nPts);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(nPts - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              traceDirectAdaptiveSpline(st, tailIdx, clampedHead, 0, ox, oy, drawW, drawH, waveSpeed, ambientScale, stringPluckPx);
              const [cR, cG, cB] = CAUCHY_SPECTRUM[(i + Math.floor(time * 2)) % 7];
              const cometAlpha = clip(baseAlpha * (0.45 + 0.55 * art.luminanceGlow), 0.18, 0.92);
              ctx.strokeStyle =
                art.edition === "DARK_SIDE" || art.edition === "CURRENTS_LP"
                  ? "rgba(" + String(cR) + "," + String(cG) + "," + String(cB) + "," + String(cometAlpha.toFixed(2)) + ")"
                  : "rgba(255, 250, 240, " + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = Math.max(0.36, adaptiveWidth * 1.4);
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: PAINT 14.0 (МАСЛЯНЫЙ ИМПРЕССИОНИЗМ КУВАХАРЫ + ЖИВЫЕ МАЗКИ МАСТИХИНА И БЛИКИ СВЕТА!)
      // ==========================================
      else if (s.topology === "PAINT" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;

        const lightU = s.fluidU;
        const lightV = s.fluidV;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const p = idx * 4;
            const l = clip(Math.pow(m.lum[idx], art.shadowGamma) + art.highlightBoost * 0.2);
            const e = m.edge[idx];
            const fd = m.fdog[idx];

            const bristleCoord = (x * m.etfY[idx] - y * m.etfX[idx]) * (0.95 / Math.max(0.35, m.scaleMap[idx]));
            const bristleHeight = Math.sin(bristleCoord) * (0.14 + e * 0.38 + t.chaos * 0.25);

            const lx = lightU - u;
            const ly = lightV - v;
            const lNorm = Math.hypot(lx, ly, 0.45);
            const nx = m.gx[idx] * e + m.etfY[idx] * bristleHeight;
            const ny = m.gy[idx] * e - m.etfX[idx] * bristleHeight;
            const dotLight = Math.max(0.0, (nx * lx + ny * ly + 0.45) / lNorm);
            const oilSpecular = Math.pow(dotLight, 14.0) * art.luminanceGlow * 175.0;

            const [edR, edG, edB] = resolveEditionColor(
              art,
              kuw[p],
              kuw[p + 1],
              kuw[p + 2],
              l,
              e,
              t.tone
            );

            const inkContour = clip(0.34 + 0.66 * Math.tanh(8.0 * (fd - 0.24)), 0.22, 1.0);
            const paintMix = art.foundationDepth;

            const rOut = (kuw[p] * paintMix + edR * (1.0 - paintMix)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpecular;
            const gOut = (kuw[p + 1] * paintMix + edG * (1.0 - paintMix)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpecular * 0.96;
            const bOut = (kuw[p + 2] * paintMix + edB * (1.0 - paintMix)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpecular * 0.88;

            dst[p] = Math.min(255, Math.max(0, Math.round(rOut * vMask)));
            dst[p + 1] = Math.min(255, Math.max(0, Math.round(gOut * vMask)));
            dst[p + 2] = Math.min(255, Math.max(0, Math.round(bOut * vMask)));
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);

        // Поверх живописной основы накладываем рельефные векторные мазки мастихина вдоль контуров!
        ctx.globalCompositeOperation = "screen";
        ctx.lineCap = "round";
        const strokes = m.strokes;
        const maxImpasto = Math.min(strokes.length, 1800);
        for (let i = 0; i < maxImpasto; i += 2) {
          const st = strokes[i];
          if (st.tier === 0) continue;
          const [rC, gC, bC] = resolveEditionColor(art, st.r, st.g, st.b, st.meanLum, st.meanEdge, t.tone, st.tier === 4);
          traceDirectAdaptiveSpline(st, 0, st.nPts - 1, 0, ox, oy, drawW, drawH, time * 1.2, 0.4, 0);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.32)";
          ctx.lineWidth = (1.6 + st.meanEdge * 1.8) * st.featureScale * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 3: CINEMA 14.0 (35MM CINESTILL 800T + FILM HALATION + ANAMORPHIC OPTICS)
      // ==========================================
      else if (s.topology === "CINEMA" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.kuwaharaRgba;

        const chromaShift = (1.5 + art.chromaAberration * 6.5 + t.chaos * 3.5);

        for (let y = 0; y < m.h; y++) {
          const ny = y / m.h - 0.5;
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const nx = x / m.w - 0.5;
            const radSq = nx * nx + ny * ny;
            const rShift = chromaShift * (0.35 + radSq * 2.2);
            const [rCh] = sampleBilinearRGB(src, m.w, m.h, clip(x + nx * rShift, 0, m.w - 1), y);
            const [, gCh] = sampleBilinearRGB(src, m.w, m.h, x, y);
            const [, , bCh] = sampleBilinearRGB(src, m.w, m.h, clip(x - nx * rShift, 0, m.w - 1), y);

            const l = clip(Math.pow(m.lum[idx], art.shadowGamma) + art.highlightBoost * 0.2);
            const e = m.edge[idx];
            const smL = m.smoothLum[idx];

            const halation = Math.max(0.0, smL - 0.34) * art.luminanceGlow * 195.0;
            const leftIdx = y * m.w + Math.max(0, x - 16);
            const rightIdx = y * m.w + Math.min(m.w - 1, x + 16);
            const anamorphicStreak = Math.max(0.0, (m.smoothLum[leftIdx] + m.smoothLum[rightIdx]) * 0.5 - 0.45) * art.luminanceGlow * 155.0;

            const [edR, edG, edB] = resolveEditionColor(
              art.edition === "SHINE_ON" ? { ...art, edition: "KODAK_800T" } : art,
              rCh,
              gCh,
              bCh,
              l,
              e,
              t.tone
            );

            const filmGrain = (Math.sin(x * 12.9898 + y * 78.233 + time * 45.0) * 43758.5453) % 1.0;
            const grainOffset = (filmGrain - 0.5) * (10.0 + art.canvasGrain * 25.0);
            const vig = 1.0 - art.vignetteStrength * 0.7 * radSq * 2.0;

            const rOut = (edR + halation * 1.2 + anamorphicStreak * 0.35) * vig + grainOffset;
            const gOut = (edG + halation * 0.38 + anamorphicStreak * 0.78) * vig + grainOffset;
            const bOut = (edB + halation * 0.08 + anamorphicStreak * 1.3) * vig + grainOffset;

            const p = idx * 4;
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
      // РЕЖИМ 5: CURRENTS 14.0 (ЛАГРАНЖЕВ ЖИДКИЙ ХРОМ + ПОВЕРХНОСТНЫЕ НИТИ РТУТИ!)
      // ==========================================
      else if (s.topology === "CURRENTS" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;

        const wu = s.fluidU;
        const wv = s.fluidV;
        const ribbonFreq = 9.0 + t.symmetry * 14.0;
        const fluidWarp = (0.025 + t.chaos * 0.075) * m.w;

        for (let y = 0; y < m.h; y++) {
          const v = y / m.h;
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const u = x / m.w;
            const l = clip(Math.pow(m.lum[idx], art.shadowGamma) + art.highlightBoost * 0.2);
            const e = m.edge[idx];
            const gxS = m.smoothGx[idx];
            const gyS = m.smoothGy[idx];

            const du = u - wu;
            const dv = v - wv;
            const rSq = du * du + dv * dv + 0.012;
            const swirl = Math.exp(-rSq * 9.5) * (1.2 + t.chaos * 2.2);

            const curlX = -dv * swirl + gyS * 14.0 + Math.sin((v * 3.0 + u * 2.0) * Math.PI - time * 1.4) * 0.45;
            const curlY = du * swirl - gxS * 14.0 + Math.cos((u * 3.0 - v * 2.0) * Math.PI + time * 1.2) * 0.45;

            const detailShield = clip((1.0 - m.scaleMap[idx]) * e * 1.85 * t.structure, 0.0, 0.92);
            const shiftScale = (1.0 - detailShield * 0.85) * fluidWarp;

            const sx = clip(x + curlX * shiftScale, 0, m.w - 1);
            const sy = clip(y + curlY * shiftScale, 0, m.h - 1);
            const [rAdv, gAdv, bAdv] = sampleBilinearRGB(kuw, m.w, m.h, sx, sy);
            const advLum = sampleBilinearScalar(m.smoothLum, m.w, m.h, sx, sy);

            const diagCoord = u * 0.65 + v * 0.76;
            const psi = (diagCoord + (curlX - curlY) * 0.06) * ribbonFreq + advLum * (2.2 + t.structure * 2.5) - time * (0.7 + t.energy * 1.1);
            const gradPsi = 1.0 + Math.hypot(gxS, gyS) * 16.0;
            const bandWave = Math.sin(psi * Math.PI * 2.0) / Math.min(2.4, gradPsi * 0.55);

            const surfNx = m.gx[idx] * e * 1.5 + Math.cos(psi * Math.PI * 2.0) * 0.65;
            const surfNy = m.gy[idx] * e * 1.5 + Math.sin(psi * Math.PI * 2.0) * 0.65;
            const lightDot = clip((surfNx * (-du) + surfNy * (-dv) + 0.55) / Math.hypot(du, dv, 0.55), 0.0, 1.0);
            const liquidMercurySpec = Math.pow(lightDot, 12.0) * art.luminanceGlow * 235.0;

            const [edR, edG, edB] = resolveEditionColor(
              art.edition === "SHINE_ON" ? { ...art, edition: "CURRENTS_LP" } : art,
              rAdv,
              gAdv,
              bAdv,
              l,
              e,
              t.tone + advLum * 0.55 + bandWave * 0.28
            );

            const smoothRibbon = 0.35 + 0.65 * smoothstep(-0.55, 0.55, bandWave);
            const effRibbon = smoothRibbon * (1.0 - detailShield * 0.75) + detailShield * 0.75;

            const keepPhoto = art.foundationDepth * 0.75;
            const rMix = (rAdv * keepPhoto + edR * (1.0 - keepPhoto * 0.65)) * effRibbon + liquidMercurySpec * 0.95;
            const gMix = (gAdv * keepPhoto + edG * (1.0 - keepPhoto * 0.65)) * effRibbon + liquidMercurySpec * 0.98;
            const bMix = (bAdv * keepPhoto + edB * (1.0 - keepPhoto * 0.65)) * effRibbon + liquidMercurySpec * 1.05;

            const p = idx * 4;
            dst[p] = Math.round(acesTonemap(rMix / 255.0) * 255 * vMask);
            dst[p + 1] = Math.round(acesTonemap(gMix / 255.0) * 255 * vMask);
            dst[p + 2] = Math.round(acesTonemap(bMix / 255.0) * 255 * vMask);
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 6: HALFTONE 14.0 (3-УГЛОВАЯ ШЕЛКОГРАФИЯ CMYK SPIDER-VERSE & WARHOL!)
      // ==========================================
      else if (s.topology === "HALFTONE" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;

        const dotFreq = (0.55 + t.symmetry * 0.65) / Math.max(0.5, art.strokeWeight);

        for (let y = 0; y < m.h; y++) {
          for (let x = 0; x < m.w; x++) {
            const idx = y * m.w + x;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) continue;

            const p = idx * 4;
            const l = clip(Math.pow(m.lum[idx], art.shadowGamma) + art.highlightBoost * 0.2);
            const e = m.edge[idx];
            const fd = m.fdog[idx];

            // 3 растровые решетки под классическими углами офсетной печати (15°, 75°, 45°)
            const cGrid = 0.5 + 0.25 * (Math.cos((x * 0.966 - y * 0.259) * dotFreq) + Math.cos((x * 0.259 + y * 0.966) * dotFreq));
            const mGrid = 0.5 + 0.25 * (Math.cos((x * 0.259 - y * 0.966) * dotFreq + time) + Math.cos((x * 0.966 + y * 0.259) * dotFreq));
            const yGrid = 0.5 + 0.25 * (Math.cos((x * 0.707 - y * 0.707) * dotFreq) + Math.cos((x * 0.707 + y * 0.707) * dotFreq - time));

            const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone);
            const inkLock = fd < 0.25 && e > 0.16 ? 0.08 : 1.0;

            const rDot = (l + e * 0.3 > cGrid * 0.85 ? 1.0 : 0.28) * (1.0 - art.foundationDepth * 0.45) + art.foundationDepth * 0.45;
            const gDot = (l + e * 0.3 > mGrid * 0.85 ? 1.0 : 0.28) * (1.0 - art.foundationDepth * 0.45) + art.foundationDepth * 0.45;
            const bDot = (l + e * 0.3 > yGrid * 0.85 ? 1.0 : 0.28) * (1.0 - art.foundationDepth * 0.45) + art.foundationDepth * 0.45;

            dst[p] = Math.min(255, Math.round(edR * rDot * inkLock * vMask));
            dst[p + 1] = Math.min(255, Math.round(edG * gDot * inkLock * vMask));
            dst[p + 2] = Math.min(255, Math.round(edB * bDot * inkLock * vMask));
            dst[p + 3] = 255;
          }
        }

        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
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
        const src = m.kuwaharaRgba;

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

            const darkFieldFactor = (0.28 + art.foundationDepth * 0.45) * (0.45 + e * 0.85) / (1.0 + l * 0.85);
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

            const facetRim = e * e * (0.45 + art.highlightBoost * 0.45);
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
      // РЕЖИМ 8: SILK
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = isPaperTheme ? "source-over" : "screen";
        const stepSize = 0.0026 + t.energy * 0.0032;
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

          if (e < 0.035 && l < 0.08) {
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
            const [rC, gC, bC] = resolveEditionColor(art, m.kuwaharaRgba[p], m.kuwaharaRgba[p + 1], m.kuwaharaRgba[p + 2], l, e, t.tone);
            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(3)) + ")";
            ctx.lineWidth = (0.35 + e * 0.65) * m.scaleMap[cell0] * art.strokeWeight;
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
      // РЕЖИМ 9: LIDAR
      // ==========================================
      else if (s.topology === "LIDAR") {
        ctx.globalCompositeOperation = isPaperTheme ? "source-over" : "screen";

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
            const [rC, gC, bC] = resolveEditionColor(art, m.kuwaharaRgba[p], m.kuwaharaRgba[p + 1], m.kuwaharaRgba[p + 2], l, e, t.tone);
            const alpha = clip((0.28 + l * 0.6 + e * 0.48 + scanGlow) * vMask, 0.08, 0.94);

            ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String((alpha * 0.6).toFixed(2)) + ")";
            ctx.fillStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";

            ctx.lineWidth = 0.8 * m.scaleMap[idx] * art.strokeWeight;
            ctx.beginPath();
            ctx.moveTo(sxBack, syBack);
            ctx.lineTo(sx, sy);
            if (hasPrev && e > 0.14 && Math.abs(sx - prevSx) < 16 && Math.abs(sy - prevSy) < 16) {
              ctx.moveTo(prevSx, prevSy);
              ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            const ptSize = (1.0 + l * 1.1 + e * 1.0) * (fov * 0.85) * m.scaleMap[idx] * art.strokeWeight;
            ctx.fillRect(sx - ptSize * 0.5, sy - ptSize * 0.5, ptSize, ptSize);

            prevSx = sx;
            prevSy = sy;
            hasPrev = true;
          }
        }
      }

      // ==========================================
      // РЕЖИМ 10: PIPER
      // ==========================================
      else if (s.topology === "PIPER" && shaderCtx) {
        if (shaderCanvas.width !== m.w || shaderCanvas.height !== m.h) {
          shaderCanvas.width = m.w;
          shaderCanvas.height = m.h;
        }
        const outImg = shaderCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;

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

            const du = u - wu;
            const dv = v - wv;
            const heat = Math.exp(-(du * du + dv * dv) * 9.0);
            const brushSlide = Math.sin(u * 8.0 + v * 8.0 - time * 2.2 + heat * 3.0) * (2.5 + t.chaos * 6.5) * m.scaleMap[baseIdx];

            const sx = clip(x + m.etfX[baseIdx] * brushSlide, 0, m.w - 1);
            const sy = clip(y + m.etfY[baseIdx] * brushSlide, 0, m.h - 1);
            const [rK, gK, bK] = sampleBilinearRGB(kuw, m.w, m.h, sx, sy);

            const [oilR, oilG, oilB] = resolveEditionColor(
              art,
              rK,
              gK,
              bK,
              l,
              e,
              t.tone + (rK - bK) / 512.0 + Math.sin(time * 0.5) * 0.1
            );

            const inkShadow = clip(0.22 + 0.78 * Math.tanh(9.0 * (fd - 0.26)), 0.12, 1.0);
            const impastoRidge = 1.0 + e * 0.45 * art.luminanceGlow;

            const p = baseIdx * 4;
            const rOut = (rK * art.foundationDepth + oilR * (1.0 - art.foundationDepth * 0.6)) * inkShadow * impastoRidge;
            const gOut = (gK * art.foundationDepth + oilG * (1.0 - art.foundationDepth * 0.6)) * inkShadow * impastoRidge;
            const bOut = (bK * art.foundationDepth + oilB * (1.0 - art.foundationDepth * 0.6)) * inkShadow * impastoRidge;

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
      // РЕЖИМ 11: ENGRAVE 14.0 (БАНКНОТНАЯ ПЕРЕКРЕСТНАЯ ИНТАЛЬО-ГРАВЮРА + ПУЛЬСАР)
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        if (art.foundationDepth > 0.02) {
          ctx.globalAlpha = art.foundationDepth * 0.55;
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        const numLines = Math.floor(105 + art.detailPrecision * 75);
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
          ctx.fillStyle = isPaperTheme ? "rgba(216, 204, 184, 0.84)" : "rgba(3, 2, 6, 0.78)";
          ctx.fill();

          const midCell = (sy * m.w + Math.floor(m.w * 0.5)) * 4;
          const [rC, gC, bC] = resolveEditionColor(
            art,
            m.kuwaharaRgba[midCell],
            m.kuwaharaRgba[midCell + 1],
            m.kuwaharaRgba[midCell + 2],
            rowLum / numCols,
            rowEdge / numCols,
            t.tone
          );
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.9)";
          ctx.lineWidth = 1.0 * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 12: CRYSTAL
      // ==========================================
      else if (s.topology === "CRYSTAL") {
        if (art.foundationDepth > 0.02) {
          ctx.globalAlpha = art.foundationDepth * 0.65;
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

          const [rC, gC, bC] = resolveEditionColor(art, cl.r, cl.g, cl.b, cl.lum, cl.edge, t.tone);
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
      // ГАЛЕРЕЙНЫЙ ПАСПОРТ И АКАДЕМИЧЕСКАЯ МАРКИРОВКА
      // ==========================================
      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isPaperTheme ? "rgba(45, 30, 18, 0.4)" : "rgba(255, 255, 255, 0.18)";
        const textFill = isPaperTheme ? "rgba(45, 30, 18, 0.78)" : "rgba(255, 255, 255, 0.58)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1.1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT 14.0 // " + (query || "SHINE ON").toUpperCase().slice(0, 20) + " [" + s.topology + " · " + art.edition + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          "KUWAHARA + HESSIAN | H(X)=" + String(c.entropy) + "b | λ=" + String(c.eigenAnisotropy),
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
        className="lg:col-span-8 relative h-[600px] md:h-[780px] rounded-2xl overflow-hidden border border-white/10 bg-[#030206] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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
            <div className="text-white font-bold">BARRETT 14.0 // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
          </div>

          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>H(X): <span className="text-white">{coeffs.entropy}b</span> | ANISOTROPY: <span className="text-[#10b981]">{coeffs.eigenAnisotropy}</span></div>
          </div>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ (12 ТОПОЛОГИЙ) */}
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
            <div className="barrett-scroll flex items-center gap-1 overflow-x-auto bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-white/10 max-w-full">
              {(
                [
                  "TRACE",
                  "PAINT",
                  "CINEMA",
                  "SKETCH",
                  "CURRENTS",
                  "HALFTONE",
                  "PRISM",
                  "SILK",
                  "LIDAR",
                  "PIPER",
                  "ENGRAVE",
                  "CRYSTAL",
                ] as ManifoldTopology[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopology(mode);
                    if (mode === "TRACE" || mode === "SKETCH") stateRef.current.traceProgress = 0;
                    if (mode === "SILK") stateRef.current.needsSilkReset = true;
                  }}
                  className={
                    "px-2.5 py-1 rounded-full font-mono text-[9px] tracking-widest uppercase transition-all shrink-0 cursor-pointer " +
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
              {(topology === "TRACE" || topology === "SKETCH") && (
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

      {/* ПРАВАЯ ПАНЕЛЬ: 3 ПРОФЕССИОНАЛЬНЫХ КОНСОЛИ (ART STUDIO / COLOR LAB / 5D MATH) */}
      <div className="lg:col-span-4 glass-panel p-6 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("STUDIO")}
                className={
                  "px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "STUDIO"
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                Art Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("COLOR_LAB")}
                className={
                  "px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "COLOR_LAB"
                    ? "bg-[#a855f7] text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                Color Lab
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MATH_HUD")}
                className={
                  "px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "MATH_HUD"
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                5D Math
              </button>
            </div>
            <span className="font-mono text-[8px] text-[#10b981] uppercase tracking-widest">PRO 14.0</span>
          </div>

          {activeTab === "STUDIO" && (
            <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
              {/* 10 МАСТЕР-ЭПОХ */}
              <div>
                <div className="flex justify-between items-center text-neutral-400 mb-1.5">
                  <span>Master Look (10 Editions):</span>
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
                      { id: "SHINE_ON", label: "Shine On (Velour)", dot: "linear-gradient(135deg,#38bdf8,#f59e0b)" },
                      { id: "KODAK_800T", label: "CineStill 800T (35mm)", dot: "linear-gradient(135deg,#0284c7,#f97316)" },
                      { id: "REMBRANDT", label: "Rembrandt (Chiaroscuro)", dot: "linear-gradient(135deg,#451a03,#fde68a)" },
                      { id: "ARCANE_OIL", label: "Arcane Impasto (Oil)", dot: "linear-gradient(135deg,#14b8a6,#f43f5e)" },
                      { id: "VOGUE_NOIR", label: "Vogue Noir (Silver/Red)", dot: "linear-gradient(135deg,#f8fafc,#ef4444)" },
                      { id: "WARHOL_POP", label: "Warhol (Silkscreen)", dot: "linear-gradient(135deg,#ff1476,#00ebf5)" },
                      { id: "CURRENTS_LP", label: "Currents (Liquid Chrome)", dot: "linear-gradient(135deg,#c026d3,#38bdf8)" },
                      { id: "DARK_SIDE", label: "Dark Side (Prism Noir)", dot: "linear-gradient(135deg,#ef4444,#3b82f6)" },
                      { id: "POMPEII", label: "Pompeii (24K Gold)", dot: "linear-gradient(135deg,#f59e0b,#78350f)" },
                      { id: "DA_VINCI", label: "Da Vinci (3 Crayons)", dot: "linear-gradient(135deg,#d8ccb8,#94442a)" },
                    ] as { id: TributeEdition; label: string; dot: string }[]
                  ).map((ed) => (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => applyTributeEdition(ed.id)}
                      className={
                        "py-1.5 px-2 rounded-lg border text-[8px] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer " +
                        (artConfig.edition === ed.id && !artConfig.customGrading
                          ? "bg-white text-black border-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20" style={{ background: ed.dot }} />
                      <span className="truncate">{ed.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 АРХИТЕКТУР ПЕРА */}
              <div>
                <div className="text-neutral-400 mb-1.5">Brush Architecture:</div>
                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      { id: "HYPER_ADAPTIVE", label: "Adaptive" },
                      { id: "TROIS_CRAYONS", label: "3-Crayon" },
                      { id: "CROSS_HATCH", label: "Hatch" },
                      { id: "GUILLOCHE", label: "Guilloché" },
                      { id: "LASER_STRINGS", label: "Harp" },
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
                        "py-1.5 px-1 rounded-lg border text-[7.5px] tracking-wider transition-all cursor-pointer " +
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

              {/* 6 ПРОФЕССИОНАЛЬНЫХ ПОЛЗУНКОВ ДОВОДКИ */}
              <div className="flex flex-col gap-2 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Kuwahara-FDoG Foundation</span>
                    <span className="text-[#a855f7]">{Math.round(artConfig.foundationDepth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.98"
                    step="0.02"
                    value={artConfig.foundationDepth}
                    onChange={(e) => updateArt("foundationDepth", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Highlight & Rim Chalk Boost (Faces)</span>
                    <span className="text-[#fde047]">{Math.round(artConfig.highlightBoost * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.highlightBoost}
                    onChange={(e) => updateArt("highlightBoost", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Shadow Contrast Gamma</span>
                    <span className="text-white">{artConfig.shadowGamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.55"
                    max="1.45"
                    step="0.02"
                    value={artConfig.shadowGamma}
                    onChange={(e) => updateArt("shadowGamma", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Pixel-Level Acuity (Hessian)</span>
                    <span className="text-[#10b981]">{Math.round(artConfig.detailPrecision * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.99"
                    step="0.01"
                    value={artConfig.detailPrecision}
                    onChange={(e) => updateArt("detailPrecision", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Adaptive Brush Calibre</span>
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

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Photonic Comets, Halation & Chrome</span>
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
          )}

          {activeTab === "COLOR_LAB" && (
            <div className="flex flex-col gap-3.5 font-mono text-[9px] uppercase tracking-widest">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">3-Way Color Grading:</span>
                  <button
                    type="button"
                    onClick={() => updateArt("customGrading", !artConfig.customGrading)}
                    className={
                      "px-2.5 py-1 rounded text-[8px] cursor-pointer transition-all " +
                      (artConfig.customGrading
                        ? "bg-[#10b981] text-black font-bold"
                        : "bg-white/10 text-neutral-300")
                    }
                  >
                    {artConfig.customGrading ? "Active" : "Enable Custom"}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.shadowHex}
                      onChange={(e) => {
                        updateArt("shadowHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Shadows</span>
                  </label>

                  <label className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.midtoneHex}
                      onChange={(e) => {
                        updateArt("midtoneHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Midtones</span>
                  </label>

                  <label className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.highlightHex}
                      onChange={(e) => {
                        updateArt("highlightHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Highlights</span>
                  </label>
                </div>
              </div>

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

              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Optical Lens Vignette</span>
                    <span className="text-white">{Math.round(artConfig.vignetteStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.vignetteStrength}
                    onChange={(e) => updateArt("vignetteStrength", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Canvas Weave & 35mm Silver Grain</span>
                    <span className="text-white">{Math.round(artConfig.canvasGrain * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.canvasGrain}
                    onChange={(e) => updateArt("canvasGrain", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Anamorphic Chromatic Split</span>
                    <span className="text-white">{Math.round(artConfig.chromaAberration * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={artConfig.chromaAberration}
                    onChange={(e) => updateArt("chromaAberration", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "MATH_HUD" && (
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

              <div className="mt-1 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[8px] text-neutral-300 leading-relaxed space-y-1.5">
                <div className="text-[#10b981] font-bold uppercase">800P Non-AI Differential Apparatus:</div>
                <div>1. Kuwahara Min-Variance: q* = argmin_k Var(I_k)</div>
                <div>2. Hessian Specular Ridges: λ_min(H) &lt; -τ_chalk</div>
                <div>3. Coherence Index: ((λ₁ - λ₂)/(λ₁ + λ₂))² = {coeffs.eigenAnisotropy}</div>
                <div>4. Trois Crayons Dual-Pass: Multiply(Ink) + Screen(Chalk)</div>
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
