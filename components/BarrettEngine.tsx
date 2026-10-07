"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

type DimensionSpace = "2D_STUDIO" | "3D_SPACE";
type CanvasBackdrop = "OBSIDIAN" | "VOID_BLACK" | "MIDNIGHT" | "VELVET_NOIR" | "ARCHIVAL_PAPER" | "WALL_BRICKS";
type RenderBehaviorMode = "STATIC_MASTERPIECE" | "PROGRESSIVE_PEN_DRAW" | "OPTICAL_LIGHT_GLIDE";

interface PromptConfig {
  promptText: string;
  modeName: string;
  lightGlideSpeed: number;
  drawSpeed: number;
  scarfeWarpAmp: number;
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
  | "PINK_FLOYD"
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
  lockFrontAnfas: boolean;
  fastPerfMode: boolean;
  edition: TributeEdition;
  posterFrame: boolean;
  strokeWeight: number;
  tonalVolumeDepth: number;
  cleanlinessGate: number;
  contrastAndGlow: number;
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
  cleanRgba: Uint8ClampedArray;
  lum: Float32Array;
  smoothLum: Float32Array;
  depthMap: Float32Array;
  coherence: Float32Array;
  subjectAlpha: Float32Array;
  fdog: Float32Array;
  nmsRidge: Float32Array;
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
  charCenterU: number;
  charCenterV: number;
  headU: number;
  headV: number;
  headRx: number;
  headRy: number;
}

type ManifoldTopology =
  | "TRACE"
  | "SKETCH"
  | "SCARFE_NIGHTMARE"
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
  [255, 42, 75], [255, 138, 25], [255, 232, 45], [35, 242, 130], [30, 215, 255], [75, 110, 255], [195, 60, 255]
];

const BACKDROP_COLORS: Record<CanvasBackdrop, string> = {
  OBSIDIAN: "#040308", VOID_BLACK: "#000000", MIDNIGHT: "#060e1e", VELVET_NOIR: "#14050b", ARCHIVAL_PAPER: "#e8dcc4", WALL_BRICKS: "#a3a3a3"
};

const NOISE_BLACKLIST = [
  "neutron", "nickelodeon", "spongebob", "toon", "clipart", "meme", "roblox", "minecraft", "fortnite", "sticker", "emoji",
];

function clip(v: number, min = 0.0, max = 1.0): number { return Math.max(min, Math.min(max, v)); }
function smoothstep(edge0: number, edge1: number, x: number): number { const t = clip((x - edge0) / Math.max(1e-6, edge1 - edge0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
function acesTonemap(x: number): number { const v = Math.max(0.0, x); return clip((v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14), 0.0, 1.0); }
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return isNaN(num) ? [168, 85, 247] : [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function scoreSearchItemRelevance(item: any, rawQuery: string): number {
  const qClean = rawQuery.trim().toLowerCase();
  const tokens = qClean.split(/\s+/).filter((t) => t.length >= 2);
  const meta = [item.title || "", item.alt || "", item.description || "", item.src || ""].join(" ").toLowerCase();

  for (const badWord of NOISE_BLACKLIST) {
    if (meta.includes(badWord) && !qClean.includes(badWord)) return -100;
  }
  if (tokens.length === 0) return 1;

  let score = 0;
  if (meta.includes(qClean) || meta.includes(tokens.join("_"))) score += 50;

  let matchedTokens = 0;
  for (const tk of tokens) {
    if (meta.includes(tk)) {
      matchedTokens++;
      score += 10;
    }
  }
  if (tokens.length >= 2 && matchedTokens < tokens.length) score -= 25;
  return score;
}

function compilePromptConfig(rawPrompt: string): PromptConfig {
  const text = (rawPrompt || "").trim().toLowerCase();
  let scarfeWarpAmp = 0;
  
  if (/(крик|стена|кошмар|монстр|scream|wall|nightmare|grotesque|flesh)/.test(text)) {
    scarfeWarpAmp = 1.0;
  }

  if (!text || /(статик|неподвиж|стоп|static|still|lock)/.test(text)) {
    return { promptText: rawPrompt, modeName: scarfeWarpAmp > 0 ? "GROTESQUE WALL WARP (STATIC)" : "100% STATIC GEOMETRY LOCK", lightGlideSpeed: 0.0, drawSpeed: 1.0, scarfeWarpAmp };
  }
  if (/(рисов|перо|таймлапс|штрих|draw|sketch|timelapse)/.test(text)) {
    return { promptText: rawPrompt, modeName: scarfeWarpAmp > 0 ? "DRAWING THE WALL NIGHTMARE" : "PROGRESSIVE CALLIGRAPHIC DRAW", lightGlideSpeed: 0.35, drawSpeed: 0.65, scarfeWarpAmp };
  }
  return { promptText: rawPrompt, modeName: scarfeWarpAmp > 0 ? "SCARFE FLESH DISTORTION" : "OPTICAL LIGHT GLIDE (LOCKED GEOMETRY)", lightGlideSpeed: 0.85, drawSpeed: 1.0, scarfeWarpAmp };
}

function encodeAnimatedGIF89a(frames: ImageData[], width: number, height: number, delayCs: number): Blob {
  const bytes: number[] = [];
  const writeStr = (s: string) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); };
  const writeU16 = (v: number) => { bytes.push(v & 0xff, (v >> 8) & 0xff); };

  writeStr("GIF89a"); writeU16(width); writeU16(height); bytes.push(0xf7, 0x00, 0x00);

  for (let i = 0; i < 256; i++) {
    if (i < 252) {
      const rIdx = Math.floor(i / 42), gIdx = Math.floor((i % 42) / 6), bIdx = i % 6;
      bytes.push(Math.round((rIdx * 255) / 5), Math.round((gIdx * 255) / 6), Math.round((bIdx * 255) / 5));
    } else {
      const v = Math.round(((i - 252) * 255) / 3);
      bytes.push(v, v, v);
    }
  }

  bytes.push(0x21, 0xff, 0x0b); writeStr("NETSCAPE2.0"); bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  const lzwEncodeFrame = (indexedPixels: Uint8Array) => {
    const minCodeSize = 8; bytes.push(minCodeSize);
    const clearCode = 256, eoiCode = 257;
    let codeSize = 9, nextCode = 258, bitBuf = 0, bitCount = 0;
    const subBlock: number[] = [];

    const flushSubBlock = () => {
      if (subBlock.length > 0) { bytes.push(subBlock.length); for (let i = 0; i < subBlock.length; i++) bytes.push(subBlock[i]); subBlock.length = 0; }
    };

    const emitCode = (code: number) => {
      bitBuf |= code << bitCount; bitCount += codeSize;
      while (bitCount >= 8) { subBlock.push(bitBuf & 0xff); if (subBlock.length === 255) flushSubBlock(); bitBuf >>= 8; bitCount -= 8; }
    };

    const dictKey = new Int32Array(9001), dictVal = new Int16Array(9001); dictKey.fill(-1);
    const resetDict = () => { dictKey.fill(-1); codeSize = 9; nextCode = 258; };

    emitCode(clearCode);
    let prefix = indexedPixels[0];

    for (let i = 1; i < indexedPixels.length; i++) {
      const k = indexedPixels[i], combined = (prefix << 8) | k;
      let h = ((combined * 2654435761) >>> 0) % 9001, found = -1;
      while (dictKey[h] !== -1) { if (dictKey[h] === combined) { found = dictVal[h]; break; } h = (h + 1) % 9001; }
      if (found !== -1) { prefix = found; } else {
        emitCode(prefix);
        if (nextCode < 4096) { dictKey[h] = combined; dictVal[h] = nextCode++; if (nextCode - 1 === 1 << codeSize && codeSize < 12) codeSize++; } 
        else { emitCode(clearCode); resetDict(); }
        prefix = k;
      }
    }
    emitCode(prefix); emitCode(eoiCode);
    if (bitCount > 0) subBlock.push(bitBuf & 0xff);
    flushSubBlock(); bytes.push(0x00);
  };

  const indexed = new Uint8Array(width * height);
  for (let f = 0; f < frames.length; f++) {
    bytes.push(0x21, 0xf9, 0x04, 0x00); writeU16(delayCs); bytes.push(0x00, 0x00);
    bytes.push(0x2c); writeU16(0); writeU16(0); writeU16(width); writeU16(height); bytes.push(0x00);
    const data = frames[f].data;
    for (let y = 0; y < height; y++) {
      const bayerRow = y & 1;
      for (let x = 0; x < width; x++) {
        const i = y * width + x, p = i * 4, dither = (x & 1) ^ bayerRow ? 4 : -4;
        const r = Math.max(0, Math.min(255, data[p] + dither)), g = Math.max(0, Math.min(255, data[p + 1] + dither)), b = Math.max(0, Math.min(255, data[p + 2] + dither));
        indexed[i] = Math.round((r * 5) / 255) * 42 + Math.round((g * 6) / 255) * 6 + Math.round((b * 5) / 255);
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
  const minVis = forVectorStroke ? 0.38 : 0.02;
  const energy = clip(Math.max(minVis, lum * 0.72 + edge * 0.48), 0.0, 1.0);
  const contrastBoost = 0.92 + art.contrastAndGlow * 0.35;

  const finalize = (r: number, g: number, b: number): [number, number, number] => {
    return [
      Math.min(255, Math.max(0, Math.round((r - 128) * contrastBoost + 128))),
      Math.min(255, Math.max(0, Math.round((g - 128) * contrastBoost + 128))),
      Math.min(255, Math.max(0, Math.round((b - 128) * contrastBoost + 128))),
    ];
  };

  const edition = art.edition;

  if (edition === "PINK_FLOYD") {
    if (isHighlightStroke) return [240, 255, 255]; 
    if (lum < 0.28 || (edge > 0.3 && forVectorStroke)) return [10, 12, 18]; 
    if (lum < 0.55) return [165, 30, 45]; 
    return [85, 160, 180]; 
  }

  if (edition === "WARHOL_POP") return lum < 0.25 ? (forVectorStroke ? [255, 35, 135] : [22, 12, 38]) : lum < 0.52 ? [255, 20, 125] : lum < 0.76 ? [0, 238, 248] : [255, 240, 25];
  if (edition === "LICHTENSTEIN") return isHighlightStroke || lum > 0.78 ? [255, 252, 240] : edge > 0.35 && !forVectorStroke ? [18, 16, 22] : lum < 0.32 ? [32, 88, 225] : lum < 0.58 ? [242, 42, 52] : [255, 218, 45];
  if (edition === "OBEY_POSTER") return lum < 0.26 ? (forVectorStroke ? [123, 164, 181] : [15, 30, 46]) : lum < 0.52 ? [217, 43, 43] : lum < 0.75 ? [123, 164, 181] : [245, 235, 214];
  if (edition === "STREET_POP") return Math.floor((lum * 3.8 + phaseShift * 3.0) % 4) === 0 ? [255, 55, 35] : Math.floor((lum * 3.8 + phaseShift * 3.0) % 4) === 1 ? [45, 245, 115] : Math.floor((lum * 3.8 + phaseShift * 3.0) % 4) === 2 ? [255, 230, 20] : [55, 195, 255];
  if (edition === "DA_VINCI") return isHighlightStroke ? [255, 250, 238] : lum > 0.35 && lum < 0.72 && edge < 0.38 ? [182, 76, 48] : art.backdrop === "ARCHIVAL_PAPER" ? [Math.round(58 * clip(0.08 + lum * 0.35 * (1.0 - edge * 0.8), 0.05, 0.38)), Math.round(38 * clip(0.08 + lum * 0.35 * (1.0 - edge * 0.8), 0.05, 0.38)), Math.round(26 * clip(0.08 + lum * 0.35 * (1.0 - edge * 0.8), 0.05, 0.38))] : finalize((185 + energy * 70) * energy, (145 + energy * 75) * energy, (105 + energy * 75) * energy);
  if (edition === "PIXAR_SSS") return finalize(nativeR * 0.58 + (35 + energy * 215 + Math.sin(lum * Math.PI) * 50) * 0.42, nativeG * 0.58 + (28 + energy * 205 + edge * 40) * 0.42, nativeB * 0.58 + (55 + energy * 195) * 0.42);
  if (edition === "REMBRANDT") return isHighlightStroke ? [255, 242, 204] : finalize((nativeR + nativeG + nativeB) * 0.14 + (35 + Math.pow(energy, 0.85) * 220) * 0.58, (nativeR + nativeG + nativeB) * 0.14 + (22 + Math.pow(energy, 0.95) * 190) * 0.58, (nativeR + nativeG + nativeB) * 0.14 + (12 + Math.pow(energy, 1.25) * 145) * 0.58);
  if (edition === "DARK_SIDE") return edge > 0.2 ? finalize(energy * 245 * (1 - smoothstep(0.2, 0.55, edge) * 0.85) + CAUCHY_SPECTRUM[Math.max(0, Math.min(6, Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7)))][0] * smoothstep(0.2, 0.55, edge) * 0.85, energy * 245 * (1 - smoothstep(0.2, 0.55, edge) * 0.85) + CAUCHY_SPECTRUM[Math.max(0, Math.min(6, Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7)))][1] * smoothstep(0.2, 0.55, edge) * 0.85, energy * 245 * (1 - smoothstep(0.2, 0.55, edge) * 0.85) + CAUCHY_SPECTRUM[Math.max(0, Math.min(6, Math.floor(((phaseShift * 7 + lum * 5) % 1) * 7)))][2] * smoothstep(0.2, 0.55, edge) * 0.85) : finalize(Math.round(energy * 240), Math.round(energy * 240), Math.round(energy * 240) + 10);
  if (edition === "CUSTOM_GRADE") return energy < 0.5 ? finalize(hexToRgb(art.shadowHex)[0] * (1 - energy * 2) + hexToRgb(art.midtoneHex)[0] * energy * 2, hexToRgb(art.shadowHex)[1] * (1 - energy * 2) + hexToRgb(art.midtoneHex)[1] * energy * 2, hexToRgb(art.shadowHex)[2] * (1 - energy * 2) + hexToRgb(art.midtoneHex)[2] * energy * 2) : finalize(hexToRgb(art.midtoneHex)[0] * (1 - (energy - 0.5) * 2) + hexToRgb(art.highlightHex)[0] * (energy - 0.5) * 2, hexToRgb(art.midtoneHex)[1] * (1 - (energy - 0.5) * 2) + hexToRgb(art.highlightHex)[1] * (energy - 0.5) * 2, hexToRgb(art.midtoneHex)[2] * (1 - (energy - 0.5) * 2) + hexToRgb(art.highlightHex)[2] * (energy - 0.5) * 2);

  const avg = (nativeR + nativeG + nativeB) * 0.333;
  if (Math.max(nativeR, nativeG, nativeB) - Math.min(nativeR, nativeG, nativeB) > 12) {
    const scaleLum = forVectorStroke ? Math.max(0.55, energy) / Math.max(0.15, avg / 255.0) : 1.0;
    return finalize((avg + (nativeR - avg) * 1.48) * scaleLum + edge * (forVectorStroke ? 52 : 18), (avg + (nativeG - avg) * 1.48) * scaleLum + edge * (forVectorStroke ? 52 : 18), (avg + (nativeB - avg) * 1.48) * scaleLum + edge * ((forVectorStroke ? 52 : 18) + 8));
  }
  const baseV = (45 + energy * 210) * (forVectorStroke ? 1.0 : clip(lum * 1.35 + edge * 0.6, 0.04, 1.0));
  return finalize(baseV * 0.96, baseV * 0.98, baseV * 1.05);
}

function computeShannonEntropy(str: string): number {
  if (!str) return 0;
  const freq: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) freq[str[i]] = (freq[str[i]] || 0) + 1;
  let h = 0;
  for (const k in freq) { const p = freq[k] / str.length; h -= p * Math.log2(p); }
  return h;
}

function compileLexicalManifold(rawText: string): { tensor: Tensor5D; coeffs: DifferentialConstants } {
  const entropy = computeShannonEntropy(rawText);
  return {
    tensor: { energy: 0.75, chaos: 0.25, tone: 0.5, structure: 0.95, symmetry: 0.36 },
    coeffs: { alpha: 1.0, beta: 0.5, gamma: 1.2, delta: 0.8, nHarmonic: 3, mHarmonic: 4, entropy, lyapunov: 0.45, eigenAnisotropy: 0.965 },
  };
}

function gaussianBlurField(src: Float32Array, w: number, h: number, passes: number): Float32Array {
  let curr = new Float32Array(src);
  const temp = new Float32Array(w * h);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        temp[row + x] = (curr[row + Math.max(0, x - 2)] + 4 * curr[row + Math.max(0, x - 1)] + 6 * curr[row + x] + 4 * curr[row + Math.min(w - 1, x + 1)] + curr[row + Math.min(w - 1, x + 2)]) * 0.0625;
      }
    }
    for (let y = 0; y < h; y++) {
      const ym2 = Math.max(0, y - 2) * w, ym1 = Math.max(0, y - 1) * w, y0 = y * w, yp1 = Math.min(h - 1, y + 1) * w, yp2 = Math.min(h - 1, y + 2) * w;
      for (let x = 0; x < w; x++) {
        curr[y0 + x] = (temp[ym2 + x] + 4 * temp[ym1 + x] + 6 * temp[y0 + x] + 4 * temp[yp1 + x] + temp[yp2 + x]) * 0.0625;
      }
    }
  }
  return curr;
}

function simplifyDouglasPeucker(pts: {x: number, y: number}[], epsilon: number): {x: number, y: number}[] {
  if (pts.length <= 2) return pts;
  let dmax = 0, index = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const a = pts[0], b = pts[end], p = pts[i];
    const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    const den = Math.hypot(b.y - a.y, b.x - a.x);
    const d = den > 0 ? num / den : Math.hypot(p.x - a.x, p.y - a.y);
    if (d > dmax) { index = i; dmax = d; }
  }
  if (dmax > epsilon) {
    const rec1 = simplifyDouglasPeucker(pts.slice(0, index + 1), epsilon);
    const rec2 = simplifyDouglasPeucker(pts.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [pts[0], pts[end]];
  }
}

// ==========================================
// МАТЕМАТИЧЕСКОЕ ЯДРО 29.0: УЛЬТРА-ЧИСТАЯ АНАЛИТИКА + ДВОЙНОЙ ГИСТЕРЕЗИС КЭННИ
// Никакого "песка" на асфальте, никаких пустых "макаронин" вокруг прутьев!
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement, useFastMode: boolean): MatrixBuffer {
  const baseRes = useFastMode ? 600 : 920;
  const aspect = img.width / Math.max(1, img.height);
  let w = baseRes, h = baseRes;
  if (aspect > 1.2) { w = baseRes; h = Math.round(baseRes / Math.min(aspect, 1.55)); }
  else if (aspect < 0.85) { h = baseRes; w = Math.round(baseRes * Math.max(aspect, 0.68)); }

  const off = document.createElement("canvas");
  off.width = w; off.height = h;
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

  if (!octx) return { w, h, rgba: new Uint8ClampedArray(0), cleanRgba: new Uint8ClampedArray(0), lum, smoothLum: lum, depthMap, coherence, subjectAlpha, fdog, nmsRidge, edge, scaleMap, gx, gy, etfX, etfY, mask, strokes, silkLoom, meanAnisotropy: 0.9, charCenterU: 0.5, charCenterV: 0.5, headU: 0.5, headV: 0.35, headRx: 0.2, headRy: 0.2 };

  octx.fillStyle = "#020104"; octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  octx.drawImage(img, (w - img.width * scale) * 0.5, (h - img.height * scale) * 0.5, img.width * scale, img.height * scale);

  const rawRgba = octx.getImageData(0, 0, w, h).data;
  const cleanRgba = new Uint8ClampedArray(rawRgba.length);
  const rawLArr = new Float32Array(total);

  let minL = 1.0, maxL = 0.0;
  for (let i = 0; i < total; i++) {
    const l = (0.299 * rawRgba[i * 4] + 0.587 * rawRgba[i * 4 + 1] + 0.114 * rawRgba[i * 4 + 2]) / 255.0;
    rawLArr[i] = l;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }

  const spanL = Math.max(0.18, maxL - minL);
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = Math.abs(ny) > 0.96 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.96) / 0.04) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = Math.abs(nx) > 0.96 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.96) / 0.04) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      mask[i] = wx * wy;
      lum[i] = Math.pow(clip((rawLArr[i] - minL) / spanL), 0.85) * mask[i]; // Немного темнее для контраста
    }
  }

  // 1. ЖЕСТКОЕ УБИЙСТВО ШУМА: Анизотропный медианный/Kuwahara проход ДО выделения краев!
  // Это уберет "песок" на асфальте и рябь, оставив только реальные контуры (прутья, кот).
  const qBounds: [number, number, number, number][] = [[-2, 0, -2, 0], [0, 2, -2, 0], [-2, 0, 0, 2], [0, 2, 0, 2]];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      let bestVar = 1e9;
      let bestL = lum[idx];
      let bestR = rawRgba[idx*4], bestG = rawRgba[idx*4+1], bestB = rawRgba[idx*4+2];

      for (let q = 0; q < 4; q++) {
        const [x0, x1, y0, y1] = qBounds[q];
        let sumL = 0, sumL2 = 0, sumR = 0, sumG = 0, sumB = 0;
        for (let ky = y0; ky <= y1; ky++) {
          const row = (y + ky) * w;
          for (let kx = x0; kx <= x1; kx++) {
            const nIdx = row + (x + kx);
            const lVal = lum[nIdx];
            sumL += lVal; sumL2 += lVal * lVal;
            const np = nIdx * 4;
            sumR += rawRgba[np]; sumG += rawRgba[np+1]; sumB += rawRgba[np+2];
          }
        }
        const meanL = sumL / 9.0;
        const variance = sumL2 / 9.0 - meanL * meanL;
        if (variance < bestVar) {
          bestVar = variance; bestL = meanL;
          bestR = sumR/9.0; bestG = sumG/9.0; bestB = sumB/9.0;
        }
      }
      // Переписываем карту яркости ОЧИЩЕННЫМИ значениями!
      lum[idx] = bestL;
      const p = idx*4;
      cleanRgba[p] = bestR; cleanRgba[p+1] = bestG; cleanRgba[p+2] = bestB; cleanRgba[p+3] = 255;
    }
  }

  const gNarrow = gaussianBlurField(lum, w, h, 1);
  const gMedium = gaussianBlurField(lum, w, h, 3);
  const smoothLum = gaussianBlurField(lum, w, h, 12);
  const domeLum = gaussianBlurField(lum, w, h, 28);

  const j11 = new Float32Array(total), j12 = new Float32Array(total), j22 = new Float32Array(total);
  const rawGradMag = new Float32Array(total), stegerRidge = new Float32Array(total);
  let globalMaxEdge = 1e-5, globalMaxRidge = 1e-5;

  // Тензор строится по ОЧИЩЕННОЙ карте яркости (без шума!)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sx = -3 * lum[(y - 1) * w + x - 1] + 3 * lum[(y - 1) * w + x + 1] - 10 * lum[y * w + x - 1] + 10 * lum[y * w + x + 1] - 3 * lum[(y + 1) * w + x - 1] + 3 * lum[(y + 1) * w + x + 1];
      const sy = -3 * lum[(y - 1) * w + x - 1] - 10 * lum[(y - 1) * w + x] - 3 * lum[(y - 1) * w + x + 1] + 3 * lum[(y + 1) * w + x - 1] + 10 * lum[(y + 1) * w + x] + 3 * lum[(y + 1) * w + x + 1];

      const mag = Math.sqrt(sx * sx + sy * sy) * mask[idx];
      rawGradMag[idx] = mag;
      if (mag > globalMaxEdge) globalMaxEdge = mag;

      const cVal = gNarrow[idx], ixx = gNarrow[idx + 1] - 2.0 * cVal + gNarrow[idx - 1], iyy = gNarrow[idx + w] - 2.0 * cVal + gNarrow[idx - w];
      const ixy = 0.25 * (gNarrow[(y + 1) * w + x + 1] - gNarrow[(y + 1) * w + x - 1] - gNarrow[(y - 1) * w + x + 1] + gNarrow[(y - 1) * w + x - 1]);

      const hTrace = ixx + iyy, hDet = Math.sqrt((ixx - iyy) * (ixx - iyy) + 4.0 * ixy * ixy);
      const absMaxEig = Math.max(Math.abs(0.5 * (hTrace + hDet)), Math.abs(0.5 * (hTrace - hDet))) * mask[idx];

      stegerRidge[idx] = absMaxEig;
      if (absMaxEig > globalMaxRidge) globalMaxRidge = absMaxEig;

      j11[idx] = sx * sx; j12[idx] = sx * sy; j22[idx] = sy * sy;
      const norm = mag + 1e-6; gx[idx] = sx / norm; gy[idx] = sy / norm;
    }
  }

  const sJ11 = gaussianBlurField(j11, w, h, 2), sJ12 = gaussianBlurField(j12, w, h, 2), sJ22 = gaussianBlurField(j22, w, h, 2);
  let anisotropySum = 0, anisotropyCount = 0;

  for (let i = 0; i < total; i++) {
    const a = sJ11[i], b = sJ12[i], c = sJ22[i], trace = a + c, detTerm = Math.sqrt((a - c) * (a - c) + 4.0 * b * b);
    const lambda1 = 0.5 * (trace + detTerm), lambda2 = 0.5 * (trace - detTerm);
    if (trace > 1e-5) { coherence[i] = Math.pow((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-5), 2); anisotropySum += coherence[i]; anisotropyCount++; }
    const tx = b, ty = lambda2 - a, tLen = Math.hypot(tx, ty);
    if (tLen > 1e-6) { etfX[i] = tx / tLen; etfY[i] = ty / tLen; } else { etfX[i] = -gy[i]; etfY[i] = gx[i]; }
  }

  const meanAnisotropy = Number((anisotropySum / Math.max(1, anisotropyCount)).toFixed(3));

  // ПОРОГ ГИСТЕРЕЗИСА: Жестко убиваем шум, оставляем только сильные структурные линии
  const localEnv = gaussianBlurField(rawGradMag, w, h, 5);
  const absFloor = globalMaxEdge * 0.045; // Увеличен порог отсечения фонового мусора!

  for (let i = 0; i < total; i++) {
    // Векторная линия теперь обязана иметь высокую анизотропию (coherence), чтобы быть линией, а не точкой шума!
    const combined = Math.max(rawGradMag[i] * 0.8, (stegerRidge[i] / globalMaxRidge) * globalMaxEdge * 0.7) * (0.2 + 0.8 * coherence[i]);
    edge[i] = combined < absFloor ? 0.0 : clip((combined - absFloor * 0.5) / Math.max(globalMaxEdge * 0.15, localEnv[i] * 1.5 + globalMaxEdge * 0.05));
  }

  const edgeDensity = gaussianBlurField(edge, w, h, 8);
  let massSum = 1e-5, massU = 0, massV = 0, headMassSum = 1e-5, headSumU = 0, headSumV = 0;

  for (let y = 0; y < h; y++) {
    const vNorm = y / h, ny = vNorm - 0.5;
    for (let x = 0; x < w; x++) {
      const uNorm = x / w, i = y * w + x;
      const crowding = edgeDensity[i] * 3.5 + (stegerRidge[i] / globalMaxRidge) * coherence[i] * 5.0;
      scaleMap[i] = clip(1.0 / (0.85 + crowding), 0.15, 1.4);
      depthMap[i] = clip((Math.max(0.2, 1.0 - (Math.pow(uNorm - 0.5, 2) * 1.2 + ny * ny * 1.1)) * 0.35 + domeLum[i] * 0.42 + Math.max(domeLum[i] - 0.08, smoothLum[i]) * 0.23)) * mask[i];
      
      const mWeight = edge[i] * mask[i];
      massSum += mWeight; massU += uNorm * mWeight; massV += vNorm * mWeight;

      if (vNorm > 0.1 && vNorm < 0.55 && uNorm > 0.15 && uNorm < 0.85) {
        const hScore = edge[i] * (1.2 - scaleMap[i] * 0.7) * Math.exp(-Math.pow(uNorm - 0.45, 2) * 4.5);
        if (hScore > 0.05) { headMassSum += hScore; headSumU += uNorm * hScore; headSumV += vNorm * hScore; }
      }
    }
  }

  const charCenterU = clip(massU / massSum, 0.3, 0.7);
  const charCenterV = clip(massV / massSum, 0.35, 0.68);
  const headU = headMassSum > 1.0 ? clip(headSumU / headMassSum, 0.22, 0.78) : charCenterU;
  const headV = headMassSum > 1.0 ? clip(headSumV / headMassSum, 0.18, 0.46) : Math.max(0.24, charCenterV - 0.16);

  let headVarU = 0, headVarV = 0;
  if (headMassSum > 1.0) {
    for (let y = Math.floor(h * 0.1); y < Math.floor(h * 0.6); y += 2) {
      const vNorm = y / h;
      for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x += 2) {
        const uNorm = x / w;
        const du = uNorm - headU;
        const dv = vNorm - headV;
        if (du * du + dv * dv < 0.09) {
          const i = y * w + x;
          const wgt = edge[i];
          headVarU += Math.abs(du) * wgt;
          headVarV += Math.abs(dv) * wgt;
        }
      }
    }
  }
  const headRx = clip((headVarU / Math.max(1, headMassSum)) * 2.3, 0.12, 0.28);
  const headRy = clip((headVarV / Math.max(1, headMassSum)) * 2.5, 0.15, 0.32);

  // FDoG: Широкая интеграция вдоль ETF для чистых, неразрывных линий (избавляет от рваных краев)
  const rawXDoG = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const diffFine = lum[i] - gNarrow[i];
    const diffCoarse = gNarrow[i] - gMedium[i];
    // Жестко отсекаем шум: XDoG работает только там, где есть высокая когерентность (настоящие линии)
    const pSharp = 12.0 + 24.0 * coherence[i]; 
    const dVal = lum[i] + (diffFine * 0.7 + diffCoarse * 0.3) * pSharp;
    rawXDoG[i] = clip(dVal, 0.0, 1.0);
  }

  for (let y = 4; y < h - 4; y++) {
    for (let x = 4; x < w - 4; x++) {
      const i = y * w + x;
      let acc = rawXDoG[i] * 0.38;
      for (let step = 1; step <= 2; step++) {
        const dist = step * scaleMap[i] * 1.2;
        const xp = Math.min(w - 1, Math.max(0, Math.round(x + etfX[i] * dist))), yp = Math.min(h - 1, Math.max(0, Math.round(y + etfY[i] * dist)));
        acc += rawXDoG[yp * w + xp] * (step === 1 ? 0.2 : 0.11);
      }
      fdog[i] = clip(acc);
    }
  }

  // 1-PIXEL RIDGE DETECTION (Супер-строгий NMS для бритвенных линий)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      const e0 = edge[i];
      if (e0 < 0.05 || mask[i] < 0.05) continue; // Высокий порог гистерезиса!
      const nx = Math.round(gx[i]), ny = Math.round(gy[i]);
      if (nx === 0 && ny === 0) continue;
      // Проверка по нормали: пиксель должен быть СТРОГИМ МАКСИМУМОМ
      if (e0 >= edge[(y - ny) * w + x - nx] && e0 >= edge[(y + ny) * w + x + nx]) {
        nmsRidge[i] = e0;
      }
    }
  }

  const ridgeSeeds: { idx: number; score: number; tier: 0 | 1 | 2 | 4 }[] = [];
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (nmsRidge[i] < 0.05 || mask[i] < 0.05) continue;
      
      const uNorm = x / w, vNorm = y / h;
      const inHeadBox = Math.hypot((uNorm - headU) / headRx, (vNorm - headV) / headRy) < 1.25;
      
      const tier: 0 | 1 | 2 | 4 = inHeadBox || (scaleMap[i] < 0.45 && nmsRidge[i] > 0.15) ? 0 : 2;
      ridgeSeeds.push({ idx: i, score: nmsRidge[i] * (tier === 0 ? 1.5 : 1.0), tier });
    }
  }
  ridgeSeeds.sort((a, b) => b.score - a.score);

  const DIRS_8: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const visited = new Uint8Array(total);

  const traceExactPixelChain = (startIdx: number, dirSign: number, maxLen: number) => {
    const chain: { x: number; y: number }[] = [];
    let currIdx = startIdx, cx = currIdx % w, cy = Math.floor(currIdx / w);
    let prevDx = etfX[currIdx] * dirSign, prevDy = etfY[currIdx] * dirSign;

    for (let step = 0; step < maxLen; step++) {
      visited[currIdx] = 1;
      chain.push({ x: cx + 0.5, y: cy + 0.5 });
      let bestNextIdx = -1, bestScore = -1.0, bestDx = 0, bestDy = 0;

      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS_8[d][0], ny = cy + DIRS_8[d][1];
        if (nx < 2 || nx >= w - 2 || ny < 2 || ny >= h - 2) continue;
        const nIdx = ny * w + nx;
        if (visited[nIdx] || nmsRidge[nIdx] <= 0.04) continue;
        const dLen = Math.hypot(DIRS_8[d][0], DIRS_8[d][1]);
        const ndx = DIRS_8[d][0] / dLen, ndy = DIRS_8[d][1] / dLen;
        const align = ndx * prevDx + ndy * prevDy;
        if (align > 0.3) { // Увеличен порог коллинеарности: линии не будут закручиваться в спирали на шуме!
          const score = align * 0.7 + nmsRidge[nIdx] * 0.3;
          if (score > bestScore) { bestScore = score; bestNextIdx = nIdx; bestDx = ndx; bestDy = ndy; }
        }
      }
      if (bestNextIdx === -1) break;
      currIdx = bestNextIdx; cx = currIdx % w; cy = Math.floor(currIdx / w);
      prevDx = prevDx * 0.4 + bestDx * 0.6; prevDy = prevDy * 0.4 + bestDy * 0.6;
      const norm = Math.hypot(prevDx, prevDy) + 1e-6; prevDx /= norm; prevDy /= norm;
    }
    return chain;
  };

  const packCornerLockedStroke = (rawPts: { x: number; y: number }[], tier: 0 | 1 | 2 | 4) => {
    let curr = rawPts.map((p) => ({ x: p.x, y: p.y }));
    const n = curr.length;

    const uArr = new Float32Array(n);
    const vArr = new Float32Array(n);
    let eSum = 0, lSum = 0, cohSum = 0, rSum = 0, gSum = 0, bSum = 0, uSum = 0, vSum = 0;

    for (let i = 0; i < n; i++) {
      uArr[i] = curr[i].x / w; vArr[i] = curr[i].y / h;
      uSum += uArr[i]; vSum += vArr[i];
      const pxIdx = Math.min(h - 1, Math.max(0, Math.floor(curr[i].y))) * w + Math.min(w - 1, Math.max(0, Math.floor(curr[i].x)));
      eSum += nmsRidge[pxIdx]; lSum += lum[pxIdx]; cohSum += coherence[pxIdx];
      const p4 = pxIdx * 4;
      rSum += cleanRgba[p4]; gSum += cleanRgba[p4 + 1]; bSum += cleanRgba[p4 + 2];
    }
    strokes.push({
      u: uArr, v: vArr, nx: new Float32Array(n), ny: new Float32Array(n), z: new Float32Array(n), nPts: n, tier,
      r: Math.round(rSum / n), g: Math.round(gSum / n), b: Math.round(bSum / n),
      cachedR: Math.round(rSum / n), cachedG: Math.round(gSum / n), cachedB: Math.round(bSum / n),
      meanEdge: eSum / n, meanLum: lSum / n, meanCoherence: cohSum / n, subjectWeight: 1.0, featureScale: 1.0,
      importance: (eSum / n) * 0.85 + (cohSum / n) * 0.45, phase: (strokes.length * PHI) % (Math.PI * 2), speed: 1.0, arcLen: n, centerU: uSum / n, centerV: vSum / n,
    });
  };

  const maxRidgeStrokes = useFastMode ? 4000 : 7000;
  for (let i = 0; i < ridgeSeeds.length && strokes.length < maxRidgeStrokes; i++) {
    const seed = ridgeSeeds[i];
    if (visited[seed.idx]) continue;

    const sx = seed.idx % w;
    const sy = Math.floor(seed.idx / w);
    const nx = Math.round(gx[seed.idx]);
    const ny = Math.round(gy[seed.idx]);
    visited[(sy + ny) * w + (sx + nx)] = 1;
    visited[(sy - ny) * w + (sx - nx)] = 1;

    const back = traceExactPixelChain(seed.idx, -1, 85).reverse();
    const fwd = traceExactPixelChain(seed.idx, 1, 85);
    const rawPts = [...back, ...(fwd.length > 1 ? fwd.slice(1) : [])];
    if (rawPts.length < 5) continue; // Убрали короткие мусорные штрихи!
    packCornerLockedStroke(rawPts, seed.tier);
  }

  strokes.sort((a, b) => {
    const da = Math.hypot(a.centerU - charCenterU, a.centerV - charCenterV);
    const db = Math.hypot(b.centerU - charCenterU, b.centerV - charCenterV);
    return (da - db) * 0.45 + (b.importance - a.importance) * 0.55;
  });

  return { w, h, rgba: rawRgba, licRgba: cleanRgba, lum, smoothLum, depthMap, coherence, subjectAlpha: new Float32Array(total), fdog, nmsRidge, edge, scaleMap, gx, gy, etfX, etfY, mask, strokes, silkLoom, meanAnisotropy: 0.96, charCenterU, charCenterV, headU, headV, headRx: 0.2, headRy: 0.2 };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const initialPrompt = "100% Static Masterpiece (Locked Geometry)";
  const initialPromptCfg = compilePromptConfig(initialPrompt);

  const [tensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("TRACE");

  const [animPromptInput, setAnimPromptInput] = useState<string>("");
  const [promptCfg, setPromptCfg] = useState<PromptConfig>(initialPromptCfg);

  const [artConfig, setArtStudioConfig] = useState<ArtStudioConfig>({
    dimension: "2D_STUDIO",
    backdrop: "OBSIDIAN",
    behavior: "STATIC_MASTERPIECE",
    lockFrontAnfas: true,
    fastPerfMode: false,
    edition: "SHINE_ON",
    posterFrame: true,
    strokeWeight: 0.55,
    tonalVolumeDepth: 0.85,
    cleanlinessGate: 0.28,
    contrastAndGlow: 0.82,
    shadowHex: "#18122b", midtoneHex: "#a855f7", highlightHex: "#fde047",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("INITIALIZING BARRETT 29.0 ULTRA-CLEAN CORE...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);

  const stateRef = useRef({
    tensor: initialData.tensor,
    art: artConfig,
    prompt: initialPromptCfg,
    topology: "TRACE" as ManifoldTopology,
    matrix: null as MatrixBuffer | null,
    time: 0, traceProgress: 1.0, needsBaseRebuild: true,
  });

  const updateArt = useCallback(<K extends keyof ArtStudioConfig>(key: K, val: ArtStudioConfig[K]) => {
    setArtStudioConfig((prev) => {
      const next = { ...prev, [key]: val };
      stateRef.current.art = next;
      stateRef.current.needsBaseRebuild = true;
      if (key === "behavior" && val === "PROGRESSIVE_PEN_DRAW") stateRef.current.traceProgress = 0;
      else if (key === "behavior" && val === "STATIC_MASTERPIECE") stateRef.current.traceProgress = 1.0;
      return next;
    });
  }, []);

  const handleApplyPrompt = useCallback((customText?: string) => {
    const targetText = customText !== undefined ? customText : animPromptInput;
    if (customText !== undefined) setAnimPromptInput(customText);
    const compiled = compilePromptConfig(targetText);
    setPromptCfg(compiled);
    stateRef.current.prompt = compiled;
    if (compiled.scarfeWarpAmp > 0) {
      setTopology("SCARFE_NIGHTMARE");
      updateArt("edition", "PINK_FLOYD");
      updateArt("backdrop", "WALL_BRICKS");
    }
  }, [animPromptInput, updateArt]);

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("SOLVING NMS HYSTERESIS EDGES [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img, typeof window !== "undefined" && window.innerWidth < 768);
      stateRef.current.matrix = buf;
      stateRef.current.traceProgress = stateRef.current.art.behavior === "PROGRESSIVE_PEN_DRAW" ? 0 : 1.0;
      stateRef.current.needsBaseRebuild = true;
      setFieldStatus("LOCKED // " + String(buf.strokes.length) + " ULTRA-CLEAN VECTORS");
    };
    img.src = rawUrl.startsWith("data:") ? rawUrl : "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  useEffect(() => {
    fetch("/api/search?page=1&query=" + encodeURIComponent(query)).then(r => r.json()).then(d => {
      if (d && d.data && d.data.length > 0) {
        const validUrls = d.data.filter((item: any) => scoreSearchItemRelevance(item, query) > -50).map((i: any) => i.src || i.image_url);
        if (validUrls.length > 0) {
          setCandidateUrls(validUrls);
          loadMatrixFromUrl(validUrls[0], 0, validUrls.length);
        }
      }
    });
  }, [query, loadMatrixFromUrl]);

  useEffect(() => {
    stateRef.current.tensor = tensor;
    stateRef.current.art = artConfig;
    stateRef.current.prompt = promptCfg;
    stateRef.current.topology = topology;
    stateRef.current.needsBaseRebuild = true;
  }, [tensor, artConfig, promptCfg, topology]);

  // ==========================================
  // РЕНДЕР: ИДЕАЛЬНАЯ ЧИСТОТА И 100% СТАТИКА (NO JELLY)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let viewW = 900, viewH = 680;

    const xdogPlateCanvas = document.createElement("canvas");
    const xdogPlateCtx = xdogPlateCanvas.getContext("2d");

    const updateSize = () => {
      viewW = canvas.parentElement?.clientWidth || 900;
      viewH = canvas.parentElement?.clientHeight || 680;
      canvas.width = viewW * 2; canvas.height = viewH * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    updateSize();

    const renderProceduralBrickWall = (w: number, h: number) => {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#4b5563";
      
      const brickH = 45;
      const brickW = 120;
      for (let y = 0; y < h; y += brickH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
        for (let x = offset; x < w; x += brickW) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + brickH);
          ctx.stroke();
        }
      }
    };

    const rebuildXDoGMasterPlateAndCache = (m: MatrixBuffer, art: ArtStudioConfig) => {
      if (!xdogPlateCtx) return;
      xdogPlateCanvas.width = m.w; xdogPlateCanvas.height = m.h;
      const plImg = xdogPlateCtx.createImageData(m.w, m.h);
      const plDst = plImg.data;

      for (let i = 0; i < m.w * m.h; i++) {
        const p = i * 4;
        const xd = m.fdog[i];
        const tr = m.edge[i];

        if (stateRef.current.topology === "SCARFE_NIGHTMARE") {
          const shadow = m.lum[i] < 0.35 ? 0 : 255;
          plDst[p] = shadow; plDst[p+1] = shadow; plDst[p+2] = shadow; plDst[p+3] = 255 - shadow;
        } else {
          // ИСПОЛЬЗУЕМ FDoG ДЛЯ ЧИСТОЙ ШТРИХОВКИ!
          // Темные области остаются 100% прозрачными, чтобы был виден кастомный фон!
          const lightBody = m.lum[i] * (0.28 + 0.72 * xd);
          const alpha = smoothstep(art.cleanlinessGate * 0.42, 0.78, lightBody) * m.mask[i];
          const [colR, colG, colB] = resolveEditionColor(art, m.licRgba[p], m.licRgba[p+1], m.licRgba[p+2], m.lum[i], tr, 0.5, false, true);
          plDst[p] = colR; plDst[p+1] = colG; plDst[p+2] = colB; plDst[p+3] = Math.round(clip(alpha, 0.0, 0.95) * 255);
        }
      }
      xdogPlateCtx.putImageData(plImg, 0, 0);

      for (let i = 0; i < m.strokes.length; i++) {
        const st = m.strokes[i];
        if (stateRef.current.topology === "SCARFE_NIGHTMARE") {
           const rawPts = [];
           for(let k=0; k<st.nPts; k++) rawPts.push({x: st.u[k], y: st.v[k]});
           const simple = simplifyDouglasPeucker(rawPts, 0.015);
           st.u = new Float32Array(simple.map(p => p.x));
           st.v = new Float32Array(simple.map(p => p.y));
           st.nPts = simple.length;
           st.cachedR = 10; st.cachedG = 12; st.cachedB = 18;
        } else {
           const [rC, gC, bC] = resolveEditionColor(art, st.r, st.g, st.b, st.meanLum, st.meanEdge, 0.5, st.tier === 4, true);
           st.cachedR = rC; st.cachedG = gC; st.cachedB = bC;
        }
      }
    };

    const render = () => {
      const s = stateRef.current;
      const art = s.art;
      const prCfg = s.prompt;
      const m = s.matrix;

      s.time += 0.016;
      if (art.behavior === "PROGRESSIVE_PEN_DRAW") s.traceProgress = (s.traceProgress + 0.0045 * prCfg.drawSpeed) % 1.35;
      else if (s.traceProgress < 1.0) s.traceProgress = Math.min(1.0, s.traceProgress + 0.022);

      if (m && s.needsBaseRebuild) {
        rebuildXDoGMasterPlateAndCache(m, art);
        s.needsBaseRebuild = false;
      }

      if (art.backdrop === "WALL_BRICKS" || s.topology === "SCARFE_NIGHTMARE") {
        renderProceduralBrickWall(viewW, viewH);
      } else {
        ctx.fillStyle = BACKDROP_COLORS[art.backdrop] || "#040308";
        ctx.fillRect(0, 0, viewW, viewH);
      }

      if (!m) {
        animId = requestAnimationFrame(render);
        return;
      }

      const drawW = m.w * Math.min((viewW - 48) / m.w, (viewH - 126) / m.h);
      const drawH = m.h * Math.min((viewW - 48) / m.w, (viewH - 126) / m.h);
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.41;

      const applyScarfeWarp = (u: number, v: number): [number, number] => {
        if (prCfg.scarfeWarpAmp <= 0) return [u, v];
        const dx = u - m.charCenterU;
        const dy = v - (m.charCenterV + 0.1);
        const r = Math.hypot(dx, dy);
        if (r < 0.35) {
          const pull = Math.pow(1.0 - r / 0.35, 2.0) * 0.15;
          u -= dx * pull;
          v += Math.abs(dy) * pull * 1.5;
        }
        return [u, v];
      };

      const clampedProg = Math.min(1.0, s.traceProgress);

      if (s.topology === "TRACE" || s.topology === "SKETCH" || s.topology === "SCARFE_NIGHTMARE") {
        if (art.tonalVolumeDepth > 0.02) {
          ctx.save();
          if (prCfg.scarfeWarpAmp <= 0) {
             ctx.globalAlpha = art.tonalVolumeDepth * smoothstep(0.05, 0.75, clampedProg);
             ctx.drawImage(xdogPlateCanvas, ox, oy, drawW, drawH);
          }
          ctx.restore();
        }

        const strokes = m.strokes;
        const headFloat = clampedProg * (strokes.length + 120);

        ctx.lineCap = s.topology === "SCARFE_NIGHTMARE" ? "square" : "round";
        ctx.lineJoin = s.topology === "SCARFE_NIGHTMARE" ? "miter" : "round";

        for (let i = 0; i < strokes.length; i++) {
          if (i > headFloat) break;
          const st = strokes[i];
          const localProg = smoothstep(0.0, 1.0, clip((headFloat - i) / 120, 0.0, 1.0));
          if (localProg <= 0.02) continue;

          const fullIdx = Math.min(st.nPts - 1, Math.floor(localProg * (st.nPts - 1)));
          const isScarfe = s.topology === "SCARFE_NIGHTMARE";
          
          ctx.globalCompositeOperation = isScarfe ? "source-over" : "screen";

          const baseAlpha = isScarfe ? 0.95 : clip((0.28 + st.meanEdge * 0.68) * localProg, 0.14, 0.96);
          const lineW = isScarfe 
             ? (0.8 + Math.sin(i * 12.5) * 0.6) * art.strokeWeight * 2.5
             : (st.tier === 0 ? 0.3 : 0.45 * st.featureScale) * art.strokeWeight;

          ctx.beginPath();
          for (let k = 0; k <= fullIdx; k++) {
            // КООРДИНАТЫ 100% СТАТИЧНЫ! Никаких синусоид и желе!
            const [wu, wv] = applyScarfeWarp(st.u[k], st.v[k]);
            const curX = ox + wu * drawW;
            const curY = oy + wv * drawH;
            
            const jitterX = isScarfe ? (Math.random() - 0.5) * 1.5 : 0;
            const jitterY = isScarfe ? (Math.random() - 0.5) * 1.5 : 0;

            if (k === 0) ctx.moveTo(curX + jitterX, curY + jitterY);
            else ctx.lineTo(curX + jitterX, curY + jitterY);
          }
          
          ctx.strokeStyle = `rgba(${st.cachedR}, ${st.cachedG}, ${st.cachedB}, ${baseAlpha})`;
          ctx.lineWidth = Math.max(0.2, lineW);
          ctx.stroke();

          // ОПТИЧЕСКОЕ СКОЛЬЖЕНИЕ СВЕТА ВДОЛЬ СТАТИЧНЫХ ЛИНИЙ
          if (art.behavior === "OPTICAL_LIGHT_GLIDE" && prCfg.lightGlideSpeed > 0.05 && st.tier === 1 && fullIdx >= 10 && !isScarfe) {
            const span = Math.max(3, Math.floor(st.nPts * 0.22));
            const headK = Math.floor(((s.time * prCfg.lightGlideSpeed + st.phase) % 1.4) * st.nPts);
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
              ctx.lineWidth = Math.max(0.28, lineW * 1.25);
              ctx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [query]);

  return (
    <div className="w-full max-w-[1600px] mx-auto mb-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div ref={containerRef} className="lg:col-span-8 relative h-[600px] md:h-[780px] rounded-2xl overflow-hidden border border-white/10 bg-[#040308] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      <div className="lg:col-span-4 glass-panel p-5 flex flex-col justify-between gap-3.5">
        <div className="flex flex-col gap-3 font-mono text-[9px] uppercase tracking-widest">
          
          <div className="p-3 rounded-xl bg-black/60 border border-white/15 space-y-2.5">
             <div className="text-white font-bold mb-2">1. Behavior (STATIC GEOMETRY LOCK):</div>
             <div className="grid grid-cols-3 gap-1 mb-2">
                <button onClick={() => updateArt("behavior", "STATIC_MASTERPIECE")} className={`py-1.5 border text-[7.5px] rounded ${artConfig.behavior === "STATIC_MASTERPIECE" ? "bg-white text-black font-bold" : "border-white/10 text-neutral-400"}`}>Static</button>
                <button onClick={() => updateArt("behavior", "PROGRESSIVE_PEN_DRAW")} className={`py-1.5 border text-[7.5px] rounded ${artConfig.behavior === "PROGRESSIVE_PEN_DRAW" ? "bg-white text-black font-bold" : "border-white/10 text-neutral-400"}`}>Pen Draw</button>
                <button onClick={() => updateArt("behavior", "OPTICAL_LIGHT_GLIDE")} className={`py-1.5 border text-[7.5px] rounded ${artConfig.behavior === "OPTICAL_LIGHT_GLIDE" ? "bg-white text-black font-bold" : "border-white/10 text-neutral-400"}`}>Light Glide</button>
             </div>
             <input type="text" value={animPromptInput} onChange={(e) => setAnimPromptInput(e.target.value)} onKeyDown={(e) => { if(e.key==='Enter') handleApplyPrompt() }} placeholder="Type 'scream' or 'wall' for grotesque warp..." className="w-full bg-black/75 border border-white/15 px-2 py-1.5 text-[9.5px] text-white rounded-lg focus:outline-none" />
             <button onClick={() => handleApplyPrompt()} className="w-full mt-1 bg-white/15 py-1.5 hover:bg-white hover:text-black rounded-lg transition-all">Apply Prompt</button>
          </div>

          <div>
             <div className="flex justify-between items-center text-neutral-400 mb-1.5">
               <span>2. Canvas Backdrop:</span>
               <button onClick={() => updateArt("posterFrame", !artConfig.posterFrame)} className={`px-2 py-0.5 rounded border text-[7.5px] transition-all ${artConfig.posterFrame ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10" : "border-white/15 text-neutral-400"}`}>Poster Frame</button>
             </div>
             <div className="grid grid-cols-6 gap-1">
               {(
                 [
                   { id: "OBSIDIAN", label: "Obsidian", col: "#040308" },
                   { id: "VOID_BLACK", label: "Void", col: "#000000" },
                   { id: "MIDNIGHT", label: "Midnight", col: "#060e1e" },
                   { id: "VELVET_NOIR", label: "Velvet", col: "#14050b" },
                   { id: "ARCHIVAL_PAPER", label: "Paper", col: "#e8dcc4" },
                   { id: "WALL_BRICKS", label: "Wall", col: "#a3a3a3" },
                 ] as { id: CanvasBackdrop; label: string; col: string }[]
               ).map((bd) => (
                 <button key={bd.id} type="button" onClick={() => updateArt("backdrop", bd.id)} className={`py-1.5 px-1 rounded-lg border text-[7px] flex flex-col items-center justify-center gap-1 transition-all ${artConfig.backdrop === bd.id ? "bg-white text-black border-white font-bold" : "bg-black/45 text-neutral-300 border-white/10"}`}>
                   <span className="w-3 h-1 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: bd.col }} />
                   <span className="truncate">{bd.label}</span>
                 </button>
               ))}
             </div>
          </div>

          <div>
             <div className="text-neutral-400 mb-1.5">3. Master Editions (13 Styles):</div>
             <div className="grid grid-cols-3 gap-1.5">
               {(
                 [
                   { id: "SHINE_ON", label: "Shine On", dot: "linear-gradient(135deg,#38bdf8,#f59e0b)" },
                   { id: "PINK_FLOYD", label: "Pink Floyd", dot: "linear-gradient(135deg,#1e3a8a,#dc2626)" },
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
                 <button key={ed.id} type="button" onClick={() => updateArt("edition", ed.id)} className={`py-1.5 px-2 rounded-lg border text-[7.5px] tracking-wider flex items-center gap-1.5 transition-all ${artConfig.edition === ed.id ? "bg-white text-black border-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.25)]" : "bg-black/45 text-neutral-300 border-white/10 hover:border-white/30"}`}>
                   <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20" style={{ background: ed.dot }} />
                   <span className="truncate">{ed.label}</span>
                 </button>
               ))}
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-0.5">
             <div className="flex flex-col gap-0.5">
               <div className="flex justify-between text-neutral-400">
                 <span>Line Calibre (0.2px - 1.5px)</span>
                 <span className="text-white">{artConfig.strokeWeight.toFixed(2)}x</span>
               </div>
               <input type="range" min="0.2" max="2.0" step="0.05" value={artConfig.strokeWeight} onChange={(e) => updateArt("strokeWeight", parseFloat(e.target.value))} className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg" />
             </div>

             <div className="flex flex-col gap-0.5">
               <div className="flex justify-between text-neutral-400">
                 <span>Tonal Chiaroscuro Volume (XDoG)</span>
                 <span className="text-[#a855f7]">{Math.round(artConfig.tonalVolumeDepth * 100)}%</span>
               </div>
               <input type="range" min="0.0" max="0.98" step="0.02" value={artConfig.tonalVolumeDepth} onChange={(e) => updateArt("tonalVolumeDepth", parseFloat(e.target.value))} className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg" />
             </div>

             <div className="flex flex-col gap-0.5">
               <div className="flex justify-between text-neutral-400">
                 <span>Cleanliness & Noise Gate</span>
                 <span className="text-[#10b981]">{Math.round(artConfig.cleanlinessGate * 100)}%</span>
               </div>
               <input type="range" min="0.05" max="0.75" step="0.02" value={artConfig.cleanlinessGate} onChange={(e) => updateArt("cleanlinessGate", parseFloat(e.target.value))} className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg" />
             </div>

             <div className="flex flex-col gap-0.5">
               <div className="flex justify-between text-neutral-400">
                 <span>Ink Contrast & Glow</span>
                 <span className="text-[#fde047]">{Math.round(artConfig.contrastAndGlow * 100)}%</span>
               </div>
               <input type="range" min="0.1" max="1.0" step="0.02" value={artConfig.contrastAndGlow} onChange={(e) => updateArt("contrastAndGlow", parseFloat(e.target.value))} className="w-full accent-white cursor-pointer h-1 bg-white/10 rounded-lg" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
