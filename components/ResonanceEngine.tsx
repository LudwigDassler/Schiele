"use client";
import { useEffect, useRef } from "react";

export default function ResonanceEngine({ mode, isActive }: { mode: 'visual' | 'sonic', isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const physicsRef = useRef({
    baseRadius: 300, 
    radius: 300, 
    currentSpeed: 0.001, 
    targetSpeed: 0.001, 
    chaos: 0, 
    isAudio: false, 
    numParticles: 700, // Снижено для оптимизации и тонкой эстетики
    baseTime: 0
  });

  // Синхронизация состояний из page.tsx
  useEffect(() => {
    physicsRef.current.isAudio = mode === 'sonic';
    physicsRef.current.targetSpeed = isActive ? 0.003 : 0.001; // Замедленное, гипнотическое вращение
    physicsRef.current.chaos = isActive ? 0.2 : 0; // Легкая турбулентность (Currents vibe)
  }, [mode, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width: number; 
    let height: number;
    let particles: any[] = [];

    // Генерация сферы Фибоначчи
    const initMath = () => {
      particles = [];
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < physicsRef.current.numParticles; i++) {
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / physicsRef.current.numParticles);
        particles.push({
          x0: Math.sin(phi) * Math.cos(theta), 
          y0: Math.cos(phi), 
          z0: Math.sin(phi) * Math.sin(theta), 
          randomOffset: Math.random() * Math.PI * 2
        });
      }
    };

    // Адаптивность для десктопа и мобилок
    const resize = () => {
      width = window.innerWidth; 
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      
      // Сфера занимает максимум 35% экрана (компактность)
      physicsRef.current.radius = Math.min(width * 0.35, physicsRef.current.baseRadius);
    };

    window.addEventListener("resize", resize);
    resize(); 
    initMath();

    const render = () => {
      const p = physicsRef.current;
      
      // Глубокий космос с плотным шлейфом
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 1, 4, 0.3)'; 
      ctx.fillRect(0, 0, width, height);
      
      // Включаем математическое свечение
      ctx.globalCompositeOperation = 'lighter';

      const cx = width / 2; 
      const cy = height / 2;
      
      p.currentSpeed += (p.targetSpeed - p.currentSpeed) * 0.05; 
      p.baseTime += p.currentSpeed;
      const time = p.baseTime;

      if (!p.isAudio) {
        // ==========================================
        // РЕЖИМ 1: ВИЗУАЛЬНАЯ ПЛОСКОСТЬ (Сфера)
        // ==========================================
        const cosY = Math.cos(time * 0.3); 
        const sinY = Math.sin(time * 0.3);
        const cosX = Math.cos(time * 0.5); 
        const sinX = Math.sin(time * 0.5);

        for (let i = 0; i < p.numParticles; i++) {
          const pt = particles[i];
          const breathing = Math.sin(time * 2 + pt.randomOffset) * (p.radius * 0.015); 
          const turbulence = p.chaos > 0 ? Math.sin(pt.x0 * 10 + time * 5) * p.chaos * (p.radius * 0.05) : 0;
          
          const currentRadius = p.radius + breathing + turbulence;
          let x = pt.x0 * currentRadius; 
          let y = pt.y0 * currentRadius; 
          let z = pt.z0 * currentRadius;

          // 3D Вращение
          let x1 = x * cosY - z * sinY; 
          let z1 = z * cosY + x * sinY;
          let y2 = y * cosX - z1 * sinX; 
          let z2 = z1 * cosX + y * sinX;

          const perspective = 1200 / (1200 - z2); 
          const px = cx + x1 * perspective; 
          const py = cy + y2 * perspective;

          // МАТЕМАТИЧЕСКИЙ ЦВЕТ: Холодный стальной (220) -> Глубокий аметист (280)
          const normalizedX = (x1 + p.radius) / (p.radius * 2);
          const hue = 220 + (normalizedX * 60); 
          
          // Мелкие, точные частицы (3Blue1Brown Aesthetic)
          const size = Math.max(0.1, (z2 + p.radius) / (p.radius * 2) * 1.5);
          const alpha = Math.max(0.02, (z2 + p.radius) / (p.radius * 2) * 0.25);

          ctx.fillStyle = `hsla(${hue}, 40%, 60%, ${alpha})`;
          ctx.beginPath(); 
          ctx.arc(px, py, size, 0, Math.PI * 2); 
          ctx.fill();
        }
      } else {
        // ==========================================
        // РЕЖИМ 2: ЗВУКОВОЙ РЕЗОНАНС (Сонар Echoes)
        // ==========================================
        ctx.beginPath(); 
        ctx.lineWidth = 1.5; 
        ctx.strokeStyle = `rgba(148, 163, 184, 0.5)`; // Холодный, стальной серый

        for (let i = 0; i < width; i += 4) {
          const baseWave = Math.sin(i * 0.01 + time * 15);
          const complexWave = Math.sin(i * 0.05 - time * 20) * Math.cos(i * 0.02);
          const envelope = Math.pow(Math.sin((i / width) * Math.PI), 2);
          const waveHeight = (baseWave + complexWave * 0.5) * (p.radius * 0.3) * envelope;
          
          if (i === 0) ctx.moveTo(i, cy + waveHeight); 
          else ctx.lineTo(i, cy + waveHeight);
        }
        ctx.stroke();
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => { 
      window.removeEventListener("resize", resize); 
      cancelAnimationFrame(animationFrameId); 
    };
  }, []);

  return <canvas ref={canvasRef} id="math-canvas" />;
}
