"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость фазового сдвига и яркость сплайнов
  chaos: number;     // C: нелинейная турбулентность (распад формы в аттрактор)
  tone: number;      // H: угол хроматического вращения матрицы SO(3)
  structure: number; // St: сила гравитации контуров Собеля (четкость объекта)
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

interface VectorFieldGrid {
  size: number;
  gx: Float32Array;   // Градиент Собеля по X
  gy: Float32Array;   // Градиент Собеля по Y
  edge: Float32Array; // Сила контура |∇I|
  lum: Float32Array;  // Яркость точки
  r: Uint8Array;      // Нативный спектр R
  g: Uint8Array;      // Нативный спектр G
  b: Uint8Array;      // Нативный спектр B
  spawnPoints: number[]; // Индексы точек высокой энергии для рождения частиц
}

type ManifoldTopology = "OBJECT" | "CLIFFORD" | "CHLADNI" | "VORTEX";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const GRID_SIZE = 220;
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.55 + consonantRatio * 0.35, 0.35, 0.92);
  const chaos = clip((entropy / 4.5) * 0.35 + (((abs2 >> 4) % 100) / 100) * 0.2, 0.12, 0.55);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(0.68 + consonantRatio * 0.25, 0.65, 0.95);
  // Для режима отрисовки объекта стартовая симметрия C_1 (0.15), чтобы не дробить образ в снежинку
  const symmetry = 0.15;

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
// МАТЕМАТИЧЕСКИЙ ЭКСТРАКТОР ПОЛЯ СОБЕЛЯ И СПЕКТРА ОБЪЕКТА
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
  const rArr = new Uint8Array(s * s);
  const gArr = new Uint8Array(s * s);
  const bArr = new Uint8Array(s * s);
  const spawnPoints: number[] = [];

  if (!octx) {
    return { size: s, gx, gy, edge, lum, r: rArr, g: gArr, b: bArr, spawnPoints };
  }

  // Вписываем объект с сохранением пропорций по центру матрицы
  octx.fillStyle = "#000000";
  octx.fillRect(0, 0, s, s);
  const aspect = img.width / Math.max(1, img.height);
  let drawW = s;
  let drawH = s;
  if (aspect > 1) drawH = s / aspect;
  else drawW = s * aspect;
  const dx = (s - drawW) * 0.5;
  const dy = (s - drawH) * 0.5;
  octx.drawImage(img, dx, dy, drawW, drawH);

  const imgData = octx.getImageData(0, 0, s, s).data;

  for (let i = 0; i < s * s; i++) {
    const p = i * 4;
    const r = imgData[p];
    const g = imgData[p + 1];
    const b = imgData[p + 2];

    // Усиливаем хроматическую насыщенность спектра объекта
    const avg = (r + g + b) / 3;
    rArr[i] = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.65)));
    gArr[i] = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.65)));
    bArr[i] = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.65)));

    lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  }

  let maxEdge = 1e-5;
  for (let y = 1; y < s - 1; y++) {
    for (let x = 1; x < s - 1; x++) {
      const idx = y * s + x;
      // Ядро оператора Собеля 3x3
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

  for (let i = 0; i < s * s; i++) {
    edge[i] = clip(edge[i] / maxEdge);
    // Отбираем точки контуров и светотени для рождения частиц (Importance Sampling)
    if (edge[i] > 0.16 || (lum[i] > 0.22 && lum[i] < 0.88 && (i % 3 === 0))) {
      spawnPoints.push(i);
    }
  }

  return { size: s, gx, gy, edge, lum, r: rArr, g: gArr, b: bArr, spawnPoints };
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

  // Загрузка конкретного образа в векторное поле Собеля
  const loadVectorFieldFromUrl = useCallback((rawUrl: string, labelIdx: number, total: number) => {
    setFieldStatus("SOLVING SOBEL FIELD [" + String(labelIdx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const grid = buildSobelFieldFromImage(img);
      stateRef.current.field = grid;
      stateRef.current.needsClear = true;
      setFieldStatus("OBJECT LOCKED // " + String(grid.spawnPoints.length) + " VECTOR NODES");
    };
    img.onerror = () => {
      setFieldStatus("PURE PARAMETRIC MODE");
    };
    img.src = "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  // При смене запроса: считаем 5D-тензор и захватываем геометрии объектов из /api/search
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
          .map((item: any) => item.thumb || item.src || item.image_url)
          .filter((u: any) => typeof u === "string" && u.startsWith("http"))
          .slice(0, 12);

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

  // Кнопка Phase Shift: переключает следующий ракурс/объект или сдвигает фазу
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
  // ЯДРО ЧИСЛЕННОГО ИНТЕГРИРОВАНИЯ BARRETT (60 FPS, СПЛАЙНЫ + ЦВЕТ SO(3))
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 900;
    let height = 900;

    const PARTICLE_COUNT = 4200;
    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);
    const age = new Uint16Array(PARTICLE_COUNT);

    const spawnParticle = (i: number, field: VectorFieldGrid | null, time: number) => {
      if (field && field.spawnPoints.length > 0 && Math.random() < 0.88) {
        const randIdx = field.spawnPoints[Math.floor(Math.random() * field.spawnPoints.length)];
        const gxCoord = randIdx % field.size;
        const gyCoord = Math.floor(randIdx / field.size);
        px[i] = (gxCoord / field.size) * 2.0 - 1.0 + (Math.random() - 0.5) * 0.015;
        py[i] = (gyCoord / field.size) * 2.0 - 1.0 + (Math.random() - 0.5) * 0.015;
      } else {
        const r = Math.sqrt(((i + 0.5) / PARTICLE_COUNT)) * 0.92;
        const theta = 2 * Math.PI * i * PHI + time;
        px[i] = r * Math.cos(theta);
        py[i] = r * Math.sin(theta);
      }
      age[i] = Math.floor(Math.random() * 90);
    };

    const initParticles = () => {
      const f = stateRef.current.field;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        spawnParticle(i, f, stateRef.current.time);
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

        // Затухание шлейфа: чем выше Structure, тем дольше держатся мазки кисти
        ctx.globalCompositeOperation = "source-over";
        const fadeAlpha = 0.012 + (1.0 - t.structure) * 0.035;
        ctx.fillStyle = "rgba(2, 1, 4, " + String(fadeAlpha.toFixed(4)) + ")";
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "lighter";

        const dt = 0.0025 * (0.4 + t.energy * 1.3);
        s.time += dt;
        const time = s.time;

        // Порядок симметрии C_k: при низком ползунке (<0.25) = 1 (реальный портрет объекта без размножения)
        const symOrders = [1, 1, 2, 4, 6, 8, 12];
        const symIdx = Math.min(symOrders.length - 1, Math.floor(t.symmetry * symOrders.length));
        const symmetryFold = symOrders[symIdx];

        const cx = width * 0.5;
        const cy = height * 0.5;
        const scale = Math.min(width, height) * 0.44;

        const aMod = c.alpha + Math.sin(time * 1.2) * (0.2 + t.chaos * 0.4);
        const bMod = c.beta + Math.cos(time * 1.1 * PHI) * (0.2 + t.chaos * 0.4);
        const gMod = c.gamma + Math.sin(time * 0.7) * 0.2;
        const dMod = c.delta + Math.cos(time * 0.9) * 0.2;

        // Угол вращения цветовой матрицы SO(3) (как в Кислоте Шиле)
        const thetaColor = t.tone * Math.PI * 2.0;
        const cosT = Math.cos(thetaColor);
        const sinT = Math.sin(thetaColor);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          let x = px[i];
          let y = py[i];
          const prevX = x;
          const prevY = y;

          let vx = 0;
          let vy = 0;

          // Считываем локальные свойства объекта в точке (x, y)
          let localEdge = 0;
          let localLum = 0.5;
          let objR = 168, objG = 85, objB = 247;
          let gradX = 0, gradY = 0;

          if (field) {
            const gxIdx = Math.min(field.size - 1, Math.max(0, Math.floor(((x + 1.0) * 0.5) * field.size)));
            const gyIdx = Math.min(field.size - 1, Math.max(0, Math.floor(((y + 1.0) * 0.5) * field.size)));
            const cell = gyIdx * field.size + gxIdx;
            localEdge = field.edge[cell];
            localLum = field.lum[cell];
            gradX = field.gx[cell];
            gradY = field.gy[cell];
            objR = field.r[cell];
            objG = field.g[cell];
            objB = field.b[cell];
          }

          // 1. Базовая математическая турбулентность (Клиффорд / Хладни / Вихрь)
          let mathVx = 0;
          let mathVy = 0;

          if (s.topology === "CHLADNI") {
            const n = c.nHarmonic + Math.floor(t.structure * 3);
            const m = c.mHarmonic + Math.floor(t.chaos * 3);
            const w1 = Math.cos(time * 1.8);
            const w2 = Math.sin(time * 1.8 / PHI);
            const eps = 0.015;
            const pot = (xx: number, yy: number) =>
              Math.abs(
                w1 * Math.sin(Math.PI * n * xx) * Math.sin(Math.PI * m * yy) +
                w2 * Math.sin(Math.PI * m * xx) * Math.sin(Math.PI * n * yy)
              );
            const p0 = pot(x, y);
            mathVx = -((pot(x + eps, y) - p0) / eps) * 0.012 - y * 0.003;
            mathVy = -((pot(x, y + eps) - p0) / eps) * 0.012 + x * 0.003;
          } else if (s.topology === "VORTEX") {
            const r = Math.sqrt(x * x + y * y) + 1e-5;
            const angle = Math.atan2(y, x);
            const wave = Math.sin(angle * c.nHarmonic + time * 3.0) * Math.cos(r * Math.PI * c.mHarmonic - time * 2.0);
            const radial = (0.55 + 0.3 * wave - r) * 0.05;
            const tangent = 0.012 * (0.5 + t.energy);
            mathVx = Math.cos(angle) * radial - Math.sin(angle) * tangent;
            mathVy = Math.sin(angle) * radial + Math.cos(angle) * tangent;
          } else {
            // CLIFFORD / OBJECT TURBULENCE
            const nextX = Math.sin(aMod * y) + gMod * Math.cos(aMod * x);
            const nextY = Math.sin(bMod * x) + dMod * Math.cos(bMod * y);
            mathVx = (nextX * 0.48 - x) * 0.06;
            mathVy = (nextY * 0.48 - y) * 0.06;
          }

          // 2. Оптическая гравитация Собеля (Отрисовка контуров и объема объекта)
          if (field && (s.topology === "OBJECT" || t.structure > 0.4)) {
            // Касательный вектор вдоль контура (-gradY, gradX) + притяжение к хребту контура
            const tangentX = -gradY;
            const tangentY = gradX;
            const pullStrength = (1.0 - localEdge) * 0.014 * t.structure;
            const flowStrength = (0.005 + localEdge * 0.014) * (0.5 + t.energy);

            const dir = (i % 2 === 0) ? 1 : -1;
            const objVx = tangentX * flowStrength * dir + gradX * pullStrength;
            const objVy = tangentY * flowStrength * dir + gradY * pullStrength;

            const blendObj = s.topology === "OBJECT" ? clip(t.structure * 1.15 - t.chaos * 0.55, 0.15, 0.96) : t.structure * 0.55;
            vx = objVx * blendObj + mathVx * (1.0 - blendObj + t.chaos * 0.6);
            vy = objVy * blendObj + mathVy * (1.0 - blendObj + t.chaos * 0.6);
          } else {
            vx = mathVx * (0.6 + t.energy);
            vy = mathVy * (0.6 + t.energy);
          }

          x += vx;
          y += vy;
          age[i]++;

          const maxAge = field ? Math.floor(45 + t.structure * 75) : 140;
          if (x * x + y * y > 1.38 || age[i] > maxAge || isNaN(x) || isNaN(y)) {
            spawnParticle(i, field, time);
            continue;
          }

          px[i] = x;
          py[i] = y;

          // 3. ПОЛИХРОМНАЯ АЛХИМИЯ ЦВЕТА (Нативный спектр объекта + Матрица поворота SO(3) + Гармоники)
          const speed = Math.sqrt(vx * vx + vy * vy);
          let finalR = objR;
          let finalG = objG;
          let finalB = objB;

          if (!field || (objR < 18 && objG < 18 && objB < 18)) {
            // Если точка в глубокой тени или режим без объекта — генерируем квантовую палитру золотого сечения
            const phase = (i * 0.015 * PHI) + time * 2.0 + speed * 35.0;
            finalR = Math.round(135 + 120 * Math.sin(phase));
            finalG = Math.round(135 + 120 * Math.sin(phase + 2.094));
            finalB = Math.round(135 + 120 * Math.sin(phase + 4.188));
          } else if (t.tone > 0.04) {
            // Хроматическое вращение спектра через SO(3) матрицу
            const nr = objR / 255.0;
            const ng = objG / 255.0;
            const nb = objB / 255.0;
            const rr = nr * cosT - ng * sinT + nb * sinT * 0.5;
            const gg = nr * sinT + ng * cosT - nb * sinT * 0.5;
            const bb = -nr * sinT * 0.5 + ng * sinT + nb * cosT;
            finalR = Math.min(255, Math.max(30, Math.round(rr * 255)));
            finalG = Math.min(255, Math.max(30, Math.round(gg * 255)));
            finalB = Math.min(255, Math.max(30, Math.round(bb * 255)));
          }

          const edgeBoost = field ? (0.35 + localEdge * 0.85 + localLum * 0.35) : 0.75;
          const alpha = clip((0.08 + t.energy * 0.24) * edgeBoost, 0.04, 0.62);
          const strokeWidth = field && localEdge > 0.45 ? 1.65 : 1.15;

          ctx.strokeStyle =
            "rgba(" +
            String(finalR) +
            "," +
            String(finalG) +
            "," +
            String(finalB) +
            "," +
            String(alpha.toFixed(3)) +
            ")";
          ctx.lineWidth = strokeWidth;

          const rPrev = Math.sqrt(prevX * prevX + prevY * prevY) * scale;
          const thetaPrev = Math.atan2(prevY, prevX);
          const rCurr = Math.sqrt(x * x + y * y) * scale;
          const thetaCurr = Math.atan2(y, x);

          for (let k = 0; k < symmetryFold; k++) {
            const rot = (k * 2 * Math.PI) / symmetryFold;
            const x0 = cx + Math.cos(thetaPrev + rot) * rPrev;
            const y0 = cy + Math.sin(thetaPrev + rot) * rPrev;
            const x1 = cx + Math.cos(thetaCurr + rot) * rCurr;
            const y1 = cy + Math.sin(thetaCurr + rot) * rCurr;

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
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
            {(["OBJECT", "CLIFFORD", "CHLADNI", "VORTEX"] as ManifoldTopology[]).map((mode) => (
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
                { key: "energy", label: "Energy (Spline Velocity)" },
                { key: "chaos", label: "Chaos (Madcap Turbulence)" },
                { key: "tone", label: "Tone (SO3 Color Rotation)" },
                { key: "structure", label: "Structure (Sobel Object Lock)" },
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
            <div>∇I(x,y) = (∂I/∂x, ∂I/∂y) [Sobel Gravity]</div>
            <div>dx/dt = -∂I/∂y·St + [sin(α·y) + γ·cos(α·x)]·C</div>
            <div>RGB&apos; = SO(3, θ_tone) · RGB(x,y)</div>
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
