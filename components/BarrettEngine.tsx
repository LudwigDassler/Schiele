"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость течения вдоль контуров и частота волн
  chaos: number;     // C: отрыв от якорей Гука (распад объекта в вихрь)
  tone: number;      // H: сдвиг спектральной фазы и полихромной палитры
  structure: number; // St: жесткость пружин Гука (точность прорисовки объекта)
  symmetry: number;  // Sy: порядок калейдоскопической группы вращений C_k
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

interface AnchorPoint {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  edge: number;
  lum: number;
  hue: number;
  sat: number;
}

interface VectorFieldGrid {
  size: number;
  gx: Float32Array;
  gy: Float32Array;
  edge: Float32Array;
  lum: Float32Array;
  hue: Float32Array;
  sat: Float32Array;
  anchors: AnchorPoint[];
}

type ManifoldTopology = "OBJECT" | "WAVE" | "CLIFFORD" | "CHLADNI";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const GRID_SIZE = 300;
const PARTICLE_COUNT = 8500;
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

function rgbToHs(r: number, g: number, b: number): [number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d < 0.001) return [0, 0];

  const l = (max + min) * 0.5;
  const s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h / 6) * 360, clip(s)];
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.45 + 0.35, 0.35, 0.85);
  // Низкий стартовый хаос, чтобы объект сразу читался идеально четко
  const chaos = clip((entropy / 4.5) * 0.18 + 0.06, 0.06, 0.28);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(0.82 + consonantRatio * 0.14, 0.80, 0.96);
  const symmetry = 0.10;

  const alpha = Number((Math.sin(abs1 * 0.001 * PHI) * 2.2 + (energy - 0.5)).toFixed(4));
  const beta = Number((Math.cos(abs2 * 0.001 * PHI) * 2.2 - (chaos - 0.5)).toFixed(4));
  const gamma = Number((Math.sin((abs1 ^ abs2) * 0.002) * 1.8 + (structure - 0.5)).toFixed(4));
  const delta = Number((Math.cos((abs1 + abs2) * 0.002) * 1.8 + (symmetry - 0.5)).toFixed(4));

  const nHarmonic = 1 + (abs1 % 7);
  let mHarmonic = 2 + (abs2 % 7);
  if (mHarmonic === nHarmonic) mHarmonic = (mHarmonic % 8) + 1;

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
// ПОСТРОЕНИЕ МАТРИЦЫ СОБЕЛЯ + УПРУГИХ ЯКОРЕЙ ГУКА
// ==========================================
function buildSobelFieldFromImage(img: HTMLImageElement): VectorFieldGrid {
  const s = GRID_SIZE;
  const offCanvas = document.createElement("canvas");
  offCanvas.width = s;
  offCanvas.height = s;
  const octx = offCanvas.getContext("2d");

  const gx = new Float32Array(s * s);
  const gy = new Float32Array(s * s);
  const edge = new Float32Array(s * s);
  const lum = new Float32Array(s * s);
  const hue = new Float32Array(s * s);
  const sat = new Float32Array(s * s);
  const anchors: AnchorPoint[] = [];

  if (!octx) {
    return { size: s, gx, gy, edge, lum, hue, sat, anchors };
  }

  octx.fillStyle = "#000000";
  octx.fillRect(0, 0, s, s);
  const aspect = img.width / Math.max(1, img.height);
  let drawW = s * 0.92;
  let drawH = s * 0.92;
  if (aspect > 1) drawH = drawW / aspect;
  else drawW = drawH * aspect;
  const dx = (s - drawW) * 0.5;
  const dy = (s - drawH) * 0.5;
  octx.drawImage(img, dx, dy, drawW, drawH);

  const imgData = octx.getImageData(0, 0, s, s).data;

  // Автоконтраст яркости + мягкое окно Ханна на краях (убирает серый квадрат)
  let minL = 1.0;
  let maxL = 0.0;
  const rawLum = new Float32Array(s * s);

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = y * s + x;
      const p = i * 4;
      const r = imgData[p];
      const g = imgData[p + 1];
      const b = imgData[p + 2];

      const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      rawLum[i] = l;
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;

      const [hVal, sVal] = rgbToHs(r, g, b);
      hue[i] = hVal;
      sat[i] = sVal;
    }
  }

  const rangeL = Math.max(0.15, maxL - minL);
  for (let y = 0; y < s; y++) {
    const ny = (y / s) * 2.0 - 1.0;
    for (let x = 0; x < s; x++) {
      const nx = (x / s) * 2.0 - 1.0;
      const i = y * s + x;
      // Радиальное окно затухания на самых границах кадра
      const rDist = Math.sqrt(nx * nx + ny * ny);
      const windowMask = rDist > 0.92 ? clip(1.0 - (rDist - 0.92) / 0.12) : 1.0;
      lum[i] = clip(((rawLum[i] - minL) / rangeL) * windowMask);
    }
  }

  let maxEdge = 1e-5;
  for (let y = 1; y < s - 1; y++) {
    for (let x = 1; x < s - 1; x++) {
      const idx = y * s + x;
      const sx =
        -lum[(y - 1) * s + (x - 1)] + lum[(y - 1) * s + (x + 1)] +
        -2 * lum[y * s + (x - 1)] + 2 * lum[y * s + (x + 1)] +
        -lum[(y + 1) * s + (x - 1)] + lum[(y + 1) * s + (x + 1)];

      const sy =
        -lum[(y - 1) * s + (x - 1)] - 2 * lum[(y - 1) * s + x] - lum[(y - 1) * s + (x + 1)] +
        lum[(y + 1) * s + (x - 1)] + 2 * lum[(y + 1) * s + x] + lum[(y + 1) * s + (x + 1)];

      const mag = Math.sqrt(sx * sx + sy * sy);
      edge[idx] = mag;
      if (mag > maxEdge) maxEdge = mag;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
    }
  }

  // Формируем список кандидатов для якорей с весом важности (контуры + светлые детали)
  const candidates: { idx: number; weight: number }[] = [];
  for (let y = 2; y < s - 2; y++) {
    for (let x = 2; x < s - 2; x++) {
      const i = y * s + x;
      edge[i] = clip(edge[i] / maxEdge);
      const e = edge[i];
      const l = lum[i];

      // Отсекаем пустой темный фон, чтобы не было квадратной подложки
      const importance = e * 2.4 + (l > 0.18 ? l * 0.65 : 0);
      if (importance > 0.22) {
        candidates.push({ idx: i, weight: importance });
      }
    }
  }

  if (candidates.length > 0) {
    // Сортируем и равномерно выбираем PARTICLE_COUNT лучших структурных точек объекта
    for (let k = 0; k < PARTICLE_COUNT; k++) {
      // Комбинация детерминированного шага по золотому сечению и порога важности
      const cIdx = Math.floor(((k * PHI) % 1) * candidates.length);
      const cell = candidates[cIdx].idx;
      const cx = cell % s;
      const cy = Math.floor(cell / s);

      const x0 = (cx / s) * 2.0 - 1.0 + (Math.random() - 0.5) * (1.5 / s);
      const y0 = (cy / s) * 2.0 - 1.0 + (Math.random() - 0.5) * (1.5 / s);

      // Касательная к контуру Собеля (-gy, gx)
      let tx = -gy[cell];
      let ty = gx[cell];
      if (tx * tx + ty * ty < 0.01) {
        const ang = (k * PHI) * Math.PI * 2;
        tx = Math.cos(ang);
        ty = Math.sin(ang);
      }

      anchors.push({
        x0,
        y0,
        tx,
        ty,
        edge: edge[cell],
        lum: lum[cell],
        hue: hue[cell],
        sat: sat[cell],
      });
    }
  }

  return { size: s, gx, gy, edge, lum, hue, sat, anchors };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("OBJECT");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<string>("SYNTHESIZING VECTOR FIELD...");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [candidateIdx, setCandidateIdx] = useState<number>(0);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    topology: "OBJECT" as ManifoldTopology,
    field: null as VectorFieldGrid | null,
    time: 0,
    needsClear: true,
    isPaused: false,
  });

  const loadVectorFieldFromUrl = useCallback((rawUrl: string, labelIdx: number, total: number) => {
    setFieldStatus("SOLVING SOBEL MATRIX [" + String(labelIdx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const grid = buildSobelFieldFromImage(img);
      stateRef.current.field = grid;
      stateRef.current.needsClear = true;
      setFieldStatus("OBJECT LOCKED // " + String(grid.anchors.length) + " HOOKE-SOBEL NODES");
    };
    img.onerror = () => {
      setFieldStatus("PURE PARAMETRIC MODE");
    };
    img.src = "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  useEffect(() => {
    const cleanQ = (query || "SHINE ON CRAZY DIAMOND").trim();
    const next = compileLexicalManifold(cleanQ);
    setTensor(next.tensor);
    setCoeffs(next.coeffs);
    stateRef.current.tensor = next.tensor;
    stateRef.current.coeffs = next.coeffs;
    stateRef.current.field = null;
    stateRef.current.needsClear = true;

    let cancelled = false;
    setFieldStatus("SCANNING OBJECT TOPOLOGY...");

    fetch("/api/search?page=1&query=" + encodeURIComponent(cleanQ))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const arr = Array.isArray(data) ? data : (data.data || data.photos || []);
        const urls = arr
          .map((item: any) => item.src || item.image_url || item.thumb)
          .filter((u: any) => typeof u === "string" && u.startsWith("http"))
          .slice(0, 15);

        if (urls.length > 0) {
          setCandidateUrls(urls);
          setCandidateIdx(0);
          loadVectorFieldFromUrl(urls[0], 0, urls.length);
        } else {
          setFieldStatus("PURE PARAMETRIC MODE");
        }
      })
      .catch(() => {
        if (!cancelled) setFieldStatus("PURE PARAMETRIC MODE");
      });

    return () => {
      cancelled = true;
    };
  }, [query, loadVectorFieldFromUrl]);

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
      loadVectorFieldFromUrl(candidateUrls[nextIdx], nextIdx, candidateUrls.length);
    } else {
      stateRef.current.needsClear = true;
    }
  }, [candidateUrls, candidateIdx, loadVectorFieldFromUrl]);

  // ==========================================
  // ЯДРО РЕНДЕРИНГА BARRETT (60 FPS)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 900;
    let height = 900;

    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);

    const initParticles = () => {
      const f = stateRef.current.field;
      if (f && f.anchors.length > 0) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const a = f.anchors[i % f.anchors.length];
          px[i] = a.x0;
          py[i] = a.y0;
        }
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const r = Math.sqrt((i + 0.5) / PARTICLE_COUNT) * 0.9;
          const theta = 2 * Math.PI * i * PHI;
          px[i] = r * Math.cos(theta);
          py[i] = r * Math.sin(theta);
        }
      }
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect ? Math.max(320, Math.floor(rect.width)) : 900;
      height = rect ? Math.max(460, Math.floor(rect.height)) : 720;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#020104";
      ctx.fillRect(0, 0, width, height);
    };

    initParticles();
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const s = stateRef.current;

      if (s.needsClear) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#020104";
        ctx.fillRect(0, 0, width, height);
        initParticles();
        s.needsClear = false;
      }

      if (!s.isPaused) {
        const t = s.tensor;
        const c = s.coeffs;
        const field = s.field;

        const dt = 0.014 * (0.35 + t.energy * 1.3);
        s.time += dt;
        const time = s.time;

        const cx = width * 0.5;
        const cy = height * 0.5;
        const scale = Math.min(width, height) * 0.45;
        const toneDeg = t.tone * 360;

        // ==========================================
        // ТОПОЛОГИЯ 1: WAVE (ОСЦИЛЛОГРАФ ФУРЬЕ)
        // ==========================================
        if (s.topology === "WAVE" && field) {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "rgba(2, 1, 4, 0.28)";
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "lighter";

          const lines = 96;
          const cols = 150;

          for (let row = 0; row < lines; row++) {
            const ny = (row / (lines - 1)) * 2.0 - 1.0;
            const gyIdx = Math.min(field.size - 1, Math.max(0, Math.floor(((ny + 1.0) * 0.5) * field.size)));

            ctx.beginPath();
            for (let col = 0; col < cols; col++) {
              const nx = (col / (cols - 1)) * 2.0 - 1.0;
              const gxIdx = Math.min(field.size - 1, Math.max(0, Math.floor(((nx + 1.0) * 0.5) * field.size)));
              const cell = gyIdx * field.size + gxIdx;

              const l = field.lum[cell];
              const e = field.edge[cell];

              const freq = 18.0 + e * 45.0 * t.structure;
              const osc = Math.sin(nx * freq + time * 4.5 + row * 0.35);
              const chaosRipple = Math.cos(ny * 14.0 - time * 3.2) * t.chaos * 0.035;

              const dispY =
                -(l * 0.042 * t.structure) +
                osc * (e * 0.028 + l * 0.012) * (0.4 + t.energy) +
                chaosRipple;

              const drawX = cx + nx * scale;
              const drawY = cy + (ny + dispY) * scale;

              if (col === 0) ctx.moveTo(drawX, drawY);
              else ctx.lineTo(drawX, drawY);
            }

            const rowHue = Math.floor((toneDeg + (row / lines) * 150 + time * 12) % 360);
            ctx.strokeStyle = "hsla(" + String(rowHue) + ", 85%, 65%, 0.55)";
            ctx.lineWidth = 1.25;
            ctx.stroke();
          }

          animId = requestAnimationFrame(render);
          return;
        }

        // ==========================================
        // ТОПОЛОГИЯ 2: HOOKE-SOBEL OBJECT / CLIFFORD / CHLADNI
        // ==========================================
        ctx.globalCompositeOperation = "source-over";
        const fadeAlpha = s.topology === "OBJECT" ? (0.09 + (1.0 - t.structure) * 0.08) : 0.035;
        ctx.fillStyle = "rgba(2, 1, 4, " + String(fadeAlpha.toFixed(3)) + ")";
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "lighter";

        const symOrders = [1, 1, 2, 4, 6, 8, 12];
        const symIdx = Math.min(symOrders.length - 1, Math.floor(t.symmetry * symOrders.length));
        const symmetryFold = symOrders[symIdx];

        const aMod = c.alpha + Math.sin(time * 0.7) * 0.25;
        const bMod = c.beta + Math.cos(time * 0.6 * PHI) * 0.25;
        const gMod = c.gamma + Math.sin(time * 0.4) * 0.2;
        const dMod = c.delta + Math.cos(time * 0.5) * 0.2;

        const hasAnchors = field !== null && field.anchors.length > 0;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          let x = px[i];
          let y = py[i];
          const prevX = x;
          const prevY = y;

          let edgeVal = 0.5;
          let lumVal = 0.6;
          let baseHue = toneDeg;
          let baseSat = 0;

          if (hasAnchors && field && s.topology === "OBJECT") {
            const a = field.anchors[i % field.anchors.length];
            edgeVal = a.edge;
            lumVal = a.lum;
            baseHue = a.hue;
            baseSat = a.sat;

            // Гармоническое колебание вдоль касательной Собеля вокруг истинной координаты (x0, y0)
            const phase = i * PHI + time * (2.2 + t.energy * 3.5);
            const tangentSlide = Math.sin(phase) * (0.006 + edgeVal * 0.014) * (0.4 + t.energy);

            // Нелинейный аттрактор Клиффорда (активируется при увеличении ползунка CHAOS)
            const attX = Math.sin(aMod * y) + gMod * Math.cos(aMod * x);
            const attY = Math.sin(bMod * x) + dMod * Math.cos(bMod * y);

            // Целевая точка: точный якорь + скольжение по контуру + вихревой отрыв Хаоса
            const targetX = a.x0 + a.tx * tangentSlide + (attX * 0.45 - a.x0) * (t.chaos * t.chaos * 1.35);
            const targetY = a.y0 + a.ty * tangentSlide + (attY * 0.45 - a.y0) * (t.chaos * t.chaos * 1.35);

            // Сила упругости Гука возвращает частицу к контуру объекта
            const springK = 0.12 + t.structure * 0.32;
            x += (targetX - x) * springK;
            y += (targetY - y) * springK;
          } else if (s.topology === "CHLADNI") {
            const n = c.nHarmonic + Math.floor(t.structure * 3);
            const m = c.mHarmonic + Math.floor(t.chaos * 3);
            const w1 = Math.cos(time * 0.9);
            const w2 = Math.sin(time * 0.9 / PHI);
            const eps = 0.015;
            const pot = (xx: number, yy: number) =>
              Math.abs(
                w1 * Math.sin(Math.PI * n * xx) * Math.sin(Math.PI * m * yy) +
                w2 * Math.sin(Math.PI * m * xx) * Math.sin(Math.PI * n * yy)
              );
            const p0 = pot(x, y);
            x += -((pot(x + eps, y) - p0) / eps) * 0.012 - y * 0.003;
            y += -((pot(x, y + eps) - p0) / eps) * 0.012 + x * 0.003;
            if (x * x + y * y > 1.3) {
              x = (Math.random() - 0.5) * 1.6;
              y = (Math.random() - 0.5) * 1.6;
            }
          } else {
            // CLIFFORD
            const nextX = Math.sin(aMod * y) + gMod * Math.cos(aMod * x);
            const nextY = Math.sin(bMod * x) + dMod * Math.cos(bMod * y);
            x += (nextX * 0.45 - x) * (0.06 + t.energy * 0.08);
            y += (nextY * 0.45 - y) * (0.06 + t.energy * 0.08);
          }

          px[i] = x;
          py[i] = y;

          // ==========================================
          // ПОЛИХРОМНЫЙ СПЕКТРАЛЬНЫЙ СИНТЕЗ (БЕЗ СЕРОЙ ГРЯЗИ)
          // ==========================================
          let finalHue = 0;
          let finalSat = 85;
          let finalLight = 62;

          if (hasAnchors && baseSat > 0.14) {
            // Если исходник цветной — берем его родной оттенок и вращаем ползунком TONE
            finalHue = Math.floor((baseHue + toneDeg) % 360);
            finalSat = Math.min(96, Math.floor(60 + baseSat * 38));
            finalLight = Math.min(86, Math.floor(38 + lumVal * 44 + edgeVal * 15));
          } else {
            // Если исходник Ч/Б (или параметрический режим) — раскладываем яркость и контур в спектр
            finalHue = Math.floor((toneDeg + lumVal * 145 + edgeVal * 75 + (i % 35)) % 360);
            finalSat = Math.floor(78 + edgeVal * 20);
            finalLight = Math.min(90, Math.floor(42 + lumVal * 38 + edgeVal * 18));
          }

          const alpha = clip((0.14 + t.energy * 0.22) * (0.45 + edgeVal * 0.65 + lumVal * 0.3), 0.06, 0.55);

          ctx.strokeStyle =
            "hsla(" +
            String(finalHue) +
            ", " +
            String(finalSat) +
            "%, " +
            String(finalLight) +
            "%, " +
            String(alpha.toFixed(3)) +
            ")";
          ctx.lineWidth = edgeVal > 0.45 ? 1.55 : 1.15;

          // Отрисовка микро-сплайна (с учетом группы вращений C_k)
          const dxMove = x - prevX;
          const dyMove = y - prevY;
          const stepLen = Math.sqrt(dxMove * dxMove + dyMove * dyMove);

          // Если частица почти на месте — рисуем короткий касательный штрих вдоль контура
          let endX = x;
          let endY = y;
          if (stepLen < 0.004 && hasAnchors && field) {
            const a = field.anchors[i % field.anchors.length];
            const strokeLen = 0.007 + edgeVal * 0.012;
            endX = x + a.tx * strokeLen;
            endY = y + a.ty * strokeLen;
          }

          if (symmetryFold === 1) {
            ctx.beginPath();
            ctx.moveTo(cx + prevX * scale, cy + prevY * scale);
            ctx.lineTo(cx + endX * scale, cy + endY * scale);
            ctx.stroke();
          } else {
            const r0 = Math.sqrt(prevX * prevX + prevY * prevY) * scale;
            const th0 = Math.atan2(prevY, prevX);
            const r1 = Math.sqrt(endX * endX + endY * endY) * scale;
            const th1 = Math.atan2(endY, endX);

            for (let k = 0; k < symmetryFold; k++) {
              const rot = (k * 2 * Math.PI) / symmetryFold;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(th0 + rot) * r0, cy + Math.sin(th0 + rot) * r0);
              ctx.lineTo(cx + Math.cos(th1 + rot) * r1, cy + Math.sin(th1 + rot) * r1);
              ctx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
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
      <div className="lg:col-span-8 relative min-h-[520px] md:min-h-[680px] rounded-2xl overflow-hidden border border-white/10 bg-[#020104] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* ВЕРХНИЙ ТЕЛЕМЕТРИЧЕСКИЙ ОВЕРЛЕЙ */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-start pointer-events-none gap-2">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-neutral-300">
            <div className="text-white font-bold">BARRETT PRISM // {(query || "SHINE ON CRAZY DIAMOND").toUpperCase()}</div>
            <div className="text-[#a855f7] mt-0.5">{fieldStatus}</div>
            <div className="text-neutral-500 mt-0.5">
              α={coeffs.alpha} | β={coeffs.beta} | γ={coeffs.gamma} | δ={coeffs.delta}
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-md border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-widest text-right text-neutral-400">
            <div>SHANNON H(X): <span className="text-white">{coeffs.entropy} bits</span></div>
            <div>LYAPUNOV λ: <span className="text-[#10b981]">{coeffs.lyapunov}</span> | MODES ({coeffs.nHarmonic},{coeffs.mHarmonic})</div>
          </div>
        </div>

        {/* НИЖНИЙ ПЕРЕКЛЮЧАТЕЛЬ ТОПОЛОГИИ */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            {(["OBJECT", "WAVE", "CLIFFORD", "CHLADNI"] as ManifoldTopology[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setTopology(mode);
                  stateRef.current.needsClear = true;
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
              className="btn-elegant !bg-black/70 backdrop-blur-md"
            >
              {isPaused ? "Resume" : "Freeze"}
            </button>
            <button
              type="button"
              onClick={triggerPhaseShift}
              className="btn-elegant !bg-black/70 backdrop-blur-md"
              title="Switch to next object matrix & shift phase"
            >
              Phase Shift ({candidateUrls.length > 0 ? String(candidateIdx + 1) + "/" + String(candidateUrls.length) : "1/1"})
            </button>
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
                { key: "energy", label: "Energy (Tangent Velocity)" },
                { key: "chaos", label: "Chaos (Attractor Disruption)" },
                { key: "tone", label: "Tone (Spectral Phase)" },
                { key: "structure", label: "Structure (Hooke Spring Lock)" },
                { key: "symmetry", label: "Symmetry (Kaleidoscope C_k)" },
              ] as { key: keyof Tensor5D; label: string }[]
            ).map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
                <div className="flex justify-between text-neutral-400">
                  <span>{item.label}</span>
                  <span className="text-white">{tensor[item.key].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
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
            <div>F_hooke = -k_st · (r - r_0) + τ_sobel · sin(ωt)</div>
            <div>r_chaos = [sin(α·y) + γ·cos(α·x)] · C²</div>
            <div>HSL = Φ(∇I, Lum, θ_tone)</div>
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
