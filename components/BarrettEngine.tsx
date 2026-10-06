"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

type DimensionSpace = "2D_STUDIO" | "3D_SPACE";
type CanvasBackdrop = "OBSIDIAN" | "VOID_BLACK" | "MIDNIGHT" | "VELVET_NOIR" | "ARCHIVAL_PAPER";
type RenderBehaviorMode = "STATIC_MASTERPIECE" | "PROGRESSIVE_PEN_DRAW" | "OPTICAL_LIGHT_GLIDE";

interface PromptConfig {
  promptText: string;
  modeName: string;
  lightGlideSpeed: number; // Скорость движения блика света по статичным штрихам (0 = полная статика)
  drawSpeed: number;       // Скорость вычерчивания пером при нажатии Re-Draw
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
  | "WARHOL_POP"
  | "LICHTENSTEIN"
  | "OBEY_POSTER"
  | "STREET_POP"
  | "PIXAR_SSS"
  | "KODAK_800T"
  | "REMBRANDT"
  | "VOGUE_NOIR"
  | "DARK_SIDE"
  | "DA_VINCI"
  | "CUSTOM_GRADE";

interface ArtStudioConfig {
  dimension: DimensionSpace;
  backdrop: CanvasBackdrop;
  behavior: RenderBehaviorMode;
  lockFrontAnfas: boolean;     // Включено по умолчанию: 3D модель стоит строго анфас (0°, 0°)
  fastPerfMode: boolean;
  edition: TributeEdition;
  posterFrame: boolean;
  strokeWeight: number;        // Калибр микро-штриха (0.2px - 1.5px)
  tonalVolumeDepth: number;    // Глубина светотеневой проработки LIC (чтобы объекты не были пустыми контурами)
  cleanlinessGate: number;     // Порог отсечения фонового шума
  contrastAndGlow: number;     // Контраст чернил и призматических граней
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
  tier: 0 | 1 | 2 | 3 | 4; // 0: Микро-детали и глаза (0.22px), 1: Силовой контур, 2: Вторичный контур, 3: Штриховка LIC, 4: Световые блики
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
  arcLen: number;
  centerU: number;
  centerV: number;
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
  licRgba: Uint8ClampedArray; // Свертка Кабрала-Лидома (LIC): превращает фото в настоящие художественные мазки вдоль контуров!
  lum: Float32Array;
  smoothLum: Float32Array;
  depthMap: Float32Array;
  coherence: Float32Array;
  subjectAlpha: Float32Array;
  fdog: Float32Array;         // Анизотропный офорт Канга
  nmsRidge: Float32Array;     // Строгий 1-пиксельный гребень Кэнни
  edge: Float32Array;
  scaleMap: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  etfX: Float32Array;
  etfY: Float32Array;
  mask: Float32Array;
  strokes: ContourStroke[];
  silkLoom: SilkStrand[];
  meanAnisotropy: number;
}

type ManifoldTopology =
  | "TRACE"
  | "SKETCH"
  | "POPART"
  | "PAINT"
  | "SILK"
  | "ENGRAVE"
  | "PRISM"
  | "SCULPT3D"
  | "CINEMA"
  | "LIDAR";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

const CAUCHY_SPECTRUM: [number, number, number][] = [
  [255, 42, 75],
  [255, 138, 25],
  [255, 232, 45],
  [35, 242, 130],
  [30, 215, 255],
  [75, 110, 255],
  [195, 60, 255],
];

const BACKDROP_COLORS: Record<CanvasBackdrop, string> = {
  OBSIDIAN: "#040308",
  VOID_BLACK: "#000000",
  MIDNIGHT: "#060e1e",
  VELVET_NOIR: "#14050b",
  ARCHIVAL_PAPER: "#e8dcc4",
};

const NOISE_BLACKLIST = [
  "neutron",
  "nickelodeon",
  "spongebob",
  "toon",
  "clipart",
  "meme",
  "roblox",
  "minecraft",
  "fortnite",
  "sticker",
  "emoji",
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

function scoreSearchItemRelevance(item: any, rawQuery: string): number {
  const qClean = rawQuery.trim().toLowerCase();
  const tokens = qClean.split(/\s+/).filter((t) => t.length >= 2);
  const meta = [
    item.title || "",
    item.alt || "",
    item.description || "",
    item.artist || "",
    item.src || "",
    item.image_url || "",
  ]
    .join(" ")
    .toLowerCase();

  for (const badWord of NOISE_BLACKLIST) {
    if (meta.includes(badWord) && !qClean.includes(badWord)) {
      return -100;
    }
  }

  if (tokens.length === 0) return 1;

  let score = 0;
  if (meta.includes(qClean) || meta.includes(tokens.join("_")) || meta.includes(tokens.join("-"))) {
    score += 50;
  }

  let matchedTokens = 0;
  for (const tk of tokens) {
    if (meta.includes(tk)) {
      matchedTokens++;
      score += 10;
    }
  }

  if (tokens.length >= 2 && matchedTokens < tokens.length) {
    score -= 25;
  }

  return score;
}

// Спокойный парсер промпта (без растягивания и деформации геометрии!)
function compilePromptConfig(rawPrompt: string): PromptConfig {
  const text = (rawPrompt || "").trim().toLowerCase();
  if (!text || /(статик|неподвиж|стоп|static|still|lock)/.test(text)) {
    return {
      promptText: rawPrompt,
      modeName: "100% STATIC GEOMETRY LOCK",
      lightGlideSpeed: 0.0,
      drawSpeed: 1.0,
    };
  }
  if (/(рисов|перо|таймлапс|штрих|draw|sketch|timelapse)/.test(text)) {
    return {
      promptText: rawPrompt,
      modeName: "PROGRESSIVE CALLIGRAPHIC DRAW",
      lightGlideSpeed: 0.35,
      drawSpeed: 0.65,
    };
  }
  return {
    promptText: rawPrompt,
    modeName: "OPTICAL LIGHT & PHOTON GLIDE (STATIC EDGES)",
    lightGlideSpeed: 0.85,
    drawSpeed: 1.0,
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
  const minVis = forVectorStroke ? 0.36 : 0.02;
  const energy = clip(Math.max(minVis, lum * 0.68 + edge * 0.52), 0.0, 1.0);
  const contrastBoost = 0.88 + art.contrastAndGlow * 0.38;

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

  if (edition === "WARHOL_POP") {
    if (lum < 0.25) return forVectorStroke ? [255, 35, 135] : [22, 12, 38];
    if (lum < 0.52) return [255, 20, 125];
    if (lum < 0.76) return [0, 238, 248];
    return [255, 240, 25];
  }

  if (edition === "LICHTENSTEIN") {
    if (isHighlightStroke || lum > 0.78) return [255, 252, 240];
    if (edge > 0.35 && !forVectorStroke) return [18, 16, 22];
    if (lum < 0.32) return [32, 88, 225];
    if (lum < 0.58) return [242, 42, 52];
    return [255, 218, 45];
  }

  if (edition === "OBEY_POSTER") {
    if (lum < 0.26) return forVectorStroke ? [123, 164, 181] : [15, 30, 46];
    if (lum < 0.52) return [217, 43, 43];
    if (lum < 0.75) return [123, 164, 181];
    return [245, 235, 214];
  }

  if (edition === "STREET_POP") {
    const band = Math.floor((lum * 3.8 + phaseShift * 3.0) % 4);
    if (band === 0) return [255, 55, 35];
    if (band === 1) return [45, 245, 115];
    if (band === 2) return [255, 230, 20];
    return [55, 195, 255];
  }

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

  const avg = (nativeR + nativeG + nativeB) * 0.333;
  const sat = Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB);
  const boost = forVectorStroke ? 52 : 18;
  if (sat > 12) {
    return finalize(
      avg + (nativeR - avg) * 1.55 + edge * boost,
      avg + (nativeG - avg) * 1.55 + edge * boost,
      avg + (nativeB - avg) * 1.55 + edge * (boost + 10)
    );
  }
  const baseV = (45 + energy * 210) * (forVectorStroke ? 1.0 : clip(lum * 1.35 + edge * 0.6, 0.04, 1.0));
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
      eigenAnisotropy: 0.952,
    },
  };
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
// МАТЕМАТИЧЕСКОЕ ЯДРО 25.0:
// СВЕРТКА КАБРАЛА-ЛИДОМА (LIC) + СКЕЛЕТ КЭННИ С СОХРАНЕНИЕМ УГЛОВ (БЕЗ "ЧЕРВЯКОВ" И ИЗГИБОВ!)
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, useFastMode: boolean): MatrixBuffer {
  const baseRes = useFastMode ? 540 : 780;
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
  const nmsRidge = new Float32Array(total);
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
      licRgba: new Uint8ClampedArray(total * 4),
      lum,
      smoothLum: lum,
      depthMap,
      coherence,
      subjectAlpha,
      fdog,
      nmsRidge,
      edge,
      scaleMap,
      gx,
      gy,
      etfX,
      etfY,
      mask,
      strokes,
      silkLoom,
      meanAnisotropy: 0.95,
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
    const wy = Math.abs(ny) > 0.95 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.95) / 0.05) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.95 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.95) / 0.05) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      const normL = clip((rawLArr[i] - minL) / spanL);
      // Поднимаем детализацию в полутенях (чтобы кот на темном фоне, лица и одежда были четко видны!)
      lum[i] = Math.pow(normL, 0.76) * mask[i];
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gWide = gaussianBlurField(lum, w, h, 3);
  const smoothLum = gaussianBlurField(lum, w, h, 10);
  const domeLum = gaussianBlurField(lum, w, h, 24);

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

  // Деликатное 1-проходное сглаживание тензора (чтобы не искривлять прямые углы и решетки!)
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

  const localEnv = gaussianBlurField(rawGradMag, w, h, 4);
  const absFloor = globalMaxEdge * 0.022;

  for (let i = 0; i < total; i++) {
    const gVal = rawGradMag[i];
    const rVal = (hessianRidge[i] / globalMaxRidge) * globalMaxEdge * 0.55 * coherence[i];
    const combinedSignal = Math.max(gVal, rVal);

    if (combinedSignal < absFloor) {
      edge[i] = 0.0;
    } else {
      const denom = Math.max(globalMaxEdge * 0.12, localEnv[i] * 1.85 + globalMaxEdge * 0.05);
      edge[i] = clip((combinedSignal - absFloor * 0.65) / denom);
    }
  }

  // Строгий 1-пиксельный скелет Кэнни (NMS) + параболическое субпиксельное уточнение центра линии!
  const subOffsetX = new Float32Array(total);
  const subOffsetY = new Float32Array(total);

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      if (e0 < 0.038 || mask[i] < 0.05) continue;
      const nx = Math.round(gx[i]);
      const ny = Math.round(gy[i]);
      if (nx === 0 && ny === 0) continue;

      const ePrev = edge[(y - ny) * w + (x - nx)];
      const eNext = edge[(y + ny) * w + (x + nx)];
      if (e0 >= ePrev && e0 >= eNext) {
        nmsRidge[i] = e0;
        const denom = 2.0 * (ePrev - 2.0 * e0 + eNext);
        const offset = Math.abs(denom) > 1e-4 ? clip((ePrev - eNext) / denom, -0.45, 0.45) : 0.0;
        subOffsetX[i] = gx[i] * offset;
        subOffsetY[i] = gy[i] * offset;
      }
    }
  }

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

      const safeDetail = Math.max(domeLum[i] - 0.1, smoothLum[i]);
      depthMap[i] = clip((radialDome * 0.38 + domeLum[i] * 0.42 + safeDetail * 0.2) * (0.35 + 0.65 * rawAlpha[i])) * mask[i];

      const normRidge = (hessianRidge[i] / globalMaxRidge) * coherence[i];
      const crowding = edgeEnvelope[i] * 3.2 + normRidge * 4.6;
      scaleMap[i] = clip(1.0 / (0.85 + crowding), 0.18, 1.25);
    }
  }

  const blurredAlpha = gaussianBlurField(rawAlpha, w, h, 4);
  for (let i = 0; i < total; i++) {
    subjectAlpha[i] = clip(blurredAlpha[i] + edge[i] * 0.45) * mask[i];
  }

  // ==========================================
  // СВЕРТКА КАБРАЛА — ЛИДОМА (LINE INTEGRAL CONVOLUTION - LIC):
  // Вместо сырой фотографии строит направленную штриховую светотень вдоль поля касательных ETF!
  // ==========================================
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] <= 0.005) continue;

      let sumR = rawRgba[idx * 4] * 0.26;
      let sumG = rawRgba[idx * 4 + 1] * 0.26;
      let sumB = rawRgba[idx * 4 + 2] * 0.26;
      let sumW = 0.26;

      const stepLen = 0.7 + scaleMap[idx] * 0.65;

      for (let dir = -1; dir <= 1; dir += 2) {
        let cx = x + 0.5;
        let cy = y + 0.5;
        let prevTx = etfX[idx] * dir;
        let prevTy = etfY[idx] * dir;

        for (let step = 1; step <= 4; step++) {
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

          cx += tx * stepLen;
          cy += ty * stepLen;

          const sx = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const sy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const sP = (sy * w + sx) * 4;
          const wgt = Math.exp(-step * 0.38);

          sumR += rawRgba[sP] * wgt;
          sumG += rawRgba[sP + 1] * wgt;
          sumB += rawRgba[sP + 2] * wgt;
          sumW += wgt;
        }
      }

      const p = idx * 4;
      licRgba[p] = Math.min(255, Math.round(sumR / sumW));
      licRgba[p + 1] = Math.min(255, Math.round(sumG / sumW));
      licRgba[p + 2] = Math.min(255, Math.round(sumB / sumW));
      licRgba[p + 3] = 255;
    }
  }

  // Анизотропный офорт FDoG
  const rawDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const microDiff = lum[i] - gNarrow[i];
    const macroDiff = gNarrow[i] - gWide[i];
    const pAdaptive = 28.0 * smoothstep(0.02, 0.2, edge[i] * (0.35 + 0.65 * coherence[i]));
    rawDoG[i] = clip(lum[i] + (microDiff * 0.72 + macroDiff * 0.28) * pAdaptive);
  }

  for (let y = 4; y < h - 4; y++) {
    for (let x = 4; x < w - 4; x++) {
      const i = y * w + x;
      let acc = rawDoG[i] * 0.42;
      const tx = etfX[i];
      const ty = etfY[i];
      const stepScale = scaleMap[i];

      for (let step = 1; step <= 2; step++) {
        const wgt = step === 1 ? 0.19 : 0.1;
        const dist = step * stepScale * 1.1;
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
        r: licRgba[p],
        g: licRgba[p + 1],
        b: licRgba[p + 2],
        cachedR: licRgba[p],
        cachedG: licRgba[p + 1],
        cachedB: licRgba[p + 2],
        lum: lum[idx],
        edge: edge[idx],
        subjectWeight: subjectAlpha[idx],
        phase: (silkLoom.length * PHI) % (Math.PI * 2),
        weight: clip(0.35 + edge[idx] * 0.8 + lum[idx] * 0.3, 0.25, 1.25),
      });
    }
  }

  // ==========================================
  // ТОЧНАЯ 8-СВЯЗНАЯ СКЕЛЕТНАЯ ВЕКТОРИЗАЦИЯ КЭННИ С СОХРАНЕНИЕМ ОСТРЫХ УГЛОВ И ПРЯМЫХ ЛИНИЙ!
  // Прутья забора, струны, архитектура и глаза вычерчиваются со 100% геометрической точностью без "червяков"!
  // ==========================================
  const ridgeSeeds: { idx: number; score: number; tier: 0 | 1 | 2 | 4 }[] = [];

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      const e0 = nmsRidge[i];
      if (e0 < 0.042 || mask[i] < 0.05) continue;

      const isBrightHighlight = positiveRidge[i] > globalMaxRidge * 0.13 && lum[i] > gWide[i] + 0.03;
      const tier: 0 | 1 | 2 | 4 =
        scaleMap[i] < 0.52 && e0 > 0.12
          ? 0
          : isBrightHighlight
          ? 4
          : e0 > 0.2
          ? 1
          : 2;
      ridgeSeeds.push({ idx: i, score: e0 * (tier === 0 || tier === 4 ? 1.4 : 1.0), tier });
    }
  }

  ridgeSeeds.sort((a, b) => b.score - a.score);

  const DIRS_8: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  const visited = new Uint8Array(total);

  const traceExactPixelChain = (startIdx: number, dirSign: number, maxLen: number) => {
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
        if (visited[nIdx] || nmsRidge[nIdx] <= 0.038) continue;

        const dLen = Math.hypot(dx, dy);
        const ndx = dx / dLen;
        const ndy = dy / dLen;
        const align = ndx * prevDx + ndy * prevDy;

        if (align > 0.15) {
          const score = align * 0.62 + nmsRidge[nIdx] * 0.38;
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
      prevDx = prevDx * 0.3 + bestDx * 0.7;
      prevDy = prevDy * 0.3 + bestDy * 0.7;
      const norm = Math.hypot(prevDx, prevDy) + 1e-6;
      prevDx /= norm;
      prevDy /= norm;
    }

    return chain;
  };

  const packCornerLockedStroke = (rawPts: { x: number; y: number }[], tier: 0 | 1 | 2 | 3 | 4) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;

    // Сглаживание с жесткой защитой углов (если cosAngle < 0.7 — это вершина угла, не скругляем её!)
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

        if (cosAngle > 0.7) {
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

    let eSum = 0, lSum = 0, cohSum = 0, subjSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0, scaleSum = 0;

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
      zArr[i] = depthMap[pxIdx];

      scaleSum += scaleMap[pxIdx];
      eSum += edge[pxIdx];
      lSum += lum[pxIdx];
      cohSum += coherence[pxIdx];
      subjSum += subjectAlpha[pxIdx];
      const p4 = pxIdx * 4;
      rSum += licRgba[p4];
      gSum += licRgba[p4 + 1];
      bSum += licRgba[p4 + 2];
    }

    const meanEdge = eSum / n;
    const meanCoh = cohSum / n;
    const meanScale = scaleSum / n;
    const importance = clip((meanEdge * 0.85 + meanCoh * 0.45) + (tier === 0 || tier === 4 ? 0.42 : Math.min(0.35, n / 65.0)));
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
      arcLen: n,
      centerU: uSum / n,
      centerV: vSum / n,
    });
  };

  const maxRidgeStrokes = useFastMode ? 4500 : 7500;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxRidgeStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const back = traceExactPixelChain(seed.idx, -1, 85).reverse();
    const fwd = traceExactPixelChain(seed.idx, 1, 85);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];

    if (rawPts.length < (seed.tier === 0 ? 3 : 4)) continue;
    packCornerLockedStroke(rawPts, seed.tier);
  }

  // Тонкие гравировальные штрихи вдоль касательных ETF в полутонах (Tier 3)
  const hatchStep = useFastMode ? 6 : 5;
  const maxTotal = useFastMode ? 5800 : 9200;
  for (let y = 6; y < h - 6; y += hatchStep) {
    for (let x = 6; x < w - 6; x += hatchStep) {
      if (strokes.length >= maxTotal) break;
      const idx = y * w + x;
      if (visited[idx] || mask[idx] < 0.08) continue;
      if (lum[idx] > 0.08 && (coherence[idx] > 0.18 || edge[idx] > 0.04)) {
        const hatchPts: { x: number; y: number }[] = [];
        let cx = x + 0.5;
        let cy = y + 0.5;
        let prevTx = etfX[idx];
        let prevTy = etfY[idx];

        for (let s = 0; s < 10; s++) {
          const ix = Math.min(w - 1, Math.max(0, Math.floor(cx)));
          const iy = Math.min(h - 1, Math.max(0, Math.floor(cy)));
          const cIdx = iy * w + ix;
          let tx = etfX[cIdx];
          let ty = etfY[cIdx];
          if (tx * prevTx + ty * prevTy < 0) {
            tx = -tx;
            ty = -ty;
          }
          prevTx = tx;
          prevTy = ty;
          hatchPts.push({ x: cx, y: cy });
          cx = clip(cx + tx * 1.35, 2, w - 3);
          cy = clip(cy + ty * 1.35, 2, h - 3);
        }
        if (hatchPts.length >= 4) {
          packCornerLockedStroke(hatchPts, 3);
        }
      }
    }
  }

  strokes.sort((a, b) => {
    const tierOrder = (a.tier === 3 ? 1 : 0) - (b.tier === 3 ? 1 : 0);
    if (tierOrder !== 0) return tierOrder;
    const da = Math.hypot(a.centerU - 0.5, a.centerV - 0.48);
    const db = Math.hypot(b.centerU - 0.5, b.centerV - 0.48);
    return (da - db) * 0.45 + (b.importance - a.importance) * 0.55;
  });

  return {
    w,
    h,
    rgba: rawRgba,
    licRgba,
    lum,
    smoothLum,
    depthMap,
    coherence,
    subjectAlpha,
    fdog,
    nmsRidge,
    edge,
    scaleMap,
    gx,
    gy,
    etfX,
    etfY,
    mask,
    strokes,
    silkLoom,
    meanAnisotropy,
  };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const initialPrompt = "100% Static Masterpiece (Locked Geometry)";
  const initialPromptCfg = compilePromptConfig(initialPrompt);

  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("TRACE");

  const [animPromptInput, setAnimPromptInput] = useState<string>("");
  const [promptCfg, setPromptCfg] = useState<PromptConfig>(initialPromptCfg);

  const [artConfig, setArtStudioConfig] = useState<ArtStudioConfig>({
    dimension: "2D_STUDIO",
    backdrop: "OBSIDIAN",
    behavior: "STATIC_MASTERPIECE", // По умолчанию 100% статичный шедевр без единого колебания!
    lockFrontAnfas: true,           // По умолчанию 3D модель строго зафиксирована анфас!
    fastPerfMode: false,
    edition: "SHINE_ON",
    posterFrame: true,
    strokeWeight: 0.58,
    tonalVolumeDepth: 0.72,         // Тональная глубина LIC (чтобы фигуры и коты имели 100% объем и детали!)
    cleanlinessGate: 0.28,
    contrastAndGlow: 0.78,
    shadowHex: "#18122b",
    midtoneHex: "#a855f7",
    highlightHex: "#fde047",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("INITIALIZING BARRETT 25.0...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);
  const [loadedPage, setLoadedPage] = useState<number>(2);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    art: artConfig,
    prompt: initialPromptCfg,
    topology: "TRACE" as ManifoldTopology,
    matrix: null as MatrixBuffer | null,
    time: 0,
    traceProgress: 1.0, // Сразу показывает 100% готовый статичный шедевр (или 0 -> 1 при клике на Re-Draw)
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
      if (key === "behavior" && val === "PROGRESSIVE_PEN_DRAW") {
        stateRef.current.traceProgress = 0;
      } else if (key === "behavior" && val === "STATIC_MASTERPIECE") {
        stateRef.current.traceProgress = 1.0;
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
    (customText?: string, forceBehavior?: RenderBehaviorMode) => {
      const targetText = customText !== undefined ? customText : animPromptInput;
      if (customText !== undefined) setAnimPromptInput(customText);
      const compiled = compilePromptConfig(targetText);
      setPromptCfg(compiled);
      stateRef.current.prompt = compiled;

      if (forceBehavior) {
        updateArt("behavior", forceBehavior);
      } else if (compiled.drawSpeed < 1.0) {
        updateArt("behavior", "PROGRESSIVE_PEN_DRAW");
      } else if (compiled.lightGlideSpeed > 0.1) {
        updateArt("behavior", "OPTICAL_LIGHT_GLIDE");
      } else {
        updateArt("behavior", "STATIC_MASTERPIECE");
      }
    },
    [animPromptInput, updateArt]
  );

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING LIC CHIAROSCURO & CORNER-LOCKED NMS [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMob = (typeof window !== "undefined" && window.innerWidth < 768) || stateRef.current.art.fastPerfMode;
      const buf = buildMatrixFromImage(img, isMob);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = stateRef.current.art.behavior === "PROGRESSIVE_PEN_DRAW" ? 0 : 1.0;
      stateRef.current.needsBaseRebuild = true;
      setCoeffs((prev) => ({ ...prev, eigenAnisotropy: buf.meanAnisotropy }));
      setFieldStatus(
        "LOCKED // " + String(buf.strokes.length) + " EXACT VECTORS & LIC SHADING (" + String(buf.w) + "x" + String(buf.h) + ")"
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
    setLoadedPage(2);

    let cancelled = false;
    setFieldStatus("VERIFYING EXACT ENTITY TARGETS...");

    const wikiCommonsUrl =
      "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
      encodeURIComponent("filetype:bitmap " + cleanQ) +
      "&gsrnamespace=6&gsrlimit=18&prop=imageinfo&iiprop=url|dimensions&iiurlwidth=800&format=json&origin=*";

    const wikiPagesUrl =
      "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
      encodeURIComponent(cleanQ) +
      "&gsrlimit=8&prop=pageimages&piprop=thumbnail|original&pithumbsize=800&format=json&origin=*";

    Promise.all([
      fetch(wikiPagesUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(wikiCommonsUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/search?page=1&query=" + encodeURIComponent(cleanQ)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/search?page=2&query=" + encodeURIComponent(cleanQ)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([wpData, wcData, d1, d2]) => {
      if (cancelled) return;

      const scoredList: { url: string; score: number }[] = [];
      const seen = new Set<string>();

      const pushCandidate = (url: string, score: number) => {
        if (!url || typeof url !== "string" || !url.startsWith("http")) return;
        if (/\.svg|\.gif|\.tif|\.pdf|icon|logo/i.test(url)) return;
        if (seen.has(url)) return;
        seen.add(url);
        scoredList.push({ url, score });
      };

      if (wpData?.query?.pages) {
        for (const pKey of Object.keys(wpData.query.pages)) {
          const pg = wpData.query.pages[pKey];
          const u = pg?.thumbnail?.source || pg?.original?.source;
          if (u) {
            const sc = scoreSearchItemRelevance({ title: pg.title || "", src: u }, cleanQ);
            if (sc >= -10) pushCandidate(u, sc + 65);
          }
        }
      }

      if (wcData?.query?.pages) {
        for (const pKey of Object.keys(wcData.query.pages)) {
          const pg = wcData.query.pages[pKey];
          const ii = pg?.imageinfo?.[0];
          const u = ii?.thumburl || ii?.url;
          if (u && (!ii.width || ii.width >= 260)) {
            const sc = scoreSearchItemRelevance({ title: pg.title || "", src: u }, cleanQ);
            if (sc >= 0) pushCandidate(u, sc + 45);
          }
        }
      }

      const a1 = d1 ? (Array.isArray(d1) ? d1 : d1.data || d1.photos || []) : [];
      const a2 = d2 ? (Array.isArray(d2) ? d2 : d2.data || d2.photos || []) : [];
      const combined = [...a1, ...a2];

      for (const item of combined) {
        const u = item.src || item.image_url || item.thumb;
        const sc = scoreSearchItemRelevance(item, cleanQ);
        if (sc > -50) {
          pushCandidate(u, sc);
        }
      }

      scoredList.sort((a, b) => b.score - a.score);
      const finalUrls = scoredList.map((item) => item.url);

      if (finalUrls.length > 0) {
        setCandidateUrls(finalUrls);
        setCandidateIdx(0);
        loadMatrixFromUrl(finalUrls[0], 0, finalUrls.length);
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
        const validNew: string[] = [];
        for (const item of arr) {
          const u = item.src || item.image_url || item.thumb;
          if (typeof u === "string" && u.startsWith("http") && scoreSearchItemRelevance(item, cleanQ) > -50) {
            validNew.push(u);
          }
        }

        setCandidateUrls((prev) => {
          const set = new Set(prev);
          const merged = [...prev];
          for (const u of validNew) {
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
    stateRef.current.prompt = promptCfg;
    stateRef.current.topology = topology;
    stateRef.current.isPaused = isPaused;
    stateRef.current.needsBaseRebuild = true;
  }, [tensor, coeffs, artConfig, promptCfg, topology, isPaused]);

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
  // ЯДРО РЕНДЕРИНГА BARRETT 25.0 (100% СТАТИЧНАЯ ГЕОМЕТРИЯ + ТЕХНИКА СВЕТОВОГО ОФОРТА LIC)
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

    // Буфер направленной штриховой светотени Кабрала-Лидома (LIC) с прозрачным фоном!
    const tonalEtchCanvas = document.createElement("canvas");
    const tonalEtchCtx = tonalEtchCanvas.getContext("2d");

    const shaderCanvas = document.createElement("canvas");
    const shaderCtx = shaderCanvas.getContext("2d");

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
    // СБОРКА ХУДОЖЕСТВЕННОЙ ШТРИХОВОЙ ОСНОВЫ LIC НА КАСТОМНОМ ФОНЕ:
    // Придает коту, лицам, одежде и предметам полноценный живописный объем,
    // при этом темный/светлый фон остается 100% чистым кастомным фоном!
    // ==========================================
    const rebuildTonalEtchAndCache = (
      m: MatrixBuffer,
      art: ArtStudioConfig,
      t: Tensor5D
    ) => {
      if (!tonalEtchCtx) return;
      tonalEtchCanvas.width = m.w;
      tonalEtchCanvas.height = m.h;

      const etImg = tonalEtchCtx.createImageData(m.w, m.h);
      const etDst = etImg.data;
      const lic = m.licRgba;

      const isPaper = art.backdrop === "ARCHIVAL_PAPER";
      const cutGate = art.cleanlinessGate;

      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const i = y * m.w + x;
          const vMask = m.mask[i];
          if (vMask <= 0.005) continue;

          const p = i * 4;
          const rawL = m.lum[i];
          const e = m.edge[i];
          const fd = m.fdog[i];
          const nms = m.nmsRidge[i];

          // Микро-бородки кисти / гравировальной иглы вдоль поля касательных ETF
          const bristleWave = 0.78 + 0.22 * Math.sin((x * m.etfY[i] - y * m.etfX[i]) * 1.45);
          const fdogShadow = clip(0.24 + 0.76 * Math.tanh(10.0 * (fd - 0.21)), 0.1, 1.0);

          const [colR, colG, colB] = resolveEditionColor(art, lic[p], lic[p + 1], lic[p + 2], rawL, e, t.tone, false, false);

          if (isPaper) {
            const darkness = (1.0 - rawL * fdogShadow) * bristleWave;
            const alpha = smoothstep(cutGate * 0.4, 0.75, darkness + nms * 0.8) * vMask;
            etDst[p] = colR;
            etDst[p + 1] = colG;
            etDst[p + 2] = colB;
            etDst[p + 3] = Math.round(alpha * 255);
          } else {
            // На темном фоне (Obsidian, Void Black, Midnight, Velvet):
            // Глубокие черные фоновые зоны прозрачны (виден чистый выбранный фон),
            // а полутона, лица, шерсть кота и грани плавно проявляются направленными мазками LIC!
            const presence = (rawL * 0.85 * fdogShadow + e * 0.65 + nms * 0.75) * bristleWave;
            const alpha = smoothstep(cutGate * 0.35, 0.72, presence) * vMask;
            etDst[p] = colR;
            etDst[p + 1] = colG;
            etDst[p + 2] = colB;
            etDst[p + 3] = Math.round(alpha * 255);
          }
        }
      }

      tonalEtchCtx.putImageData(etImg, 0, 0);

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
      const prCfg = s.prompt;
      const m = s.matrix;

      const isPaper = art.backdrop === "ARCHIVAL_PAPER";
      const bgHex = BACKDROP_COLORS[art.backdrop] || "#040308";

      if (!s.isPaused) {
        s.time += 0.016;
        if (art.behavior === "PROGRESSIVE_PEN_DRAW") {
          s.traceProgress = (s.traceProgress + 0.0045 * prCfg.drawSpeed) % 1.35;
        } else if (s.traceProgress < 1.0) {
          s.traceProgress = Math.min(1.0, s.traceProgress + 0.022);
        }
      }
      const time = s.time;

      if (m && s.needsBaseRebuild) {
        rebuildTonalEtchAndCache(m, art, t);
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

        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(cx - prismR * 0.45, cy);
        ctx.stroke();

        for (let b = 0; b < 7; b++) {
          const [cr, cg, cb] = CAUCHY_SPECTRUM[b];
          const spreadAngle = -0.3 + (b / 6) * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx + prismR * 0.35, cy + b * 2.0 - 6.0);
          ctx.lineTo(viewW, cy + Math.tan(spreadAngle) * (viewW - cx));
          ctx.strokeStyle = "rgba(" + String(cr) + "," + String(cg) + "," + String(cb) + ",0.85)";
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI * 2) / 3 - Math.PI * 0.5;
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

      const goalU = s.mouseActive && mNormX >= 0.02 && mNormX <= 0.98 ? mNormX : 0.5 + Math.cos(time * 0.5) * 0.25;
      const goalV = s.mouseActive && mNormY >= 0.02 && mNormY <= 0.98 ? mNormY : 0.42 + Math.sin(time * 0.65) * 0.2;
      s.fluidU += (goalU - s.fluidU) * 0.08;
      s.fluidV += (goalV - s.fluidV) * 0.08;

      const is3DActive = art.dimension === "3D_SPACE" || s.topology === "SCULPT3D" || s.topology === "LIDAR";

      if (!s.isDragging3D && is3DActive && !art.lockFrontAnfas) {
        s.userYaw = clip(s.userYaw + s.velYaw, -0.38, 0.38);
        s.userPitch = clip(s.userPitch + s.velPitch, -0.28, 0.28);
        s.velYaw *= 0.92;
        s.velPitch *= 0.92;
      }

      const targetYaw = !is3DActive || art.lockFrontAnfas ? 0.0 : s.userYaw;
      const targetPitch = !is3DActive || art.lockFrontAnfas ? 0.0 : s.userPitch;
      s.smoothYaw += (targetYaw - s.smoothYaw) * 0.15;
      s.smoothPitch += (targetPitch - s.smoothPitch) * 0.15;

      const clampedProg = Math.min(1.0, s.traceProgress);

      // ==========================================
      // РЕЖИМ 1 И 2: TRACE 25.0 & SKETCH (100% НЕПОДВИЖНАЯ ГЕОМЕТРИЯ + ОБЪЕМНАЯ СВЕТОТЕНЬ LIC + МИКРО-ВЕКТОРЫ)
      // Никакого растягивания краев и изгибания прутьев забора!
      // ==========================================
      if (s.topology === "TRACE" || s.topology === "SKETCH") {
        const isSketchMode = s.topology === "SKETCH";
        const volumeReveal = smoothstep(0.05, 0.75, clampedProg);

        // 1. Отрисовываем тональную штриховую светотень LIC (строго по координатам ox, oy, drawW, drawH — 0% смещения!)
        if (art.tonalVolumeDepth > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.tonalVolumeDepth * volumeReveal;
          ctx.drawImage(tonalEtchCanvas, ox, oy, drawW, drawH);
          ctx.restore();
        }

        // 2. Поверх светотени проводим бритвенно-резкие, идеально прямые на углах микро-векторы Кэнни!
        const strokes = m.strokes;
        const totalStrokes = strokes.length;
        const windowSpan = Math.max(120, Math.floor(totalStrokes * 0.2));
        const headFloat = clampedProg * (totalStrokes + windowSpan);
        const cohThreshold = art.cleanlinessGate * 0.68;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 0; i < totalStrokes; i++) {
          if (i > headFloat) break;

          const st = strokes[i];
          if (st.meanCoherence < cohThreshold && st.meanEdge < 0.18 && st.tier !== 0) continue;

          const nPts = st.nPts;
          const rawLocal = clampedProg >= 0.999 ? 1.0 : clip((headFloat - i) / windowSpan, 0.0, 1.0);
          const localProg = smoothstep(0.0, 1.0, rawLocal);
          if (localProg <= 0.02) continue;

          const fullIdx = Math.min(nPts - 1, Math.floor(localProg * (nPts - 1)));
          const isHighlight = st.tier === 4;

          ctx.globalCompositeOperation = isPaper && !isHighlight ? "source-over" : "screen";

          const tierAlpha =
            st.tier === 0
              ? 0.95
              : st.tier === 4
              ? 0.9
              : st.tier === 1
              ? 0.9
              : st.tier === 2
              ? 0.65
              : 0.38;
          const baseAlpha = clip((0.28 + st.meanEdge * 0.68) * tierAlpha * localProg, 0.14, 0.96);

          const lineW =
            (st.tier === 0
              ? 0.3
              : st.tier === 4
              ? 0.45 * st.featureScale
              : st.tier === 1
              ? (0.48 + st.meanEdge * 0.48) * st.featureScale
              : st.tier === 2
              ? 0.34 * st.featureScale
              : 0.25 * st.featureScale) * art.strokeWeight;

          // СТРОГО СТАТИЧНЫЕ КООРДИНАТЫ (ox + st.u[k] * drawW, oy + st.v[k] * drawH)!
          // Никаких синусоидальных волн, гнущих прямые линии!
          ctx.beginPath();
          let prevX = ox + st.u[0] * drawW;
          let prevY = oy + st.v[0] * drawH;
          ctx.moveTo(prevX, prevY);

          for (let k = 1; k <= fullIdx; k++) {
            const curX = ox + st.u[k] * drawW;
            const curY = oy + st.v[k] * drawH;
            if (k === 1) {
              ctx.lineTo(curX, curY);
            } else {
              ctx.quadraticCurveTo(prevX, prevY, (prevX + curX) * 0.5, (prevY + curY) * 0.5);
            }
            prevX = curX;
            prevY = curY;
          }
          ctx.lineTo(prevX, prevY);

          const rC = isSketchMode && isPaper ? (isHighlight ? 255 : 28) : st.cachedR;
          const gC = isSketchMode && isPaper ? (isHighlight ? 250 : 20) : st.cachedG;
          const bC = isSketchMode && isPaper ? (isHighlight ? 240 : 16) : st.cachedB;

          ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(baseAlpha.toFixed(2)) + ")";
          ctx.lineWidth = Math.max(0.2, lineW);
          ctx.stroke();

          // Если включен режим OPTICAL_LIGHT_GLIDE — пускаем тонкий световой блик строго ВДОЛЬ неподвижной линии!
          if (art.behavior === "OPTICAL_LIGHT_GLIDE" && prCfg.lightGlideSpeed > 0.05 && st.tier === 1 && fullIdx >= 10 && !isPaper) {
            const span = Math.max(3, Math.floor(nPts * 0.22));
            const headK = Math.floor(((time * prCfg.lightGlideSpeed + st.phase) % 1.4) * nPts);
            const tailK = Math.max(0, headK - span);
            const clampH = Math.min(fullIdx, headK);
            if (clampH - tailK >= 2) {
              ctx.beginPath();
              for (let k = tailK; k <= clampH; k++) {
                const lx = ox + st.u[k] * drawW;
                const ly = oy + st.v[k] * drawH;
                if (k === tailK) ctx.moveTo(lx, ly);
                else ctx.lineTo(lx, ly);
              }
              ctx.strokeStyle = "rgba(255, 250, 240, " + String((baseAlpha * 0.75).toFixed(2)) + ")";
              ctx.lineWidth = Math.max(0.3, lineW * 1.3);
              ctx.stroke();
            }
          }
        }
      }

      // ==========================================
      // РЕЖИМ 3: POPART 25.0 (СТАТИЧНЫЙ ПОП-АРТ УОРХОЛА / ЛИХТЕНШТЕЙНА / OBEY)
      // ==========================================
      else if (s.topology === "POPART" && shaderCtx) {
        const scaleDiv = art.fastPerfMode ? 2 : 1;
        const bW = Math.floor(m.w / scaleDiv);
        const bH = Math.floor(m.h / scaleDiv);
        if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
          shaderCanvas.width = bW;
          shaderCanvas.height = bH;
        }
        const outImg = shaderCtx.createImageData(bW, bH);
        const dst = outImg.data;
        const lic = m.licRgba;
        const [bgR, bgG, bgB] = hexToRgb(bgHex);

        const popStyle =
          art.edition === "WARHOL_POP" || art.edition === "LICHTENSTEIN" || art.edition === "OBEY_POSTER" || art.edition === "STREET_POP"
            ? art.edition
            : "LICHTENSTEIN";

        const dotFreq = (0.65 + t.symmetry * 0.55) / Math.max(0.45, art.strokeWeight);

        for (let y = 0; y < bH; y++) {
          const sy = Math.min(m.h - 1, y * scaleDiv);
          for (let x = 0; x < bW; x++) {
            const sx = Math.min(m.w - 1, x * scaleDiv);
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

            const l = m.lum[idx];
            const e = m.edge[idx];
            const nms = m.nmsRidge[idx];
            const fd = m.fdog[idx];

            const isBlackInk = nms > 0.2 || fd < 0.23 || l < 0.14;
            if (isBlackInk) {
              dst[outP] = 10;
              dst[outP + 1] = 8;
              dst[outP + 2] = 14;
              dst[outP + 3] = 255;
              continue;
            }

            const p = idx * 4;
            const [popR, popG, popB] = resolveEditionColor(
              { ...art, edition: popStyle },
              lic[p],
              lic[p + 1],
              lic[p + 2],
              l,
              e,
              t.tone,
              false,
              false
            );

            const rotX = (sx * 0.866 - sy * 0.5) * dotFreq;
            const rotY = (sx * 0.5 + sy * 0.866) * dotFreq;
            const benDayGrid = 0.5 + 0.25 * (Math.cos(rotX) + Math.cos(rotY));

            let rFinal = popR, gFinal = popG, bFinal = popB;
            if (popStyle === "LICHTENSTEIN" && l > 0.22 && l < 0.76) {
              if (benDayGrid <= l * 0.95) {
                rFinal = 252;
                gFinal = 246;
                bFinal = 232;
              }
            }

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
      // РЕЖИМ 4: PAINT 25.0 (СТАТИЧНАЯ МАСЛЯНАЯ ЖИВОПИСЬ LIC ВАН ГОГА / ARCANE)
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
        const lic = m.licRgba;
        const [bgR, bgG, bgB] = hexToRgb(bgHex);
        const lightU = s.fluidU;
        const lightV = s.fluidV;

        for (let y = 0; y < bH; y++) {
          const vOrig = y / bH;
          const sy = Math.min(m.h - 1, y * scaleDiv);
          for (let x = 0; x < bW; x++) {
            const uOrig = x / bW;
            const sx = Math.min(m.w - 1, x * scaleDiv);
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

            const bristleCoord = (sx * m.etfY[idx] - sy * m.etfX[idx]) * (0.9 / Math.max(0.35, m.scaleMap[idx]));
            const bristleRelief = Math.sin(bristleCoord) * (0.12 + e * 0.35) * art.strokeWeight;

            const lx = lightU - uOrig;
            const ly = lightV - vOrig;
            const lNorm = Math.hypot(lx, ly, 0.5);
            const nx = m.gx[idx] * e + m.etfY[idx] * bristleRelief;
            const ny = m.gy[idx] * e - m.etfX[idx] * bristleRelief;
            const dotLight = Math.max(0.0, (nx * lx + ny * ly + 0.5) / lNorm);
            const oilSpec = Math.pow(dotLight, 14.0) * art.contrastAndGlow * 125.0 * smoothstep(0.08, 0.45, l + e);

            const [edR, edG, edB] = resolveEditionColor(art, lic[p], lic[p + 1], lic[p + 2], l, e, t.tone, false, false);
            const inkContour = clip(0.28 + 0.72 * Math.tanh(9.0 * (fd - 0.22)), 0.15, 1.0);
            const shade = inkContour * (0.92 + bristleRelief * 0.26) * smoothstep(0.02, 0.14, l + e * 0.8);

            const rFinal = Math.min(255, Math.max(0, Math.round((lic[p] * 0.65 + edR * 0.35) * shade + oilSpec)));
            const gFinal = Math.min(255, Math.max(0, Math.round((lic[p + 1] * 0.65 + edG * 0.35) * shade + oilSpec * 0.96)));
            const bFinal = Math.min(255, Math.max(0, Math.round((lic[p + 2] * 0.65 + edB * 0.35) * shade + oilSpec * 0.9)));

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
      // РЕЖИМ 5: SILK 25.0 (СТАТИЧНЫЙ ШЕЛКОВЫЙ ГОБЕЛЕН КАДЖИИ — КЭЯ)
      // ==========================================
      else if (s.topology === "SILK") {
        if (art.tonalVolumeDepth > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = art.tonalVolumeDepth * 0.45;
          ctx.drawImage(tonalEtchCanvas, ox, oy, drawW, drawH);
          ctx.restore();
        }

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
          const nPts = st.u.length;

          const midTx = st.tx[7];
          const midTy = st.ty[7];
          const tDotL = clip(midTx * lx + midTy * ly, -0.99, 0.99);
          const sinTL = Math.sqrt(Math.max(0.0, 1.0 - tDotL * tDotL));
          const sheenWave = 0.5 + 0.5 * Math.sin((st.u[0] * 6.0 - st.v[0] * 5.0) + time * prCfg.lightGlideSpeed * 2.5 + st.phase * 0.25);
          const kajiyaSpec = Math.pow(sinTL * sheenWave, 5.0) * art.contrastAndGlow * 165.0;

          const rS = Math.min(255, Math.round(st.cachedR + kajiyaSpec * 0.95));
          const gS = Math.min(255, Math.round(st.cachedG + kajiyaSpec * 0.98));
          const bS = Math.min(255, Math.round(st.cachedB + kajiyaSpec * 1.12));

          const alpha = clip(0.24 + st.edge * 0.62 + st.lum * 0.28 + sheenWave * 0.18, 0.12, 0.95);

          ctx.beginPath();
          for (let k = 0; k < nPts; k++) {
            const sx = ox + st.u[k] * drawW;
            const sy = oy + st.v[k] * drawH;
            if (k === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }

          ctx.strokeStyle = "rgba(" + String(rS) + "," + String(gS) + "," + String(bS) + "," + String(alpha.toFixed(2)) + ")";
          ctx.lineWidth = (0.35 + st.edge * 0.65) * st.weight * art.strokeWeight;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 6: ENGRAVE 25.0 (СТАТИЧНАЯ БАНКНОТНАЯ ГРАВЮРА)
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        const numLines = Math.floor(135 + (1.0 - art.cleanlinessGate) * 65);
        const numCols = 230;
        const maxElevation = (drawH / numLines) * (2.2 + t.structure * 2.4);

        ctx.globalCompositeOperation = isPaper ? "source-over" : "screen";
        ctx.lineCap = "round";

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          let prevX = ox;
          let prevY = baseScreenY;

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const uNorm = cIdx / (numCols - 1);
            const sx = Math.min(m.w - 1, Math.floor(uNorm * m.w));
            const cell = sy * m.w + sx;

            const l = m.lum[cell];
            const e = m.edge[cell];
            const vMask = m.mask[cell];
            if (vMask < 0.05 || (l < 0.04 && e < 0.04)) continue;

            const px = ox + uNorm * drawW;
            const curY = baseScreenY - (l * 0.82 + e * 0.55) * maxElevation * vMask;

            if (cIdx > 0 && Math.abs(px - prevX) < 18) {
              const p4 = cell * 4;
              const [rC, gC, bC] = resolveEditionColor(art, m.licRgba[p4], m.licRgba[p4 + 1], m.licRgba[p4 + 2], l, e, t.tone, false, true);
              const alpha = clip((0.22 + l * 0.65 + e * 0.55) * vMask, 0.08, 0.95);
              ctx.strokeStyle = "rgba(" + String(rC) + "," + String(gC) + "," + String(bC) + "," + String(alpha.toFixed(2)) + ")";
              ctx.lineWidth = (0.3 + l * 0.95 + e * 0.75) * art.strokeWeight;
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
      // РЕЖИМ 7 И 9: PRISM & CINEMA (100% СТАТИЧНАЯ ГЕОМЕТРИЯ)
      // ==========================================
      else if ((s.topology === "PRISM" || s.topology === "CINEMA") && shaderCtx) {
        const scaleDiv = art.fastPerfMode ? 2 : 1;
        const bW = Math.floor(m.w / scaleDiv);
        const bH = Math.floor(m.h / scaleDiv);
        if (shaderCanvas.width !== bW || shaderCanvas.height !== bH) {
          shaderCanvas.width = bW;
          shaderCanvas.height = bH;
        }
        const outImg = shaderCtx.createImageData(bW, bH);
        const dst = outImg.data;
        const lic = m.licRgba;
        const [bgR, bgG, bgB] = hexToRgb(bgHex);

        const prismAngle = s.mouseActive ? Math.atan2(mNormY - 0.5, mNormX - 0.5) : 0.42;
        const dirX = Math.cos(prismAngle);
        const dirY = Math.sin(prismAngle);
        const dispStep = 1.2 + art.contrastAndGlow * 2.2;

        for (let y = 0; y < bH; y++) {
          const sy = Math.min(m.h - 1, y * scaleDiv);
          for (let x = 0; x < bW; x++) {
            const sx = Math.min(m.w - 1, x * scaleDiv);
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
            const e = m.nmsRidge[idx];
            const fd = m.fdog[idx];

            let rFinal = 0, gFinal = 0, bFinal = 0;
            if (s.topology === "PRISM") {
              const darkCrystal = Math.pow(l, 1.15) * 0.48 * clip(0.25 + 0.75 * fd, 0.15, 1.0);
              let rAcc = (lic[p] / 255.0) * darkCrystal;
              let gAcc = (lic[p + 1] / 255.0) * darkCrystal;
              let bAcc = (lic[p + 2] / 255.0) * darkCrystal;

              for (let band = 0; band < 7; band++) {
                const offset = (band - 3.0) * dispStep;
                const rx = Math.round(sx + dirX * offset);
                const ry = Math.round(sy + dirY * offset);

                if (rx >= 0 && rx < m.w && ry >= 0 && ry < m.h) {
                  const sIdx = ry * m.w + rx;
                  const ridgeOnly = m.edge[sIdx] * (0.4 + 0.6 * m.coherence[sIdx]);
                  if (ridgeOnly > 0.16) {
                    const wgt = (ridgeOnly - 0.14) * (0.18 + art.contrastAndGlow * 0.22);
                    const [cr, cg, cb] = CAUCHY_SPECTRUM[band];
                    rAcc += (cr / 255.0) * wgt;
                    gAcc += (cg / 255.0) * wgt;
                    bAcc += (cb / 255.0) * wgt;
                  }
                }
              }
              const coreEdge = e * 0.42;
              rFinal = Math.round(acesTonemap(rAcc + coreEdge) * 255);
              gFinal = Math.round(acesTonemap(gAcc + coreEdge) * 255);
              bFinal = Math.round(acesTonemap(bAcc + coreEdge * 1.1) * 255);
            } else {
              const halation = Math.max(0.0, m.smoothLum[idx] - 0.34) * art.contrastAndGlow * 185.0;
              const [edR, edG, edB] = resolveEditionColor(
                art.edition === "SHINE_ON" ? { ...art, edition: "KODAK_800T" } : art,
                lic[p],
                lic[p + 1],
                lic[p + 2],
                l,
                m.edge[idx],
                t.tone
              );
              rFinal = Math.round(acesTonemap((edR + halation * 1.15) / 255.0) * 255);
              gFinal = Math.round(acesTonemap((edG + halation * 0.32) / 255.0) * 255);
              bFinal = Math.round(acesTonemap((edB + halation * 0.08) / 255.0) * 255);
            }

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
      // РЕЖИМ 8 И 10: SCULPT3D & LIDAR (ПО УМОЛЧАНИЮ ЗАБЛОКИРОВАНЫ СТРОГО АНФАС 0°!)
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
          const depthScale = 0.22 + art.tonalVolumeDepth * 0.45;
          const fitScale = 0.88 * s.userZoom;

          const lx = (s.fluidU - 0.5) * 2.4;
          const ly = (s.fluidV - 0.5) * 2.4;
          const lz = 0.72;
          const lLen = Math.hypot(lx, ly, lz);
          const lightX = lx / lLen;
          const lightY = ly / lLen;
          const lightZ = lz / lLen;

          const ptStep = isLidar ? 2 : 1;
          const splatRadius = isLidar ? 0 : 1;

          for (let y = 1; y < bH - 1; y += ptStep) {
            const vOrig = y / bH;
            const my = Math.min(m.h - 2, y * scaleDiv);

            for (let x = 1; x < bW - 1; x += ptStep) {
              const mx = Math.min(m.w - 2, x * scaleDiv);
              const mIdx = my * m.w + mx;
              if (m.mask[mIdx] < 0.04) continue;

              const uOrig = x / bW;
              const l = m.lum[mIdx];
              const e = m.edge[mIdx];
              if (l < 0.03 && e < 0.04) continue;

              const zHeight = (m.depthMap[mIdx] - 0.35) * depthScale;
              const x3 = (uOrig - 0.5) * fitScale;
              const y3 = (vOrig - 0.5) * fitScale;

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
              const fresnelRim = Math.pow(1.0 - Math.max(0.0, rnz2), 2.2) * 0.7 * art.contrastAndGlow;
              const spec = Math.pow(nDotL, 14.0) * art.contrastAndGlow * 145.0;

              const p = mIdx * 4;
              const [baseR, baseG, baseB] = resolveEditionColor(art, m.licRgba[p], m.licRgba[p + 1], m.licRgba[p + 2], l, e, t.tone);
              const featureContrast = (0.18 + Math.pow(l, 0.85) * 0.82) * clip(0.25 + 0.75 * m.fdog[mIdx], 0.15, 1.0);
              const shade = featureContrast * (0.42 + nDotL * 0.78);

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
          "BARRETT 25.0 // " + (query || "SHINE ON").toUpperCase().slice(0, 18) + " [" + s.topology + " · " + art.edition + "]",
          ox - 4,
          oy + drawH + 10
        );
        ctx.textAlign = "right";
        ctx.fillText(
          prCfg.modeName + " | H(X)=" + String(c.entropy) + "b | λ=" + String(c.eigenAnisotropy),
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
          a.download = "barrett-artifact-" + String(Date.now()) + ".gif";
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

      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT 25.0 */}
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
            <div className="text-white font-bold">BARRETT 25.0 // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
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
                2D Masterpiece
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

            {artConfig.dimension === "3D_SPACE" && (
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
                {artConfig.lockFrontAnfas ? "Locked: Анфас (0°)" : "Free 3D Drag"}
              </button>
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
            >
              PERF: {artConfig.fastPerfMode ? "FAST" : "HD 780P"}
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
                  "POPART",
                  "PAINT",
                  "SILK",
                  "ENGRAVE",
                  "PRISM",
                  "SCULPT3D",
                  "CINEMA",
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

      {/* ПРАВАЯ ПАНЕЛЬ BARRETT 25.0 */}
      <div className="lg:col-span-4 glass-panel p-5 flex flex-col justify-between gap-3.5">
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
          {/* 1. ВЫБОР ПОВЕДЕНИЯ ХОЛСТА И ПОЛЕ ПРОМПТА (ПО УМОЛЧАНИЮ 100% СТАТИКА БЕЗ РАСТЯЖЕНИЯ!) */}
          <div className="p-3 rounded-xl bg-black/60 border border-white/15 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">1. Canvas Behavior & Prompt:</span>
              <span className="text-[7px] text-[#10b981]">LOCKED EDGES</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "STATIC_MASTERPIECE", label: "Static Print" },
                  { id: "PROGRESSIVE_PEN_DRAW", label: "Pen Draw" },
                  { id: "OPTICAL_LIGHT_GLIDE", label: "Light Sheen" },
                ] as { id: RenderBehaviorMode; label: string }[]
              ).map((bm) => (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => updateArt("behavior", bm.id)}
                  className={
                    "py-1.5 px-1.5 rounded-lg border text-[7.5px] tracking-wider transition-all cursor-pointer " +
                    (artConfig.behavior === bm.id
                      ? "bg-white text-black border-white font-bold"
                      : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30")
                  }
                >
                  {bm.label}
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
                placeholder="Опционально: прорисовка пером, скольжение света..."
                className="flex-1 rounded-lg bg-black/75 border border-white/15 px-2.5 py-1.5 text-[9.5px] text-white font-mono normal-case focus:outline-none focus:border-white/40"
              />
              <button
                type="button"
                onClick={() => handleApplyPrompt()}
                className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-bold text-[8px] uppercase tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shrink-0"
              >
                Apply
              </button>
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

          {/* 3. ХУДОЖЕСТВЕННАЯ ПАЛИТРА + ПОП-АРТ */}
          <div>
            <div className="text-neutral-400 mb-1.5">3. Pop-Art & Master Editions (12 Styles):</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "SHINE_ON", label: "Shine On", dot: "linear-gradient(135deg,#38bdf8,#f59e0b)" },
                  { id: "WARHOL_POP", label: "Warhol '64", dot: "linear-gradient(135deg,#ff147d,#ffe619)" },
                  { id: "LICHTENSTEIN", label: "Lichtenstein", dot: "linear-gradient(135deg,#f22a34,#2058e1)" },
                  { id: "OBEY_POSTER", label: "Obey Poster", dot: "linear-gradient(135deg,#d92b2b,#7ba4b5)" },
                  { id: "STREET_POP", label: "Street Pop", dot: "linear-gradient(135deg,#2df573,#ff3723)" },
                  { id: "PIXAR_SSS", label: "Pixar 3D", dot: "linear-gradient(135deg,#fb7185,#38bdf8)" },
                  { id: "DARK_SIDE", label: "Prism Ray", dot: "linear-gradient(135deg,#ef4444,#3b82f6)" },
                  { id: "REMBRANDT", label: "Rembrandt", dot: "linear-gradient(135deg,#451a03,#fde68a)" },
                  { id: "KODAK_800T", label: "35mm Film", dot: "linear-gradient(135deg,#0284c7,#f97316)" },
                  { id: "VOGUE_NOIR", label: "Noir Red", dot: "linear-gradient(135deg,#f8fafc,#ef4444)" },
                  { id: "DA_VINCI", label: "Da Vinci", dot: "linear-gradient(135deg,#e8dcc4,#963d28)" },
                  { id: "CUSTOM_GRADE", label: "Custom RGB", dot: "linear-gradient(135deg,#a855f7,#fde047)" },
                ] as { id: TributeEdition; label: string; dot: string }[]
              ).map((ed) => (
                <button
                  key={ed.id}
                  type="button"
                  onClick={() => updateArt("edition", ed.id)}
                  className={
                    "py-1.5 px-2 rounded-lg border text-[7.5px] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer " +
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

          {/* 4. ЧЕТЫРЕ ГЛАВНЫХ ПОЛЗУНКА КАЧЕСТВА ОТРИСОВКИ */}
          <div className="flex flex-col gap-2 pt-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Micro-Needle Line Calibre (0.2px - 1.5px)</span>
                <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="1.6"
                step="0.05"
                value={artConfig.strokeWeight}
                onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Tonal Chiaroscuro Volume (LIC Shading)</span>
                <span className="text-[#a855f7]">{Math.round(artConfig.tonalVolumeDepth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.98"
                step="0.02"
                value={artConfig.tonalVolumeDepth}
                onChange={(e) => updateArt("tonalVolumeDepth", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Dark-Field Cleanliness & Noise Gate</span>
                <span className="text-[#10b981]">{Math.round(artConfig.cleanlinessGate * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.75"
                step="0.02"
                value={artConfig.cleanlinessGate}
                onChange={(e) => updateArt("cleanlinessGate", parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-neutral-400">
                <span>Ink Contrast, Specular & Prism</span>
                <span className="text-[#fde047]">{Math.round(artConfig.contrastAndGlow * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.02"
                value={artConfig.contrastAndGlow}
                onChange={(e) => updateArt("contrastAndGlow", parseFloat(e.target.value))}
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
