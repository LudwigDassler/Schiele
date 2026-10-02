"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: фазовая скорость волн и частота импульсов
  chaos: number;     // C: амплитуда нелинейной турбулентности и хроматической дисперсии
  tone: number;      // H: угол поворота цветовой матрицы SO(3)
  structure: number; // St: рельефность граней Собеля и плотность линий
  symmetry: number;  // Sy: зеркальная/калейдоскопическая складка пространства
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
}

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  lum: Float32Array;
  edge: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  mask: Float32Array; // Косинусная маска плавного растворения краев в пустоте
  spawnIndices: number[];
}

type ManifoldTopology = "ACID" | "ENGRAVE" | "SILK" | "GLYPH";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const MATRIX_RES = 460;
const SILK_COUNT = 4200;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "≡", "≈"];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

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
  const clean = (rawText || "JOY DIVISION").trim().toLowerCase();
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.45 + 0.35, 0.35, 0.85);
  const chaos = clip((entropy / 4.5) * 0.22 + 0.12, 0.12, 0.42);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(0.78 + consonantRatio * 0.18, 0.75, 0.95);
  const symmetry = 0.05;

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
// ДЕКОДИРОВАНИЕ ОПТИЧЕСКОЙ МАТРИЦЫ + МАСКА РАСТВОРЕНИЯ КРАЕВ
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
  const mask = new Float32Array(total);
  const spawnIndices: number[] = [];

  if (!octx) {
    return { w, h, rgba: new Uint8ClampedArray(total * 4), lum, edge, gx, gy, mask, spawnIndices };
  }

  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rgba = octx.getImageData(0, 0, w, h).data;

  // Косинусная виньетка (убирает жесткую прямоугольную рамку вокруг картинки)
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2.0 - 1.0;
    const wy = ny * ny > 0.64 ? Math.max(0, Math.cos(((Math.abs(ny) - 0.8) / 0.2) * (Math.PI * 0.5))) : 1.0;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2.0 - 1.0;
      const wx = nx * nx > 0.64 ? Math.max(0, Math.cos(((Math.abs(nx) - 0.8) / 0.2) * (Math.PI * 0.5))) : 1.0;
      const i = y * w + x;
      const mVal = wx * wy;
      mask[i] = mVal;

      const p = i * 4;
      lum[i] = ((0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) / 255.0) * mVal;
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
    }
  }

  for (let i = 0; i < total; i++) {
    edge[i] = clip(edge[i] / maxEdge);
    if (edge[i] > 0.14 || lum[i] > 0.22) {
      spawnIndices.push(i);
    }
  }

  return { w, h, rgba, lum, edge, gx, gy, mask, spawnIndices };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialData = compileLexicalManifold(query || "JOY DIVISION");
  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("ACID");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("SYNTHESIZING MANIFOLD...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    topology: "ACID" as ManifoldTopology,
    matrix: null as MatrixBuffer | null,
    time: 0,
    needsSilkReset: true,
    isPaused: false,
  });

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("DECODING OPTICAL MATRIX [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img);
      stateRef.current.matrix = buf;
      stateRef.current.needsSilkReset = true;
      setFieldStatus(
        "MATRIX LOCKED // " + String(buf.w) + "x" + String(buf.h) + " SOBEL FIELD"
      );
    };
    img.onerror = () => {
      setFieldStatus("PARAMETRIC WAVE SYNTHESIS");
    };
    img.src = "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  useEffect(() => {
    const cleanQ = (query || "JOY DIVISION").trim();
    const next = compileLexicalManifold(cleanQ);
    setTensor(next.tensor);
    setCoeffs(next.coeffs);
    stateRef.current.tensor = next.tensor;
    stateRef.current.coeffs = next.coeffs;
    stateRef.current.matrix = null;

    let cancelled = false;
    setFieldStatus("SCANNING VISUAL TARGETS...");

    fetch("/api/search?page=1&query=" + encodeURIComponent(cleanQ))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const arr = Array.isArray(data) ? data : (data.data || data.photos || []);
        const urls = arr
          .map((item: any) => item.src || item.image_url || item.thumb)
          .filter((u: any) => typeof u === "string" && u.startsWith("http"))
          .slice(0, 10);

        if (urls.length > 0) {
          setCandidateUrls(urls);
          setCandidateIdx(0);
          loadMatrixFromUrl(urls[0], 0, urls.length);
        } else {
          setFieldStatus("NO EXTERNAL TARGET // PARAMETRIC SYNTH");
        }
      })
      .catch(() => {
        if (!cancelled) setFieldStatus("PARAMETRIC SYNTHESIS MODE");
      });

    return () => {
      cancelled = true;
    };
  }, [query, loadMatrixFromUrl]);

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

    // Пул шелковых частиц для режима SILK
    const silkParticles: SilkParticle[] = [];
    for (let i = 0; i < SILK_COUNT; i++) {
      silkParticles.push({ x: 0.5, y: 0.5, x0: 0.5, y0: 0.5, age: 0, maxAge: 60 });
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
            age: Math.floor(Math.random() * 50),
            maxAge: 45 + Math.floor(Math.random() * 55),
          };
        } else {
          const u = Math.random();
          const v = Math.random();
          silkParticles[i] = { x: u, y: v, x0: u, y0: v, age: 0, maxAge: 70 };
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
        s.time += 0.016 * (0.35 + t.energy * 1.4);
      }
      const time = s.time;

      if (m && s.needsSilkReset) {
        resetSilkParticles(m);
        s.needsSilkReset = false;
      }

      // Для режима SILK используем плавное затухание шлейфа, для остальных — полную очистку кадра
      if (s.topology === "SILK" && m) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(2, 1, 4, 0.065)";
        ctx.fillRect(0, 0, viewW, viewH);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#020104";
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // Пока матрица грузится — рисуем параметрический резонанс Лиссажу
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

      const pad = 28;
      const availW = viewW - pad * 2;
      const availH = viewH - 115;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.45;

      const theta = t.tone * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // ==========================================
      // РЕЖИМ 1: ACID (ОПТИЧЕСКИЙ МОРФИНГ + ФАЗОВЫЙ ПУЛЬС СОБЕЛЯ + ВИНЬЕТКА)
      // ==========================================
      if (s.topology === "ACID" && acidCtx) {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const waveAmp = t.chaos * 16.0;
        const freq1 = 0.022 * c.nHarmonic;
        const freq2 = 0.022 * c.mHarmonic;
        const rgbSplit = t.chaos * 10.0 + t.energy * 2.5;
        const edgeGlowBoost = t.structure * 210.0;
        const foldMirror = t.symmetry > 0.5;

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

            // Смещение вдоль нормалей Собеля + гармоническая волна
            const radialRipple = Math.sin(radDist * 18.0 - time * 3.2) * waveAmp * 0.45;
            const sx = clip(srcXBase + rowWaveX + m.gx[baseIdx] * radialRipple, 0, m.w - 1);
            const sy = clip(y + Math.cos(srcXBase * freq2 + time * 1.9) * waveAmp * 0.75 + m.gy[baseIdx] * radialRipple, 0, m.h - 1);

            const sxI = Math.floor(sx);
            const syI = Math.floor(sy);
            const sxR = Math.min(m.w - 1, Math.max(0, Math.floor(sx + rgbSplit)));
            const sxB = Math.min(m.w - 1, Math.max(0, Math.floor(sx - rgbSplit)));

            const idx = syI * m.w + sxI;
            const pG = idx * 4;
            const pR = (syI * m.w + sxR) * 4;
            const pB = (syI * m.w + sxB) * 4;

            let r = src[pR];
            let g = src[pG + 1];
            let b = src[pB + 2];

            if (t.tone > 0.03) {
              const avg = (r + g + b) * 0.333;
              const dr = r - avg;
              const dg = g - avg;
              const db = b - avg;
              if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 14) {
                const lNorm = m.lum[idx];
                const ph = theta + lNorm * Math.PI * 1.6 + radDist * 2.0;
                r = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph)))));
                g = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph + 2.094)))));
                b = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph + 4.188)))));
              } else {
                r = Math.min(255, Math.max(0, Math.round(avg + dr * cosT - dg * sinT)));
                g = Math.min(255, Math.max(0, Math.round(avg + dr * sinT + dg * cosT)));
                b = Math.min(255, Math.max(0, Math.round(avg + db * cosT + dr * sinT * 0.5)));
              }
            }

            // Бегущий фазовый импульс вдоль контуров Собеля
            const eVal = m.edge[idx];
            if (eVal > 0.12) {
              const travelingWave = 0.55 + 0.45 * Math.sin(radDist * 22.0 - time * 4.5);
              const glow = eVal * edgeGlowBoost * travelingWave;
              r = Math.min(255, r + Math.round(glow * (0.75 + 0.25 * Math.cos(theta))));
              g = Math.min(255, g + Math.round(glow * (0.35 + 0.45 * Math.sin(theta))));
              b = Math.min(255, b + Math.round(glow));
            }

            const outP = baseIdx * 4;
            dst[outP] = Math.round(r * vMask);
            dst[outP + 1] = Math.round(g * vMask);
            dst[outP + 2] = Math.round(b * vMask);
            dst[outP + 3] = 255;
          }
        }

        acidCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 2: ENGRAVE (JOY DIVISION / PULSAR CP 1919 TOPOGRAPHY С ПЕРЕКРЫТИЕМ ЛИНИЙ)
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        ctx.globalCompositeOperation = "source-over";
        const numLines = Math.floor(85 + t.structure * 50);
        const numCols = 180;
        const maxElevation = (drawH / numLines) * (3.2 + t.structure * 3.5);

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          ctx.beginPath();
          ctx.moveTo(ox, baseScreenY + 4);

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const uNorm = cIdx / (numCols - 1);
            const sx = Math.min(m.w - 1, Math.floor(uNorm * m.w));
            const cell = sy * m.w + sx;

            const l = m.lum[cell];
            const e = m.edge[cell];
            const vMask = m.mask[cell];

            // Высокочастотная пульсация на контурах и ярких областях объекта
            const carrierFreq = 28.0 + e * 55.0;
            const vibration =
              Math.sin(uNorm * carrierFreq + time * 4.5 + rIdx * 0.55) *
              (e * 0.55 + l * 0.25 + t.chaos * 0.25) *
              vMask;

            const elevation = (l * 0.82 + e * 0.48 + vibration * 0.45) * maxElevation * vMask;
            const px = ox + uNorm * drawW;
            const py = baseScreenY - elevation;

            ctx.lineTo(px, py);
          }

          ctx.lineTo(ox + drawW, baseScreenY + 4);
          ctx.closePath();

          // Черная заливка под гребнем волны перекрывает задние волны (эффект Unknown Pleasures)
          ctx.fillStyle = "#020104";
          ctx.fill();

          const hue = Math.floor((t.tone * 360 + vNorm * 95 + time * 10) % 360);
          ctx.strokeStyle =
            t.tone < 0.06
              ? "rgba(240, 240, 250, 0.88)"
              : "hsla(" + String(hue) + ", 85%, 72%, 0.88)";
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 3: SILK (ШЕЛКОВЫЕ ПОТОКИ ВДОЛЬ КАСАТЕЛЬНЫХ СОБЕЛЯ)
      // ==========================================
      else if (s.topology === "SILK") {
        ctx.globalCompositeOperation = "lighter";

        for (let i = 0; i < SILK_COUNT; i++) {
          const pt = silkParticles[i];
          const prevX = pt.x;
          const prevY = pt.y;

          const gxIdx = Math.min(m.w - 1, Math.max(0, Math.floor(pt.x * m.w)));
          const gyIdx = Math.min(m.h - 1, Math.max(0, Math.floor(pt.y * m.h)));
          const cell = gyIdx * m.w + gxIdx;

          const e = m.edge[cell];
          const l = m.lum[cell];
          const vMask = m.mask[cell];

          // Касательный вектор (-gy, gx) + возвратная пружина к якорю (x0, y0)
          const tx = -m.gy[cell];
          const ty = m.gx[cell];
          const curlAngle = Math.sin(pt.x * 12.0 + time * 2.0) * Math.cos(pt.y * 12.0 - time * 1.6) * Math.PI * t.chaos;
          const speed = (0.0025 + e * 0.0055) * (0.5 + t.energy);

          const dir = i % 2 === 0 ? 1 : -1;
          const vx =
            (tx * dir * Math.cos(curlAngle) - ty * dir * Math.sin(curlAngle)) * speed +
            (pt.x0 - pt.x) * (0.08 * t.structure);
          const vy =
            (ty * dir * Math.cos(curlAngle) + tx * dir * Math.sin(curlAngle)) * speed +
            (pt.y0 - pt.y) * (0.08 * t.structure);

          pt.x += vx;
          pt.y += vy;
          pt.age++;

          if (pt.age >= pt.maxAge || pt.x < 0.02 || pt.x > 0.98 || pt.y < 0.02 || pt.y > 0.98 || vMask < 0.05) {
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

          const p = cell * 4;
          const alpha = clip((0.12 + l * 0.35 + e * 0.45) * vMask, 0.05, 0.65);

          if (t.tone < 0.05) {
            ctx.strokeStyle =
              "rgba(" +
              String(Math.min(255, m.rgba[p] + 45)) +
              "," +
              String(Math.min(255, m.rgba[p + 1] + 45)) +
              "," +
              String(Math.min(255, m.rgba[p + 2] + 60)) +
              "," +
              String(alpha.toFixed(3)) +
              ")";
          } else {
            const hue = Math.floor((t.tone * 360 + l * 130 + e * 85 + (i % 30)) % 360);
            ctx.strokeStyle = "hsla(" + String(hue) + ", 85%, " + String(Math.floor(48 + l * 40)) + "%, " + String(alpha.toFixed(3)) + ")";
          }

          ctx.lineWidth = 0.9 + e * 1.3;
          ctx.beginPath();
          ctx.moveTo(ox + prevX * drawW, oy + prevY * drawH);
          ctx.lineTo(ox + pt.x * drawW, oy + pt.y * drawH);
          ctx.stroke();
        }
      }

      // ==========================================
      // РЕЖИМ 4: GLYPH (ПОТОКОВОЕ ПОЛЕ МАТЕМАТИЧЕСКИХ ОПЕРАТОРОВ С ВИНЬЕТКОЙ)
      // ==========================================
      else if (s.topology === "GLYPH") {
        ctx.globalCompositeOperation = "lighter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(52 + t.structure * 32);
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
            if ((l < 0.09 && e < 0.11) || vMask < 0.08) continue;

            // Смещение вдоль касательных Собеля + фазовая волна
            const phase = u * 10.0 + v * 10.0 - time * 3.2;
            const shiftX = (-m.gy[idx] * Math.sin(phase) * 5.0) * (0.3 + t.chaos);
            const shiftY = (m.gx[idx] * Math.cos(phase) * 5.0) * (0.3 + t.chaos);

            const glyphIdx = Math.floor((l * 9 + e * 6 + time * 1.8 + (r * 3 + cIdx) * 0.2) % MATH_GLYPHS.length);
            const ch = MATH_GLYPHS[glyphIdx];

            const fontSize = Math.max(7, Math.floor(cellW * (0.55 + l * 0.65 + e * 0.45) * vMask));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            const alpha = clip((0.2 + l * 0.72 + e * 0.45) * vMask, 0.05, 0.95);
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
      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT */}
      <div
        ref={containerRef}
        className="lg:col-span-8 relative h-[560px] md:h-[700px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* ВЕРХНИЙ ТЕЛЕМЕТРИЧЕСКИЙ ОВЕРЛЕЙ */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-2">
          <div className="bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300">
            <div className="text-white font-bold">BARRETT PRISM // {(query || "JOY DIVISION").toUpperCase()}</div>
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

        {/* ЛЕНТА ВЫБОРА МАТРИЦЫ + ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ СИНТЕЗА */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2.5">
          {candidateUrls.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-2 bg-black/75 backdrop-blur-md rounded-xl border border-white/10 self-center max-w-full">
              <span className="font-mono text-[8px] text-neutral-400 uppercase tracking-widest px-1 shrink-0">
                Matrix:
              </span>
              {candidateUrls.slice(0, 8).map((u, idx) => (
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
                      ? "border-[#a855f7] scale-105 shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                      : "border-white/15 opacity-50 hover:opacity-100")
                  }
                >
                  <img src={u} alt="matrix" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-white/10">
              {(["ACID", "ENGRAVE", "SILK", "GLYPH"] as ManifoldTopology[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTopology(mode);
                    if (mode === "SILK") stateRef.current.needsSilkReset = true;
                  }}
                  className={
                    "px-3 py-1 rounded-full font-mono text-[9px] tracking-widest uppercase transition-all cursor-pointer " +
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
                { key: "energy", label: "Energy (Wave Frequency)" },
                { key: "chaos", label: "Chaos (Spatial Warp & RGB Split)" },
                { key: "tone", label: "Tone (SO3 Spectrum Shift)" },
                { key: "structure", label: "Structure (Sobel Relief)" },
                { key: "symmetry", label: "Symmetry (Mirror Fold)" },
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
            <div>u&apos;(x,y,t) = x + A_chaos · sin(ω_n·y + t) + ∂I/∂x</div>
            <div>W_pulsar(x,y) = Lum(x,y)·St + |∇I|·sin(ω·x + t)</div>
            <div>I_out = Mask_cos(x,y) · SO(3, θ) · I(u&apos;, v&apos;)</div>
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
