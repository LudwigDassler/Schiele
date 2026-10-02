"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость волн и частота фазового сдвига
  chaos: number;     // C: амплитуда деформации пространства и RGB-аберрации
  tone: number;      // H: сдвиг цветовой фазы спектра
  structure: number; // St: резкость контуров Собеля и детализация объекта
  symmetry: number;  // Sy: зеркальная/радиальная симметрия
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

interface MatrixBuffer {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  lum: Float32Array;
  edge: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
  nodes: { x: number; y: number; vx: number; vy: number; r: number; g: number; b: number; e: number }[];
}

type ManifoldTopology = "ACID" | "ENGRAVE" | "GLYPH" | "PLEXUS";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const MATRIX_RES = 480;
const MATH_GLYPHS = ["∑", "∫", "∂", "∇", "π", "λ", "Φ", "∆", "∞", "Ω", "ψ", "0", "1"];
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
  const clean = (rawText || "LED ZEPPELIN").trim().toLowerCase();
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
  const chaos = clip((entropy / 4.5) * 0.25 + 0.15, 0.15, 0.45);
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
// ДЕКОДИРОВАНИЕ ВЫСОКОТОЧНОЙ МАТРИЦЫ ОБЪЕКТА + ГРАДИЕНТЫ СОБЕЛЯ
// ==========================================
function buildMatrixFromImage(img: HTMLImageElement): MatrixBuffer {
  const aspect = img.width / Math.max(1, img.height);
  let w = MATRIX_RES;
  let h = MATRIX_RES;
  if (aspect > 1.25) {
    w = MATRIX_RES;
    h = Math.round(MATRIX_RES / Math.min(aspect, 1.6));
  } else if (aspect < 0.8) {
    h = MATRIX_RES;
    w = Math.round(MATRIX_RES * Math.max(aspect, 0.65));
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
  const nodes: MatrixBuffer["nodes"] = [];

  if (!octx) {
    return { w, h, rgba: new Uint8ClampedArray(total * 4), lum, edge, gx, gy, nodes };
  }

  // Заполняем кадр с сохранением пропорций (cover/contain гибрид)
  octx.fillStyle = "#020104";
  octx.fillRect(0, 0, w, h);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  octx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);

  const rgba = octx.getImageData(0, 0, w, h).data;

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    lum[i] = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) / 255.0;
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

      const mag = Math.sqrt(sx * sx + sy * sy);
      edge[idx] = mag;
      if (mag > maxEdge) maxEdge = mag;

      const norm = mag + 1e-6;
      gx[idx] = sx / norm;
      gy[idx] = sy / norm;
    }
  }

  for (let i = 0; i < total; i++) {
    edge[i] = clip(edge[i] / maxEdge);
  }

  // Собираем структурные узлы для режима PLEXUS
  const step = Math.max(4, Math.floor(Math.min(w, h) / 48));
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      const idx = y * w + x;
      if (edge[idx] > 0.18 || lum[idx] > 0.25) {
        const p = idx * 4;
        nodes.push({
          x: x / w,
          y: y / h,
          vx: -gy[idx],
          vy: gx[idx],
          r: rgba[p],
          g: rgba[p + 1],
          b: rgba[p + 2],
          e: edge[idx],
        });
      }
    }
  }

  return { w, h, rgba, lum, edge, gx, gy, nodes };
}

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialData = compileLexicalManifold(query || "LED ZEPPELIN");
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
    isPaused: false,
  });

  const loadMatrixFromUrl = useCallback((rawUrl: string, idx: number, total: number) => {
    setFieldStatus("DECODING OPTICAL MATRIX [" + String(idx + 1) + "/" + String(total) + "]...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const buf = buildMatrixFromImage(img);
      stateRef.current.matrix = buf;
      setFieldStatus(
        "MATRIX LOCKED // " + String(buf.w) + "x" + String(buf.h) + " SOBEL FIELD (" + String(buf.nodes.length) + " NODES)"
      );
    };
    img.onerror = () => {
      setFieldStatus("FALLBACK WAVE SYNTHESIS");
    };
    img.src = "/api/mutate?proxy=" + encodeURIComponent(rawUrl);
  }, []);

  useEffect(() => {
    const cleanQ = (query || "LED ZEPPELIN").trim();
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

    // Вспомогательный буфер для ACID MORPH
    const acidCanvas = document.createElement("canvas");
    const acidCtx = acidCanvas.getContext("2d");

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

    // ResizeObserver гарантирует, что после снятия display:none холст мгновенно обретет Retina-разрешение
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(container);
    updateSize();

    const render = () => {
      const s = stateRef.current;
      const t = s.tensor;
      const c = s.coeffs;
      const m = s.matrix;

      if (!s.isPaused) {
        s.time += 0.018 * (0.3 + t.energy * 1.4);
      }
      const time = s.time;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#020104";
      ctx.fillRect(0, 0, viewW, viewH);

      // Если матрица еще грузится — рисуем параметрическую фигуру Лиссажу-Хладни
      if (!m) {
        ctx.globalCompositeOperation = "lighter";
        const cx = viewW * 0.5;
        const cy = viewH * 0.5;
        const rad = Math.min(viewW, viewH) * 0.34;
        for (let l = 0; l < 45; l++) {
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

      // Вычисляем геометрии области отрисовки на холсте с сохранением пропорций объекта
      const pad = 32;
      const availW = viewW - pad * 2;
      const availH = viewH - 110;
      const scale = Math.min(availW / m.w, availH / m.h);
      const drawW = m.w * scale;
      const drawH = m.h * scale;
      const ox = (viewW - drawW) * 0.5;
      const oy = (viewH - drawH) * 0.46;

      // Поворот цветовой матрицы SO(3) от ползунка TONE
      const theta = t.tone * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // ==========================================
      // РЕЖИМ 1: ACID MORPH (ЖИВАЯ КИСЛОТА ШИЛЕ 60 FPS + НЕОН СОБЕЛЯ)
      // ==========================================
      if (s.topology === "ACID" && acidCtx) {
        if (acidCanvas.width !== m.w || acidCanvas.height !== m.h) {
          acidCanvas.width = m.w;
          acidCanvas.height = m.h;
        }
        const outImg = acidCtx.createImageData(m.w, m.h);
        const dst = outImg.data;
        const src = m.rgba;

        const waveAmpX = t.chaos * 22.0;
        const waveAmpY = t.chaos * 18.0;
        const freq1 = (0.025 * c.nHarmonic);
        const freq2 = (0.025 * c.mHarmonic);
        // Хроматический сдвиг каналов R и B
        const rgbSplit = Math.round(t.chaos * 12.0 + t.energy * 3.0);
        const edgeGlowBoost = t.structure * 190.0;
        const foldMirror = t.symmetry > 0.5;

        for (let y = 0; y < m.h; y++) {
          const waveX = Math.sin(y * freq1 + time * 2.4) * waveAmpX + Math.cos(y * freq2 - time * 1.7) * (waveAmpX * 0.4);
          for (let x = 0; x < m.w; x++) {
            const srcXBase = foldMirror && x > m.w / 2 ? m.w - 1 - x : x;
            const waveY = Math.cos(srcXBase * freq2 + time * 2.1) * waveAmpY;

            const sx = Math.min(m.w - 1, Math.max(0, Math.round(srcXBase + waveX)));
            const sy = Math.min(m.h - 1, Math.max(0, Math.round(y + waveY)));

            const sxR = Math.min(m.w - 1, Math.max(0, sx + rgbSplit));
            const sxB = Math.min(m.w - 1, Math.max(0, sx - rgbSplit));

            const idx = sy * m.w + sx;
            const pG = idx * 4;
            const pR = (sy * m.w + sxR) * 4;
            const pB = (sy * m.w + sxB) * 4;

            let r = src[pR];
            let g = src[pG + 1];
            let b = src[pB + 2];

            // Вращение цвета при сдвиге ползунка TONE
            if (t.tone > 0.03) {
              const avg = (r + g + b) * 0.333;
              const dr = r - avg;
              const dg = g - avg;
              const db = b - avg;
              // Если исходник Ч/Б — окрашиваем через спектральную фазу яркости
              if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 12) {
                const lNorm = m.lum[idx];
                const ph = theta + lNorm * Math.PI * 1.5;
                r = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph)))));
                g = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph + 2.094)))));
                b = Math.min(255, Math.max(0, Math.round(avg * (0.75 + 0.55 * Math.sin(ph + 4.188)))));
              } else {
                r = Math.min(255, Math.max(0, Math.round(avg + dr * cosT - dg * sinT)));
                g = Math.min(255, Math.max(0, Math.round(avg + dr * sinT + dg * cosT)));
                b = Math.min(255, Math.max(0, Math.round(avg + db * cosT + dr * sinT * 0.5)));
              }
            }

            // Неоновая подсветка граней Собеля |∇I|
            const eVal = m.edge[idx];
            if (eVal > 0.15) {
              const pulse = 0.7 + 0.3 * Math.sin(time * 4.0 + (x + y) * 0.03);
              const glow = eVal * edgeGlowBoost * pulse;
              r = Math.min(255, r + Math.round(glow * (0.7 + 0.3 * Math.cos(theta))));
              g = Math.min(255, g + Math.round(glow * (0.4 + 0.4 * Math.sin(theta))));
              b = Math.min(255, b + Math.round(glow));
            }

            const outP = (y * m.w + x) * 4;
            dst[outP] = r;
            dst[outP + 1] = g;
            dst[outP + 2] = b;
            dst[outP + 3] = 255;
          }
        }

        acidCtx.putImageData(outImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
      }

      // ==========================================
      // РЕЖИМ 2: ENGRAVE (ВЕКТОРНАЯ ГРАВЮРА / ОСЦИЛЛОГРАФ ВЫСОКОЙ ПЛОТНОСТИ)
      // ==========================================
      else if (s.topology === "ENGRAVE") {
        ctx.globalCompositeOperation = "lighter";
        const numLines = Math.floor(110 + t.structure * 65);
        const numCols = 240;
        const waveHeight = (drawH / numLines) * (1.2 + t.chaos * 2.2);

        for (let rIdx = 0; rIdx < numLines; rIdx++) {
          const vNorm = rIdx / (numLines - 1);
          const sy = Math.min(m.h - 1, Math.floor(vNorm * m.h));
          const baseScreenY = oy + vNorm * drawH;

          for (let cIdx = 0; cIdx < numCols - 1; cIdx++) {
            const uNorm0 = cIdx / (numCols - 1);
            const uNorm1 = (cIdx + 1) / (numCols - 1);
            const sx0 = Math.min(m.w - 1, Math.floor(uNorm0 * m.w));
            const sx1 = Math.min(m.w - 1, Math.floor(uNorm1 * m.w));

            const cell0 = sy * m.w + sx0;
            const cell1 = sy * m.w + sx1;

            const l0 = m.lum[cell0];
            const l1 = m.lum[cell1];
            const e0 = m.edge[cell0];

            if (l0 < 0.06 && e0 < 0.08) continue;

            const freq = 25.0 + e0 * 60.0 + t.energy * 30.0;
            const osc0 = Math.sin(uNorm0 * freq + time * 4.5 + rIdx * 0.4) * (e0 * 0.75 + l0 * 0.25 + t.chaos * 0.3);
            const osc1 = Math.sin(uNorm1 * freq + time * 4.5 + rIdx * 0.4) * (m.edge[cell1] * 0.75 + l1 * 0.25 + t.chaos * 0.3);

            const y0 = baseScreenY - l0 * waveHeight * 0.85 + osc0 * waveHeight * 0.55;
            const y1 = baseScreenY - l1 * waveHeight * 0.85 + osc1 * waveHeight * 0.55;

            const p = cell0 * 4;
            const hue = Math.floor((t.tone * 360 + l0 * 120 + e0 * 90) % 360);
            const alpha = clip(0.18 + l0 * 0.65 + e0 * 0.45, 0.1, 0.92);

            if (t.tone < 0.05) {
              ctx.strokeStyle =
                "rgba(" +
                String(Math.min(255, m.rgba[p] + 40)) +
                "," +
                String(Math.min(255, m.rgba[p + 1] + 40)) +
                "," +
                String(Math.min(255, m.rgba[p + 2] + 55)) +
                "," +
                String(alpha.toFixed(2)) +
                ")";
            } else {
              ctx.strokeStyle = "hsla(" + String(hue) + ", 85%, " + String(Math.floor(45 + l0 * 45)) + "%, " + String(alpha.toFixed(2)) + ")";
            }

            ctx.lineWidth = 0.8 + l0 * 1.6 + e0 * 1.2;
            ctx.beginPath();
            ctx.moveTo(ox + uNorm0 * drawW, y0);
            ctx.lineTo(ox + uNorm1 * drawW, y1);
            ctx.stroke();
          }
        }
      }

      // ==========================================
      // РЕЖИМ 3: GLYPH (КВАНТОВОЕ ПОЛЕ МАТЕМАТИЧЕСКИХ СИМВОЛОВ)
      // ==========================================
      else if (s.topology === "GLYPH") {
        ctx.globalCompositeOperation = "lighter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const cols = Math.floor(54 + t.structure * 36);
        const cellW = drawW / cols;
        const rows = Math.floor(drawH / cellW);

        for (let r = 0; r < rows; r++) {
          const v = (r + 0.5) / rows;
          const sy = Math.min(m.h - 1, Math.floor(v * m.h));
          for (let cIdx = 0; cIdx < cols; cIdx++) {
            const u = (cIdx + 0.5) / cols;
            const sx = Math.min(m.w - 1, Math.floor(u * m.w));
            const idx = sy * m.w + sx;

            const l = m.lum[idx];
            const e = m.edge[idx];
            if (l < 0.1 && e < 0.12) continue;

            const waveShift = Math.sin(u * 12 + v * 12 + time * 3.0) * t.chaos * 6.0;
            const glyphIdx = Math.floor((l * 8 + e * 5 + time * 1.5 + (r + cIdx) * 0.1) % MATH_GLYPHS.length);
            const ch = MATH_GLYPHS[glyphIdx];

            const fontSize = Math.max(7, Math.floor(cellW * (0.65 + l * 0.55 + e * 0.35)));
            ctx.font = "bold " + String(fontSize) + "px 'Space Mono', monospace";

            const p = idx * 4;
            if (t.tone < 0.05) {
              ctx.fillStyle =
                "rgba(" +
                String(Math.min(255, m.rgba[p] + 45)) +
                "," +
                String(Math.min(255, m.rgba[p + 1] + 45)) +
                "," +
                String(Math.min(255, m.rgba[p + 2] + 60)) +
                "," +
                String(clip(0.25 + l * 0.7 + e * 0.4).toFixed(2)) +
                ")";
            } else {
              const hue = Math.floor((t.tone * 360 + l * 130 + e * 80) % 360);
              ctx.fillStyle = "hsla(" + String(hue) + ", 85%, " + String(Math.floor(48 + l * 42)) + "%, " + String(clip(0.3 + l * 0.65).toFixed(2)) + ")";
            }

            ctx.fillText(ch, ox + u * drawW + waveShift, oy + v * drawH + waveShift * 0.5);
          }
        }
      }

      // ==========================================
      // РЕЖИМ 4: PLEXUS (ГЕОМЕТРИЧЕСКАЯ СЕТКА ГРАФОВ ПОВЕРХ ОБЪЕКТА)
      // ==========================================
      else if (s.topology === "PLEXUS") {
        // Легкая призрачная проекция базового рельефа для 100% читаемости лиц и деталей
        if (acidCtx && acidCanvas.width === m.w) {
          ctx.globalAlpha = 0.28 * t.structure;
          ctx.drawImage(acidCanvas, ox, oy, drawW, drawH);
          ctx.globalAlpha = 1.0;
        }

        ctx.globalCompositeOperation = "lighter";
        const nodes = m.nodes;
        const len = nodes.length;
        const maxDist = (18 + (1.0 - t.structure) * 16);
        const maxDistSq = maxDist * maxDist;

        const screenPts: { x: number; y: number; r: number; g: number; b: number; e: number }[] = [];

        for (let i = 0; i < len; i++) {
          const nd = nodes[i];
          const phase = i * PHI + time * (2.5 + t.energy * 3.0);
          const amp = (2.5 + t.chaos * 18.0);
          const sx = ox + nd.x * drawW + (nd.vx * Math.sin(phase) + Math.cos(phase * 0.7) * t.chaos) * amp;
          const sy = oy + nd.y * drawH + (nd.vy * Math.sin(phase) + Math.sin(phase * 0.7) * t.chaos) * amp;
          screenPts.push({ x: sx, y: sy, r: nd.r, g: nd.g, b: nd.b, e: nd.e });
        }

        ctx.lineWidth = 0.85;
        for (let i = 0; i < len; i++) {
          const p1 = screenPts[i];
          let links = 0;
          for (let j = i + 1; j < len; j++) {
            const p2 = screenPts[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < maxDistSq) {
              const alpha = (1.0 - Math.sqrt(dSq) / maxDist) * 0.65;
              if (t.tone < 0.05) {
                ctx.strokeStyle =
                  "rgba(" +
                  String(Math.min(255, p1.r + 50)) +
                  "," +
                  String(Math.min(255, p1.g + 50)) +
                  "," +
                  String(Math.min(255, p1.b + 65)) +
                  "," +
                  String(alpha.toFixed(2)) +
                  ")";
              } else {
                const hue = Math.floor((t.tone * 360 + p1.e * 120 + (i % 40)) % 360);
                ctx.strokeStyle = "hsla(" + String(hue) + ", 85%, 65%, " + String(alpha.toFixed(2)) + ")";
              }
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
              links++;
              if (links >= 4) break;
            }
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
      {/* МАТЕМАТИЧЕСКИЙ ХОЛСТ BARRETT С ЖЕСТКОЙ ФИКСАЦИЕЙ РАЗМЕРА */}
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
            <div className="text-white font-bold">BARRETT PRISM // {(query || "LED ZEPPELIN").toUpperCase()}</div>
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
              {(["ACID", "ENGRAVE", "GLYPH", "PLEXUS"] as ManifoldTopology[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTopology(mode)}
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
                { key: "structure", label: "Structure (Sobel Edge Glow)" },
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
            <div>u&apos;(x,y,t) = x + A_chaos · sin(ω_n·y + t)</div>
            <div>v&apos;(x,y,t) = y + A_chaos · cos(ω_m·x + t)</div>
            <div>I_out = SO(3, θ) · I(u&apos;±δ_rgb, v&apos;) + |∇I| · St</div>
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
