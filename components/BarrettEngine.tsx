"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

interface Tensor5D {
  energy: number;    // E: скорость фазового сдвига и яркость
  chaos: number;     // C: нелинейная турбулентность ("Madcap" девиация)
  tone: number;      // H: базовый спектральный угол (Hue)
  structure: number; // St: баланс между стоячими волнами Хладни и аттрактором
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

type ManifoldTopology = "AUTO" | "CLIFFORD" | "CHLADNI" | "VORTEX";

interface Props {
  query: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void;
}

const PHI = 1.618033988749;
const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"]);

function clip(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

// Информационная энтропия Шеннона H(X)
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

// Детерминированный лексический спектрограф BARRETT: Текст -> 5D Тензор + Коэффициенты ДУ
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

  const energy = clip(((abs1 % 1000) / 1000) * 0.65 + consonantRatio * 0.35, 0.15, 0.98);
  const chaos = clip((entropy / 4.5) * 0.7 + (((abs2 >> 4) % 100) / 100) * 0.3, 0.1, 0.98);
  const tone = clip(((abs1 >> 8) % 360) / 360, 0.0, 1.0);
  const structure = clip(consonantRatio * 0.8 + (((abs2 >> 10) % 100) / 100) * 0.2, 0.1, 0.98);
  const symmetry = clip((1.0 - Math.abs(0.5 - vowelCount / totalLetters)) * 0.6 + (((abs1 >> 16) % 100) / 100) * 0.4, 0.05, 0.98);

  const alpha = Number((Math.sin(abs1 * 0.001 * PHI) * 2.4 + (energy - 0.5)).toFixed(4));
  const beta = Number((Math.cos(abs2 * 0.001 * PHI) * 2.4 - (chaos - 0.5)).toFixed(4));
  const gamma = Number((Math.sin((abs1 ^ abs2) * 0.002) * 1.9 + (structure - 0.5)).toFixed(4));
  const delta = Number((Math.cos((abs1 + abs2) * 0.002) * 1.9 + (symmetry - 0.5)).toFixed(4));

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

export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initialData = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
  const [tensor, setTensor] = useState<Tensor5D>(initialData.tensor);
  const [coeffs, setCoeffs] = useState<DifferentialConstants>(initialData.coeffs);
  const [topology, setTopology] = useState<ManifoldTopology>("AUTO");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stateRef = useRef({
    tensor: initialData.tensor,
    coeffs: initialData.coeffs,
    topology: "AUTO" as ManifoldTopology,
    time: 0,
    needsClear: true,
    isPaused: false,
  });

  useEffect(() => {
    const next = compileLexicalManifold(query || "SHINE ON CRAZY DIAMOND");
    setTensor(next.tensor);
    setCoeffs(next.coeffs);
    stateRef.current.tensor = next.tensor;
    stateRef.current.coeffs = next.coeffs;
    stateRef.current.needsClear = true;
  }, [query]);

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

  const triggerReseed = useCallback(() => {
    stateRef.current.time += PHI;
    stateRef.current.needsClear = true;
  }, []);

  // ==========================================
  // ЯДРО ЧИСЛЕННОГО ИНТЕГРИРОВАНИЯ BARRETT (60 FPS)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { preserveDrawingBuffer: true });
    if (!ctx) return;

    let animId = 0;
    let width = 900;
    let height = 900;

    const PARTICLE_COUNT = 3200;
    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);

    const initParticles = () => {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const r = Math.sqrt((i + 0.5) / PARTICLE_COUNT);
        const theta = 2 * Math.PI * i * PHI;
        px[i] = r * Math.cos(theta);
        py[i] = r * Math.sin(theta);
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

        ctx.globalCompositeOperation = "source-over";
        const fadeAlpha = 0.018 + (1.0 - t.structure) * 0.035;
        ctx.fillStyle = "rgba(2, 1, 4, " + String(fadeAlpha.toFixed(4)) + ")";
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "lighter";

        const dt = 0.0025 * (0.3 + t.energy * 1.4);
        s.time += dt;
        const time = s.time;

        let activeMode = s.topology;
        if (activeMode === "AUTO") {
          if (t.structure > 0.62) activeMode = "CHLADNI";
          else if (t.chaos > 0.58) activeMode = "CLIFFORD";
          else activeMode = "VORTEX";
        }

        const symOrders = [1, 2, 3, 4, 6, 8, 12];
        const symIdx = Math.min(symOrders.length - 1, Math.floor(t.symmetry * symOrders.length));
        const symmetryFold = symOrders[symIdx];

        const cx = width * 0.5;
        const cy = height * 0.5;
        const scale = Math.min(width, height) * 0.42;

        const aMod = c.alpha + Math.sin(time * 1.3) * (0.25 + t.chaos * 0.4);
        const bMod = c.beta + Math.cos(time * 1.1 * PHI) * (0.25 + t.chaos * 0.4);
        const gMod = c.gamma + Math.sin(time * 0.7) * 0.2;
        const dMod = c.delta + Math.cos(time * 0.9) * 0.2;

        const baseHue = Math.floor(t.tone * 360);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          let x = px[i];
          let y = py[i];

          let vx = 0;
          let vy = 0;

          if (activeMode === "CLIFFORD") {
            const nextX = Math.sin(aMod * y) + gMod * Math.cos(aMod * x);
            const nextY = Math.sin(bMod * x) + dMod * Math.cos(bMod * y);
            vx = (nextX * 0.42 - x) * (0.08 + t.energy * 0.12);
            vy = (nextY * 0.42 - y) * (0.08 + t.energy * 0.12);
          } else if (activeMode === "CHLADNI") {
            const n = c.nHarmonic + Math.floor(t.structure * 3);
            const m = c.mHarmonic + Math.floor(t.chaos * 3);
            const w1 = Math.cos(time * 2.0);
            const w2 = Math.sin(time * 2.0 / PHI);

            const eps = 0.015;
            const potential = (xx: number, yy: number) =>
              Math.abs(
                w1 * Math.sin(Math.PI * n * xx) * Math.sin(Math.PI * m * yy) +
                w2 * Math.sin(Math.PI * m * xx) * Math.sin(Math.PI * n * yy)
              );

            const p0 = potential(x, y);
            const gradX = (potential(x + eps, y) - p0) / eps;
            const gradY = (potential(x, y + eps) - p0) / eps;

            const step = 0.012 * (0.5 + t.energy);
            vx = -gradX * step - y * 0.003 * t.chaos + (Math.sin(i + time * 11) * 0.004 * p0);
            vy = -gradY * step + x * 0.003 * t.chaos + (Math.cos(i - time * 11) * 0.004 * p0);
          } else {
            const r = Math.sqrt(x * x + y * y) + 1e-5;
            const angle = Math.atan2(y, x);
            const harmonicWave =
              Math.sin(angle * c.nHarmonic + time * 3.0) *
              Math.cos(r * Math.PI * c.mHarmonic - time * 2.0 * PHI);

            const targetR = 0.55 + 0.32 * harmonicWave * (0.4 + t.chaos * 0.6);
            const radialForce = (targetR - r) * (0.04 + t.structure * 0.08);
            const tangentForce = (0.006 + t.energy * 0.014) * (1.0 + 0.5 * Math.sin(r * 8.0 - time * 4.0));

            vx = Math.cos(angle) * radialForce - Math.sin(angle) * tangentForce;
            vy = Math.sin(angle) * radialForce + Math.cos(angle) * tangentForce;
          }

          x += vx;
          y += vy;

          if (x * x + y * y > 1.35 || isNaN(x) || isNaN(y)) {
            const reTheta = ((i * PHI + time) % 1) * Math.PI * 2;
            const reR = 0.05 + ((i % 97) / 97) * 0.85;
            x = Math.cos(reTheta) * reR;
            y = Math.sin(reTheta) * reR;
          }

          px[i] = x;
          py[i] = y;

          const speed = Math.sqrt(vx * vx + vy * vy);
          const hueShift = Math.floor((baseHue + speed * 1800 + (i % 60)) % 360);
          const lightness = Math.min(88, Math.floor(52 + t.energy * 30 + speed * 400));
          const alpha = Math.min(0.45, 0.07 + t.energy * 0.18);

          ctx.fillStyle =
            "hsla(" +
            String(hueShift) +
            ", 78%, " +
            String(lightness) +
            "%, " +
            String(alpha.toFixed(3)) +
            ")";

          const radiusPx = Math.sqrt(x * x + y * y) * scale;
          const baseTheta = Math.atan2(y, x);

          for (let k = 0; k < symmetryFold; k++) {
            const rotAngle = baseTheta + (k * 2 * Math.PI) / symmetryFold;
            const drawX = cx + Math.cos(rotAngle) * radiusPx;
            const drawY = cy + Math.sin(rotAngle) * radiusPx;
            ctx.fillRect(drawX, drawY, 1.35, 1.35);
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
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
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
            {(["AUTO", "CLIFFORD", "CHLADNI", "VORTEX"] as ManifoldTopology[]).map((mode) => (
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
              onClick={triggerReseed}
              className="btn-elegant !bg-black/70 backdrop-blur-md"
            >
              Phase Shift
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
                { key: "energy", label: "Energy (Phase Velocity)" },
                { key: "chaos", label: "Chaos (Madcap Turbulence)" },
                { key: "tone", label: "Tone (Liquid Spectrum)" },
                { key: "structure", label: "Structure (Chladni Nodes)" },
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
                  min="0.05"
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
            <div>dx/dt = sin(α·y) + γ·cos(α·x)</div>
            <div>dy/dt = sin(β·x) + δ·cos(β·y)</div>
            <div>W(x,y) = a·sin(πnx)sin(πmy) + b·sin(πmx)sin(πny)</div>
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
              className="btn-elegant w-full !py-3 justify-center bg-white !text-black font-bold"
            >
              Secure to Saved Resonance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
