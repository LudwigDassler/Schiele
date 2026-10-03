"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

type DimensionSpace = "2D_STUDIO" | "3D_SPACE";
type Render3DStyle = "HYBRID_SOLID" | "PURE_SOLID" | "WIREFRAME_MESH";

interface KineticPromptCoordinates {
  promptText: string;
  modeName: string;
  orbitYawAmp: number;
  orbitPitchAmp: number;
  orbitSpeed: number;
  zoomAmp: number;
  zoomFreq: number;
  windVecX: number;
  windVecY: number;
  turbulence: number;
  pulseAmp: number;
  pulseFreq: number;
  shockwaveAmp: number;
  rippleWaveAmp: number;
  elasticSwayAmp: number;
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
  | "ARCANE_OIL"
  | "VOGUE_NOIR"
  | "WARHOL_POP"
  | "DARK_SIDE"
  | "POMPEII"
  | "DA_VINCI";

type TraceArchitecture =
  | "HYPER_ADAPTIVE"
  | "TROIS_CRAYONS"
  | "CROSS_HATCH"
  | "GUILLOCHE"
  | "LASER_STRINGS";

interface ArtStudioConfig {
  dimension: DimensionSpace;
  render3DStyle: Render3DStyle;
  autoOrbit3D: boolean;
  fastPerfMode: boolean;
  edition: TributeEdition;
  architecture: TraceArchitecture;
  posterFrame: boolean;
  strokeWeight: number;
  coherenceGate: number;
  foundationDepth: number;
  luminanceGlow: number;
  highlightBoost: number;
  depthExtrusion3D: number;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  vignetteStrength: number;
  canvasGrain: number;
  customGrading: boolean;
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
  tier: 0 | 1 | 2 | 3 | 4;
  r: number;
  g: number;
  b: number;
  cachedR: number;
  cachedG: number;
  cachedB: number;
  meanEdge: number;
  meanLum: number;
  meanCoherence: number;
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
  subjectMask: Float32Array;
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
  | "SILK"
  | "SCULPT3D"
  | "PAINT"
  | "CINEMA"
  | "SKETCH"
  | "HALFTONE"
  | "PRISM"
  | "LIDAR"
  | "PIPER"
  | "ENGRAVE";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
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

const PROMPT_PRESETS: { label: string; prompt: string; is3D?: boolean }[] = [
  { label: "3D Orbital Sculpture", prompt: "Smooth 3D orbital rotation, deep relief extrusion and perspective parallax", is3D: true },
  { label: "Silk Laminar Breeze", prompt: "Gentle laminar wind flow across silk fibers, soft breathing and sheen", is3D: false },
  { label: "Harmonic Rhythm & Sway", prompt: "Rhythmic harmonic oscillation, elastic sway and phase resonance", is3D: false },
  { label: "Radial Shockwave Pulse", prompt: "Expanding radial shockwave impulse, high energy frequency and vibration", is3D: false },
  { label: "Hydrodynamic Vortex", prompt: "Turbulent curl vortex advection, fluid wave ripple and strong current", is3D: false },
  { label: "Geodesic Timelapse Draw", prompt: "Progressive geodesic vector drawing from scratch and golden ratio grid", is3D: false },
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

// ==========================================
// УНИВЕРСАЛЬНЫЙ КОМПИЛЯТОР ПРОМПТА В ДИФФЕРЕНЦИАЛЬНЫЕ КООРДИНАТЫ ДВИЖЕНИЯ
// ==========================================
function compileAnimationPrompt(rawPrompt: string): KineticPromptCoordinates {
  const text = (rawPrompt || "Gentle laminar wind flow and soft breathing").trim().toLowerCase();

  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normHash = (Math.abs(hash) % 1000) / 1000;

  let orbitYawAmp = 0.0;
  let orbitPitchAmp = 0.0;
  let orbitSpeed = 0.55;
  let zoomAmp = 0.0;
  let zoomFreq = 0.4;
  let windVecX = 0.14;
  let windVecY = -0.04;
  let turbulence = 0.18;
  let pulseAmp = 0.22;
  let pulseFreq = 1.8;
  let shockwaveAmp = 0.0;
  let rippleWaveAmp = 0.0;
  let elasticSwayAmp = 0.0;
  let timelapseLoop = false;
  const tags: string[] = [];

  const speedMult = /(быстр|стремител|шторм|fast|rapid|storm|hyper|high|intense)/.test(text)
    ? 1.65
    : /(медлен|плавн|спокойн|нежн|тихий|slow|smooth|calm|gentle|soft)/.test(text)
    ? 0.65
    : 1.0;

  const powerMult = /(сильн|мощн|максим|взрыв|глубок|strong|heavy|max|deep|extreme)/.test(text)
    ? 1.5
    : /(едва|легк|тонк|subtle|slight|delicate)/.test(text)
    ? 0.55
    : 1.0;

  // 1. Радиальный импульс / взрывная волна / удар
  if (/(импульс|взрыв|удар|волн|динамит|пульс|shock|blast|impulse|explod|radial|impact|boom)/.test(text)) {
    shockwaveAmp = 0.72 * powerMult;
    pulseAmp = 0.55 * powerMult;
    pulseFreq = 2.8 * speedMult;
    tags.push("RADIAL-IMPULSE");
  }

  // 2. Упругая кинематика / ритм / танец / колебание
  if (/(ритм|танц|колебан|упруг|покачив|движен|прыж|rhythm|dance|sway|oscillat|elastic|bounce|groove)/.test(text)) {
    elasticSwayAmp = 0.65 * powerMult;
    pulseAmp = Math.max(pulseAmp, 0.45 * powerMult);
    pulseFreq = 3.4 * speedMult;
    tags.push("ELASTIC-KINEMATICS");
  }

  // 3. 3D вращение / орбита / параллакс
  if (/(3d|3д|вращ|орбит|облет|скульпт|поворот|параллакс|рельеф|orbit|rotate|spin|sculpt|relief|parallax)/.test(text)) {
    orbitYawAmp = 0.52 * powerMult;
    orbitPitchAmp = 0.32 * powerMult;
    orbitSpeed = 0.7 * speedMult;
    tags.push("3D-ORBIT");
  }

  // 4. Наезд камеры / зум
  if (/(зум|приближ|наезд|отдален|полет|zoom|dolly|fly|closer)/.test(text)) {
    zoomAmp = 0.14 * powerMult;
    zoomFreq = 0.65 * speedMult;
    tags.push("DOLLY-ZOOM");
  }

  // 5. Ламинарный ветер / вихрь / турбулентность
  if (/(ветер|ветр|волос|шелк|вихр|буря|поток|шторм|wind|breeze|silk|vortex|turbulen|current|flow)/.test(text)) {
    windVecX = (/(влево|left)/.test(text) ? -0.6 : 0.6) * powerMult;
    windVecY = -0.15 * powerMult;
    turbulence = Math.max(turbulence, 0.58 * powerMult);
    tags.push("VORTEX-FLOW");
  }

  // 6. Дыхание / био-резонанс
  if (/(дыхан|дышит|жив|сердц|breathe|breath|alive|heart)/.test(text)) {
    pulseAmp = Math.max(pulseAmp, 0.45 * powerMult);
    pulseFreq = 2.0 * speedMult;
    tags.push("BIO-BREATHE");
  }

  // 7. Гидродинамическая рябь
  if (/(вод|рябь|океан|море|течен|жидк|water|ripple|ocean|liquid|sea)/.test(text)) {
    rippleWaveAmp = 0.65 * powerMult;
    tags.push("HYDRO-RIPPLE");
  }

  // 8. Пошаговая геодезическая развертка (рисование с нуля)
  if (/(рисов|перо|таймлапс|с нуля|штрих|карандаш|разверт|draw|timelapse|sketch|geodesic)/.test(text)) {
    timelapseLoop = true;
    tags.push("GEODESIC-DRAW");
  }

  // 9. Статичная фиксация
  if (/(статик|неподвиж|стоп|замри|static|still|freeze)/.test(text)) {
    orbitYawAmp = 0;
    orbitPitchAmp = 0;
    zoomAmp = 0;
    windVecX = 0;
    windVecY = 0;
    turbulence = 0;
    pulseAmp = 0;
    shockwaveAmp = 0;
    rippleWaveAmp = 0;
    elasticSwayAmp = 0;
    tags.push("STATIC-LOCK");
  }

  if (tags.length === 0) {
    pulseAmp = Number((0.22 + normHash * 0.35).toFixed(3));
    turbulence = Number((0.18 + ((normHash * 7) % 1) * 0.35).toFixed(3));
    elasticSwayAmp = Number((0.15 + ((normHash * 13) % 1) * 0.3).toFixed(3));
    tags.push("HARMONIC-FIELD");
  }

  return {
    promptText: rawPrompt,
    modeName: tags.join(" · "),
    orbitYawAmp: Number(clip(orbitYawAmp, 0, 0.95).toFixed(3)),
    orbitPitchAmp: Number(clip(orbitPitchAmp, 0, 0.75).toFixed(3)),
    orbitSpeed: Number(clip(orbitSpeed, 0.1, 2.5).toFixed(3)),
    zoomAmp: Number(clip(zoomAmp, 0, 0.28).toFixed(3)),
    zoomFreq: Number(clip(zoomFreq, 0.1, 2.0).toFixed(3)),
    windVecX: Number(clip(windVecX, -1.0, 1.0).toFixed(3)),
    windVecY: Number(clip(windVecY, -1.0, 1.0).toFixed(3)),
    turbulence: Number(clip(turbulence, 0, 1.0).toFixed(3)),
    pulseAmp: Number(clip(pulseAmp, 0, 1.0).toFixed(3)),
    pulseFreq: Number(clip(pulseFreq, 0.2, 6.0).toFixed(3)),
    shockwaveAmp: Number(clip(shockwaveAmp, 0, 1.0).toFixed(3)),
    rippleWaveAmp: Number(clip(rippleWaveAmp, 0, 1.0).toFixed(3)),
    elasticSwayAmp: Number(clip(elasticSwayAmp, 0, 1.0).toFixed(3)),
    timelapseLoop,
  };
}

// Автономный LZW-кодировщик GIF89a
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

function applyPhotoshopGrading(
  rIn: number,
  gIn: number,
  bIn: number,
  art: ArtStudioConfig
): [number, number, number] {
  const expMult = Math.pow(2.0, art.exposure);
  let r = rIn * expMult;
  let g = gIn * expMult;
  let b = bIn * expMult;

  r += art.temperature * 45.0;
  b -= art.temperature * 45.0;

  r = (r - 128.0) * art.contrast + 128.0;
  g = (g - 128.0) * art.contrast + 128.0;
  b = (b - 128.0) * art.contrast + 128.0;

  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  r = luma + (r - luma) * art.saturation;
  g = luma + (g - luma) * art.saturation;
  b = luma + (b - luma) * art.saturation;

  return [
    Math.min(255, Math.max(0, Math.round(r))),
    Math.min(255, Math.max(0, Math.round(g))),
    Math.min(255, Math.max(0, Math.round(b))),
  ];
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

  let rOut = nativeR;
  let gOut = nativeG;
  let bOut = nativeB;

  if (art.customGrading) {
    const [r1, g1, b1] = hexToRgb(art.shadowHex);
    const [r2, g2, b2] = hexToRgb(art.midtoneHex);
    const [r3, g3, b3] = hexToRgb(art.highlightHex);
    if (energy < 0.5) {
      const t = energy * 2.0;
      rOut = r1 * (1 - t) + r2 * t;
      gOut = g1 * (1 - t) + g2 * t;
      bOut = b1 * (1 - t) + b2 * t;
    } else {
      const t = (energy - 0.5) * 2.0;
      rOut = r2 * (1 - t) + r3 * t;
      gOut = g2 * (1 - t) + g3 * t;
      bOut = b2 * (1 - t) + b3 * t;
    }
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  const edition = art.edition;
  const ph = (phaseShift + energy * 0.65) * Math.PI * 2.0;

  if (edition === "DA_VINCI") {
    if (isHighlightStroke) return [252, 248, 238];
    if (lum > 0.42 && edge < 0.35) return applyPhotoshopGrading(148, 68, 42, art);
    const inkShade = clip(1.0 - edge * 0.75 - (1.0 - lum) * 0.45, 0.06, 0.38);
    return applyPhotoshopGrading(52 * inkShade, 36 * inkShade, 28 * inkShade, art);
  }

  if (edition === "PIXAR_SSS") {
    if (isHighlightStroke) return [255, 248, 230];
    const sssBand = Math.sin(lum * Math.PI);
    rOut = nativeR * 0.55 + (45 + lum * 205 + sssBand * 55) * 0.45;
    gOut = nativeG * 0.55 + (35 + lum * 195 + edge * 45) * 0.45;
    bOut = nativeB * 0.55 + (65 + lum * 185 + (1.0 - lum) * 55) * 0.45;
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  if (edition === "REMBRANDT") {
    if (isHighlightStroke) return [255, 240, 200];
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    rOut = avg * 0.45 + (55 + Math.pow(energy, 0.85) * 200) * 0.55 + art.highlightBoost * 35;
    gOut = avg * 0.45 + (38 + Math.pow(energy, 0.95) * 175) * 0.55 + art.highlightBoost * 28;
    bOut = avg * 0.45 + (22 + Math.pow(energy, 1.25) * 135) * 0.55 + art.highlightBoost * 18;
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  if (edition === "WARHOL_POP") {
    if (lum < 0.26) return applyPhotoshopGrading(18, 12, 28, art);
    if (lum < 0.52) return applyPhotoshopGrading(255, 20, 118, art);
    if (lum < 0.76) return applyPhotoshopGrading(0, 235, 245, art);
    return applyPhotoshopGrading(255, 238, 25, art);
  }

  if (edition === "KODAK_800T") {
    if (isHighlightStroke) return [255, 230, 190];
    const shadowWeight = 1.0 - smoothstep(0.15, 0.65, lum);
    const hiWeight = smoothstep(0.42, 0.92, lum);
    rOut = nativeR * 0.52 + (25 + shadowWeight * 15 + hiWeight * 230 + edge * 55) * 0.48;
    gOut = nativeG * 0.52 + (68 + shadowWeight * 58 + hiWeight * 170 + edge * 38) * 0.48;
    bOut = nativeB * 0.52 + (98 + shadowWeight * 98 + hiWeight * 95 + edge * 28) * 0.48;
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  if (edition === "ARCANE_OIL") {
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    rOut = avg + (nativeR - avg) * 1.75 + (lum > 0.58 ? 48 : 16);
    gOut = avg + (nativeG - avg) * 1.65 + (edge > 0.24 ? 42 : 14);
    bOut = avg + (nativeB - avg) * 1.75 + (lum < 0.42 ? 58 : 26);
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  if (edition === "VOGUE_NOIR") {
    if (edge > 0.36 && lum > 0.25 && lum < 0.75) return applyPhotoshopGrading(245, 28, 45, art);
    const v = clip(Math.round(145 + energy * 110), 25, 255);
    return applyPhotoshopGrading(v, v, v + 6, art);
  }

  if (edition === "SHINE_ON") {
    const avg = (nativeR + nativeG + nativeB) * 0.333;
    const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
    if (sat > 16) {
      rOut = avg + (nativeR - avg) * 1.55 + edge * 48;
      gOut = avg + (nativeG - avg) * 1.55 + edge * 48;
      bOut = avg + (nativeB - avg) * 1.55 + edge * 58;
    } else {
      rOut = 145 + energy * 110 + 32 * Math.sin(ph);
      gOut = 150 + energy * 100 + 26 * Math.sin(ph + 1.5);
      bOut = 175 + energy * 80 + 35 * Math.cos(ph);
    }
    return applyPhotoshopGrading(rOut, gOut, bOut, art);
  }

  if (edition === "DARK_SIDE") {
    if (edge > 0.3) {
      const bandIdx = Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7);
      const [cr, cg, cb] = CAUCHY_SPECTRUM[Math.max(0, Math.min(6, bandIdx))];
      const mix = smoothstep(0.3, 0.65, edge);
      const baseV = 190 + lum * 65;
      return applyPhotoshopGrading(
        baseV * (1 - mix) + cr * mix,
        baseV * (1 - mix) + cg * mix,
        baseV * (1 - mix) + cb * mix,
        art
      );
    }
    const v = 165 + energy * 90;
    return applyPhotoshopGrading(v, v, v + 12, art);
  }

  return applyPhotoshopGrading(
    190 + energy * 65,
    125 + energy * 110,
    32 + Math.pow(energy, 2.0) * 150,
    art
  );
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
      eigenAnisotropy: 0.918,
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

function buildMatrixFromImage(img: HTMLImageElement, useFastMode: boolean): MatrixBuffer {
  const baseRes = useFastMode ? 500 : 760;
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
  const subjectMask = new Float32Array(total);
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
      subjectMask,
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
      meanAnisotropy: 0.9,
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
    const wy = Math.abs(ny) > 0.94 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.94) / 0.06) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.94 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.94) / 0.06) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const normL = clip((rawLArr[i] - minL) / spanL);
      lum[i] = Math.pow(normL, 0.8) * mask[i];
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 4);
  const smoothLum = gaussianBlurField(lum, w, h, 10);
  const domeLum = gaussianBlurField(lum, w, h, 20);

  for (let i = 0; i < total; i++) {
    const shadowLift = (1.0 - smoothLum[i]) * 0.2;
    lum[i] = clip(lum[i] * (1.0 + shadowLift));
  }

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
  const absFloor = globalMaxEdge * 0.032;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    const rVal = (hessianRidge[i] / globalMaxRidge) * globalMaxEdge * 0.45 * coherence[i];
    const combinedSignal = Math.max(gVal, rVal);

    if (combinedSignal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.14, localEnv[i] * 2.0 + globalMaxEdge * 0.06);
      edge[i] = clip((combinedSignal - absFloor * 0.7) / denom);
    }
  }

  const edgeDensity = gaussianBlurField(edge, w, h, 6);

  let massSum = 1e-5;
  let massU = 0;
  let massV = 0;

  for (let y = 0; y < h; y++) {
    const ny = (y / h) - 0.48;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) - 0.5;
      const i = y * w + x;
      const radialDome = Math.exp(-(nx * nx + ny * ny) * 2.2);

      const subj = clip(edgeDensity[i] * 2.2 + smoothLum[i] * 0.7 * radialDome);
      subjectMask[i] = subj;

      const mWeight = edge[i] + subj * 0.5;
      massSum += mWeight;
      massU += (x / w) * mWeight;
      massV += (y / h) * mWeight;

      depthMap[i] = clip((domeLum[i] * 0.55 + smoothLum[i] * 0.33 + gNarrow[i] * 0.12) * (0.65 + 0.35 * radialDome)) * mask[i];

      const normRidge = (hessianRidge[i] / globalMaxRidge) * coherence[i];
      const crowding = edgeDensity[i] * 3.2 + normRidge * 4.5;
      scaleMap[i] = clip(1.0 / (0.82 + crowding), 0.22, 1.35);
    }
  }

  const charCenterU = clip(massU / massSum, 0.25, 0.75);
  const charCenterV = clip(massV / massSum, 0.25, 0.75);

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

  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const microDiff = lum[i] - gNarrow[i];
    const macroDiff = gNarrow[i] - gWide[i];
    const pAdaptive = 22.0 * smoothstep(0.03, 0.24, edge[i] * (0.35 + 0.65 * coherence[i]));
    rawDoG[i] = clip(lum[i] + (microDiff * 0.55 + macroDiff * 0.45) * pAdaptive);
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

  // Полотно шелка Каджии — Кэя
  const silkStep = useFastMode ? 6 : 5;
  for (let y = 6; y < h - 6; y += silkStep) {
    for (let x = 6; x < w - 6; x += silkStep) {
      const idx = y * w + x;
      if (mask[idx] < 0.06 || (lum[idx] < 0.04 && edge[idx] < 0.04)) continue;

      const strandLen = 9;
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
        prevTx = tx * 0.6 + prevTx * 0.4;
        prevTy = ty * 0.6 + prevTy * 0.4;
        const norm = Math.hypot(prevTx, prevTy) + 1e-6;
        prevTx /= norm;
        prevTy /= norm;

        uS[k] = cx / w;
        vS[k] = cy / h;
        txS[k] = prevTx;
        tyS[k] = prevTy;

        cx = clip(cx + prevTx * 2.2, 2, w - 3);
        cy = clip(cy + prevTy * 2.2, 2, h - 3);
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
        phase: (silkLoom.length * PHI) % (Math.PI * 2),
        weight: clip(0.45 + edge[idx] * 0.95 + lum[idx] * 0.35, 0.35, 1.5),
      });
    }
  }

  // Скелетная векторизация TRACE
  const isRidgeMap = new Uint8Array(total);
  const subOffsetX = new Float32Array(total);
  const subOffsetY = new Float32Array(total);
  const ridgeSeeds: { idx: number; score: number; tier: 0 | 1 | 2 | 4 }[] = [];

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      const coh = coherence[i];
      if (e0 < 0.045 || (e0 < 0.14 && coh < 0.24) || mask[i] < 0.05) continue;

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

        const isBrightHighlight = positiveRidge[i] > globalMaxRidge * 0.14 && lum[i] > gWide[i] + 0.035 && coh > 0.28;
        const tier: 0 | 1 | 2 | 4 =
          scaleMap[i] < 0.46 && e0 > 0.16
            ? 0
            : isBrightHighlight
            ? 4
            : e0 > 0.2
            ? 1
            : 2;
        ridgeSeeds.push({ idx: i, score: e0 * (0.5 + 0.5 * coh) * (tier === 0 || tier === 4 ? 1.4 : 1.0), tier });
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
    const minAlign = isMicroTier ? -0.2 : 0.22;

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
      const inertia = isMicroTier ? 0.16 : 0.36;
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
    const angleThreshold = tier === 0 ? 0.82 : 0.6;

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
    const zArr = new Float32Array(n);

    let eSum = 0, lSum = 0, cohSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0, zSum = 0, scaleSum = 0;

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
      const p4 = pxIdx * 4;
      rSum += kuwaharaRgba[p4];
      gSum += kuwaharaRgba[p4 + 1];
      bSum += kuwaharaRgba[p4 + 2];
    }

    const meanEdge = eSum / n;
    const meanCoh = cohSum / n;
    const meanScale = scaleSum / n;
    const importance = clip((meanEdge * 0.85 + meanCoh * 0.45) + (tier === 0 || tier === 4 ? 0.35 : Math.min(0.3, n / 75.0)));
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
      featureScale: meanScale,
      importance,
      phase: (strokes.length * PHI) % (Math.PI * 2),
      speed: 0.65 + ((strokes.length * 7) % 13) * 0.06,
      arcLen: n,
      centerU: uSum / n,
      centerV: vSum / n,
      centerZ: zSum / n,
    });
  };

  const maxRidgeStrokes = useFastMode ? 3200 : 5800;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxRidgeStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const isMicro = seed.tier === 0;
    const maxHalf = isMicro ? 40 : 95;
    const back = tracePixelSkeleton(seed.idx, -1, maxHalf, isMicro).reverse();
    const fwd = tracePixelSkeleton(seed.idx, 1, maxHalf, isMicro);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < (isMicro ? 3 : 4)) continue;
    packAdaptiveStroke(rawPts, seed.tier);
  }

  const gridStep = useFastMode ? 5 : 4;
  const maxTotalStrokes = useFastMode ? 4200 : 7200;

  for (let y = 4; y < h - 4; y += gridStep) {
    for (let x = 4; x < w - 4; x += gridStep) {
      if (strokes.length >= maxTotalStrokes) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.08) continue;

      if (coherence[idx] > 0.28 && edge[idx] > 0.06) {
        const rawFilament: { x: number; y: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        const filSteps = Math.max(5, Math.min(12, Math.round(scaleMap[idx] * 11)));

        for (let s = 0; s < filSteps; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          visited[cIdx] = 1;
          rawFilament.push({ x: cx, y: cy });
          cx += etfX[cIdx] * 1.35;
          cy += etfY[cIdx] * 1.35;
        }
        if (rawFilament.length >= 4) {
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

  return {
    w,
    h,
    rgba: rawRgba,
    kuwaharaRgba,
    lum,
    smoothLum,
    depthMap,
    coherence,
    subjectMask,
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
  const initialPrompt = PROMPT_PRESETS[1].prompt;
  const initialKinetic = compileAnimationPrompt(initialPrompt);

  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("TRACE");
  const [activeTab, setActiveTab] = useState<"ANIM_PROMPT" | "STUDIO" | "COLOR_LAB">("ANIM_PROMPT");

  const [animPromptInput, setAnimPromptInput] = useState<string>(initialPrompt);
  const [kineticCoords, setKineticCoords] = useState<KineticPromptCoordinates>(initialKinetic);

  // Явные ползунки 3D-углов камеры для очевидного управления 3D-фигурой
  const [manualYaw, setManualYaw] = useState<number>(0.0);
  const [manualPitch, setManualPitch] = useState<number>(0.0);

  const [artConfig, setArtConfig] = useState<ArtStudioConfig>({
    dimension: "2D_STUDIO",
    render3DStyle: "HYBRID_SOLID",
    autoOrbit3D: true,
    fastPerfMode: false,
    edition: "SHINE_ON",
    architecture: "HYPER_ADAPTIVE",
    posterFrame: true,
    strokeWeight: 0.92,
    coherenceGate: 0.34,
    foundationDepth: 0.78,
    luminanceGlow: 0.82,
    highlightBoost: 0.65,
    depthExtrusion3D: 0.58,
    exposure: 0.0,
    contrast: 1.08,
    saturation: 1.15,
    temperature: 0.0,
    vignetteStrength: 0.25,
    canvasGrain: 0.18,
    customGrading: false,
    shadowHex: "#18122b",
    midtoneHex: "#a855f7",
    highlightHex: "#fde047",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
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
    shockTriggerTime: -10,
  });

  const updateArt = useCallback(<K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsBaseRebuild = true;
      return next;
    });
  }, []);

  const handleApplyPrompt = useCallback((customText?: string, force3D?: boolean) => {
    const targetText = customText !== undefined ? customText : animPromptInput;
    if (customText !== undefined) setAnimPromptInput(customText);
    const compiled = compileAnimationPrompt(targetText);
    setKineticCoords(compiled);
    stateRef.current.kinetic = compiled;

    if (force3D !== undefined) {
      updateArt("dimension", force3D ? "3D_SPACE" : "2D_STUDIO");
      if (force3D) updateArt("autoOrbit3D", true);
    } else if (compiled.orbitYawAmp > 0.3) {
      updateArt("dimension", "3D_SPACE");
      updateArt("autoOrbit3D", true);
    }

    if (compiled.shockwaveAmp > 0.1) {
      stateRef.current.shockTriggerTime = stateRef.current.time;
    }

    if (compiled.timelapseLoop) {
      stateRef.current.traceProgress = 0;
    }
  }, [animPromptInput, updateArt]);

  const applyTributeEdition = (edition: TributeEdition) => {
    let next: ArtStudioConfig = { ...artConfig, edition, customGrading: false };
    if (edition === "SHINE_ON") {
      next = { ...next, architecture: "HYPER_ADAPTIVE", strokeWeight: 0.92, coherenceGate: 0.34, foundationDepth: 0.78, luminanceGlow: 0.82, highlightBoost: 0.65 };
    } else if (edition === "PIXAR_SSS") {
      next = { ...next, architecture: "HYPER_ADAPTIVE", strokeWeight: 0.95, coherenceGate: 0.32, foundationDepth: 0.82, luminanceGlow: 0.88, highlightBoost: 0.78 };
    } else if (edition === "KODAK_800T") {
      next = { ...next, architecture: "HYPER_ADAPTIVE", strokeWeight: 0.88, coherenceGate: 0.34, foundationDepth: 0.78, luminanceGlow: 0.85, highlightBoost: 0.68 };
    } else if (edition === "REMBRANDT") {
      next = { ...next, architecture: "TROIS_CRAYONS", strokeWeight: 0.92, coherenceGate: 0.35, foundationDepth: 0.8, luminanceGlow: 0.65, highlightBoost: 0.85 };
    } else if (edition === "ARCANE_OIL") {
      next = { ...next, architecture: "HYPER_ADAPTIVE", strokeWeight: 1.0, coherenceGate: 0.32, foundationDepth: 0.85, luminanceGlow: 0.68, highlightBoost: 0.65 };
    } else if (edition === "WARHOL_POP") {
      next = { ...next, architecture: "HYPER_ADAPTIVE", strokeWeight: 0.95, coherenceGate: 0.38, foundationDepth: 0.82, luminanceGlow: 0.75, highlightBoost: 0.7 };
    } else if (edition === "VOGUE_NOIR") {
      next = { ...next, architecture: "CROSS_HATCH", strokeWeight: 0.88, coherenceGate: 0.36, foundationDepth: 0.65, luminanceGlow: 0.65, highlightBoost: 0.78 };
    } else if (edition === "DARK_SIDE") {
      next = { ...next, architecture: "LASER_STRINGS", strokeWeight: 0.85, coherenceGate: 0.3, foundationDepth: 0.45, luminanceGlow: 0.92, highlightBoost: 0.72 };
    } else if (edition === "POMPEII") {
      next = { ...next, architecture: "GUILLOCHE", strokeWeight: 0.9, coherenceGate: 0.34, foundationDepth: 0.6, luminanceGlow: 0.8, highlightBoost: 0.75 };
    } else if (edition === "DA_VINCI") {
      next = { ...next, architecture: "TROIS_CRAYONS", strokeWeight: 0.9, coherenceGate: 0.36, foundationDepth: 0.75, luminanceGlow: 0.2, highlightBoost: 0.88 };
    }

    setArtConfig(next);
    stateRef.current.art = next;
    stateRef.current.needsBaseRebuild = true;
    stateRef.current.traceProgress = 0;
  };

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING DIFFERENTIAL MANIFOLD [" + String(idx + 1) + "/" + String(total) + "]...");
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
        "LOCKED // " + String(buf.strokes.length) + " VECTORS & " + String(buf.silkLoom.length) + " SILK FIBERS (" + String(buf.w) + "x" + String(buf.h) + ")"
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

  const handleAxisChange = (axis: keyof Tensor5D, value: number) => {
    setTensor((prev) => {
      const updated = { ...prev, [axis]: value };
      stateRef.current.tensor = updated;
      stateRef.current.needsBaseRebuild = true;
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
  }, []);

  const reset3DCamera = useCallback(() => {
    stateRef.current.userYaw = 0;
    stateRef.current.userPitch = 0;
    stateRef.current.velYaw = 0;
    stateRef.current.velPitch = 0;
    stateRef.current.userZoom = 1.0;
    setManualYaw(0);
    setManualPitch(0);
  }, []);

  // ИНТЕРАКТИВНОЕ ВРАЩЕНИЕ 3D-ФИГУРЫ МЫШЬЮ И ТАЧЕМ (ARCBALL 3D ORBIT)
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

    if (stateRef.current.art.dimension === "2D_STUDIO") {
      stateRef.current.shockTriggerTime = stateRef.current.time;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    stateRef.current.mouseX = mx;
    stateRef.current.mouseY = my;
    stateRef.current.mouseActive = true;

    if (stateRef.current.isDragging3D) {
      const dx = mx - stateRef.current.dragLastX;
      const dy = my - stateRef.current.dragLastY;
      stateRef.current.dragLastX = mx;
      stateRef.current.dragLastY = my;

      if (stateRef.current.art.dimension === "3D_SPACE" || stateRef.current.topology === "SCULPT3D" || stateRef.current.topology === "LIDAR") {
        const nextYaw = clip(stateRef.current.userYaw + dx * 0.007, -1.25, 1.25);
        const nextPitch = clip(stateRef.current.userPitch + dy * 0.007, -0.95, 0.95);
        stateRef.current.userYaw = nextYaw;
        stateRef.current.userPitch = nextPitch;
        stateRef.current.velYaw = dx * 0.002;
        stateRef.current.velPitch = dy * 0.002;
        setManualYaw(Number(nextYaw.toFixed(2)));
        setManualPitch(Number(nextPitch.toFixed(2)));
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

      if (stateRef.current.isDragging3D) {
        const dx = mx - stateRef.current.dragLastX;
        const dy = my - stateRef.current.dragLastY;
        stateRef.current.dragLastX = mx;
        stateRef.current.dragLastY = my;

        if (stateRef.current.art.dimension === "3D_SPACE" || stateRef.current.topology === "SCULPT3D" || stateRef.current.topology === "LIDAR") {
          const nextYaw = clip(stateRef.current.userYaw + dx * 0.007, -1.25, 1.25);
          const nextPitch = clip(stateRef.current.userPitch + dy * 0.007, -0.95, 0.95);
          stateRef.current.userYaw = nextYaw;
          stateRef.current.userPitch = nextPitch;
          setManualYaw(Number(nextYaw.toFixed(2)));
          setManualPitch(Number(nextPitch.toFixed(2)));
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
      stateRef.current.userZoom = clip(stateRef.current.userZoom - e.deltaY * 0.001, 0.65, 1.85);
    }
  };

  // ==========================================
  // ВЫСОКОПРОИЗВОДИТЕЛЬНОЕ ЯДРО РЕНДЕРИНГА BARRETT 18.0 (ZERO-ALLOCATION & O(N) BUCKET SORT)
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

    const baseCanvas = document.createElement("canvas");
    const baseCtx = baseCanvas.getContext("2d");

    const shaderCanvas = document.createElement("canvas");
    const shaderCtx = shaderCanvas.getContext("2d");

    // Предвыделенные типизированные буферы для мгновенной O(N) сортировки 3D-граней без GC-фризов!
    const MAX_3D_VERTICES = 45000;
    const vScreenX = new Float32Array(MAX_3D_VERTICES);
    const vScreenY = new Float32Array(MAX_3D_VERTICES);
    const vRotZ = new Float32Array(MAX_3D_VERTICES);
    const vValid = new Uint8Array(MAX_3D_VERTICES);

    const NUM_Z_BUCKETS = 128;
    const bucketHeads = new Int32Array(NUM_Z_BUCKETS);
    const faceNext = new Int32Array(MAX_3D_VERTICES);
    const faceV00 = new Int32Array(MAX_3D_VERTICES);
    const faceV10 = new Int32Array(MAX_3D_VERTICES);
    const faceV11 = new Int32Array(MAX_3D_VERTICES);
    const faceV01 = new Int32Array(MAX_3D_VERTICES);
    const faceColorR = new Uint8Array(MAX_3D_VERTICES);
    const faceColorG = new Uint8Array(MAX_3D_VERTICES);
    const faceColorB = new Uint8Array(MAX_3D_VERTICES);

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

    // Предварительное кэширование цветов всех векторов и нитей шелка (выполняется только при смене палитры!)
    const rebuildFoundationAndCacheColors = (m: MatrixBuffer, art: ArtStudioConfig, t: Tensor5D) => {
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

          const l = clip(rawL + art.highlightBoost * 0.2 * smoothstep(0.25, 0.85, rawL));
          const inkShade = clip(0.26 + 0.74 * Math.tanh(9.5 * (fd - 0.23)), 0.12, 1.0);

          const radDistSq = nx * nx + ny * ny;
          const vigFactor = 1.0 - art.vignetteStrength * 0.65 * radDistSq;
          const grainTex = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1.0;
          const canvasWeave = Math.sin(x * 1.1) * Math.cos(y * 1.1) * 0.5 + (grainTex - 0.5);
          const grainOffset = canvasWeave * art.canvasGrain * 22.0;

          let outR = 0, outG = 0, outB = 0;

          if (isDaVinci) {
            const wash = Math.pow(l, 0.78) * inkShade;
            outR = (115 + wash * 125) * vigFactor + grainOffset;
            outG = (88 + wash * 138) * vigFactor + grainOffset;
            outB = (62 + wash * 148) * vigFactor + grainOffset;
          } else {
            const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone);
            const nativeMix =
              art.customGrading
                ? 0.25
                : art.edition === "SHINE_ON" || art.edition === "ARCANE_OIL" || art.edition === "PIXAR_SSS"
                ? 0.8
                : 0.45;
            const colR = kuw[p] * nativeMix + edR * (1.0 - nativeMix);
            const colG = kuw[p + 1] * nativeMix + edG * (1.0 - nativeMix);
            const colB = kuw[p + 2] * nativeMix + edB * (1.0 - nativeMix);

            const microBoost = (1.0 - m.scaleMap[i]) * e * 0.52 + art.highlightBoost * e * 0.32;
            const chiaroscuro = clip(l * inkShade + e * 0.28 + microBoost, 0.0, 1.0);
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

      // Кэшируем RGB для всех 7 000 векторов и 5 000 нитей шелка!
      const hiMix = art.highlightBoost * 0.65;
      for (let i = 0; i < m.strokes.length; i++) {
        const st = m.strokes[i];
        const isHi = st.tier === 4 || (art.architecture === "TROIS_CRAYONS" && st.meanLum > 0.64);
        let [rC, gC, bC] = resolveEditionColor(art, st.r, st.g, st.b, st.meanLum, st.meanEdge, t.tone, isHi);
        if (isHi && !isDaVinci) {
          rC = Math.min(255, Math.round(rC + (255 - rC) * hiMix));
          gC = Math.min(255, Math.round(gC + (248 - gC) * hiMix));
          bC = Math.min(255, Math.round(bC + (235 - bC) * hiMix));
        }
        st.cachedR = rC;
        st.cachedG = gC;
        st.cachedB = bC;
      }

      for (let i = 0; i < m.silkLoom.length; i++) {
        const sl = m.silkLoom[i];
        const [rS, gS, bS] = resolveEditionColor(art, sl.r, sl.g, sl.b, sl.lum, sl.edge, t.tone);
        sl.cachedR = rS;
        sl.cachedG = gS;
        sl.cachedB = bS;
      }
    };

    // Единое поле деформации 2D-пространства (без разрыва между подложкой и векторами!)
    const evaluateUnified2DField = (
      uIn: number,
      vIn: number,
      m: MatrixBuffer,
      kin: KineticPromptCoordinates,
      time: number
    ): [number, number] => {
      let u = uIn;
      let v = vIn;
      const cx = m.charCenterU;
      const cy = m.charCenterV;

      // 1. Упругая гармоническая кинематика (Elastic Sway & Squash)
      if (kin.elasticSwayAmp > 0.01) {
        const beat = time * kin.pulseFreq;
        const squash = 1.0 + Math.sin(beat) * 0.045 * kin.elasticSwayAmp;
        v = 0.85 + (v - 0.85) * squash;
        u = cx + (u - cx) / squash;
        const heightFactor = clip((0.85 - v) / 0.65, 0.0, 1.2);
        u += Math.cos(beat * 0.5) * 0.028 * kin.elasticSwayAmp * heightFactor;
      }

      // 2. Радиальный импульс / волна (Shockwave & Bio-Pulse)
      if (kin.shockwaveAmp > 0.01 || kin.pulseAmp > 0.01) {
        const du = u - cx;
        const dv = v - cy;
        const r = Math.hypot(du, dv) + 0.001;
        if (r < 0.45) {
          const wave = Math.sin(r * 14.0 - time * kin.pulseFreq * 1.5) * (1.0 - r / 0.45);
          const amp = (kin.pulseAmp * 0.008 + kin.shockwaveAmp * 0.018);
          u += (du / r) * wave * amp;
          v += (dv / r) * wave * amp;
        }
      }

      // 3. Гидродинамическая волна
      if (kin.rippleWaveAmp > 0.01) {
        v += Math.sin(u * 16.0 + v * 12.0 - time * 3.8) * kin.rippleWaveAmp * 0.007;
      }

      return [u, v];
    };

    const projectPointUnified = (
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
      zoomScale: number,
      pluckPx: number
    ): [number, number] => {
      let [u, v] = evaluateUnified2DField(uIn, vIn, m, kin, time);
      const env = Math.sin(sNorm * Math.PI);

      if (!isMicro && (kin.turbulence > 0.01 || Math.abs(kin.windVecX) > 0.01)) {
        const windWave = Math.sin((u * 4.5 + v * 4.5) * Math.PI - time * 2.8 + phase) * env;
        u += kin.windVecX * 0.0045 * env + nxIn * windWave * kin.turbulence * 0.0035;
        v += kin.windVecY * 0.0045 * env + nyIn * windWave * kin.turbulence * 0.0035;
      }

      const pluckDisp = Math.sin(sNorm * Math.PI * 2.0) * pluckPx * env;

      if (art.dimension === "2D_STUDIO" && stateRef.current.topology !== "SCULPT3D" && stateRef.current.topology !== "LIDAR") {
        const sx = ox + ((u - 0.5) * zoomScale + 0.5) * drawW + nxIn * pluckDisp;
        const sy = oy + ((v - 0.5) * zoomScale + 0.5) * drawH + nyIn * pluckDisp;
        return [sx, sy];
      }

      const zRel = (zIn - 0.38) * art.depthExtrusion3D * 0.68;
      const x3 = (u - 0.5) * zoomScale;
      const y3 = (v - 0.5) * zoomScale;

      const cosY = Math.cos(camYaw);
      const sinY = Math.sin(camYaw);
      const cosX = Math.cos(camPitch);
      const sinX = Math.sin(camPitch);

      const rx = x3 * cosY + zRel * sinY;
      const rz1 = -x3 * sinY + zRel * cosY;
      const ry = y3 * cosX - rz1 * sinX;
      const rz2 = y3 * sinX + rz1 * cosX;

      const fov = 2.6 / Math.max(0.8, 2.6 - rz2 * 0.85);
      const screenX = ox + (0.5 + rx * fov) * drawW + nxIn * pluckDisp;
      const screenY = oy + (0.5 + ry * fov) * drawH + nyIn * pluckDisp;
      return [screenX, screenY];
    };

    // Отрисовка интерактивного 3D-гироскопа осей (3D Axis Gizmo) в углу холста
    const draw3DGimbalGizmo = (yaw: number, pitch: number, ox: number, oy: number, drawH: number) => {
      const gx = ox + 46;
      const gy = oy + drawH - 46;
      const rad = 26;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(5, 4, 10, 0.78)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
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

        const ex = gx + rx * rad;
        const ey = gy + ry * rad;

        ctx.strokeStyle = ax.col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(ex, ey);
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

      const isPaperTheme = (art.edition === "DA_VINCI" && !art.customGrading) || s.topology === "SKETCH";
      const bgHex = isPaperTheme ? "#d8ccb8" : "#030206";

      if (!s.isPaused) {
        s.time += 0.016 * (0.35 + t.energy * 1.35);
        if (kin.timelapseLoop) {
          s.traceProgress = (s.traceProgress + 0.0045 * (0.6 + t.energy)) % 1.35;
        } else if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.014 * (0.65 + t.energy * 1.15));
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildFoundationAndCacheColors(m, art, t);
        s.needsBaseRebuild = false;
      }

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

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.5) * 0.24;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.45 + Math.sin(time * 0.65) * 0.2;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      const is3DActive = art.dimension === "3D_SPACE" || s.topology === "SCULPT3D" || s.topology === "LIDAR";

      // Инерция свободного 3D-вращения + авто-орбита
      if (!s.isDragging3D && is3DActive) {
        s.userYaw = clip(s.userYaw + s.velYaw, -1.25, 1.25);
        s.userPitch = clip(s.userPitch + s.velPitch, -0.95, 0.95);
        s.velYaw *= 0.92;
        s.velPitch *= 0.92;
      }

      const autoYawOffset = is3DActive && art.autoOrbit3D && !s.isDragging3D
        ? Math.sin(time * kin.orbitSpeed) * Math.max(0.28, kin.orbitYawAmp)
        : 0.0;
      const autoPitchOffset = is3DActive && art.autoOrbit3D && !s.isDragging3D
        ? Math.cos(time * kin.orbitSpeed * 0.8) * Math.max(0.16, kin.orbitPitchAmp)
        : 0.0;

      const targetYaw = is3DActive ? clip(s.userYaw + autoYawOffset, -1.3, 1.3) : 0.0;
      const targetPitch = is3DActive ? clip(s.userPitch + autoPitchOffset, -1.0, 1.0) : 0.0;
      s.smoothYaw += (targetYaw - s.smoothYaw) * 0.14;
      s.smoothPitch += (targetPitch - s.smoothPitch) * 0.14;

      const camZoom = s.userZoom * (1.0 + Math.sin(time * kin.zoomFreq) * kin.zoomAmp);

      // Быстрая синхронная отрисовка подложки (на пониженном шаге в динамике для 60 FPS на телефонах!)
      const drawSynchronizedUnderlay = (opacityMult: number) => {
        if (art.foundationDepth <= 0.01 || opacityMult <= 0.01 || !shaderCtx) return;

        const hasDeformation =
          is3DActive ||
          kin.elasticSwayAmp > 0.02 ||
          kin.shockwaveAmp > 0.02 ||
          kin.pulseAmp > 0.04 ||
          kin.rippleWaveAmp > 0.02 ||
          Math.abs(camZoom - 1.0) > 0.01;

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = clip(art.foundationDepth * opacityMult, 0, 0.98);

        if (!hasDeformation) {
          ctx.drawImage(baseCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
          return;
        }

        // Для отсутствия лагов на слабых ПК и смартфонах используем быстрый буфер половинного разрешения для мягкой подложки,
        // а поверх него рисуем векторные контуры в полном Retina-разрешении!
        const bufW = Math.floor(m.w * 0.5);
        const bufH = Math.floor(m.h * 0.5);
        if (shaderCanvas.width !== bufW || shaderCanvas.height !== bufH) {
          shaderCanvas.width = bufW;
          shaderCanvas.height = bufH;
        }
        shaderCtx.drawImage(baseCanvas, 0, 0, bufW, bufH);
        const srcBase = shaderCtx.getImageData(0, 0, bufW, bufH).data;
        const warpedImg = shaderCtx.createImageData(bufW, bufH);
        const dstBase = warpedImg.data;

        const yawShift = is3DActive ? s.smoothYaw * art.depthExtrusion3D * bufW * 0.25 : 0;
        const pitchShift = is3DActive ? s.smoothPitch * art.depthExtrusion3D * bufH * 0.25 : 0;

        for (let y = 0; y < bufH; y++) {
          const vOrig = y / bufH;
          const mRow = Math.min(m.h - 1, y * 2) * m.w;
          for (let x = 0; x < bufW; x++) {
            const uOrig = x / bufW;
            const mIdx = mRow + Math.min(m.w - 1, x * 2);

            const [uDef, vDef] = evaluateUnified2DField(uOrig, vOrig, m, kin, time);
            const dU = uDef - uOrig;
            const dV = vDef - vOrig;

            const zRel = m.depthMap[mIdx] - 0.38;
            const sx = ((uOrig - dU - 0.5) / camZoom + 0.5) * bufW - yawShift * zRel;
            const sy = ((vOrig - dV - 0.5) / camZoom + 0.5) * bufH - pitchShift * zRel;

            if (sx >= 0 && sx < bufW && sy >= 0 && sy < bufH) {
              const sP = (Math.floor(sy) * bufW + Math.floor(sx)) * 4;
              const dP = (y * bufW + x) * 4;
              dstBase[dP] = srcBase[sP];
              dstBase[dP + 1] = srcBase[sP + 1];
              dstBase[dP + 2] = srcBase[sP + 2];
              dstBase[dP + 3] = srcBase[sP + 3];
            }
          }
        }
        shaderCtx.putImageData(warpedImg, 0, 0);
        ctx.drawImage(shaderCanvas, ox, oy, drawW, drawH);
        ctx.globalAlpha = 1.0;
      };

      // ==========================================
      // РЕЖИМ 1 И 6: TRACE 18.0 & SKETCH
      // ==========================================
      if (s.topology === "TRACE" || s.topology === "SKETCH") {
        const clampedProg = Math.min(1.0, s.traceProgress);
        const baseReveal = smoothstep(0.0, 0.45, clampedProg);
        const isSketchMode = s.topology === "SKETCH";

        drawSynchronizedUnderlay(isSketchMode ? 0.32 * baseReveal : baseReveal);

        const strokes = m.strokes;
        const pluckAmps = m.pluckAmps;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(120, Math.floor(totalStrokes * 0.22));
        const headFloat = clampedProg * (totalStrokes + windowSpan);
        const cohThreshold = art.coherenceGate * 0.65;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.meanCoherence < cohThreshold && st.meanEdge < 0.24) continue;

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
          const isMicroFeature = st.tier === 0 || st.featureScale < 0.54;
          const isHighlight = st.tier === 4 || (art.architecture === "TROIS_CRAYONS" && st.meanLum > 0.64);
          const isDarkInkOnWhite = st.meanLum > 0.68 && st.tier !== 4 && art.foundationDepth > 0.35;

          ctx.globalCompositeOperation =
            isPaperTheme && !isHighlight
              ? "source-over"
              : isDarkInkOnWhite
              ? "source-over"
              : "screen";

          const stringPluckPx = pAmp * (isMicroFeature ? 1.5 : 5.5 + t.chaos * 7.0) * Math.sin(time * 28.0 + st.phase);

          const rC = isSketchMode ? (isHighlight ? 252 : 24) : isDarkInkOnWhite ? Math.round(st.r * 0.28) : st.cachedR;
          const gC = isSketchMode ? (isHighlight ? 248 : 18) : isDarkInkOnWhite ? Math.round(st.g * 0.28) : st.cachedG;
          const bC = isSketchMode ? (isHighlight ? 240 : 16) : isDarkInkOnWhite ? Math.round(st.b * 0.32) : st.cachedB;

          const tierAlpha =
            st.tier === 0
              ? 0.96
              : st.tier === 4
              ? clip(0.55 + art.highlightBoost * 0.4, 0.2, 0.96)
              : st.tier === 1
              ? 0.92
              : st.tier === 2
              ? 0.78
              : 0.38;
          const baseAlpha = clip((0.28 + st.meanEdge * 0.64 + pAmp * 0.45) * tierAlpha * localProg, 0.12, 0.96);

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

          ctx.beginPath();
          let prevX = 0;
          let prevY = 0;
          for (let k = 0; k <= fullIdx; k++) {
            const sNorm = k / Math.max(1, nPts - 1);
            const [curX, curY] = projectPointUnified(
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
              stringPluckPx
            );

            if (k === 0) {
              ctx.moveTo(curX, curY);
            } else if (k === 1) {
              ctx.lineTo(curX, curY);
            } else {
              ctx.quadraticCurveTo(prevX, prevY, (prevX + curX) * 0.5, (prevY + curY) * 0.5);
            }
            prevX = curX;
            prevY = curY;
          }
          ctx.lineTo(prevX, prevY);

          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
          ctx.lineWidth = Math.max(0.24, adaptiveWidth);
          ctx.stroke();

          if (!isMicroFeature && art.luminanceGlow > 0.1 && nPts >= 8 && clampedProg >= 0.92 && !isPaperTheme && st.tier === 1) {
            const cometSpan = Math.max(3, Math.floor(nPts * 0.26));
            const cyclePos = ((time * st.speed * (0.65 + t.energy * 0.85) + st.phase) % 1.45) - 0.22;
            const headIdx = Math.floor(cyclePos * nPts);
            const tailIdx = Math.max(0, headIdx - cometSpan);
            const clampedHead = Math.min(nPts - 1, headIdx);

            if (clampedHead - tailIdx >= 2) {
              ctx.globalCompositeOperation = "screen";
              ctx.beginPath();
              for (let k = tailIdx; k <= clampedHead; k++) {
                const sNorm = k / Math.max(1, nPts - 1);
                const [cx, cy] = projectPointUnified(
                  st.u[k],
                  st.v[k],
                  st.z[k],
                  st.nx[k],
                  st.ny[k],
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
                  stringPluckPx
                );
                if (k === tailIdx) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
              }
              const [cR, cG, cB] = CAUCHY_SPECTRUM[(i + Math.floor(time * 2)) % 7];
              const cometAlpha = clip(baseAlpha * (0.45 + 0.55 * art.luminanceGlow), 0.18, 0.92);
              ctx.strokeStyle =
                art.edition === "DARK_SIDE"
                  ? "rgba(" + String(cR) + "," + String(cG) + "," + String(cB) + "," + String(cometAlpha.toFixed(2)) + ")"
                  : "rgba(255, 250, 240, " + String(cometAlpha.toFixed(2)) + ")";
              ctx.lineWidth = Math.max(0.36, adaptiveWidth * 1.45);
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 2: SILK 18.0 (ОПТИМИЗИРОВАННЫЙ ШЕЛК КАДЖИИ — КЭЯ С КЭШИРОВАННЫМ СПЕКТРОМ)
      // ==========================================
      else if (s.topology === "SILK") {
        drawSynchronizedUnderlay(0.55);

        ctx.globalCompositeOperation = isPaperTheme ? "source-over" : "screen";
        ctx.lineCap = "round";

        const loom = m.silkLoom;
        const totalStrands = loom.length;
        const lightX = (s.fluidU - 0.5) * 2.0;
        const lightY = (s.fluidV - 0.5) * 2.0;
        const lLen = Math.hypot(lightX, lightY, 0.65);
        const lx = lightX / lLen;
        const ly = lightY / lLen;

        for (let i = 0; i < totalStrands; i++) {
          const st = loom[i];
          const nPts = st.u.length;

          const midTx = st.tx[4];
          const midTy = st.ty[4];
          const tDotL = clip(midTx * lx + midTy * ly, -0.99, 0.99);
          const sinTL = Math.sqrt(Math.max(0.0, 1.0 - tDotL * tDotL));
          const sheenWave = 0.5 + 0.5 * Math.sin((st.u[0] * 6.0 - st.v[0] * 5.0) + time * 2.6 + st.phase * 0.25);
          const kajiyaSpec = Math.pow(sinTL * sheenWave, 6.0) * art.luminanceGlow * 145.0;

          const rS = Math.min(255, Math.round(st.cachedR + kajiyaSpec * 0.95));
          const gS = Math.min(255, Math.round(st.cachedG + kajiyaSpec * 0.98));
          const bS = Math.min(255, Math.round(st.cachedB + kajiyaSpec * 1.1));

          const alpha = clip(0.22 + st.edge * 0.58 + st.lum * 0.25 + sheenWave * 0.18, 0.12, 0.94);

          ctx.beginPath();
          for (let k = 0; k < nPts; k++) {
            const sNorm = k / (nPts - 1);
            const [sx, sy] = projectPointUnified(
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
              0
            );
            if (k === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }

          ctx.strokeStyle = "rgba(" + String(rS) + "," + String(gS) + "," + String(bS) + "," + String(alpha.toFixed(2)) + ")";
          ctx.lineWidth = (0.45 + st.edge * 0.85) * st.weight * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 3 И 9: SCULPT3D & LIDAR 18.0 (O(N) BUCKET Z-SORT + ГИБРИДНЫЕ 3D-ВЕКТОРЫ PIXAR!)
      // ==========================================
      else if (s.topology === "SCULPT3D" || s.topology === "LIDAR") {
        const isWireLidar = s.topology === "LIDAR" || art.render3DStyle === "WIREFRAME_MESH";
        const step = art.fastPerfMode ? 6 : 4;
        const cols = Math.floor((m.w - step) / step);
        const rows = Math.floor((m.h - step) / step);

        const cosY = Math.cos(s.smoothYaw);
        const sinY = Math.sin(s.smoothYaw);
        const cosX = Math.cos(s.smoothPitch);
        const sinX = Math.sin(s.smoothPitch);
        const depthScale = art.depthExtrusion3D * 0.72;

        const lx = (s.fluidU - 0.5) * 2.2;
        const ly = (s.fluidV - 0.5) * 2.2;
        const lz = 0.75;
        const lLen = Math.hypot(lx, ly, lz);
        const lightX = lx / lLen;
        const lightY = ly / lLen;
        const lightZ = lz / lLen;

        // 1. Вычисляем 3D-проекцию вершин в предвыделенный буфер (0 аллокаций!)
        for (let r = 0; r <= rows; r++) {
          const py = Math.min(m.h - 1, r * step);
          const vOrig = py / (m.h - 1);
          for (let cIdx = 0; cIdx <= cols; cIdx++) {
            const px = Math.min(m.w - 1, cIdx * step);
            const uOrig = px / (m.w - 1);
            const mIdx = py * m.w + px;
            const vIdx = r * (cols + 1) + cIdx;

            if (m.mask[mIdx] < 0.06 || (m.lum[mIdx] < 0.035 && m.edge[mIdx] < 0.04)) {
              vValid[vIdx] = 0;
              continue;
            }
            vValid[vIdx] = 1;

            const [uDef, vDef] = evaluateUnified2DField(uOrig, vOrig, m, kin, time);
            const zRel = (m.depthMap[mIdx] - 0.35) * depthScale;
            const x3 = (uDef - 0.5) * camZoom;
            const y3 = (vDef - 0.5) * camZoom;

            const rx = x3 * cosY + zRel * sinY;
            const rz1 = -x3 * sinY + zRel * cosY;
            const ry = y3 * cosX - rz1 * sinX;
            const rz2 = y3 * sinX + rz1 * cosX;

            const fov = 2.5 / Math.max(0.7, 2.5 - rz2 * 0.85);
            vScreenX[vIdx] = ox + (0.5 + rx * fov) * drawW;
            vScreenY[vIdx] = oy + (0.5 + ry * fov) * drawH;
            vRotZ[vIdx] = rz2;
          }
        }

        // 2. O(N) Сортировка полигонов по 128 Z-корзинам (никакого .sort() и тормозов!)
        bucketHeads.fill(-1);
        let faceCount = 0;

        for (let r = 0; r < rows; r++) {
          const py = r * step;
          for (let cIdx = 0; cIdx < cols; cIdx++) {
            const v00 = r * (cols + 1) + cIdx;
            const v10 = v00 + 1;
            const v01 = (r + 1) * (cols + 1) + cIdx;
            const v11 = v01 + 1;

            if (!vValid[v00] || !vValid[v10] || !vValid[v11] || !vValid[v01]) continue;

            const mIdx = py * m.w + cIdx * step;
            const l = m.lum[mIdx];
            const e = m.edge[mIdx];
            const p = mIdx * 4;

            const dzdx = (m.depthMap[Math.min(m.w * m.h - 1, mIdx + 2)] - m.depthMap[Math.max(0, mIdx - 2)]) * 14.0;
            const dzdy = (m.depthMap[Math.min(m.w * m.h - 1, mIdx + m.w * 2)] - m.depthMap[Math.max(0, mIdx - m.w * 2)]) * 14.0;
            const nLen = Math.hypot(dzdx, dzdy, 1.0);
            const nx = -dzdx / nLen;
            const ny = -dzdy / nLen;
            const nz = 1.0 / nLen;

            const rnx = nx * cosY + nz * sinY;
            const rnz1 = -nx * sinY + nz * cosY;
            const rny = ny * cosX - rnz1 * sinX;
            const rnz2 = ny * sinX + rnz1 * cosX;

            const nDotL = Math.max(0.0, rnx * lightX + rny * lightY + rnz2 * lightZ);
            const sss = Math.max(0.0, Math.sin(nDotL * Math.PI)) * 0.35;
            const fresnelRim = Math.pow(1.0 - Math.max(0.0, rnz2), 2.6) * 0.65 * art.luminanceGlow;
            const spec = Math.pow(nDotL, 18.0) * art.luminanceGlow * 145.0;

            const [baseR, baseG, baseB] = resolveEditionColor(art, m.kuwaharaRgba[p], m.kuwaharaRgba[p + 1], m.kuwaharaRgba[p + 2], l, e, t.tone);
            const lightMult = 0.28 + nDotL * 0.82;

            faceV00[faceCount] = v00;
            faceV10[faceCount] = v10;
            faceV11[faceCount] = v11;
            faceV01[faceCount] = v01;
            faceColorR[faceCount] = Math.min(255, Math.round(baseR * (lightMult + sss * 1.2) + fresnelRim * 90 + spec));
            faceColorG[faceCount] = Math.min(255, Math.round(baseG * (lightMult + sss * 0.6) + fresnelRim * 195 + spec));
            faceColorB[faceCount] = Math.min(255, Math.round(baseB * (lightMult + sss * 0.3) + fresnelRim * 255 + spec));

            const zAvg = (vRotZ[v00] + vRotZ[v10] + vRotZ[v11] + vRotZ[v01]) * 0.25;
            const bucketIdx = Math.max(0, Math.min(NUM_Z_BUCKETS - 1, Math.floor((zAvg + 1.2) * 0.416 * NUM_Z_BUCKETS)));
            faceNext[faceCount] = bucketHeads[bucketIdx];
            bucketHeads[bucketIdx] = faceCount;
            faceCount++;
          }
        }

        // 3. Отрисовка 3D-граней от дальних корзин к ближним
        ctx.globalCompositeOperation = isWireLidar ? "screen" : "source-over";
        for (let b = 0; b < NUM_Z_BUCKETS; b++) {
          let fIdx = bucketHeads[b];
          while (fIdx !== -1) {
            const i00 = faceV00[fIdx];
            const i10 = faceV10[fIdx];
            const i11 = faceV11[fIdx];
            const i01 = faceV01[fIdx];

            ctx.beginPath();
            ctx.moveTo(vScreenX[i00], vScreenY[i00]);
            ctx.lineTo(vScreenX[i10], vScreenY[i10]);
            ctx.lineTo(vScreenX[i11], vScreenY[i11]);
            ctx.lineTo(vScreenX[i01], vScreenY[i01]);
            ctx.closePath();

            const colStr = "rgb(" + String(faceColorR[fIdx]) + "," + String(faceColorG[fIdx]) + "," + String(faceColorB[fIdx]) + ")";
            if (isWireLidar) {
              ctx.strokeStyle = colStr;
              ctx.lineWidth = 0.7 * art.strokeWeight;
              ctx.stroke();
            } else {
              ctx.fillStyle = colStr;
              ctx.fill();
              ctx.strokeStyle = colStr;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
            fIdx = faceNext[fIdx];
          }
        }

        // 4. В режиме HYBRID_SOLID поверх 3D-скульптуры прорисовываем 3D-векторные контуры для 100% четкости лиц и текста!
        if (!isWireLidar && art.render3DStyle === "HYBRID_SOLID") {
          ctx.globalCompositeOperation = "screen";
          const strokes = m.strokes;
          for (let i = 0; i < strokes.length; i++) {
            const st = strokes[i];
            if (st.tier > 1 && st.tier !== 4) continue;
            ctx.beginPath();
            for (let k = 0; k < st.nPts; k++) {
              const [cx, cy] = projectPointUnified(
                st.u[k],
                st.v[k],
                st.z[k] + 0.015,
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
                0
              );
              if (k === 0) ctx.moveTo(cx, cy);
              else ctx.lineTo(cx, cy);
            }
            ctx.strokeStyle = "rgba(" + String(st.cachedR) + "," + String(st.cachedG) + "," + String(st.cachedB) + ",0.68)";
            ctx.lineWidth = (0.42 + st.meanEdge * 0.65) * art.strokeWeight;
            ctx.stroke();
          }
        }
      }

      // ==========================================
      // РЕЖИМЫ 4, 5, 7, 8, 10, 11 (PAINT, CINEMA, HALFTONE, PRISM, PIPER, ENGRAVE)
      // ==========================================
      else if (s.topology === "PAINT" || s.topology === "CINEMA" || s.topology === "HALFTONE" || s.topology === "PRISM" || s.topology === "PIPER") {
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
          const lightU = s.fluidU;
          const lightV = s.fluidV;
          const dotFreq = (0.55 + t.symmetry * 0.65) / Math.max(0.5, art.strokeWeight);
          const prismAngle = t.tone * Math.PI * 2 + Math.sin(time * 0.55) * 0.35;
          const dirX = Math.cos(prismAngle);
          const dirY = Math.sin(prismAngle);
          const maxDispersion = 14.0 + t.symmetry * 38.0 + t.chaos * 22.0;

          for (let y = 0; y < bH; y++) {
            const vOrig = y / bH;
            for (let x = 0; x < bW; x++) {
              const uOrig = x / bW;
              const [uDef, vDef] = evaluateUnified2DField(uOrig, vOrig, m, kin, time);
              const sx = clip(Math.round((2 * uOrig - uDef) * (m.w - 1)), 0, m.w - 1);
              const sy = clip(Math.round((2 * vOrig - vDef) * (m.h - 1)), 0, m.h - 1);

              const idx = sy * m.w + sx;
              const outP = (y * bW + x) * 4;
              const vMask = m.mask[idx];
              if (vMask <= 0.005) continue;

              const p = idx * 4;
              const l = clip(m.lum[idx] + art.highlightBoost * 0.2);
              const e = m.edge[idx];
              const fd = m.fdog[idx];

              let rOut = kuw[p], gOut = kuw[p + 1], bOut = kuw[p + 2];

              if (s.topology === "PAINT") {
                const bristleCoord = (sx * m.etfY[idx] - sy * m.etfX[idx]) * (0.95 / Math.max(0.35, m.scaleMap[idx]));
                const bristleHeight = Math.sin(bristleCoord) * (0.14 + e * 0.38 + t.chaos * 0.25);
                const lx = lightU - uOrig;
                const ly = lightV - vOrig;
                const lNorm = Math.hypot(lx, ly, 0.45);
                const nx = m.gx[idx] * e + m.etfY[idx] * bristleHeight;
                const ny = m.gy[idx] * e - m.etfX[idx] * bristleHeight;
                const dotLight = Math.max(0.0, (nx * lx + ny * ly + 0.45) / lNorm);
                const oilSpec = Math.pow(dotLight, 14.0) * art.luminanceGlow * 175.0;
                const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone);
                const inkContour = clip(0.34 + 0.66 * Math.tanh(8.0 * (fd - 0.24)), 0.22, 1.0);
                rOut = (kuw[p] * art.foundationDepth + edR * (1.0 - art.foundationDepth)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpec;
                gOut = (kuw[p + 1] * art.foundationDepth + edG * (1.0 - art.foundationDepth)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpec * 0.96;
                bOut = (kuw[p + 2] * art.foundationDepth + edB * (1.0 - art.foundationDepth)) * inkContour * (0.94 + bristleHeight * 0.24) + oilSpec * 0.88;
              } else if (s.topology === "CINEMA") {
                const halation = Math.max(0.0, m.smoothLum[idx] - 0.34) * art.luminanceGlow * 195.0;
                const [edR, edG, edB] = resolveEditionColor(art.edition === "SHINE_ON" && !art.customGrading ? { ...art, edition: "KODAK_800T" } : art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone);
                rOut = edR + halation * 1.2;
                gOut = edG + halation * 0.38;
                bOut = edB + halation * 0.1;
              } else if (s.topology === "HALFTONE") {
                const cGrid = 0.5 + 0.25 * (Math.cos((sx * 0.966 - sy * 0.259) * dotFreq) + Math.cos((sx * 0.259 + sy * 0.966) * dotFreq));
                const [edR, edG, edB] = resolveEditionColor(art, kuw[p], kuw[p + 1], kuw[p + 2], l, e, t.tone);
                const dotVal = l + e * 0.3 > cGrid * 0.85 ? 1.0 : 0.25;
                rOut = edR * dotVal;
                gOut = edG * dotVal;
                bOut = edB * dotVal;
              } else if (s.topology === "PRISM") {
                const darkFactor = (0.28 + art.foundationDepth * 0.45) * (0.45 + e * 0.85) / (1.0 + l * 0.85);
                let rLin = (kuw[p] / 255.0) * darkFactor;
                let gLin = (kuw[p + 1] / 255.0) * darkFactor;
                let bLin = (kuw[p + 2] / 255.0) * darkFactor;
                const glowScale = 0.14 + art.luminanceGlow * 0.24;
                for (let band = 0; band < 7; band++) {
                  const bandNorm = (band + 1) / 7.0;
                  const dist = bandNorm * maxDispersion;
                  const rx = Math.round(sx - dirX * dist);
                  const ry = Math.round(sy - dirY * dist);
                  if (rx >= 0 && rx < m.w && ry >= 0 && ry < m.h) {
                    const sEdge = m.edge[ry * m.w + rx];
                    if (sEdge > 0.16) {
                      const falloff = (1.0 - bandNorm * 0.45) * sEdge * glowScale;
                      const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                      rLin += (cr / 255.0) * falloff;
                      gLin += (cg / 255.0) * falloff;
                      bLin += (cb / 255.0) * falloff;
                    }
                  }
                }
                rOut = acesTonemap(rLin) * 255;
                gOut = acesTonemap(gLin) * 255;
                bOut = acesTonemap(bLin) * 255;
              } else {
                const brushSlide = Math.sin(uOrig * 8.0 + vOrig * 8.0 - time * 2.2) * (2.2 + t.chaos * 5.5) * m.scaleMap[idx];
                const [rK, gK, bK] = sampleBilinearRGB(kuw, m.w, m.h, clip(sx + m.etfX[idx] * brushSlide, 0, m.w - 1), clip(sy + m.etfY[idx] * brushSlide, 0, m.h - 1));
                const [oilR, oilG, oilB] = resolveEditionColor(art, rK, gK, bK, l, e, t.tone + (rK - bK) / 512.0);
                const inkShadow = clip(0.32 + 0.68 * Math.tanh(8.0 * (fd - 0.22)), 0.22, 1.0);
                rOut = (rK * art.foundationDepth + oilR * (1.0 - art.foundationDepth * 0.6)) * inkShadow;
                gOut = (gK * art.foundationDepth + oilG * (1.0 - art.foundationDepth * 0.6)) * inkShadow;
                bOut = (bK * art.foundationDepth + oilB * (1.0 - art.foundationDepth * 0.6)) * inkShadow;
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
      } else if (s.topology === "ENGRAVE") {
        drawSynchronizedUnderlay(0.5);
        const numLines = Math.floor(115 + (1.0 - art.coherenceGate) * 65);
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
          const [rC, gC, bC] = resolveEditionColor(art, m.kuwaharaRgba[midCell], m.kuwaharaRgba[midCell + 1], m.kuwaharaRgba[midCell + 2], rowLum / numCols, rowEdge / numCols, t.tone);
          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + ",0.9)";
          ctx.lineWidth = 1.0 * art.strokeWeight;
          ctx.stroke();
        }
      }

      // Если активен 3D-режим — рисуем интерактивный 3D-гироскоп осей (X, Y, Z) в левом нижнем углу картины!
      if (is3DActive) {
        draw3DGimbalGizmo(s.smoothYaw, s.smoothPitch, ox, oy, drawH);
      }

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
          "BARRETT 18.0 // " + (query || "SHINE ON").toUpperCase().slice(0, 18) + " [" + art.dimension + " · " + s.topology + "]",
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

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[600px] md:h-[780px] rounded-2xl overflow-hidden border border-white/10 bg-[#030206] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
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
            cursor: artConfig.dimension === "3D_SPACE" ? "grab" : "crosshair",
            touchAction: "none",
          }}
        />

        {/* ВЕРХНИЙ БАР: ТЕЛЕМЕТРИЯ + ЧЕТКОЕ РАЗДЕЛЕНИЕ 2D / 3D + УПРАВЛЕНИЕ 3D-КАМЕРОЙ */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start gap-2">
          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300 pointer-events-none">
            <div className="text-white font-bold">BARRETT 18.0 // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
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
                2D Studio
              </button>
              <button
                type="button"
                onClick={() => updateArt("dimension", "3D_SPACE")}
                className={
                  "px-3 py-1 rounded-lg font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer " +
                  (artConfig.dimension === "3D_SPACE"
                    ? "bg-[#10b981] text-black font-bold"
                    : "text-neutral-400 hover:text-white")
                }
              >
                3D Space (Drag to Rotate)
              </button>
            </div>

            {artConfig.dimension === "3D_SPACE" && (
              <div className="flex bg-black/85 backdrop-blur-md p-1 rounded-xl border border-white/15 gap-1">
                <button
                  type="button"
                  onClick={() => updateArt("autoOrbit3D", !artConfig.autoOrbit3D)}
                  className={
                    "px-2 py-1 rounded-lg font-mono text-[8px] uppercase tracking-wider cursor-pointer " +
                    (artConfig.autoOrbit3D ? "bg-[#a855f7] text-black font-bold" : "text-neutral-300")
                  }
                >
                  Auto-Orbit
                </button>
                <button
                  type="button"
                  onClick={reset3DCamera}
                  className="px-2 py-1 rounded-lg font-mono text-[8px] uppercase tracking-wider text-neutral-300 hover:text-white cursor-pointer"
                >
                  Reset 3D
                </button>
              </div>
            )}

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
              title="Toggle High-Speed Mobile Optimization"
            >
              PERF: {artConfig.fastPerfMode ? "FAST 500P" : "HD 760P"}
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
                  "SILK",
                  "SCULPT3D",
                  "PAINT",
                  "CINEMA",
                  "SKETCH",
                  "HALFTONE",
                  "PRISM",
                  "LIDAR",
                  "PIPER",
                  "ENGRAVE",
                ] as ManifoldTopology[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopology(mode);
                    if (mode === "SCULPT3D" || mode === "LIDAR") {
                      updateArt("dimension", "3D_SPACE");
                    } else if (artConfig.dimension === "3D_SPACE" && mode !== "SILK" && mode !== "TRACE") {
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

      {/* ПРАВАЯ ПАНЕЛЬ: MOTION COMPILER + ART STUDIO + COLOR LAB */}
      <div className="lg:col-span-4 glass-panel p-6 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("ANIM_PROMPT")}
                className={
                  "px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-widest transition-all cursor-pointer " +
                  (activeTab === "ANIM_PROMPT"
                    ? "bg-[#10b981] text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white")
                }
              >
                Motion Compiler
              </button>
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
            </div>
            <span className="font-mono text-[8px] text-[#10b981] uppercase tracking-widest">PRO 18.0</span>
          </div>

          {activeTab === "ANIM_PROMPT" && (
            <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
              <div>
                <div className="text-neutral-400 mb-1.5">Differential Animation Prompt (RU / EN):</div>
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={animPromptInput}
                    onChange={(e) => setAnimPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleApplyPrompt();
                      }
                    }}
                    placeholder="Enter motion parameters (e.g. 3D orbit, laminar wind, radial pulse, elastic wave)..."
                    className="w-full rounded-xl bg-black/60 border border-white/15 p-2.5 text-[10px] text-white font-mono normal-case focus:outline-none focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPrompt()}
                    className="py-2 px-3 rounded-xl bg-[#10b981] text-black font-bold text-[9px] uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer"
                  >
                    Compile Kinetic Coordinates
                  </button>
                </div>
              </div>

              <div>
                <div className="text-neutral-400 mb-1.5">Preset Kinetic Vectors:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROMPT_PRESETS.map((pr) => (
                    <button
                      key={pr.label}
                      type="button"
                      onClick={() => handleApplyPrompt(pr.prompt, pr.is3D)}
                      className={
                        "py-1.5 px-2 rounded-lg border text-[8px] tracking-wider text-left truncate transition-all cursor-pointer " +
                        (animPromptInput === pr.prompt
                          ? "bg-white text-black border-white font-bold"
                          : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                      }
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[8px] text-neutral-300 space-y-1">
                <div className="text-[#10b981] font-bold flex justify-between">
                  <span>COMPILED FIELD MATRIX:</span>
                  <span>{kineticCoords.modeName}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7.5px]">
                  <div>PIPELINE: <span className="text-white">{artConfig.dimension}</span></div>
                  <div>SHOCK IMPULSE: <span className="text-white">{kineticCoords.shockwaveAmp}</span></div>
                  <div>ELASTIC SWAY: <span className="text-white">{kineticCoords.elasticSwayAmp}</span></div>
                  <div>WIND VECTOR: <span className="text-white">({kineticCoords.windVecX}, {kineticCoords.windVecY})</span></div>
                  <div>BIO-PULSE: <span className="text-white">{kineticCoords.pulseAmp} ({kineticCoords.pulseFreq}Hz)</span></div>
                  <div>TURBULENCE: <span className="text-white">{kineticCoords.turbulence}</span></div>
                </div>
              </div>

              {/* Явное управление 3D-фигурой и 3D-стилем */}
              <div className="flex flex-col gap-2 pt-0.5">
                {artConfig.dimension === "3D_SPACE" && (
                  <>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: "HYBRID_SOLID", label: "3D Hybrid" },
                          { id: "PURE_SOLID", label: "3D Solid" },
                          { id: "WIREFRAME_MESH", label: "3D Wire" },
                        ] as { id: Render3DStyle; label: string }[]
                      ).map((st3) => (
                        <button
                          key={st3.id}
                          type="button"
                          onClick={() => updateArt("render3DStyle", st3.id)}
                          className={
                            "py-1 rounded border text-[7.5px] uppercase cursor-pointer " +
                            (artConfig.render3DStyle === st3.id
                              ? "bg-white text-black border-white font-bold"
                              : "bg-black/40 text-neutral-400 border-white/10")
                          }
                        >
                          {st3.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-neutral-400">
                        <span>3D Camera Yaw (Horizontal Angle)</span>
                        <span className="text-white">{manualYaw} rad</span>
                      </div>
                      <input
                        type="range"
                        min="-1.2"
                        max="1.2"
                        step="0.02"
                        value={manualYaw}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setManualYaw(v);
                          stateRef.current.userYaw = v;
                        }}
                        className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-neutral-400">
                        <span>3D Camera Pitch (Vertical Tilt)</span>
                        <span className="text-white">{manualPitch} rad</span>
                      </div>
                      <input
                        type="range"
                        min="-0.9"
                        max="0.9"
                        step="0.02"
                        value={manualPitch}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setManualPitch(v);
                          stateRef.current.userPitch = v;
                        }}
                        className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>3D Z-Relief Extrusion Depth</span>
                    <span className="text-[#10b981]">{Math.round(artConfig.depthExtrusion3D * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.02"
                    value={artConfig.depthExtrusion3D}
                    onChange={(e) => updateArt("depthExtrusion3D", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Global Phase Velocity (Energy)</span>
                    <span className="text-white">{tensor.energy.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.98"
                    step="0.01"
                    value={tensor.energy}
                    onChange={(e) => handleAxisChange("energy", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "STUDIO" && (
            <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
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
                      { id: "PIXAR_SSS", label: "Pixar 3D (SSS & Rim)", dot: "linear-gradient(135deg,#fb7185,#38bdf8)" },
                      { id: "KODAK_800T", label: "CineStill 800T (35mm)", dot: "linear-gradient(135deg,#0284c7,#f97316)" },
                      { id: "REMBRANDT", label: "Rembrandt (Chiaroscuro)", dot: "linear-gradient(135deg,#451a03,#fde68a)" },
                      { id: "ARCANE_OIL", label: "Arcane Impasto (Oil)", dot: "linear-gradient(135deg,#14b8a6,#f43f5e)" },
                      { id: "VOGUE_NOIR", label: "Vogue Noir (Silver/Red)", dot: "linear-gradient(135deg,#f8fafc,#ef4444)" },
                      { id: "WARHOL_POP", label: "Warhol (Silkscreen)", dot: "linear-gradient(135deg,#ff1476,#00ebf5)" },
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

              <div className="flex flex-col gap-2 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Tensor Coherence Gate (Cleanliness)</span>
                    <span className="text-[#10b981]">{Math.round(artConfig.coherenceGate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.85"
                    step="0.02"
                    value={artConfig.coherenceGate}
                    onChange={(e) => updateArt("coherenceGate", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

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
                    <span>Specular Rim & Highlight Boost</span>
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
                    <span>Adaptive Vector & Silk Calibre</span>
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
                    <span>Kajiya-Kay Sheen & Photonic Glow</span>
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
            <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">3-Way Color Wheels:</span>
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
                  <label className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.shadowHex}
                      onChange={(e) => {
                        updateArt("shadowHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Shadows</span>
                  </label>

                  <label className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.midtoneHex}
                      onChange={(e) => {
                        updateArt("midtoneHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Midtones</span>
                  </label>

                  <label className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-white/5 cursor-pointer">
                    <input
                      type="color"
                      value={artConfig.highlightHex}
                      onChange={(e) => {
                        updateArt("highlightHex", e.target.value);
                        updateArt("customGrading", true);
                      }}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[7.5px] text-neutral-300">Highlights</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Exposure (EV)</span>
                    <span className="text-white">{artConfig.exposure >= 0 ? "+" : ""}{artConfig.exposure.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.02"
                    value={artConfig.exposure}
                    onChange={(e) => updateArt("exposure", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Contrast</span>
                    <span className="text-white">{Math.round(artConfig.contrast * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.02"
                    value={artConfig.contrast}
                    onChange={(e) => updateArt("contrast", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Color Saturation</span>
                    <span className="text-white">{Math.round(artConfig.saturation * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.2"
                    step="0.05"
                    value={artConfig.saturation}
                    onChange={(e) => updateArt("saturation", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Color Temperature (Cool / Warm)</span>
                    <span className="text-white">{artConfig.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.02"
                    value={artConfig.temperature}
                    onChange={(e) => updateArt("temperature", parseFloat(e.target.value))}
                    className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Optical Vignette & Film Grain</span>
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
              </div>
            </div>
          )}
        </div>

        {/* БЛОК ЭКСПОРТА PNG / ANIMATED GIF / 60FPS WEBM */}
        <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadSnapshot}
              className="btn-elegant !py-2.5 justify-center text-[9px]"
            >
              Download PNG
            </button>

            <button
              type="button"
              disabled={isExportingGif}
              onClick={handleExportAnimatedGif}
              className="btn-elegant !py-2.5 justify-center border-[#10b981]/60 text-[#10b981] text-[9px]"
            >
              {isExportingGif ? "Encoding GIF..." : "Export Animated GIF"}
            </button>
          </div>

          <button
            type="button"
            disabled={isRecording}
            onClick={handleRecordWebm}
            className="btn-elegant w-full !py-2.5 justify-center border-[#a855f7]/50 text-[#a855f7]"
          >
            {isRecording ? "Recording 60FPS Loop (5s)..." : "Export 5s WebM Video Loop"}
          </button>

          {onSecureArtifact && (
            <button
              type="button"
              onClick={handleSecureToArchive}
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
              className="btn-elegant w-full !py-2.5 justify-center font-bold"
            >
              Secure to Saved Resonance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
