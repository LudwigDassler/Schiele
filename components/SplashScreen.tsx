"use client";
import { useState, useEffect, useRef } from "react";
import { useSpring, animated } from "@react-spring/web";

interface SplashScreenProps {
  onComplete: () => void;
  variant: "schiele" | "ledzeppelin";
}

export default function SplashScreen({ onComplete, variant }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const fadeOut = useSpring({
    opacity: visible ? 1 : 0,
    config: { duration: 800 },
    onRest: () => {
      if (!visible) onComplete();
    },
  });

  function drawSchiele(ctx: CanvasRenderingContext2D, w: number, h: number, p: number) {
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 600;

    ctx.clearRect(0, 0, w, h);
    
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "#2a1f0e");
    grad.addColorStop(1, "#0d0a06");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#c0521a";
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(192,82,26,0.3)";
    ctx.shadowBlur = 10 * scale;

    const pp = Math.min(p * 1.1, 1);

    // Голова
    const headP = Math.min(pp * 1.3, 1);
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30 * scale, 75 * scale * headP, 95 * scale * headP, 0, 0, Math.PI * 2 * headP);
    ctx.stroke();

    // Шея
    if (pp > 0.15) {
      const neckP = Math.min((pp - 0.15) / 0.15, 1);
      ctx.beginPath();
      ctx.moveTo(cx - 25 * scale * neckP, cy + 20 * scale);
      ctx.lineTo(cx - 20 * scale * neckP, cy + 65 * scale * neckP);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 25 * scale * neckP, cy + 20 * scale);
      ctx.lineTo(cx + 20 * scale * neckP, cy + 65 * scale * neckP);
      ctx.stroke();
    }

    // Плечи
    if (pp > 0.25) {
      const shP = Math.min((pp - 0.25) / 0.2, 1);
      ctx.beginPath();
      ctx.moveTo(cx - 20 * scale * shP, cy + 65 * scale);
      ctx.quadraticCurveTo(cx - 90 * scale * shP, cy + 60 * scale, cx - 120 * scale * shP, cy + 100 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 20 * scale * shP, cy + 65 * scale);
      ctx.quadraticCurveTo(cx + 90 * scale * shP, cy + 60 * scale, cx + 120 * scale * shP, cy + 100 * scale);
      ctx.stroke();
    }

    // Глаза
    if (pp > 0.35) {
      const eyeP = Math.min((pp - 0.35) / 0.15, 1);
      ctx.shadowBlur = 15 * scale;
      ctx.beginPath();
      ctx.ellipse(cx - 28 * scale, cy - 45 * scale, 14 * scale * eyeP, 10 * scale * eyeP, -0.1, 0, Math.PI * 2 * eyeP);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx + 28 * scale, cy - 45 * scale, 14 * scale * eyeP, 10 * scale * eyeP, 0.1, 0, Math.PI * 2 * eyeP);
      ctx.stroke();
      
      if (pp > 0.5) {
        const pupilP = Math.min((pp - 0.5) / 0.15, 1);
        ctx.fillStyle = "#c0521a";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx - 28 * scale, cy - 43 * scale, 5 * scale * pupilP, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 28 * scale, cy - 43 * scale, 5 * scale * pupilP, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10 * scale;
      }
    }

    // Нос
    if (pp > 0.5) {
      const noseP = Math.min((pp - 0.5) / 0.15, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy - 38 * scale);
      ctx.lineTo(cx + 2 * scale * noseP, cy - 20 * scale * noseP);
      ctx.lineTo(cx - 2 * scale * noseP, cy - 20 * scale * noseP);
      ctx.stroke();
    }

    // Рот
    if (pp > 0.6) {
      const mouthP = Math.min((pp - 0.6) / 0.15, 1);
      ctx.beginPath();
      ctx.arc(cx, cy - 10 * scale, 18 * scale * mouthP, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Волосы
    if (pp > 0.7) {
      const hairP = Math.min((pp - 0.7) / 0.2, 1);
      ctx.shadowBlur = 5 * scale;
      ctx.strokeStyle = "#8a4a1a";
      ctx.lineWidth = 1.5 * scale;
      
      const hairLines = [
        [-60, -80, -40, -110], [-40, -90, -20, -115], [-20, -95, 0, -118],
        [20, -95, 40, -115], [40, -90, 60, -110], [60, -80, 70, -95],
        [-70, -70, -80, -85], [70, -70, 80, -85],
      ];
      
      hairLines.forEach(([x1, y1, x2, y2]) => {
        if (pp > 0.7 + Math.random() * 0.2) {
          ctx.beginPath();
          ctx.moveTo(cx + x1 * scale * hairP, cy + y1 * scale);
          ctx.quadraticCurveTo(
            cx + (x1 + x2) / 2 * scale * hairP,
            cy + (y1 + y2 - 20) * scale * hairP,
            cx + x2 * scale * hairP,
            cy + y2 * scale
          );
          ctx.stroke();
        }
      });
      
      ctx.strokeStyle = "#6a3a1a";
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const offset = (i % 4) * 15;
        if (pp > 0.75 + i * 0.02) {
          ctx.beginPath();
          ctx.moveTo(cx + side * (65 + offset) * scale * hairP, cy + (-85 + i * 8) * scale);
          ctx.quadraticCurveTo(
            cx + side * (80 + offset) * scale * hairP,
            cy + (-70 + i * 10) * scale,
            cx + side * (75 + offset) * scale * hairP,
            cy + (-50 + i * 8) * scale
          );
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 10 * scale;
      ctx.strokeStyle = "#c0521a";
      ctx.lineWidth = 2.5 * scale;
    }

    // Подпись
    if (pp > 0.9) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(192,82,26,0.6)";
      ctx.font = `${14 * scale}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText("EGON SCHIELE", cx, h - 30 * scale);
      ctx.fillStyle = "rgba(192,82,26,0.3)";
      ctx.font = `${10 * scale}px Georgia, serif`;
      ctx.fillText("1918", cx, h - 12 * scale);
    }
  }

  function drawLedZeppelin(ctx: CanvasRenderingContext2D, w: number, h: number, p: number) {
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 600;

    ctx.clearRect(0, 0, w, h);
    
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(0.5, "#0d0d1a");
    grad.addColorStop(1, "#05050a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#d4a854";
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(212,168,84,0.15)";
    ctx.shadowBlur = 8 * scale;

    const pp = Math.min(p * 1.1, 1);

    const members = [
      { dx: -160, dy: 20, label: "P", size: 1.0 },
      { dx: -60, dy: -10, label: "J", size: 1.1 },
      { dx: 60, dy: -10, label: "R", size: 1.0 },
      { dx: 160, dy: 20, label: "B", size: 0.9 },
    ];

    members.forEach((member, idx) => {
      const mp = Math.max(0, Math.min((pp - idx * 0.08) * 1.3, 1));
      if (mp <= 0) return;

      const x = cx + member.dx * scale;
      const y = cy + member.dy * scale;
      const s = member.size * scale * 0.8;

      ctx.shadowBlur = 15 * scale;
      ctx.strokeStyle = idx === 0 ? "#d4a854" : idx === 1 ? "#a8c8d4" : idx === 2 ? "#d4a854" : "#c8b8a8";
      
      ctx.beginPath();
      ctx.arc(x, y - 60 * s, 28 * s * mp, 0, Math.PI * 2 * mp);
      ctx.stroke();
      
      if (idx === 1 && mp > 0.5) {
        ctx.strokeStyle = "#c8b090";
        ctx.lineWidth = 1.5 * scale;
        const hairP = Math.min((mp - 0.5) / 0.3, 1);
        for (let i = 0; i < 10; i++) {
          const angle = -1.2 + i * 0.25;
          ctx.beginPath();
          ctx.moveTo(x + 22 * s * Math.cos(angle), y - 50 * s + 10 * s * Math.sin(angle));
          ctx.quadraticCurveTo(
            x + 60 * s * Math.cos(angle) * hairP,
            y - 20 * s + 30 * s * Math.sin(angle) * hairP,
            x + 80 * s * Math.cos(angle) * hairP,
            y + 10 * s + 40 * s * Math.sin(angle) * hairP
          );
          ctx.stroke();
        }
        ctx.strokeStyle = "#d4a854";
        ctx.lineWidth = 2 * scale;
      }

      if (mp > 0.2) {
        const bodyP = Math.min((mp - 0.2) / 0.25, 1);
        ctx.beginPath();
        ctx.moveTo(x - 35 * s * bodyP, y - 25 * s);
        ctx.lineTo(x, y - 10 * s * bodyP);
        ctx.lineTo(x + 35 * s * bodyP, y - 25 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 10 * s);
        ctx.lineTo(x, y + 30 * s * bodyP);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 30 * s * bodyP);
        ctx.lineTo(x - 20 * s * bodyP, y + 70 * s * bodyP);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 30 * s * bodyP);
        ctx.lineTo(x + 20 * s * bodyP, y + 70 * s * bodyP);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 35 * s * bodyP, y - 25 * s);
        ctx.lineTo(x - 45 * s * bodyP, y + 10 * s * bodyP);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 35 * s * bodyP, y - 25 * s);
        ctx.lineTo(x + 45 * s * bodyP, y + 10 * s * bodyP);
        ctx.stroke();
        
        if (idx === 2 && mp > 0.6) {
          const gP = Math.min((mp - 0.6) / 0.25, 1);
          ctx.strokeStyle = "#d4a854";
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.moveTo(x + 45 * s, y - 5 * s);
          ctx.lineTo(x + 85 * s * gP, y + 25 * s * gP);
          ctx.stroke();
          ctx.lineWidth = 1.5 * scale;
          ctx.beginPath();
          ctx.arc(x + 70 * s * gP, y + 15 * s * gP, 12 * s * gP, 0, Math.PI * 2 * gP);
          ctx.stroke();
          ctx.strokeStyle = "#d4a854";
          ctx.lineWidth = 2 * scale;
        }
        
        if (idx === 3 && mp > 0.6) {
          const dP = Math.min((mp - 0.6) / 0.25, 1);
          ctx.strokeStyle = "#c8b8a8";
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(x + 50 * s * dP, y + 10 * s * dP, 30 * s * dP, 0, Math.PI * 2 * dP);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 30 * s * dP, y + 10 * s * dP);
          ctx.lineTo(x + 70 * s * dP, y + 10 * s * dP);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 50 * s * dP, y - 10 * s * dP);
          ctx.lineTo(x + 50 * s * dP, y + 30 * s * dP);
          ctx.stroke();
          ctx.strokeStyle = "#d4a854";
          ctx.lineWidth = 2 * scale;
        }
      }
    });

    if (pp > 0.85) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "rgba(212,168,84,0.3)";
      ctx.shadowBlur = 20 * scale;
      ctx.fillStyle = "#d4a854";
      ctx.font = `bold ${28 * scale}px Cinzel, Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText("LED ZEPPELIN", cx, h - 40 * scale);
      
      ctx.fillStyle = "rgba(212,168,84,0.3)";
      ctx.font = `${10 * scale}px Georgia, serif`;
      ctx.fillText("1968", cx, h - 18 * scale);
    }
  }

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000;

    function animate() {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        const rect = canvas.parentElement?.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect?.width || 600;
        const h = rect?.height || 500;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.scale(dpr, dpr);

        if (variant === "schiele") {
          drawSchiele(ctx, w, h, p);
        } else {
          drawLedZeppelin(ctx, w, h, p);
        }
      }

      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setVisible(false), 600);
      }
    }

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [variant]);

  return (
    <animated.div
      style={{
        ...fadeOut,
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0d0a06",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 700, aspectRatio: "4/3" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      
      <div style={{ marginTop: 20, width: 200, height: 2, background: "#2a1f0e", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: "#c0521a", transition: "width 0.1s" }} />
      </div>
      
      <p style={{ marginTop: 12, color: "#4a3520", fontSize: 11, fontFamily: "Georgia, serif", letterSpacing: 2 }}>
        {variant === "schiele" ? "EGON SCHIELE · 1918" : "LED ZEPPELIN · 1968"}
      </p>
    </animated.div>
  );
}