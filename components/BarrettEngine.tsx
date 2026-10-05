"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

type DimensionSpace = "2D_STUDIO" | "3D_SPACE";
type CanvasBackdrop = "OBSIDIAN" | "VOID_BLACK" | "MIDNIGHT" | "VELVET_NOIR" | "ARCHIVAL_PAPER";
type AnimationStageMode = "ANIMATE_ART" | "DRAW_THEN_ANIMATE" | "ISOLATE_SUBJECT";

interface KineticPromptCoordinates {
  promptText: string;
  modeName: string;
  layerMoveX: number;
  layerMoveY: number;
  layerTiltAmp: number;
  layerScaleAmp: number;
  moveFreq: number;
  orbitYawAmp: number;
  orbitPitchAmp: number;
  orbitSpeed: number;
  windVecX: number;
  windVecY: number;
  internalWaveAmp: number;
  shockwaveAmp: number;
  timelapseLoop: boolean;
}

interface Tensor5D {
  energy: number;
  chaos: number;
  tone: number;
  structure: number;
  symmetry: number;
}

type TributeEdition =
  | "SHINE_ON"
  | "PIXAR_SSS"
  | "KODAK_800T"
  | "REMBRANDT"
  | "VOGUE_NOIR"
  | "WARHOL_POP"
  | "DARK_SIDE"
  | "DA_VINCI"
  | "CUSTOM_GRADE";

interface ArtStudioConfig {
  dimension: DimensionSpace;
  backdrop: CanvasBackdrop;
  stageMode: AnimationStageMode;
  lockFrontAnfas: boolean;
  fastPerfMode: boolean;
  edition: TributeEdition;
  posterFrame: boolean;
  strokeWeight: number;
  coherenceCleanliness: number;
  relief3DAndMotion: number;
  glowAndPrism: number;
  shadowHex: string;
  midtoneHex: string;
  highlightHex: string;
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

interface ContourStroke {
  u: Float32Array;
  v: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  z: Float32Array;
  nPts: number;
  tier: 0 | 1 | 2 | 3 | 4; // 0: Микро-текст и глаза, 1: Главный контур, 2: Вторичный контур, 3: Штриховка объема, 4: Блик
  r: number;
  g: number;
  b: number;
  cachedR: number;
  cachedG: number;
  cachedB: number;
  meanEdge: number;
  meanLum: number;
  meanCoherence: number;
  subjectWeight: number;
  featureScale: number;
  importance: number;
  phase: number;
  speed: number;
  arcLen: number;
  centerU: number;
  centerV: number;
  centerZ: number;
}

interface SilkStrand {
  u: Float32Array;
  v: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  z: number;
  r: number;
  g: number;
  b: number;
  cachedR: number;
  cachedG: number;
  cachedB: number;
  lum: number;
  edge: number;
  subjectWeight: number;
  phase: number;
  weight: number;
}

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  kuwaharaRgba: Uint8ClampedArray;
  lum: Float32Array;
  smoothLum: Float32Array;
  depthMap: Float32Array;
  coherence: Float32Array;
  subjectAlpha: Float32Array;
  fdog: Float32Array;
  edge: Float32Array;
  scaleMap: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  etfX: Float32Array;
  etfY: Float32Array;
  mask: Float32Array;
  strokes: ContourStroke[];
  silkLoom: SilkStrand[];
  pluckAmps: Float32Array;
  meanAnisotropy: number;
  charCenterU: number;
  charCenterV: number;
}

type ManifoldTopology =
  | "TRACE"
  | "SKETCH"
  | "SCULPT3D"
  | "PRISM"
  | "SILK"
  | "PAINT"
  | "ENGRAVE"
  | "CINEMA"
  | "HALFTONE"
  | "LIDAR";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 42, 75],   // Ruby Red
  [255, 138, 25],  // Amber Orange
  [255, 232, 45],  // Solar Gold
  [35, 242, 130],  // Emerald Green
  [30, 215, 255],  // Cyan Ice
  [75, 110, 255],  // Cobalt Blue
  [195, 60, 255],  // Deep Violet
];

const BACKDROP_COLORS: Record<CanvasBackdrop, string> = {
  OBSIDIAN: "#040308",
  VOID_BLACK: "#000000",
  MIDNIGHT: "#060e1e",
  VELVET_NOIR: "#14050b",
  ARCHIVAL_PAPER: "#e8dcc4",
};

const PROMPT_PRESETS: { label: string; prompt: string; is3D?: boolean; stage?: AnimationStageMode }[] = [
  {
    label: "Draw -> Animate",
    prompt: "Отрисовать чистый скетч на кастомном фоне с нуля и плавно оживить в движении",
    is3D: false,
    stage: "DRAW_THEN_ANIMATE",
  },
  {
    label: "Floating Breathing",
    prompt: "Плавное парение в невесомости, мягкое дыхание контуров и волна света",
    is3D: false,
    stage: "ANIMATE_ART",
  },
  {
    label: "Rhythmic Groove",
    prompt: "Ритмичное упругое покачивание влево-вправо в такт и живая пластика линий",
    is3D: false,
    stage: "ISOLATE_SUBJECT",
  },
  {
    label: "3D Front Bas-Relief",
    prompt: "Объемный 3D барельеф анфас со скользящим студийным светом и мягким дыханием",
    is3D: true,
    stage: "ANIMATE_ART",
  },
  {
    label: "Laminar Silk Wind",
    prompt: "Ламинарный поток ветра вдоль волокон, колыхание штрихов и фазовый сдвиг",
    is3D: false,
    stage: "ANIMATE_ART",
  },
  {
    label: "Radial Pulse Wave",
    prompt: "Мощный радиальный импульс из центра фигуры, вибрация струн и отдача",
    is3D: false,
    stage: "ANIMATE_ART",
  },
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

function compileAnimationPrompt(rawPrompt: string): KineticPromptCoordinates {
  const text = (rawPrompt || "Плавное парение и мягкое дыхание контуров").trim().toLowerCase();

  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normHash = (Math.abs(hash) % 1000) / 1000;

  let layerMoveX = 0.012;
  let layerMoveY = 0.016;
  let layerTiltAmp = 0.022;
  let layerScaleAmp = 0.018;
  let moveFreq = 1.5;
  let orbitYawAmp = 0.0;
  let orbitPitchAmp = 0.0;
  let orbitSpeed = 0.55;
  let windVecX = 0.14;
  let windVecY = -0.04;
  let internalWaveAmp = 0.22;
  let shockwaveAmp = 0.0;
  let timelapseLoop = false;
  const tags: string[] = [];

  const speedMult = /(быстр|стремител|ритм|актив|fast|rapid|quick|high|upbeat)/.test(text)
    ? 1.6
    : /(медлен|плавн|спокойн|нежн|slow|smooth|calm|gentle|soft)/.test(text)
    ? 0.65
    : 1.0;

  const powerMult = /(сильн|мощн|максим|амплитуд|глубок|strong|heavy|max|deep|wide)/.test(text)
    ? 1.45
    : /(едва|легк|тонк|subtle|slight|delicate)/.test(text)
    ? 0.55
    : 1.0;

  moveFreq *= speedMult;

  if (/(влево|вправо|шаг|ходьб|скольж|горизонт|танц|ритм|покачив|left|right|walk|slide|sway|dance|groove)/.test(text)) {
    layerMoveX = 0.045 * powerMult;
    layerTiltAmp = 0.06 * powerMult;
    internalWaveAmp = 0.45 * powerMult;
    tags.push("SWAY-X");
  }

  if (/(вверх|вниз|парен|парит|прыж|прыг|левит|невесом|up|down|float|hover|jump|bounce|levitat)/.test(text)) {
    layerMoveY = 0.048 * powerMult;
    layerScaleAmp = 0.035 * powerMult;
    tags.push("FLOAT-Y");
  }

  if (/(наклон|качан|качает|круж|поворот|tilt|rock|nod|spin|swing)/.test(text)) {
    layerTiltAmp = 0.085 * powerMult;
    tags.push("TILT");
  }

  if (/(дыхан|дышит|пульс|зум|масштаб|сердц|breathe|breath|pulse|scale|zoom|heart)/.test(text)) {
    layerScaleAmp = 0.045 * powerMult;
    tags.push("BREATHE");
  }

  if (/(3d|3д|скульпт|объем|рельеф|орбит|параллакс|sculpt|relief|orbit|parallax)/.test(text)) {
    orbitYawAmp = /анфас|front/.test(text) ? 0.07 : 0.22 * powerMult;
    orbitPitchAmp = /анфас|front/.test(text) ? 0.05 : 0.14 * powerMult;
    orbitSpeed = 0.58 * speedMult;
    tags.push("3D-RELIEF");
  }

  if (/(ветер|ветр|волн|поток|шелк|волос|вихр|wind|wave|flow|silk|breeze|vortex)/.test(text)) {
    windVecX = 0.48 * powerMult;
    windVecY = -0.14 * powerMult;
    internalWaveAmp = Math.max(internalWaveAmp, 0.55 * powerMult);
    tags.push("SILK-WIND");
  }

  if (/(импульс|удар|взрыв|отдач|вибрац|impulse|shock|blast|vibrat|impact)/.test(text)) {
    shockwaveAmp = 0.65 * powerMult;
    tags.push("RADIAL-PULSE");
  }

  if (/(отрисов|рисов|перо|с нуля|штрих|ожив|draw|sketch|trace|timelapse|alive)/.test(text)) {
    timelapseLoop = true;
    tags.push("DRAW-&-ANIMATE");
  }

  if (/(статик|неподвиж|стоп|замри|static|still|freeze)/.test(text)) {
    layerMoveX = 0;
    layerMoveY = 0;
    layerTiltAmp = 0;
    layerScaleAmp = 0;
    orbitYawAmp = 0;
    orbitPitchAmp = 0;
    windVecX = 0;
    windVecY = 0;
    internalWaveAmp = 0;
    shockwaveAmp = 0;
    tags.push("STATIC-LOCK");
  }

  if (tags.length === 0) {
    layerMoveX = Number((0.014 + normHash * 0.022).toFixed(3));
    layerMoveY = Number((0.016 + ((normHash * 7) % 1) * 0.024).toFixed(3));
    layerTiltAmp = Number((0.018 + ((normHash * 13) % 1) * 0.03).toFixed(3));
    internalWaveAmp = Number((0.2 + ((normHash * 19) % 1) * 0.28).toFixed(3));
    tags.push("HARMONIC-MOTION");
  }

  return {
    promptText: rawPrompt,
    modeName: tags.join(" · "),
    layerMoveX: Number(clip(layerMoveX, 0, 0.1).toFixed(3)),
    layerMoveY: Number(clip(layerMoveY, 0, 0.1).toFixed(3)),
    layerTiltAmp: Number(clip(layerTiltAmp, 0, 0.2).toFixed(3)),
    layerScaleAmp: Number(clip(layerScaleAmp, 0, 0.1).toFixed(3)),
    moveFreq: Number(clip(moveFreq, 0.2, 4.5).toFixed(2)),
    orbitYawAmp: Number(clip(orbitYawAmp, 0, 0.28).toFixed(3)),
    orbitPitchAmp: Number(clip(orbitPitchAmp, 0, 0.2).toFixed(3)),
    orbitSpeed: Number(clip(orbitSpeed, 0.1, 2.0).toFixed(3)),
    windVecX: Number(clip(windVecX, -1.0, 1.0).toFixed(3)),
    windVecY: Number(clip(windVecY, -1.0, 1.0).toFixed(3)),
    internalWaveAmp: Number(clip(internalWaveAmp, 0, 1.0).toFixed(3)),
    shockwaveAmp: Number(clip(shockwaveAmp, 0, 1.0).toFixed(3)),
    timelapseLoop,
  };
}

function encodeAnimatedGIF89a(frames: ImageData[], width: number, height: number, delayCs: number): Blob {
  const bytes: number[] = [];
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  };
  const writeU16 = (v: number) => {
    bytes.push(v & 0xff, (v >> 8) & 0xff);
  };

  writeStr("GIF89a");
  writeU16(width);
  writeU16(height);
  bytes.push(0xf7, 0x00, 0x00);

  for (let i = 0; i < 256; i++) {
    if (i < 252) {
      const rIdx = Math.floor(i / 42);
      const gIdx = Math.floor((i % 42) / 6);
      const bIdx = i % 6;
      bytes.push(Math.round((rIdx * 255) / 5), Math.round((gIdx * 255) / 6), Math.round((bIdx * 255) / 5));
    } else {
      const v = Math.round(((i - 252) * 255) / 3);
      bytes.push(v, v, v);
    }
  }

  bytes.push(0x21, 0xff, 0x0b);
  writeStr("NETSCAPE2.0");
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  const lzwEncodeFrame = (indexedPixels: Uint8Array) => {
    const minCodeSize = 8;
    bytes.push(minCodeSize);

    const clearCode = 256;
    const eoiCode = 257;
    let codeSize = 9;
    let nextCode = 258;

    let bitBuf = 0;
    let bitCount = 0;
    const subBlock: number[] = [];

    const flushSubBlock = () => {
      if (subBlock.length > 0) {
        bytes.push(subBlock.length);
        for (let i = 0; i < subBlock.length; i++) bytes.push(subBlock[i]);
        subBlock.length = 0;
      }
    };

    const emitCode = (code: number) => {
      bitBuf |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        subBlock.push(bitBuf & 0xff);
        if (subBlock.length === 255) flushSubBlock();
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    const dictKey = new Int32Array(9001);
    const dictVal = new Int16Array(9001);
    dictKey.fill(-1);

    const resetDict = () => {
      dictKey.fill(-1);
      codeSize = 9;
      nextCode = 258;
    };

    emitCode(clearCode);
    let prefix = indexedPixels[0];

    for (let i = 1; i < indexedPixels.length; i++) {
      const k = indexedPixels[i];
      const combined = (prefix << 8) | k;
      let h = ((combined * 2654435761) >>> 0) % 9001;

      let found = -1;
      while (dictKey[h] !== -1) {
        if (dictKey[h] === combined) {
          found = dictVal[h];
          break;
        }
        h = (h + 1) % 9001;
      }

      if (found !== -1) {
        prefix = found;
      } else {
        emitCode(prefix);
        if (nextCode < 4096) {
          dictKey[h] = combined;
          dictVal[h] = nextCode++;
          if (nextCode - 1 === 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
        } else {
          emitCode(clearCode);
          resetDict();
        }
        prefix = k;
      }
    }

    emitCode(prefix);
    emitCode(eoiCode);
    if (bitCount > 0) {
      subBlock.push(bitBuf & 0xff);
    }
    flushSubBlock();
    bytes.push(0x00);
  };

  const indexed = new Uint8Array(width * height);
  for (let f = 0; f < frames.length; f++) {
    bytes.push(0x21, 0xf9, 0x04, 0x00);
    writeU16(delayCs);
    bytes.push(0x00, 0x00);

    bytes.push(0x2c);
    writeU16(0);
    writeU16(0);
    writeU16(width);
    writeU16(height);
    bytes.push(0x00);

    const data = frames[f].data;
    for (let y = 0; y < height; y++) {
      const bayerRow = y & 1;
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const p = i * 4;
        const dither = (x & 1) ^ bayerRow ? 4 : -4;
        const r = Math.max(0, Math.min(255, data[p] + dither));
        const g = Math.max(0, Math.min(255, data[p + 1] + dither));
        const b = Math.max(0, Math.min(255, data[p + 2] + dither));
        const rIdx = Math.round((r * 5) / 255);
        const gIdx = Math.round((g * 6) / 255);
        const bIdx = Math.round((b * 5) / 255);
        indexed[i] = rIdx * 42 + gIdx * 6 + bIdx;
      }
    }

    lzwEncodeFrame(indexed);
  }

  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

// ==========================================
// ИСПРАВЛЕННЫЙ ЦВЕТОВОЙ СОЛВЕР (УБИРАЕТ ГОЛУБЫЕ ПЯТНА В ТЕНЯХ PAINT И TRACE!)
// ==========================================
function resolveEditionColor(
  art: ArtStudioConfig,
  nativeR: number,
  nativeG: number,
  nativeB: number,
  lum: number,
  edge: number,
  phaseShift: number,
  isHighlightStroke = false,
  forVectorStroke = false
): [number, number, number] {
  // Для векторных линий на темном фоне минимальная яркость выше, а для заливок PAINT она строго пропорциональна lum!
  const minVis = forVectorStroke ? 0.32 : 0.02;
  const energy = clip(Math.max(minVis, lum * 0.65 + edge * 0.55), 0.0, 1.0);
  const contrastBoost = 0.88 + art.glowAndPrism * 0.38;

  const finalize = (r: number, g: number, b: number): [number, number, number] => {
    const cr = (r - 128) * contrastBoost + 128;
    const cg = (g - 128) * contrastBoost + 128;
    const cb = (b - 128) * contrastBoost + 128;
    return [
      Math.min(255, Math.max(0, Math.round(cr))),
      Math.min(255, Math.max(0, Math.round(cg))),
      Math.min(255, Math.max(0, Math.round(cb))),
    ];
  };

  if (art.edition === "CUSTOM_GRADE") {
    const [r1, g1, b1] = hexToRgb(art.shadowHex);
    const [r2, g2, b2] = hexToRgb(art.midtoneHex);
    const [r3, g3, b3] = hexToRgb(art.highlightHex);
    if (energy < 0.5) {
      const t = energy * 2.0;
      return finalize(r1 * (1 - t) + r2 * t, g1 * (1 - t) + g2 * t, b1 * (1 - t) + b2 * t);
    }
    const t = (energy - 0.5) * 2.0;
    return finalize(r2 * (1 - t) + r3 * t, g2 * (1 - t) + g3 * t, b2 * (1 - t) + b3 * t);
  }

  const edition = art.edition;

  if (edition === "DA_VINCI") {
    if (isHighlightStroke) return [255, 250, 238];
    if (lum > 0.35 && lum < 0.72 && edge < 0.38) {
      return [182, 76, 48];
    }
    if (art.backdrop === "ARCHIVAL_PAPER") {
      const inkShade = clip(0.08 + lum * 0.35 * (1.0 - edge * 0.8), 0.05, 0.38);
      return [Math.round(58 * inkShade), Math.round(38 * inkShade), Math.round(26 * inkShade)];
    }
    return finalize((175 + energy * 80) * energy, (135 + energy * 85) * energy, (95 + energy * 85) * energy);
  }

  if (edition === "PIXAR_SSS") {
    if (isHighlightStroke) return [255, 248, 232];
    const sssBand = Math.sin(lum * Math.PI);
    const r = nativeR * 0.55 + (35 + energy * 215 + sssBand * 55) * 0.45;
    const g = nativeG * 0.55 + (28 + energy * 205 + edge * 45) * 0.45;
    const b = nativeB * 0.55 + (55 + energy * 195) * 0.45;
    return finalize(r, g, b);
  }

  if (edition === "REMBRANDT") {
    if (isHighlightStroke) return [255, 242, 204];
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const r = avg * 0.4 + (35 + Math.pow(energy, 0.85) * 220) * 0.6;
    const g = avg * 0.4 + (22 + Math.pow(energy, 0.95) * 190) * 0.6;
    const b = avg * 0.4 + (12 + Math.pow(energy, 1.25) * 145) * 0.6;
    return finalize(r, g, b);
  }

  if (edition === "WARHOL_POP") {
    if (lum < 0.25) return [24, 14, 42];
    if (lum < 0.52) return [255, 22, 120];
    if (lum < 0.76) return [0, 238, 248];
    return [255, 240, 28];
  }

  if (edition === "KODAK_800T") {
    if (isHighlightStroke) return [255, 232, 194];
    const shadowWeight = (1.0 - smoothstep(0.15, 0.65, lum)) * energy;
    const hiWeight = smoothstep(0.38, 0.9, lum);
    const r = nativeR * 0.52 + (18 + shadowWeight * 15 + hiWeight * 235 + edge * 50) * 0.48;
    const g = nativeG * 0.52 + (45 + shadowWeight * 55 + hiWeight * 175 + edge * 35) * 0.48;
    const b = nativeB * 0.52 + (75 + shadowWeight * 95 + hiWeight * 95 + edge * 25) * 0.48;
    return finalize(r, g, b);
  }

  if (edition === "VOGUE_NOIR") {
    if (edge > 0.34 && lum > 0.24 && lum < 0.76) return [248, 26, 44];
    const v = clip(Math.round(energy * 250), 18, 255);
    return finalize(v, v, v + 5);
  }

  if (edition === "DARK_SIDE") {
    if (edge > 0.2) {
      const bandIdx = Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7);
      const [cr, cg, cb] = CAUCHY_SPECTRUM[Math.max(0, Math.min(6, bandIdx))];
      const mix = smoothstep(0.2, 0.55, edge) * 0.85;
      const baseV = energy * 245;
      return finalize(baseV * (1 - mix) + cr * mix, baseV * (1 - mix) + cg * mix, baseV * (1 - mix) + cb * mix);
    }
    const v = Math.round(energy * 240);
    return finalize(v, v, v + 10);
  }

  // SHINE_ON: сохраняет родной цвет и умножает монохромные участки на energy (никаких голубых пятен в черных тенях!)
  const avg = (nativeR + nativeG + nativeB) * 0.333;
  const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
  const boost = forVectorStroke ? 48 : 18;
  if (sat > 14) {
    return finalize(
      avg + (nativeR - avg) * 1.55 + edge * boost,
      avg + (nativeG - avg) * 1.55 + edge * boost,
      avg + (nativeB - avg) * 1.55 + edge * (boost + 10)
    );
  }
  const baseV = (40 + energy * 215) * (forVectorStroke ? 1.0 : clip(lum * 1.35 + edge * 0.6, 0.04, 1.0));
  return finalize(baseV * 0.96, baseV * 0.98, baseV * 1.05);
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
      eigenAnisotropy: 0.942,
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
// МАТЕМАТИЧЕСКОЕ ЯДРО 22.0:
// ЧИСТЫЙ ВЕКТОРНЫЙ СКЕТЧ БЕЗ ФОТО-ПОДЛОЖКИ + НЕОБРЕЗАННЫЙ 3D Z-BUFFER 800x800
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, useFastMode: boolean): MatrixBuffer {
  const baseRes = useFastMode ? 520 : 760;
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
  const depthMap = new Float32Array(total);
  const coherence = new Float32Array(total);
  const subjectAlpha = new Float32Array(total);
  const fdog = new Float32Array(total);
  const edge = new Float32Array(total);
  const scaleMap = new Float32Array(total);
  const gx = new Float32Array(total);
  const gy = new Float32Array(total);
  const etfX = new Float32Array(total);
  const etfY = new Float32Array(total);
  const mask = new Float32Array(total);
  const strokes: ContourStroke[] = [];
  const silkLoom: SilkStrand[] = [];

  if (!octx) {
    return {
      w,
      h,
      rgba: new Uint8ClampedArray(total * 4),
      kuwaharaRgba: new Uint8ClampedArray(total * 4),
      lum,
      smoothLum: lum,
      depthMap,
      coherence,
      subjectAlpha,
      fdog,
      edge,
      scaleMap,
      gx,
      gy,
      etfX,
      etfY,
      mask,
      strokes,
      silkLoom,
      pluckAmps: new Float32Array(0),
      meanAnisotropy: 0.94,
      charCenterU: 0.5,
      charCenterV: 0.5,
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
    const wy = Math.abs(ny) > 0.95 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.95) / 0.05) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.95 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.95) / 0.05) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const normL = clip((rawLArr[i] - minL) / spanL);
      lum[i] = Math.pow(normL, 0.82) * mask[i];
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 4);
  const smoothLum = gaussianBlurField(lum, w, h, 12);
  const domeLum = gaussianBlurField(lum, w, h, 26);

  const j11 = new Float32Array(total);
  const j12 = new Float32Array(total);
  const j22 = new Float32Array(total);
  const rawGradMag = new Float32Array(total);
  const hessianRidge = new Float32Array(total);
  const positiveRidge = new Float32Array(total);
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
      const ixy = 0.25 * (lum[(y + 1) * w + (x + 1)] - lum[(y + 1) * w + (x - 1)] - lum[(y - 1) * w + (x + 1)] + lum[(y - 1) * w + (x + 1)]);
      const hTrace = ixx + iyy;
      const hDet = Math.sqrt((ixx - iyy) * (ixx - iyy) + 4.0 * ixy * ixy);
      const eigMin = 0.5 * (hTrace - hDet);
      const ridgeStrength = Math.max(Math.abs(0.5 * (hTrace + hDet)), Math.abs(eigMin)) * mask[idx];
      hessianRidge[idx] = ridgeStrength;
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

  const sJ11 = gaussianBlurField(j11, w, h, 3);
  const sJ12 = gaussianBlurField(j12, w, h, 3);
  const sJ22 = gaussianBlurField(j22, w, h, 3);

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
      const coh = Math.pow((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-5), 2);
      coherence[i] = coh;
      anisotropySum += coh;
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
    const rVal = (hessianRidge[i] / globalMaxRidge) * globalMaxEdge * 0.48 * coherence[i];
    const combinedSignal = Math.max(gVal, rVal);

    if (combinedSignal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.14, localEnv[i] * 2.0 + globalMaxEdge * 0.06);
      edge[i] = clip((combinedSignal - absFloor * 0.7) / denom);
    }
  }

  // Сегментация слоя и гладкий 3D-купол (не обрезающий верх и низ композиции!)
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  for (let x = 4; x < w - 4; x += 3) {
    const pTop = (4 * w + x) * 4;
    const pBot = ((h - 5) * w + x) * 4;
    bgR += rawRgba[pTop] + rawRgba[pBot];
    bgG += rawRgba[pTop + 1] + rawRgba[pBot + 1];
    bgB += rawRgba[pTop + 2] + rawRgba[pBot + 2];
    bgCount += 2;
  }
  bgR /= Math.max(1, bgCount);
  bgG /= Math.max(1, bgCount);
  bgB /= Math.max(1, bgCount);

  const edgeEnvelope = gaussianBlurField(edge, w, h, 8);
  const rawAlpha = new Float32Array(total);

  let massSum = 1e-5;
  let massU = 0;
  let massV = 0;

  for (let y = 0; y < h; y++) {
    const ny = (y / h) - 0.5;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) - 0.5;
      const i = y * w + x;
      const p = i * 4;

      const dCol = Math.hypot(rawRgba[p] - bgR, rawRgba[p + 1] - bgG, rawRgba[p + 2] - bgB) / 255.0;
      const radialDome = Math.max(0.15, 1.0 - (nx * nx * 1.4 + ny * ny * 1.2));

      const fgSignal = clip(dCol * 1.4 + edgeEnvelope[i] * 2.6 + edge[i] * 1.5);
      rawAlpha[i] = smoothstep(0.08, 0.42, fgSignal) * mask[i];

      const mWeight = rawAlpha[i] + edge[i];
      massSum += mWeight;
      massU += (x / w) * mWeight;
      massV += (y / h) * mWeight;

      // Гладкая 3D-высота, которая сохраняет и верхние буквы PINK FLOYD, и нижние волны!
      const safeDetail = Math.max(domeLum[i] - 0.1, smoothLum[i]);
      depthMap[i] = clip((radialDome * 0.38 + domeLum[i] * 0.42 + safeDetail * 0.2) * (0.35 + 0.65 * rawAlpha[i])) * mask[i];

      const normRidge = (hessianRidge[i] / globalMaxRidge) * coherence[i];
      const crowding = edgeEnvelope[i] * 3.0 + normRidge * 4.2;
      scaleMap[i] = clip(1.0 / (0.82 + crowding), 0.22, 1.35);
    }
  }

  const blurredAlpha = gaussianBlurField(rawAlpha, w, h, 4);
  for (let i = 0; i < total; i++) {
    subjectAlpha[i] = clip(blurredAlpha[i] + edge[i] * 0.45) * mask[i];
  }

  const charCenterU = clip(massU / massSum, 0.35, 0.65);
  const charCenterV = clip(massV / massSum, 0.35, 0.65);

  // Анизотропный фильтр минимальной дисперсии Кувахары
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
        let sumL = 0, sumL2 = 0, sumR = 0, sumG = 0, sumB = 0;

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

  // Потоковый офорт Канга FDoG
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const microDiff = lum[i] - gNarrow[i];
    const macroDiff = gNarrow[i] - gWide[i];
    const pAdaptive = 26.0 * smoothstep(0.02, 0.2, edge[i] * (0.3 + 0.7 * coherence[i]));
    rawDoG[i] = clip(lum[i] + (microDiff * 0.62 + macroDiff * 0.38) * pAdaptive);
  }

  for (let y = 4; y < h - 4; y++) {
    for (let x = 4; x < w - 4; x++) {
      const i = y * w + x;
      let acc = rawDoG[i] * 0.34;
      const tx = etfX[i];
      const ty = etfY[i];
      const stepScale = scaleMap[i];

      for (let step = 1; step <= 3; step++) {
        const wgt = step === 1 ? 0.16 : step === 2 ? 0.11 : 0.06;
        const dist = step * stepScale * 1.25;
        const xPlus = Math.min(w - 1, Math.max(0, Math.round(x + tx * dist)));
        const yPlus = Math.min(h - 1, Math.max(0, Math.round(y + ty * dist)));
        const xMinus = Math.min(w - 1, Math.max(0, Math.round(x - tx * dist)));
        const yMinus = Math.min(h - 1, Math.max(0, Math.round(y - ty * dist)));
        acc += (rawDoG[yPlus * w + xPlus] + rawDoG[yMinus * w + xMinus]) * wgt;
      }
      fdog[i] = clip(acc);
    }
  }

  // Шелковый станок SILK LOOM
  const silkStep = useFastMode ? 6 : 5;
  for (let y = 6; y < h - 6; y += silkStep) {
    for (let x = 6; x < w - 6; x += silkStep) {
      const idx = y * w + x;
      if (mask[idx] < 0.06 || (lum[idx] < 0.035 && edge[idx] < 0.04)) continue;

      const strandLen = 15;
      const uS = new Float32Array(strandLen);
      const vS = new Float32Array(strandLen);
      const txS = new Float32Array(strandLen);
      const tyS = new Float32Array(strandLen);

      let cx = x + 0.5;
      let cy = y + 0.5;
      let prevTx = etfX[idx];
      let prevTy = etfY[idx];

      for (let k = 0; k < strandLen; k++) {
        const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
        const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
        const cIdx = iy * w + ix;

        let tx = etfX[cIdx];
        let ty = etfY[cIdx];
        if (tx * prevTx + ty * prevTy < 0) {
          tx = -tx;
          ty = -ty;
        }
        prevTx = tx * 0.65 + prevTx * 0.35;
        prevTy = ty * 0.65 + prevTy * 0.35;
        const norm = Math.hypot(prevTx, prevTy) + 1e-6;
        prevTx /= norm;
        prevTy /= norm;

        uS[k] = cx / w;
        vS[k] = cy / h;
        txS[k] = prevTx;
        tyS[k] = prevTy;

        cx = clip(cx + prevTx * 2.1, 2, w - 3);
        cy = clip(cy + prevTy * 2.1, 2, h - 3);
      }

      const p = idx * 4;
      silkLoom.push({
        u: uS,
        v: vS,
        tx: txS,
        ty: tyS,
        z: depthMap[idx],
        r: kuwaharaRgba[p],
        g: kuwaharaRgba[p + 1],
        b: kuwaharaRgba[p + 2],
        cachedR: kuwaharaRgba[p],
        cachedG: kuwaharaRgba[p + 1],
        cachedB: kuwaharaRgba[p + 2],
        lum: lum[idx],
        edge: edge[idx],
        subjectWeight: subjectAlpha[idx],
        phase: (silkLoom.length * PHI) % (Math.PI * 2),
        weight: clip(0.45 + edge[idx] * 0.95 + lum[idx] * 0.35, 0.35, 1.5),
      });
    }
  }

  // ==========================================
  // САМОДОСТАТОЧНАЯ 5-УРОВНЕВАЯ РК2-ТРАССИРОВКА (ДЛЯ ИДЕАЛЬНОГО СКЕТЧА НА ЧИСТОМ ФОНЕ!)
  // ==========================================
  const ridgeSeeds: { idx: number; score: number; tier: 0 | 1 | 2 | 4 }[] = [];

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      const coh = coherence[i];
      if (e0 < 0.042 || (e0 < 0.12 && coh < 0.22) || mask[i] < 0.05) continue;

      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      if (nx === 0 && ny === 0) continue;

      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];

      if (e0 >= ePrev * 0.96 && e0 >= eNext * 0.96) {
        const isBrightHighlight = positiveRidge[i] > globalMaxRidge * 0.13 && lum[i] > gWide[i] + 0.03 && coh > 0.28;
        const tier: 0 | 1 | 2 | 4 =
          scaleMap[i] < 0.48 && e0 > 0.14
            ? 0
            : isBrightHighlight
            ? 4
            : e0 > 0.2
            ? 1
            : 2;
        ridgeSeeds.push({ idx: i, score: e0 * (0.45 + 0.55 * coh) * (tier === 0 || tier === 4 ? 1.45 : 1.0), tier });
      }
    }
  }

  ridgeSeeds.sort((a, b) => b.score - a.score);
  const visited = new Uint8Array(total);

  const traceRK2Spline = (startX: number, startY: number, dirSign: number, maxSteps: number, minEdge: number) => {
    const chain: { x: number; y: number }[] = [];
    let cx = startX + 0.5;
    let cy = startY + 0.5;

    const startIdx = Math.floor(cy) * w + Math.floor(cx);
    let prevTx = etfX[startIdx] * dirSign;
    let prevTy = etfY[startIdx] * dirSign;
    const stepSize = 1.4;

    for (let s = 0; s < maxSteps; s++) {
      const ix = Math.floor(cx);
      const iy = Math.floor(cy);
      if (ix < 3 || ix >= w - 3 || iy < 3 || iy >= h - 3) break;

      const cIdx = iy * w + ix;
      if (mask[cIdx] < 0.04) break;

      const curEdge = sampleBilinearScalar(edge, w, h, cx, cy);
      if (curEdge < minEdge) break;

      visited[cIdx] = 1;
      chain.push({ x: cx, y: cy });

      let tx1 = sampleBilinearScalar(etfX, w, h, cx, cy) * dirSign;
      let ty1 = sampleBilinearScalar(etfY, w, h, cx, cy) * dirSign;
      if (tx1 * prevTx + ty1 * prevTy < 0) {
        tx1 = -tx1;
        ty1 = -ty1;
      }

      const midX = clip(cx + tx1 * stepSize * 0.5, 2, w - 3);
      const midY = clip(cy + ty1 * stepSize * 0.5, 2, h - 3);

      let tx2 = sampleBilinearScalar(etfX, w, h, midX, midY) * dirSign;
      let ty2 = sampleBilinearScalar(etfY, w, h, midX, midY) * dirSign;
      if (tx2 * prevTx + ty2 * prevTy < 0) {
        tx2 = -tx2;
        ty2 = -ty2;
      }

      if (s > 0 && tx2 * prevTx + ty2 * prevTy < 0.12) break;

      const smoothTx = prevTx * 0.35 + tx2 * 0.65;
      const smoothTy = prevTy * 0.35 + ty2 * 0.65;
      const norm = Math.hypot(smoothTx, smoothTy) + 1e-6;
      const finalTx = smoothTx / norm;
      const finalTy = smoothTy / norm;

      prevTx = finalTx;
      prevTy = finalTy;

      const nX = -finalTy;
      const nY = finalTx;
      const ePlus = sampleBilinearScalar(edge, w, h, cx + nX * 0.75, cy + nY * 0.75);
      const eMinus = sampleBilinearScalar(edge, w, h, cx - nX * 0.75, cy - nY * 0.75);
      const ridgePull = (ePlus - eMinus) * 0.28;

      cx += finalTx * stepSize + nX * ridgePull;
      cy += finalTy * stepSize + nY * ridgePull;
    }

    return chain;
  };

  const packAdaptiveStroke = (rawPts: { x: number; y: number }[], tier: 0 | 1 | 2 | 3 | 4) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;

    const passes = tier === 0 ? 1 : 2;
    for (let pass = 0; pass < passes; pass++) {
      const next = curr.map((pt) => ({ x: pt.x, y: pt.y }));
      for (let i = 1; i < n - 1; i++) {
        next[i].x = 0.24 * curr[i - 1].x + 0.52 * curr[i].x + 0.24 * curr[i + 1].x;
        next[i].y = 0.24 * curr[i - 1].y + 0.52 * curr[i].y + 0.24 * curr[i + 1].y;
      }
      curr = next;
    }

    const uArr = new Float32Array(n);
    const vArr = new Float32Array(n);
    const nxArr = new Float32Array(n);
    const nyArr = new Float32Array(n);
    const zArr = new Float32Array(n);

    let eSum = 0, lSum = 0, cohSum = 0, subjSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0, zSum = 0, scaleSum = 0;

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
      const zVal = depthMap[pxIdx];
      zArr[i] = zVal;
      zSum += zVal;

      scaleSum += scaleMap[pxIdx];
      eSum += edge[pxIdx];
      lSum += lum[pxIdx];
      cohSum += coherence[pxIdx];
      subjSum += subjectAlpha[pxIdx];
      const p4 = pxIdx * 4;
      rSum += kuwaharaRgba[p4];
      gSum += kuwaharaRgba[p4 + 1];
      bSum += kuwaharaRgba[p4 + 2];
    }

    const meanEdge = eSum / n;
    const meanCoh = cohSum / n;
    const meanScale = scaleSum / n;
    const importance = clip((meanEdge * 0.85 + meanCoh * 0.45) + (tier === 0 || tier === 4 ? 0.38 : Math.min(0.35, n / 65.0)));
    const rAvg = Math.round(rSum / n);
    const gAvg = Math.round(gSum / n);
    const bAvg = Math.round(bSum / n);

    strokes.push({
      u: uArr,
      v: vArr,
      nx: nxArr,
      ny: nyArr,
      z: zArr,
      nPts: n,
      tier,
      r: rAvg,
      g: gAvg,
      b: bAvg,
      cachedR: rAvg,
      cachedG: gAvg,
      cachedB: bAvg,
      meanEdge,
      meanLum: lSum / n,
      meanCoherence: meanCoh,
      subjectWeight: subjSum / n,
      featureScale: meanScale,
      importance,
      phase: (strokes.length * PHI) % (Math.PI * 2),
      speed: 0.65 + ((strokes.length * 7) % 13) * 0.06,
      arcLen: n * 1.4,
      centerU: uSum / n,
      centerV: vSum / n,
      centerZ: zSum / n,
    });
  };

  const maxRidgeStrokes = useFastMode ? 3800 : 6400;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxRidgeStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const sx = seed.idx % w;
    const sy = Math.floor(seed.idx / w);
    const isMicro = seed.tier === 0;
    const maxHalf = isMicro ? 30 : 72;
    const minE = isMicro ? 0.048 : 0.038;

    const back = traceRK2Spline(sx, sy, -1, maxHalf, minE).reverse();
    const fwd = traceRK2Spline(sx, sy, 1, maxHalf, minE);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < (isMicro ? 3 : 6)) continue;
    packAdaptiveStroke(rawPts, seed.tier);
  }

  // Добавляем направленные штрихи полутонов (Tier 3) вдоль изофот, чтобы в TRACE и SKETCH
  // объем лица, пирамиды и волн читался на 100% БЕЗ растровой фотографии сзади!
  const hatchStep = useFastMode ? 6 : 5;
  const maxTotal = useFastMode ? 5200 : 8600;
  for (let y = 6; y < h - 6; y += hatchStep) {
    for (let x = 6; x < w - 6; x += hatchStep) {
      if (strokes.length >= maxTotal) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.08) continue;
      if (lum[idx] > 0.1 && (coherence[idx] > 0.22 || edge[idx] > 0.05)) {
        const hatchChain = traceRK2Spline(x, y, 1, 14, 0.015);
        if (hatchChain.length >= 5) {
          packAdaptiveStroke(hatchChain, 3);
        }
      }
    }
  }

  strokes.sort((a, b) => {
    const tierOrder = (a.tier === 3 ? 1 : 0) - (b.tier === 3 ? 1 : 0);
    if (tierOrder !== 0) return tierOrder;
    const da = Math.hypot(a.centerU - charCenterU, a.centerV - charCenterV);
    const db = Math.hypot(b.centerU - charCenterU, b.centerV - charCenterV);
    return (da - db) * 0.45 + (b.importance - a.importance) * 0.55;
  });

  return {
    w,
    h,
    rgba: rawRgba,
    kuwaharaRgba,
    lum,
    smoothLum,
    depthMap,
    coherence,
    subjectAlpha,
    fdog,
    edge,
    scaleMap,
    gx,
    gy,
    etfX,
    etfY,
    mask,
    strokes,
    silkLoom,
    pluckAmps: new Float32Array(strokes.length),
    meanAnisotropy,
    charCenterU,
    charCenterV,
  };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const initialPrompt = PROMPT_PRESETS[0].prompt;
  const initialKinetic = compileAnimationPrompt(initialPrompt);

  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("TRACE");

  const [animPromptInput, setAnimPromptInput] = useState<string>(initialPrompt);
  const [kineticCoords, setKineticCoords] = useState<KineticPromptCoordinates>(initialKinetic);

  const [artConfig, setArtStudioConfig] = useState<ArtStudioConfig>({
    dimension: "2D_STUDIO",
    backdrop: "OBSIDIAN",
    stageMode: "ANIMATE_ART",
    lockFrontAnfas: false,
    fastPerfMode: false,
    edition: "SHINE_ON",
    posterFrame: true,
    strokeWeight: 0.92,
    coherenceCleanliness: 0.32,
    relief3DAndMotion: 0.55,
    glowAndPrism: 0.82,
    shadowHex: "#18122b",
    midtoneHex: "#a855f7",
    highlightHex: "#fde047",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("INITIALIZING BARRETT 22.0...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);
  const [loadedPage, setLoadedPage] = useState<number>(2);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    art: artConfig,
    kinetic: initialKinetic,
    topology: "TRACE" as ManifoldTopology,
    matrix: null as MatrixBuffer | null,
    time: 0,
    traceProgress: 0,
    needsBaseRebuild: true,
    isPaused: false,
    mouseX: -10,
    mouseY: -10,
    mouseActive: false,
    isDragging3D: false,
    dragLastX: 0,
    dragLastY: 0,
    userYaw: 0.0,
    userPitch: 0.0,
    velYaw: 0.0,
    velPitch: 0.0,
    userZoom: 1.0,
    smoothYaw: 0,
    smoothPitch: 0,
    fluidU: 0.52,
    fluidV: 0.48,
  });

  const updateArt = useCallback(<K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtStudioConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsBaseRebuild = true;
      if (key === "stageMode" && val === "DRAW_THEN_ANIMATE") {
        stateRef.current.traceProgress = 0;
      }
      if (key === "lockFrontAnfas" && val === true) {
        stateRef.current.userYaw = 0;
        stateRef.current.userPitch = 0;
        stateRef.current.velYaw = 0;
        stateRef.current.velPitch = 0;
      }
      return next;
    });
  }, []);

  const lockModelFrontAnfas = useCallback(() => {
    stateRef.current.userYaw = 0;
    stateRef.current.userPitch = 0;
    stateRef.current.velYaw = 0;
    stateRef.current.velPitch = 0;
    stateRef.current.smoothYaw = 0;
    stateRef.current.smoothPitch = 0;
    stateRef.current.userZoom = 1.0;
    updateArt("lockFrontAnfas", !stateRef.current.art.lockFrontAnfas);
  }, [updateArt]);

  const handleApplyPrompt = useCallback(
    (customText?: string, force3D?: boolean, forceStage?: AnimationStageMode) => {
      const targetText = customText !== undefined ? customText : animPromptInput;
      if (customText !== undefined) setAnimPromptInput(customText);
      const compiled = compileAnimationPrompt(targetText);
      setKineticCoords(compiled);
      stateRef.current.kinetic = compiled;

      if (forceStage) {
        updateArt("stageMode", forceStage);
      } else if (compiled.timelapseLoop) {
        updateArt("stageMode", "DRAW_THEN_ANIMATE");
      }

      if (force3D !== undefined) {
        updateArt("dimension", force3D ? "3D_SPACE" : "2D_STUDIO");
        if (force3D) {
          setTopology("SCULPT3D");
        }
      } else if (compiled.orbitYawAmp > 0.15) {
        updateArt("dimension", "3D_SPACE");
      }

      if (compiled.timelapseLoop || forceStage === "DRAW_THEN_ANIMATE") {
        stateRef.current.traceProgress = 0;
      }
    },
    [animPromptInput, updateArt]
  );

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING PURE VECTOR SKETCH & 3D DOME [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMob = (typeof window !== "undefined" && window.innerWidth < 768) || stateRef.current.art.fastPerfMode;
      const buf = buildMatrixFromImage(img, isMob);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = 0;
      stateRef.current.needsBaseRebuild = true;
      setCoeffs((prev) => ({ ...prev, eigenAnisotropy: buf.meanAnisotropy }));
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " PURE VECTORS & " + String(buf.w * buf.h) + " 3D VOXELS (" + String(buf.w) + "x" + String(buf.h) + ")"
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
    stateRef.current.kinetic = kineticCoords;
    stateRef.current.topology = topology;
    stateRef.current.isPaused = isPaused;
    stateRef.current.needsBaseRebuild = true;
  }, [tensor, coeffs, artConfig, kineticCoords, topology, isPaused]);

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
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    stateRef.current.mouseX = mx;
    stateRef.current.mouseY = my;
    stateRef.current.mouseActive = true;
    stateRef.current.isDragging3D = true;
    stateRef.current.dragLastX = mx;
    stateRef.current.dragLastY = my;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    stateRef.current.mouseX = mx;
    stateRef.current.mouseY = my;
    stateRef.current.mouseActive = true;

    if (stateRef.current.isDragging3D && !stateRef.current.art.lockFrontAnfas) {
      const dx = mx - stateRef.current.dragLastX;
      const dy = my - stateRef.current.dragLastY;
      stateRef.current.dragLastX = mx;
      stateRef.current.dragLastY = my;

      if (stateRef.current.art.dimension === "3D_SPACE" || stateRef.current.topology === "SCULPT3D" || stateRef.current.topology === "LIDAR") {
        stateRef.current.userYaw = clip(stateRef.current.userYaw + dx * 0.0045, -0.38, 0.38);
        stateRef.current.userPitch = clip(stateRef.current.userPitch + dy * 0.0045, -0.28, 0.28);
        stateRef.current.velYaw = dx * 0.001;
        stateRef.current.velPitch = dy * 0.001;
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.touches[0].clientX - rect.left;
      const my = e.touches[0].clientY - rect.top;
      stateRef.current.mouseX = mx;
      stateRef.current.mouseY = my;
      stateRef.current.mouseActive = true;
      stateRef.current.isDragging3D = true;
      stateRef.current.dragLastX = mx;
      stateRef.current.dragLastY = my;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.touches[0].clientX - rect.left;
      const my = e.touches[0].clientY - rect.top;
      stateRef.current.mouseX = mx;
      stateRef.current.mouseY = my;
      stateRef.current.mouseActive = true;

      if (stateRef.current.isDragging3D && !stateRef.current.art.lockFrontAnfas) {
        const dx = mx - stateRef.current.dragLastX;
        const dy = my - stateRef.current.dragLastY;
        stateRef.current.dragLastX = mx;
        stateRef.current.dragLastY = my;

        if (stateRef.current.art.dimension === "3D_SPACE" || stateRef.current.topology === "SCULPT3D" || stateRef.current.topology === "LIDAR") {
          stateRef.current.userYaw = clip(stateRef.current.userYaw + dx * 0.0045, -0.38, 0.38);
          stateRef.current.userPitch = clip(stateRef.current.userPitch + dy * 0.0045, -0.28, 0.28);
        }
      }
    }
  };

  const handleMouseUp = () => {
    stateRef.current.isDragging3D = false;
  };

  const handleMouseLeave = () => {
    stateRef.current.mouseActive = false;
    stateRef.current.isDragging3D = false;
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (stateRef.current.art.dimension === "3D_SPACE" || stateRef.current.topology === "SCULPT3D" || stateRef.current.topology === "LIDAR") {
      e.preventDefault();
      stateRef.current.userZoom = clip(stateRef.current.userZoom - e.deltaY * 0.001, 0.75, 1.45);
    }
  };

  // ==========================================
  // ЯДРО РЕНДЕРИНГА BARRETT 22.0
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let viewW = 900;
    let viewH = 680;

    // Буфер ЧИСТОГО ГРАФИЧЕСКОГО ОФОРТА (100% прозрачный фон, содержит только линии FDoG и штриховку без фото!)
    const pureSketchCanvas = document.createElement("canvas");
    const pureSketchCtx = pureSketchCanvas.getContext("2d");

    const shaderCanvas = document.createElement("canvas");
    const shaderCtx = shaderCanvas.getContext("2d");

    // Увеличенный Z-буфер на 800x800 = 640,000 вокселей (никакого обрезания нижней части 3D-модели!)
    const MAX_ZBUF_SIZE = 800 * 800;
    const zBuffer = new Float32Array(MAX_ZBUF_SIZE);

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return;
      viewW = Math.floor(rect.width);
      viewH = Math.floor(rect.height);
      const isMob = window.innerWidth < 768 || stateRef.current.art.fastPerfMode;
      const dpr = Math.min(window.devicePixelRatio || 1, isMob ? 1.25 : 2.0);
      if (canvas.width !== Math.floor(viewW * dpr) || canvas.height !== Math.floor(viewH * dpr)) {
        canvas.width = Math.floor(viewW * dpr);
        canvas.height = Math.floor(viewH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(container);
    updateSize();

    // ==========================================
    // СБОРКА ЧИСТОЙ ГРАФИЧЕСКОЙ МАТРИЦЫ ЛИНИЙ (БЕЗ ФОТОГРАФИИ НА ЗАДНЕМ ПЛАНЕ!)
    // В каждом пикселе, где нет контура или штриховки, альфа = 0 (виден чистый кастомный фон юзера!)
    // ==========================================
    const rebuildPureSketchMatrixAndCache = (
      m: MatrixBuffer,
      art: ArtStudioConfig,
      t: Tensor5D
    ) => {
      if (!pureSketchCtx) return;
      pureSketchCanvas.width = m.w;
      pureSketchCanvas.height = m.h;

      const skImg = pureSketchCtx.createImageData(m.w, m.h);
      const skDst = skImg.data;
      const kuw = m.kuwaharaRgba;

      const isPaper = art.backdrop === "ARCHIVAL_PAPER";
      const cutGate = art.coherenceCleanliness;
      const isolateSubject = art.stageMode === "ISOLATE_SUBJECT";

      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const subjW = m.subjectAlpha[i];
          if (isolateSubject && subjW < cutGate * 0.65) continue;

          const p = i * 4;
          const rawL = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];
          const coh = m.coherence[i];

          // Выделяем ТОЛЬКО линии контуров, микро-текст и перекрестную штриховку (никакой заливки фото!)
          const fdogRidge = Math.max(0.0, 1.0 - Math.tanh(11.0 * (fd - 0.22)));
          const cleanEdge = e * (0.35 + 0.65 * coh);

          // Тонкая гравировальная штриховка вдоль касательного поля ETF
          const hatchCoord = (x * m.etfY[i] - y * m.etfX[i]) * 1.35;
          const crossCoord = (x * m.etfX[i] + y * m.etfY[i]) * 1.35;
          const hatchWave = 0.5 + 0.5 * Math.sin(hatchCoord);
          const crossWave = 0.5 + 0.5 * Math.sin(crossCoord);

          let lineSignal = 0.0;
          if (isPaper) {
            // На светлой бумаге штрихуем тени
            const shadow = Math.pow(1.0 - rawL, 1.4);
            if (shadow > 0.25 && hatchWave < shadow * 0.75) lineSignal += 0.38;
            if (shadow > 0.55 && crossWave < shadow * 0.75) lineSignal += 0.35;
            lineSignal = clip(lineSignal + cleanEdge * 0.95 + fdogRidge * 0.65, 0.0, 1.0);
          } else {
            // На темном кастомном фоне рисуем светящиеся контуры, буквы и деликатную штриховку светов!
            if (rawL > 0.25 && cleanEdge > 0.08 && hatchWave > 0.55) {
              lineSignal += rawL * 0.32;
            }
            lineSignal = clip(lineSignal + cleanEdge * 1.15 + fdogRidge * 0.55 * rawL, 0.0, 1.0);
          }

          // Если в пикселе нет линии скетча — оставляем его 100% прозрачным (альфа = 0), чтобы сиял чистый кастомный фон!
          if (lineSignal < 0.06) continue;

          const [colR, colG, colB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], rawL, cleanEdge, t.tone, false, true);

          skDst[p] = colR;
          skDst[p + 1] = colG;
          skDst[p + 2] = colB;
          skDst[p + 3] = Math.round(clip(lineSignal * vMask, 0.0, 0.92) * 255);
        }
      }

      pureSketchCtx.putImageData(skImg, 0, 0);

      // Кэшируем цвета для всех векторных сплайнов и нитей шелка
      for (let i = 0; i < m.strokes.length; i++) {
        const st = m.strokes[i];
        const [rC, gC, bC] = resolveEditionColor(art, st.r, st.g, st.b, st.meanLum, st.meanEdge, t.tone, st.tier === 4, true);
        st.cachedR = rC;
        st.cachedG = gC;
        st.cachedB = bC;
      }

      for (let i = 0; i < m.silkLoom.length; i++) {
        const sl = m.silkLoom[i];
        const [rS, gS, bS] = resolveEditionColor(art, sl.r, sl.g, sl.b, sl.lum, sl.edge, t.tone, false, true);
        sl.cachedR = rS;
        sl.cachedG = gS;
        sl.cachedB = bS;
      }
    };

    const getLayerTransform = (
      kin: KineticPromptCoordinates,
      art: ArtStudioConfig,
      time: number,
      prog: number
    ) => {
      const animGate = art.stageMode === "DRAW_THEN_ANIMATE" ? smoothstep(0.45, 0.92, prog) : 1.0;
      const power = (0.4 + art.relief3DAndMotion * 0.9) * animGate;
      const phase = time * kin.moveFreq;

      const dx = Math.sin(phase) * kin.layerMoveX * power;
      const dy = -Math.abs(Math.sin(phase * 1.5)) * kin.layerMoveY * power + Math.cos(phase * 0.8) * kin.layerMoveY * 0.35 * power;
      const tilt = Math.sin(phase) * kin.layerTiltAmp * power;
      const scale = 1.0 + Math.sin(phase * 2.0) * kin.layerScaleAmp * power;

      return { dx, dy, tilt, scale, animGate, power };
    };

    const transformUnifiedPoint = (
      uIn: number,
      vIn: number,
      zIn: number,
      nxIn: number,
      nyIn: number,
      sNorm: number,
      phase: number,
      isMicro: boolean,
      ox: number,
      oy: number,
      drawW: number,
      drawH: number,
      m: MatrixBuffer,
      time: number,
      kin: KineticPromptCoordinates,
      art: ArtStudioConfig,
      camYaw: number,
      camPitch: number,
      camZoom: number,
      pluckPx: number,
      layerTf: { dx: number; dy: number; tilt: number; scale: number; animGate: number; power: number }
    ): [number, number] => {
      const cx = m.charCenterU;
      const cy = m.charCenterV;

      let u = uIn;
      let v = vIn;

      if (layerTf.animGate > 0.01) {
        const relU = (u - cx) * layerTf.scale;
        const relV = (v - cy) / layerTf.scale;
        const cosT = Math.cos(layerTf.tilt);
        const sinT = Math.sin(layerTf.tilt);

        u = cx + (relU * cosT - relV * sinT) + layerTf.dx;
        v = cy + (relU * sinT + relV * cosT) + layerTf.dy;

        if (!isMicro && kin.internalWaveAmp > 0.01) {
          const env = Math.sin(sNorm * Math.PI);
          const wave = Math.sin((uIn * 5.0 + vIn * 4.0) * Math.PI - time * 3.0 + phase) * kin.internalWaveAmp * 0.007 * layerTf.power;
          u += kin.windVecX * 0.004 * env + nxIn * wave;
          v += kin.windVecY * 0.004 * env + nyIn * wave;
        }

        if (!isMicro && kin.shockwaveAmp > 0.01) {
          const du = u - cx;
          const dv = v - cy;
          const r = Math.hypot(du, dv) + 0.001;
          if (r < 0.45) {
            const shock = Math.sin(r * 16.0 - time * 5.0) * (1.0 - r / 0.45) * kin.shockwaveAmp * 0.015 * layerTf.power;
            u += (du / r) * shock;
            v += (dv / r) * shock;
          }
        }
      }

      const pluckDisp = Math.sin(sNorm * Math.PI * 2.0) * pluckPx * Math.sin(sNorm * Math.PI);

      if (art.dimension === "2D_STUDIO" && stateRef.current.topology !== "SCULPT3D" && stateRef.current.topology !== "LIDAR") {
        const sx = ox + ((u - 0.5) * camZoom + 0.5) * drawW + nxIn * pluckDisp;
        const sy = oy + ((v - 0.5) * camZoom + 0.5) * drawH + nyIn * pluckDisp;
        return [sx, sy];
      }

      const zRel = (zIn - 0.38) * art.relief3DAndMotion * 0.52;
      const x3 = (u - 0.5) * camZoom * 0.88;
      const y3 = (v - 0.5) * camZoom * 0.88;

      const cosY = Math.cos(camYaw);
      const sinY = Math.sin(camYaw);
      const cosX = Math.cos(camPitch);
      const sinX = Math.sin(camPitch);

      const rx = x3 * cosY + zRel * sinY;
      const rz1 = -x3 * sinY + zRel * cosY;
      const ry = y3 * cosX - rz1 * sinX;
      const rz2 = y3 * sinX + rz1 * cosX;

      const fov = 2.6 / Math.max(0.85, 2.6 - rz2 * 0.75);
      const screenX = ox + (0.5 + rx * fov) * drawW + nxIn * pluckDisp;
      const screenY = oy + (0.5 + ry * fov) * drawH + nyIn * pluckDisp;
      return [screenX, screenY];
    };

    const draw3DGimbalGizmo = (yaw: number, pitch: number, locked: boolean, ox: number, oy: number, drawH: number) => {
      const gx = ox + 42;
      const gy = oy + drawH - 42;
      const rad = 24;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(5, 4, 10, 0.82)";
      ctx.strokeStyle = locked ? "rgba(253, 224, 71, 0.75)" : "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(gx, gy, rad + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch), sinX = Math.sin(pitch);

      const axes: { vx: number; vy: number; vz: number; col: string; label: string }[] = [
        { vx: 1, vy: 0, vz: 0, col: "#ef4444", label: "X" },
        { vx: 0, vy: 1, vz: 0, col: "#10b981", label: "Y" },
        { vx: 0, vy: 0, vz: 1, col: "#38bdf8", label: "Z" },
      ];

      ctx.font = "bold 8px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const ax of axes) {
        const rx = ax.vx * cosY + ax.vz * sinY;
        const rz1 = -ax.vx * sinY + ax.vz * cosY;
        const ry = ax.vy * cosX - rz1 * sinX;

        ctx.strokeStyle = ax.col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + rx * rad, gy + ry * rad);
        ctx.stroke();

        ctx.fillStyle = ax.col;
        ctx.fillText(ax.label, gx + rx * (rad + 5), gy + ry * (rad + 5));
      }
      ctx.restore();
    };

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const art = s.art;
      const kin = s.kinetic;
      const m = s.matrix;

      const isPaper = art.backdrop === "ARCHIVAL_PAPER";
      const bgHex = BACKDROP_COLORS[art.backdrop] || "#040308";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (kin.timelapseLoop || art.stageMode === "DRAW_THEN_ANIMATE") {
          s.traceProgress = (s.traceProgress + 0.0042 * (0.6 + t.energy)) % 1.45;
        } else if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.015 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildPureSketchMatrixAndCache(m, art, t);
        s.needsBaseRebuild = false;
      }

      // 1. Заливаем весь холст ЧИСТЫМ кастомным фоном (Obsidian, Void Black, Midnight, Velvet или Paper)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, viewW, viewH);

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

          ctx.beginPath();
          ctx.moveTo(cx + prismR * 0.35, cy + b * 2.2 - 7.0);
          const ctrlX = cx + (viewW - cx) * 0.45;
          const ctrlY = cy + Math.tan(spreadAngle) * (viewW - cx) * 0.42 + Math.sin(time * 2.5 + b) * 14.0;
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.strokeStyle = "rgba(" + String(cr) + "," + String(cg) + "," + String(cb) + ",0.85)";
          ctx.lineWidth = 2.2;
          ctx.stroke();
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

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.7) * 0.3;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.45 + Math.sin(time * 0.9) * 0.24;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      const is3DActive = art.dimension === "3D_SPACE" || s.topology === "SCULPT3D" || s.topology === "LIDAR";

      if (!s.isDragging3D && is3DActive && !art.lockFrontAnfas) {
        s.userYaw = clip(s.userYaw + s.velYaw, -0.38, 0.38);
        s.userPitch = clip(s.userPitch + s.velPitch, -0.28, 0.28);
        s.velYaw *= 0.92;
        s.velPitch *= 0.92;
      }

      const orbitPower = 0.35 + art.relief3DAndMotion * 0.65;
      const autoYawOffset =
        is3DActive && !art.lockFrontAnfas && !s.isDragging3D
          ? Math.sin(time * kin.orbitSpeed) * Math.max(0.14, kin.orbitYawAmp) * orbitPower
          : 0.0;
      const autoPitchOffset =
        is3DActive && !art.lockFrontAnfas && !s.isDragging3D
          ? Math.cos(time * kin.orbitSpeed * 0.8) * Math.max(0.09, kin.orbitPitchAmp) * orbitPower
          : 0.0;

      const targetYaw = !is3DActive || art.lockFrontAnfas ? 0.0 : clip(s.userYaw + autoYawOffset, -0.4, 0.4);
      const targetPitch = !is3DActive || art.lockFrontAnfas ? 0.0 : clip(s.userPitch + autoPitchOffset, -0.3, 0.3);
      s.smoothYaw += (targetYaw - s.smoothYaw) * 0.14;
      s.smoothPitch += (targetPitch - s.smoothPitch) * 0.14;

      const camZoom = s.userZoom;
      const clampedProg = Math.min(1.0, s.traceProgress);
      const layerTf = getLayerTransform(kin, art, time, clampedProg);

      // Отрисовка ЧИСТОЙ ГРАФИЧЕСКОЙ СЕТКИ ШТРИХОВ (без фото!) с синхронной трансформацией
      const renderPureSketchEtchLayer = (opacity: number) => {
        if (opacity <= 0.01) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, drawW, drawH);
        ctx.clip();

        const pivotX = ox + m.charCenterU * drawW;
        const pivotY = oy + m.charCenterV * drawH;

        ctx.translate(pivotX + layerTf.dx * drawW, pivotY + layerTf.dy * drawH);
        ctx.rotate(layerTf.tilt);
        ctx.scale(layerTf.scale * camZoom, (1.0 / layerTf.scale) * camZoom);
        ctx.translate(-pivotX, -pivotY);

        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        ctx.globalAlpha = clip(opacity, 0, 1.0);
        ctx.drawImage(
          pureSketchCanvas,
          ox - s.smoothYaw * art.relief3DAndMotion * 20,
          oy - s.smoothPitch * art.relief3DAndMotion * 20,
          drawW,
          drawH
        );
        ctx.restore();
      };

      // ==========================================
      // РЕЖИМ 1 И 2: TRACE 22.0 & SKETCH (100% ЧИСТЫЙ СКЕТЧ НА КАСТОМНОМ ФОНЕ — НИКАКОЙ ФОТКИ СЗАДИ!)
      // ==========================================
      if (s.topology === "TRACE" || s.topology === "SKETCH") {
        const isSketchMode = s.topology === "SKETCH";
        const etchReveal = smoothstep(0.1, 0.85, clampedProg);

        // 1. Сначала проявляется тончайший гравировальный офорт (только линии и штриховка на кастомном фоне!)
        renderPureSketchEtchLayer((isSketchMode ? 0.92 : 0.78) * etchReveal);

        // В режиме SKETCH или Da Vinci добавляем чертежные линии построения Леонардо
        if (isSketchMode || art.edition === "DA_VINCI") {
          ctx.save();
          ctx.strokeStyle = isPaper ? "rgba(140, 55, 35, 0.24)" : "rgba(215, 165, 105, 0.14)";
          ctx.lineWidth = 0.8;
          const cx = ox + (m.charCenterU + layerTf.dx) * drawW;
          const cy = oy + (m.charCenterV + layerTf.dy) * drawH;
          const rVitruvian = Math.min(drawW, drawH) * 0.36;
          ctx.beginPath();
          ctx.arc(cx, cy, rVitruvian, 0, Math.PI * 2);
          ctx.arc(cx, cy, rVitruvian / PHI, 0, Math.PI * 2);
          ctx.moveTo(ox, cy);
          ctx.lineTo(ox + drawW, cy);
          ctx.moveTo(cx, oy);
          ctx.lineTo(cx, oy + drawH);
          ctx.stroke();
          ctx.restore();
        }

        // 2. Поверх гравировки вычерчиваются 7 500 каллиграфических векторных сплайнов РК2!
        const strokes = m.strokes;
        const pluckAmps = m.pluckAmps;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(120, Math.floor(totalStrokes * 0.22));
        const headFloat = clampedProg * (totalStrokes + windowSpan);
        const cohThreshold = art.coherenceCleanliness * 0.72;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.meanCoherence < cohThreshold && st.meanEdge < 0.22 && st.tier !== 0) continue;
          if (art.stageMode === "ISOLATE_SUBJECT" && st.subjectWeight < art.coherenceCleanliness) continue;

          if (s.mouseActive && !s.isDragging3D) {
            const dMouse = Math.hypot(st.centerU - mNormX, st.centerV - mNormY);
            if (dMouse < 0.08) {
              pluckAmps[i] = Math.min(1.0, pluckAmps[i] + (1.0 - dMouse / 0.08) * 0.45);
            }
          }
          pluckAmps[i] *= 0.93;
          const pAmp = pluckAmps[i];

          const nPts = st.nPts;
          const rawLocal = clampedProg >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.02) continue;

          const fullIdx = Math.min(nPts - 1, Math.floor(localProg * (nPts - 1)));
          const isMicroFeature = st.tier === 0 || st.featureScale < 0.52;
          const isHighlight = st.tier === 4;

          ctx.globalCompositeOperation = isPaper && !isHighlight ? "source-over" : "screen";

          const stringPluckPx = pAmp * (isMicroFeature ? 1.4 : 5.5 + t.chaos * 7.0) * Math.sin(time * 28.0 + st.phase);
          const tierAlpha =
            st.tier === 0
              ? 0.96
              : st.tier === 4
              ? 0.92
              : st.tier === 1
              ? 0.92
              : st.tier === 2
              ? 0.68
              : 0.42;
          const baseAlpha = clip((0.32 + st.meanEdge * 0.65 + pAmp * 0.45) * tierAlpha * localProg, 0.15, 0.98);

          const maxW =
            (st.tier === 0
              ? 0.42
              : st.tier === 4
              ? 0.65 * st.featureScale
              : st.tier === 1
              ? (0.72 + st.meanEdge * 0.75) * st.featureScale
              : st.tier === 2
              ? 0.48 * st.featureScale
              : 0.36 * st.featureScale) *
            art.strokeWeight *
            (1.0 + pAmp * 0.75);

          ctx.beginPath();
          let prevX = 0, prevY = 0;
          let tipX = 0, tipY = 0;
          for (let k = 0; k <= fullIdx; k++) {
            const sNorm = k / Math.max(1, nPts - 1);
            const [curX, curY] = transformUnifiedPoint(
              st.u[k],
              st.v[k],
              st.z[k],
              st.nx[k],
              st.ny[k],
              sNorm,
              st.phase,
              isMicroFeature,
              ox,
              oy,
              drawW,
              drawH,
              m,
              time,
              kin,
              art,
              s.smoothYaw,
              s.smoothPitch,
              camZoom,
              stringPluckPx,
              layerTf
            );
            if (k === 0) ctx.moveTo(curX, curY);
            else if (k === 1) ctx.lineTo(curX, curY);
            else ctx.quadraticCurveTo(prevX, prevY, (prevX + curX) * 0.5, (prevY + curY) * 0.5);
            prevX = curX;
            prevY = curY;
            if (k === fullIdx) {
              tipX = curX;
              tipY = curY;
            }
          }
          ctx.lineTo(prevX, prevY);
          ctx.strokeStyle = "rgba(" + String(st.cachedR) + "," + String(st.cachedG) + "," + String(st.cachedB) + "," + String(baseAlpha.toFixed(2)) + ")";
          ctx.lineWidth = Math.max(0.28, maxW);
          ctx.stroke();

          if (localProg < 0.96 && st.tier === 1 && i % 4 === 0) {
            ctx.fillStyle = isPaper ? "#8f3d27" : "#10b981";
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 3: SCULPT3D & LIDAR 22.0 (ПОЛНЫЙ КАДР 800x800 БЕЗ ОБРЕЗАНИЯ ВЕРХА И НИЗА!)
      // ==========================================
      else if (s.topology === "SCULPT3D" || s.topology === "LIDAR") {
        const isLidar = s.topology === "LIDAR";
        if (shaderCtx) {
          const scaleDiv = art.fastPerfMode ? 2 : 1;
          const bW = Math.floor(m.w / scaleDiv);
          const bH = Math.floor(m.h / scaleDiv);
          if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
            shaderCanvas.width = bW;
            shaderCanvas.height = bH;
          }

          const outImg = shaderCtx.createImageData(bW, bH);
          const dst = outImg.data;
          const [bgR, bgG, bgB] = hexToRgb(bgHex);
          const totalPx = bW * bH;
          for (let i = 0; i < totalPx; i++) {
            zBuffer[i] = -1e9;
            const p4 = i * 4;
            dst[p4] = bgR;
            dst[p4 + 1] = bgG;
            dst[p4 + 2] = bgB;
            dst[p4 + 3] = 255;
          }

          const cosY = Math.cos(s.smoothYaw);
          const sinY = Math.sin(s.smoothYaw);
          const cosX = Math.cos(s.smoothPitch);
          const sinX = Math.sin(s.smoothPitch);
          const depthScale = 0.22 + art.relief3DAndMotion * 0.52;

          // Коэффициент 0.88 гарантирует, что при 3D-экструзии вперёд ни верх надписи PINK FLOYD, ни низ не выйдут за рамку!
          const fitScale = 0.88 * camZoom;

          const lx = (s.fluidU - 0.5) * 2.4;
          const ly = (s.fluidV - 0.5) * 2.4;
          const lz = 0.72;
          const lLen = Math.hypot(lx, ly, lz);
          const lightX = lx / lLen;
          const lightY = ly / lLen;
          const lightZ = lz / lLen;

          const scanV = ((time * 0.32) % 1.4) - 0.2;
          const ptStep = isLidar ? 2 : 1;
          const splatRadius = isLidar ? 0 : 1;

          for (let y = 1; y < bH - 1; y += ptStep) {
            const vOrig = y / bH;
            const my = Math.min(m.h - 2, y * scaleDiv);
            const scanBoost = isLidar && Math.abs(vOrig - scanV) < 0.045 ? (1.0 - Math.abs(vOrig - scanV) / 0.045) * 0.75 : 0.0;

            for (let x = 1; x < bW - 1; x += ptStep) {
              const mx = Math.min(m.w - 2, x * scaleDiv);
              const mIdx = my * m.w + mx;
              if (m.mask[mIdx] < 0.04) continue;

              const subjW = m.subjectAlpha[mIdx];
              if (art.stageMode === "ISOLATE_SUBJECT" && subjW < art.coherenceCleanliness) continue;

              const uOrig = x / bW;
              const l = m.lum[mIdx];
              const e = m.edge[mIdx];
              if (l < 0.03 && e < 0.04) continue;

              const zHeight = (m.depthMap[mIdx] - 0.35) * depthScale;
              const x3 = (uOrig + layerTf.dx * 0.6 - 0.5) * fitScale;
              const y3 = (vOrig + layerTf.dy * 0.6 - 0.5) * fitScale;

              const rx = x3 * cosY + zHeight * sinY;
              const rz1 = -x3 * sinY + zHeight * cosY;
              const ry = y3 * cosX - rz1 * sinX;
              const rz2 = y3 * sinX + rz1 * cosX;

              const fov = 2.6 / Math.max(0.85, 2.6 - rz2 * 0.75);
              const sx = Math.round((0.5 + rx * fov) * bW);
              const sy = Math.round((0.5 + ry * fov) * bH);

              if (sx < 1 || sx >= bW - 2 || sy < 1 || sy >= bH - 2) continue;

              const dzdx = (m.depthMap[mIdx + 1] - m.depthMap[mIdx - 1]) * 10.0 + m.gx[mIdx] * e * 0.85;
              const dzdy = (m.depthMap[mIdx + m.w] - m.depthMap[mIdx - m.w]) * 10.0 + m.gy[mIdx] * e * 0.85;
              const nLen = Math.hypot(dzdx, dzdy, 1.0);
              const nx = -dzdx / nLen;
              const ny = -dzdy / nLen;
              const nz = 1.0 / nLen;

              const rnx = nx * cosY + nz * sinY;
              const rnz1 = -nx * sinY + nz * cosY;
              const rny = ny * cosX - rnz1 * sinX;
              const rnz2 = ny * sinX + rnz1 * cosX;

              const nDotL = Math.max(0.0, rnx * lightX + rny * lightY + rnz2 * lightZ);
              const fresnelRim = Math.pow(1.0 - Math.max(0.0, rnz2), 2.2) * 0.7 * art.glowAndPrism;
              const spec = Math.pow(nDotL, 14.0) * art.glowAndPrism * 145.0;

              const p = mIdx * 4;
              const [baseR, baseG, baseB] = resolveEditionColor(art, m.kuwaharaRgba[p], m.kuwaharaRgba[p + 1], m.kuwaharaRgba[p + 2], l, e, t.tone);
              const featureContrast = (0.18 + Math.pow(l, 0.85) * 0.82) * clip(0.25 + 0.75 * m.fdog[mIdx], 0.15, 1.0);
              const shade = featureContrast * (0.42 + nDotL * 0.78 + scanBoost);

              const rCol = Math.min(255, Math.round(baseR * shade + fresnelRim * 90 + spec * l));
              const gCol = Math.min(255, Math.round(baseG * shade + fresnelRim * 195 + spec * l));
              const bCol = Math.min(255, Math.round(baseB * shade + fresnelRim * 255 + spec * l));

              for (let dy = 0; dy <= splatRadius; dy++) {
                const rowOut = (sy + dy) * bW;
                for (let dx = 0; dx <= splatRadius; dx++) {
                  const outIdx = rowOut + (sx + dx);
                  if (rz2 > zBuffer[outIdx]) {
                    zBuffer[outIdx] = rz2;
                    const outP = outIdx * 4;
                    dst[outP] = rCol;
                    dst[outP + 1] = gCol;
                    dst[outP + 2] = bCol;
                  }
                }
              }
            }
          }

          shaderCtx.putImageData(outImg, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
        }
      }

      // ==========================================
      // РЕЖИМ 4: PRISM 22.0 (ЮВЕЛИРНАЯ СПЕКТРАЛЬНАЯ ДИФРАКЦИЯ НА ГРАНЯХ — БЕЗ БЕЛОГО ПЕРЕСВЕТА!)
      // ==========================================
      else if (s.topology === "PRISM" && shaderCtx) {
        const scaleDiv = art.fastPerfMode ? 2 : 1;
        const bW = Math.floor(m.w / scaleDiv);
        const bH = Math.floor(m.h / scaleDiv);
        if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
          shaderCanvas.width = bW;
          shaderCanvas.height = bH;
        }
        const outImg = shaderCtx.createImageData(bW, bH);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;
        const [bgR, bgG, bgB] = hexToRgb(bgHex);

        // Вектор преломления призмы
        const prismAngle = s.mouseActive
          ? Math.atan2(mNormY - 0.5, mNormX - 0.5)
          : time * 0.4 + 0.38;
        const dirX = Math.cos(prismAngle);
        const dirY = Math.sin(prismAngle);
        // Компактный, четкий шаг хроматического расщепления (4..16px), чтобы не размазывать картинку в белое мыло!
        const dispStep = (1.2 + art.glowAndPrism * 2.2);

        for (let y = 0; y < bH; y++) {
          const vOrig = y / bH;
          for (let x = 0; x < bW; x++) {
            const uOrig = x / bW;
            const sx = clip(Math.round((uOrig - layerTf.dx) * (m.w - 1)), 0, m.w - 1);
            const sy = clip(Math.round((vOrig - layerTf.dy) * (m.h - 1)), 0, m.h - 1);

            const idx = sy * m.w + sx;
            const outP = (y * bW + x) * 4;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) {
              dst[outP] = bgR;
              dst[outP + 1] = bgG;
              dst[outP + 2] = bgB;
              dst[outP + 3] = 255;
              continue;
            }

            const p = idx * 4;
            const l = m.lum[idx];
            const e = m.edge[idx];
            const fd = m.fdog[idx];

            // 1. Темнопольная кристаллическая база (не выгорает в белый цвет!)
            const darkCrystal = Math.pow(l, 1.15) * 0.52 * clip(0.25 + 0.75 * fd, 0.15, 1.0);
            let rAcc = (kuw[p] / 255.0) * darkCrystal;
            let gAcc = (kuw[p + 1] / 255.0) * darkCrystal;
            let bAcc = (kuw[p + 2] / 255.0) * darkCrystal;

            // 2. Истинная хроматическая дисперсия Коши:
            // Вместо сложения всех 7 цветов в белый, каждая длина волны берет ТОЛЬКО тонкий контурный гребень `edge * coherence`
            // на своем индивидуальном расстоянии преломления!
            for (let band = 0; band < 7; band++) {
              const offset = (band - 3.0) * dispStep;
              const rx = Math.round(sx + dirX * offset);
              const ry = Math.round(sy + dirY * offset);

              if (rx >= 0 && rx < m.w && ry >= 0 && ry < m.h) {
                const sIdx = ry * m.w + rx;
                const ridgeOnly = m.edge[sIdx] * (0.4 + 0.6 * m.coherence[sIdx]);
                if (ridgeOnly > 0.16) {
                  // Нормированный вес (0.24), чтобы 7 полос давали чистую радужную кайму вокруг граней и букв!
                  const wgt = (ridgeOnly - 0.14) * (0.18 + art.glowAndPrism * 0.22);
                  const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                  rAcc += (cr / 255.0) * wgt;
                  gAcc += (cg / 255.0) * wgt;
                  bAcc += (cb / 255.0) * wgt;
                }
              }
            }

            // 3. Четкое алмазное ядро на самой грани
            const coreEdge = e * m.coherence[idx] * 0.35;
            const rFinal = Math.round(acesTonemap(rAcc + coreEdge) * 255);
            const gFinal = Math.round(acesTonemap(gAcc + coreEdge) * 255);
            const bFinal = Math.round(acesTonemap(bAcc + coreEdge * 1.1) * 255);

            dst[outP] = Math.round(bgR * (1 - vMask) + rFinal * vMask);
            dst[outP + 1] = Math.round(bgG * (1 - vMask) + gFinal * vMask);
            dst[outP + 2] = Math.round(bgB * (1 - vMask) + bFinal * vMask);
            dst[outP + 3] = 255;
          }
        }
        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 5: SILK 22.0 (ШЕЛК КАДЖИИ — КЭЯ НА ЧИСТОМ КАСТОМНОМ ФОНЕ)
      // ==========================================
      else if (s.topology === "SILK") {
        renderPureSketchEtchLayer(0.35);

        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        ctx.lineCap = "round";

        const loom = m.silkLoom;
        const totalStrands = loom.length;
        const lightX = (s.fluidU - 0.5) * 2.2;
        const lightY = (s.fluidV - 0.5) * 2.2;
        const lLen = Math.hypot(lightX, lightY, 0.65);
        const lx = lightX / lLen;
        const ly = lightY / lLen;

        for (let i = 0; i < totalStrands; i++) {
          const st = loom[i];
          if (art.stageMode === "ISOLATE_SUBJECT" && st.subjectWeight < art.coherenceCleanliness) continue;
          const nPts = st.u.length;

          const midTx = st.tx[7];
          const midTy = st.ty[7];
          const tDotL = clip(midTx * lx + midTy * ly, -0.99, 0.99);
          const sinTL = Math.sqrt(Math.max(0.0, 1.0 - tDotL * tDotL));
          const sheenWave = 0.5 + 0.5 * Math.sin((st.u[0] * 6.0 - st.v[0] * 5.0) + time * 2.8 + st.phase * 0.25);
          const kajiyaSpec = Math.pow(sinTL * sheenWave, 5.0) * art.glowAndPrism * 165.0;

          const rS = Math.min(255, Math.round(st.cachedR + kajiyaSpec * 0.95));
          const gS = Math.min(255, Math.round(st.cachedG + kajiyaSpec * 0.98));
          const bS = Math.min(255, Math.round(st.cachedB + kajiyaSpec * 1.12));

          const alpha = clip(0.24 + st.edge * 0.62 + st.lum * 0.28 + sheenWave * 0.2, 0.12, 0.95);

          ctx.beginPath();
          for (let k = 0; k < nPts; k++) {
            const sNorm = k / (nPts - 1);
            const [sx, sy] = transformUnifiedPoint(
              st.u[k],
              st.v[k],
              st.z,
              -st.ty[k],
              st.tx[k],
              sNorm,
              st.phase,
              false,
              ox,
              oy,
              drawW,
              drawH,
              m,
              time,
              kin,
              art,
              s.smoothYaw,
              s.smoothPitch,
              camZoom,
              0,
              layerTf
            );
            if (k === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }

          ctx.strokeStyle = "rgba(" + String(rS) + "," + String(gS) + "," + String(bS) + "," + String(alpha.toFixed(2)) + ")";
          ctx.lineWidth = (0.42 + st.edge * 0.82) * st.weight * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 6: PAINT 22.0 (МУЗЕЙНЫЙ АНИЗОТРОПНЫЙ ИМПАСТО БЕЗ ДЕТСКИХ ПЯТЕН!)
      // ==========================================
      else if (s.topology === "PAINT" && shaderCtx) {
        const scaleDiv = art.fastPerfMode ? 2 : 1;
        const bW = Math.floor(m.w / scaleDiv);
        const bH = Math.floor(m.h / scaleDiv);
        if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
          shaderCanvas.width = bW;
          shaderCanvas.height = bH;
        }
        const outImg = shaderCtx.createImageData(bW, bH);
        const dst = outImg.data;
        const kuw = m.kuwaharaRgba;
        const [bgR, bgG, bgB] = hexToRgb(bgHex);

        const lightU = s.fluidU;
        const lightV = s.fluidV;

        for (let y = 0; y < bH; y++) {
          const vOrig = y / bH;
          for (let x = 0; x < bW; x++) {
            const uOrig = x / bW;
            const sx = clip(Math.round((uOrig - layerTf.dx) * (m.w - 1)), 0, m.w - 1);
            const sy = clip(Math.round((vOrig - layerTf.dy) * (m.h - 1)), 0, m.h - 1);

            const idx = sy * m.w + sx;
            const outP = (y * bW + x) * 4;
            const vMask = m.mask[idx];
            if (vMask <= 0.005) {
              dst[outP] = bgR;
              dst[outP + 1] = bgG;
              dst[outP + 2] = bgB;
              dst[outP + 3] = 255;
              continue;
            }

            const p = idx * 4;
            const l = m.lum[idx];
            const e = m.edge[idx];
            const fd = m.fdog[idx];

            // 1. Тонкий рельеф масляной кисти вдоль векторного поля касательных ETF (без грубых палок!)
            const bristleCoord = (sx * m.etfY[idx] - sy * m.etfX[idx]) * (0.85 / Math.max(0.35, m.scaleMap[idx]));
            const bristleRelief = Math.sin(bristleCoord) * (0.1 + e * 0.32) * art.strokeWeight;

            // 2. 3D-освещение гребней мазка по Блинну-Фонгу (умноженное на l, чтобы черные зоны оставались глубокими черными!)
            const lx = lightU - uOrig;
            const ly = lightV - vOrig;
            const lNorm = Math.hypot(lx, ly, 0.5);
            const nx = m.gx[idx] * e + m.etfY[idx] * bristleRelief;
            const ny = m.gy[idx] * e - m.etfX[idx] * bristleRelief;
            const dotLight = Math.max(0.0, (nx * lx + ny * ly + 0.5) / lNorm);
            const oilSpecular = Math.pow(dotLight, 14.0) * art.glowAndPrism * 135.0 * smoothstep(0.08, 0.45, l + e);

            const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone, false, false);
            const inkContour = clip(0.28 + 0.72 * Math.tanh(9.0 * (fd - 0.23)), 0.15, 1.0);
            const shade = inkContour * (0.92 + bristleRelief * 0.25) * smoothstep(0.02, 0.14, l + e * 0.8);

            const rFinal = Math.min(255, Math.max(0, Math.round((kuw[p] * 0.65 + edR * 0.35) * shade + oilSpecular)));
            const gFinal = Math.min(255, Math.max(0, Math.round((kuw[p + 1] * 0.65 + edG * 0.35) * shade + oilSpecular * 0.96)));
            const bFinal = Math.min(255, Math.max(0, Math.round((kuw[p + 2] * 0.65 + edB * 0.35) * shade + oilSpecular * 0.9)));

            dst[outP] = Math.round(bgR * (1 - vMask) + rFinal * vMask);
            dst[outP + 1] = Math.round(bgG * (1 - vMask) + gFinal * vMask);
            dst[outP + 2] = Math.round(bgB * (1 - vMask) + bFinal * vMask);
            dst[outP + 3] = 255;
          }
        }
        shaderCtx.putImageData(outImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);

        // Поверх масляной основы укладываем плавные изогнутые мазки РК2 вдоль контуров!
        ctx.globalCompositeOperation = "screen";
        ctx.lineCap = "round";
        const strokes = m.strokes;
        for (let i = 0; i < strokes.length; i++) {
          const st = strokes[i];
          if (st.tier > 1 || st.meanLum < 0.08) continue;
          ctx.beginPath();
          for (let k = 0; k < st.nPts; k++) {
            const [cx, cy] = transformUnifiedPoint(
              st.u[k],
              st.v[k],
              st.z[k],
              st.nx[k],
              st.ny[k],
              k / Math.max(1, st.nPts - 1),
              st.phase,
              true,
              ox,
              oy,
              drawW,
              drawH,
              m,
              time,
              kin,
              art,
              s.smoothYaw,
              s.smoothPitch,
              camZoom,
              0,
              layerTf
            );
            if (k === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          }
          ctx.strokeStyle = "rgba(" + String(st.cachedR) + "," + String(st.cachedG) + "," + String(st.cachedB) + ",0.42)";
          ctx.lineWidth = (0.55 + st.meanEdge * 0.85) * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 7: ENGRAVE 22.0
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        renderPureSketchEtchLayer(0.28);

        const numLines = Math.floor(125 + (1.0 - art.coherenceCleanliness) * 65);
        const numCols = 230;
        const maxElevation = (drawH / numLines) * (2.2 + t.structure * 2.4);

        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        ctx.lineCap = "round";

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));

          let prevX = ox;
          let prevY = oy + vNorm * drawH;

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const uNorm = cIdx / (numCols - 1);
            const sx = Math.min(m.w - 1, Math.floor(uNorm * m.w));
            const cell = sy * m.w + sx;
            const subjW = m.subjectAlpha[cell];
            if (art.stageMode === "ISOLATE_SUBJECT" && subjW < art.coherenceCleanliness) continue;

            const l = m.lum[cell];
            const e = m.edge[cell];
            const vMask = m.mask[cell];
            if (vMask < 0.05 || (l < 0.05 && e < 0.05)) continue;

            const [px, py] = transformUnifiedPoint(
              uNorm,
              vNorm,
              m.depthMap[cell],
              0,
              -1,
              uNorm,
              rIdx * 0.2,
              false,
              ox,
              oy,
              drawW,
              drawH,
              m,
              time,
              kin,
              art,
              s.smoothYaw,
              s.smoothPitch,
              camZoom,
              0,
              layerTf
            );

            const carrier = Math.sin(uNorm * (36.0 + e * 45.0) + time * 3.5 + rIdx * 0.45) * e * 0.35;
            const curY = py - (l * 0.82 + e * 0.55 + carrier) * maxElevation * vMask;

            if (cIdx > 0 && Math.abs(px - prevX) < 18) {
              const p4 = cell * 4;
              const [rC, gC, bC] = resolveEditionColor(art, m.kuwaharaRgba[p4], m.kuwaharaRgba[p4 + 1], m.kuwaharaRgba[p4 + 2], l, e, t.tone, false, true);
              const alpha = clip((0.2 + l * 0.65 + e * 0.55) * vMask, 0.08, 0.95);
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
              ctx.lineWidth = (0.35 + l * 1.15 + e * 0.95) * art.strokeWeight;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(px, curY);
              ctx.stroke();
            }
            prevX = px;
            prevY = curY;
          }
        }
      }

      // ==========================================
      // РЕЖИМЫ 8, 9: CINEMA & HALFTONE
      // ==========================================
      else if (s.topology === "CINEMA" || s.topology === "HALFTONE") {
        if (shaderCtx) {
          const scaleDiv = art.fastPerfMode ? 2 : 1;
          const bW = Math.floor(m.w / scaleDiv);
          const bH = Math.floor(m.h / scaleDiv);
          if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
            shaderCanvas.width = bW;
            shaderCanvas.height = bH;
          }
          const outImg = shaderCtx.createImageData(bW, bH);
          const dst = outImg.data;
          const kuw = m.kuwaharaRgba;
          const dotFreq = (0.55 + t.symmetry * 0.65) / Math.max(0.5, art.strokeWeight);

          for (let y = 0; y < bH; y++) {
            const vOrig = y / bH;
            for (let x = 0; x < bW; x++) {
              const uOrig = x / bW;
              const sx = clip(Math.round((uOrig - layerTf.dx) * (m.w - 1)), 0, m.w - 1);
              const sy = clip(Math.round((vOrig - layerTf.dy) * (m.h - 1)), 0, m.h - 1);

              const idx = sy * m.w + sx;
              const outP = (y * bW + x) * 4;
              const vMask = m.mask[idx];
              if (vMask <= 0.005) continue;

              const p = idx * 4;
              const l = m.lum[idx];
              const e = m.edge[idx];
              const fd = m.fdog[idx];

              let rOut = kuw[p], gOut = kuw[p + 1], bOut = kuw[p + 2];

              if (s.topology === "CINEMA") {
                const halation = Math.max(0.0, m.smoothLum[idx] - 0.34) * art.glowAndPrism * 185.0;
                const [edR, edG, edB] = resolveEditionColor(
                  art.edition === "SHINE_ON" ? { ...art, edition: "KODAK_800T" } : art,
                  kuw[p],
                  kuw[p + 1],
                  kuw[p + 2],
                  l,
                  e,
                  t.tone
                );
                const grain = ((Math.sin(x * 12.989 + y * 78.233 + time * 35) * 43758.54) % 1.0 - 0.5) * 16.0;
                rOut = acesTonemap((edR + halation * 1.15 + grain) / 255.0) * 255;
                gOut = acesTonemap((edG + halation * 0.32 + grain) / 255.0) * 255;
                bOut = acesTonemap((edB + halation * 0.08 + grain) / 255.0) * 255;
              } else {
                const cGrid = 0.5 + 0.25 * (Math.cos((sx * 0.966 - sy * 0.259) * dotFreq) + Math.cos((sx * 0.259 + sy * 0.966) * dotFreq));
                const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone, false, true);
                const inkLine = fd < 0.26 && e > 0.16 ? 0.08 : 1.0;
                const dotVal = (l + e * 0.3 > cGrid * 0.85 ? 1.0 : 0.18) * inkLine;
                rOut = edR * dotVal;
                gOut = edG * dotVal;
                bOut = edB * dotVal;
              }

              dst[outP] = Math.min(255, Math.max(0, Math.round(rOut * vMask)));
              dst[outP + 1] = Math.min(255, Math.max(0, Math.round(gOut * vMask)));
              dst[outP + 2] = Math.min(255, Math.max(0, Math.round(bOut * vMask)));
              dst[outP + 3] = 255;
            }
          }
          shaderCtx.putImageData(outImg, 0, 0);
          ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
        }
      }

      if (is3DActive) {
        draw3DGimbalGizmo(s.smoothYaw, s.smoothPitch, art.lockFrontAnfas, ox, oy, drawH);
      }

      if (art.posterFrame) {
        ctx.globalCompositeOperation = "source-over";
        const frameStroke = isPaper ? "rgba(45, 30, 18, 0.4)" : "rgba(255, 255, 255, 0.18)";
        const textFill = isPaper ? "rgba(45, 30, 18, 0.78)" : "rgba(255, 255, 255, 0.58)";

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 1.1;
        ctx.strokeRect(ox - 10, oy - 10, drawW + 20, drawH + 26);

        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = textFill;
        ctx.textAlign = "left";
        ctx.fillText(
          "BARRETT 22.0 // " + (query || "SHINE ON").toUpperCase().slice(0, 18) + " [" + s.topology + " · " + art.backdrop + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          kin.modeName + " | H(X)=" + String(c.entropy) + "b | λ=" + String(c.eigenAnisotropy),
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

  const handleExportAnimatedGif = () => {
    const srcCanvas = canvasRef.current;
    if (!srcCanvas || isExportingGif) return;
    setIsExportingGif(true);

    const gifW = 420;
    const gifH = Math.round((srcCanvas.height / Math.max(1, srcCanvas.width)) * gifW);
    const recCanvas = document.createElement("canvas");
    recCanvas.width = gifW;
    recCanvas.height = gifH;
    const rCtx = recCanvas.getContext("2d");

    if (!rCtx) {
      setIsExportingGif(false);
      return;
    }

    const frames: ImageData[] = [];
    const totalFrames = 32;
    let captured = 0;

    const captureStep = () => {
      stateRef.current.time += 0.045;
      rCtx.drawImage(srcCanvas, 0, 0, gifW, gifH);
      frames.push(rCtx.getImageData(0, 0, gifW, gifH));
      captured++;

      if (captured < totalFrames) {
        setTimeout(captureStep, 45);
      } else {
        try {
          const blob = encodeAnimatedGIF89a(frames, gifW, gifH, 5);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "barrett-kinetic-" + String(Date.now()) + ".gif";
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("GIF encoding error:", err);
        }
        setIsExportingGif(false);
      }
    };

    captureStep();
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

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT 22.0 */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[600px] md:h-[780px] rounded-2xl overflow-hidden border border-white/10 bg-[#040308] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheelZoom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onMouseLeave={handleMouseLeave}
          onTouchEnd={handleMouseLeave}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: artConfig.dimension === "3D_SPACE" && !artConfig.lockFrontAnfas ? "grab" : "crosshair",
            touchAction: "none",
          }}
        />

        {/* ВЕРХНИЙ БАР */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start gap-2">
          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300 pointer-events-none">
            <div className="text-white font-bold">BARRETT 22.0 // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#10b981] mt-0.5">{fieldStatus}</div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex bg-black/85 backdrop-blur-md p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => updateArt("dimension", "2D_STUDIO")}
                className={
                  "px-3 py-1 rounded-lg font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer " +
                  (artConfig.dimension === "2D_STUDIO"
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white")
                }
              >
                2D Pure Sketch
              </button>
              <button
                type="button"
                onClick={() => {
                  updateArt("dimension", "3D_SPACE");
                  setTopology("SCULPT3D");
                }}
                className={
                  "px-3 py-1 rounded-lg font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer " +
                  (artConfig.dimension === "3D_SPACE"
                    ? "bg-[#10b981] text-black font-bold"
                    : "text-neutral-400 hover:text-white")
                }
              >
                3D Relief
              </button>
            </div>

            <button
              type="button"
              onClick={lockModelFrontAnfas}
              className={
                "px-3 py-1.5 rounded-xl border font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer " +
                (artConfig.lockFrontAnfas
                  ? "bg-[#fde047] text-black border-[#fde047] font-bold shadow-[0_0_12px_rgba(253,224,71,0.4)]"
                  : "bg-black/85 text-white border-white/20 hover:border-white/50")
              }
            >
              {artConfig.lockFrontAnfas ? "Locked: Анфас (0°)" : "Lock Front (Анфас)"}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextFast = !artConfig.fastPerfMode;
                updateArt("fastPerfMode", nextFast);
                if (candidateUrls[candidateIdx]) {
                  loadMatrixFromUrl(candidateUrls[candidateIdx], candidateIdx, candidateUrls.length);
                }
              }}
              className={
                "px-2.5 py-1.5 rounded-xl border font-mono text-[8px] uppercase tracking-wider cursor-pointer " +
                (artConfig.fastPerfMode
                  ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981]"
                  : "bg-black/80 border-white/15 text-neutral-400")
              }
            >
              PERF: {artConfig.fastPerfMode ? "FAST" : "HD 760P"}
            </button>
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
                  "SKETCH",
                  "SCULPT3D",
                  "PRISM",
                  "SILK",
                  "PAINT",
                  "ENGRAVE",
                  "CINEMA",
                  "HALFTONE",
                  "LIDAR",
                ] as ManifoldTopology[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopology(mode);
                    if (mode === "SCULPT3D" || mode === "LIDAR") {
                      updateArt("dimension", "3D_SPACE");
                    } else {
                      updateArt("dimension", "2D_STUDIO");
                    }
                    if (mode === "TRACE" || mode === "SKETCH") stateRef.current.traceProgress = 0;
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

      {/* ЕДИНАЯ ПРОФЕССИОНАЛЬНАЯ ПАНЕЛЬ BARRETT 22.0 */}
      <div className="lg:col-span-4 glass-panel p-5 flex flex-col justify-between gap-3.5">
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
          {/* 1. ПРОМПТ-СИНТЕЗАТОР АНИМАЦИИ */}
          <div className="p-3 rounded-xl bg-black/60 border border-[#10b981]/40 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[#10b981] font-bold">1. Prompt Animation Synthesizer:</span>
              <span className="text-[7.5px] text-neutral-400">{kineticCoords.modeName}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "ANIMATE_ART", label: "Animate Art" },
                  { id: "DRAW_THEN_ANIMATE", label: "Draw -> Animate" },
                  { id: "ISOLATE_SUBJECT", label: "Cutout Subject" },
                ] as { id: AnimationStageMode; label: string }[]
              ).map((sm) => (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => updateArt("stageMode", sm.id)}
                  className={
                    "py-1.5 px-1.5 rounded-lg border text-[7.5px] tracking-wider transition-all cursor-pointer " +
                    (artConfig.stageMode === sm.id
                      ? "bg-white text-black border-white font-bold"
                      : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                  }
                >
                  {sm.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={animPromptInput}
                onChange={(e) => setAnimPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyPrompt();
                  }
                }}
                placeholder="Опиши движение (парение, дыхание, ритм, ветер, пульс)..."
                className="flex-1 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1.5 text-[9.5px] text-white font-mono normal-case focus:outline-none focus:border-[#10b981]"
              />
              <button
                type="button"
                onClick={() => handleApplyPrompt()}
                className="px-3 py-1.5 rounded-lg bg-[#10b981] text-black font-bold text-[8.5px] uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shrink-0"
              >
                Animate
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {PROMPT_PRESETS.map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  onClick={() => handleApplyPrompt(pr.prompt, pr.is3D, pr.stage)}
                  className={
                    "py-1 px-1.5 rounded border text-[7.5px] tracking-wider truncate transition-all cursor-pointer " +
                    (animPromptInput === pr.prompt
                      ? "bg-[#10b981]/25 text-[#10b981] border-[#10b981] font-bold"
                      : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                  }
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. ВЫБОР КАСТОМНОГО ФОНА ХОЛСТА */}
          <div>
            <div className="flex justify-between items-center text-neutral-400 mb-1.5">
              <span>2. Custom Canvas Backdrop:</span>
              <button
                type="button"
                onClick={() => updateArt("posterFrame", !artConfig.posterFrame)}
                className={
                  "px-2 py-0.5 rounded border text-[7.5px] cursor-pointer transition-all " +
                  (artConfig.posterFrame
                    ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                    : "border-white/15 text-neutral-400")
                }
              >
                Poster Frame
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: "OBSIDIAN", label: "Obsidian", col: "#040308" },
                  { id: "VOID_BLACK", label: "Void Black", col: "#000000" },
                  { id: "MIDNIGHT", label: "Midnight", col: "#060e1e" },
                  { id: "VELVET_NOIR", label: "Velvet", col: "#14050b" },
                  { id: "ARCHIVAL_PAPER", label: "Paper", col: "#e8dcc4" },
                ] as { id: CanvasBackdrop; label: string; col: string }[]
              ).map((bd) => (
                <button
                  key={bd.id}
                  type="button"
                  onClick={() => updateArt("backdrop", bd.id)}
                  className={
                    "py-1.5 px-1 rounded-lg border text-[7.5px] flex items-center justify-center gap-1 transition-all cursor-pointer " +
                    (artConfig.backdrop === bd.id
                      ? "bg-white text-black border-white font-bold"
                      : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                  }
                >
                  <span className="w-2 h-2 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: bd.col }} />
                  <span className="truncate">{bd.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. ХУДОЖЕСТВЕННАЯ ПАЛИТРА */}
          <div>
            <div className="text-neutral-400 mb-1.5">3. Artistic & Optical Grade:</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "SHINE_ON", label: "Shine On", dot: "linear-gradient(135deg,#38bdf8,#f59e0b)" },
                  { id: "PIXAR_SSS", label: "Pixar 3D", dot: "linear-gradient(135deg,#fb7185,#38bdf8)" },
                  { id: "DARK_SIDE", label: "Prism Ray", dot: "linear-gradient(135deg,#ef4444,#3b82f6)" },
                  { id: "REMBRANDT", label: "Rembrandt", dot: "linear-gradient(135deg,#451a03,#fde68a)" },
                  { id: "KODAK_800T", label: "35mm Film", dot: "linear-gradient(135deg,#0284c7,#f97316)" },
                  { id: "VOGUE_NOIR", label: "Noir Red", dot: "linear-gradient(135deg,#f8fafc,#ef4444)" },
                  { id: "WARHOL_POP", label: "Pop Art", dot: "linear-gradient(135deg,#ff1476,#00ebf5)" },
                  { id: "DA_VINCI", label: "Da Vinci", dot: "linear-gradient(135deg,#e8dcc4,#963d28)" },
                  { id: "CUSTOM_GRADE", label: "Custom RGB", dot: "linear-gradient(135deg,#a855f7,#fde047)" },
                ] as { id: TributeEdition; label: string; dot: string }[]
              ).map((ed) => (
                <button
                  key={ed.id}
                  type="button"
                  onClick={() => updateArt("edition", ed.id)}
                  className={
                    "py-1.5 px-2 rounded-lg border text-[8px] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer " +
                    (artConfig.edition === ed.id
                      ? "bg-white text-black border-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                      : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                  }
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20" style={{ background: ed.dot }} />
                  <span className="truncate">{ed.label}</span>
                </button>
              ))}
            </div>

            {artConfig.edition === "CUSTOM_GRADE" && (
              <div className="grid grid-cols-3 gap-2 mt-2 p-2 rounded-xl bg-black/50 border border-white/10">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={artConfig.shadowHex}
                    onChange={(e) => updateArt("shadowHex", e.target.value)}
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[7.5px] text-neutral-300">Shadow</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={artConfig.midtoneHex}
                    onChange={(e) => updateArt("midtoneHex", e.target.value)}
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[7.5px] text-neutral-300">Mid</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={artConfig.highlightHex}
                    onChange={(e) => updateArt("highlightHex", e.target.value)}
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[7.5px] text-neutral-300">Light</span>
                </label>
              </div>
            )}
          </div>

          {/* 4. ЧЕТЫРЕ ТОЧНЫХ ПОЛЗУНКА */}
          <div className="flex flex-col gap-2 pt-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Sketch Cleanliness & Cutout Gate</span>
                <span className="text-[#10b981]">{Math.round(artConfig.coherenceCleanliness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.06"
                max="0.75"
                step="0.02"
                value={artConfig.coherenceCleanliness}
                onChange={(e) => updateArt("coherenceCleanliness", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Calligraphic Spline & Silk Calibre</span>
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
                <span>3D Dome Depth & Motion Amplitude</span>
                <span className="text-[#a855f7]">{Math.round(artConfig.relief3DAndMotion * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.02"
                value={artConfig.relief3DAndMotion}
                onChange={(e) => updateArt("relief3DAndMotion", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Prism Dispersion & Specular Contrast</span>
                <span className="text-[#fde047]">{Math.round(artConfig.glowAndPrism * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.02"
                value={artConfig.glowAndPrism}
                onChange={(e) => updateArt("glowAndPrism", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* БЛОК ЭКСПОРТА */}
        <div className="flex flex-col gap-2 pt-2.5 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadSnapshot}
              className="btn-elegant !py-2 justify-center text-[9px]"
            >
              Download PNG
            </button>

            <button
              type="button"
              disabled={isExportingGif}
              onClick={handleExportAnimatedGif}
              className="btn-elegant !py-2 justify-center border-[#10b981]/60 text-[#10b981] text-[9px]"
            >
              {isExportingGif ? "Encoding GIF..." : "Export Animated GIF"}
            </button>
          </div>

          <button
            type="button"
            disabled={isRecording}
            onClick={handleRecordWebm}
            className="btn-elegant w-full !py-2 justify-center border-[#a855f7]/50 text-[#a855f7]"
          >
            {isRecording ? "Recording 60FPS Loop (5s)..." : "Export 5s WebM Video Loop"}
          </button>

          {onSecureArtifact && (
            <button
              type="button"
              onClick={handleSecureToArchive}
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
              className="btn-elegant w-full !py-2 justify-center font-bold"
            >
              Secure to Saved Resonance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
