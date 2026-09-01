"use client";
import { useEffect, useRef } from "react";

interface PhysicsState {
  baseRadius: number;
  radius: number;
  currentSpeed: number;
  targetSpeed: number;
  chaos: number;
  isAudio: boolean;
  numParticles: number;
  baseTime: number;
}

export default function ResonanceEngine({ mode, isActive }: { mode: 'visual' | 'sonic', isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // ==========================================
  // ФИЗИЧЕСКОЕ ЯДРО (STATE)
  // ==========================================
  const physicsRef = useRef<PhysicsState>({
    baseRadius: 300, 
    radius: 300, 
    currentSpeed: 0.001, 
    targetSpeed: 0.001, 
    chaos: 0, 
    isAudio: false, 
    numParticles: 700, // Баланс между плотностью и FPS
    baseTime: 0
  });

  // Синхронизация состояния с пропсами из page.tsx
  useEffect(() => {
    physicsRef.current.isAudio = mode === 'sonic';
    physicsRef.current.targetSpeed = isActive ? 0.003 : 0.001; // Гипнотическое замедление
    physicsRef.current.chaos = isActive ? 0.2 : 0; // Турбулентность при поиске
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

    // ==========================================
    // ГЕНЕРАЦИЯ СФЕРЫ (АЛГОРИТМ ФИБОНАЧЧИ)
    // ==========================================
    const initMath = () => {
      particles = [];
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      
      for (let i = 0; i < physicsRef.current.numParticles; i++) {
        // Расчет углов для равномерного распределения точек по сфере
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

    // ==========================================
    // АДАПТИВНОСТЬ И РЕСАЙЗ
    // ==========================================
    const resize = () => {
      width = window.innerWidth; 
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      // Учет плотности пикселей (Retina дисплеи)
      canvas.width = width * dpr; 
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      
      // Динамический радиус: сфера не занимает больше 35% экрана
      physicsRef.current.radius = Math.min(width * 0.35, physicsRef.current.baseRadius);
    };

    window.addEventListener("resize", resize);
    resize(); 
    initMath();

    // ==========================================
    // ГЛАВНЫЙ ЦИКЛ РЕНДЕРИНГА
    // ==========================================
    const render = () => {
      const p = physicsRef.current;
      
      // Очистка кадра с эффектом "шлейфа" (motion blur)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 1, 4, 0.4)'; // Глубокий, холодный фон
      ctx.fillRect(0, 0, width, height);
      
      // Режим наложения для свечения частиц
      ctx.globalCompositeOperation = 'lighter';

      const cx = width / 2; 
      const cy = height / 2;
      
      // Инерция скорости (плавный разгон и торможение)
      p.currentSpeed += (p.targetSpeed - p.currentSpeed) * 0.05; 
      p.baseTime += p.currentSpeed;
      const time = p.baseTime;

      // ------------------------------------------
      // РЕЖИМ 1: VISUAL PLANE (Сфера)
      // ------------------------------------------
      if (!p.isAudio) {
        // Базовые углы вращения всей сферы
        const cosY = Math.cos(time * 0.3); 
        const sinY = Math.sin(time * 0.3);
        const cosX = Math.cos(time * 0.5); 
        const sinX = Math.sin(time * 0.5);

        for (let i = 0; i < p.numParticles; i++) {
          const pt = particles[i];
          
          // Органическое дыхание (расширение/сжатие)
          const breathing = Math.sin(time * 2 + pt.randomOffset) * (p.radius * 0.015); 
          
          // Турбулентность Tame Impala (искажение формы при поиске)
          const turbulence = p.chaos > 0 
            ? Math.sin(pt.x0 * 10 + time * 5) * p.chaos * (p.radius * 0.05) 
            : 0;
          
          const currentRadius = p.radius + breathing + turbulence;
          
          // Базовые 3D координаты точки
          let x = pt.x0 * currentRadius; 
          let y = pt.y0 * currentRadius; 
          let z = pt.z0 * currentRadius;

          // Матрица поворота (Оси X и Y)
          let x1 = x * cosY - z * sinY; 
          let z1 = z * cosY + x * sinY;
          let y2 = y * cosX - z1 * sinX; 
          let z2 = z1 * cosX + y * sinX;

          // 3D -> 2D Проекция (Перспектива)
          const perspective = 1200 / (1200 - z2); 
          const px = cx + x1 * perspective; 
          const py = cy + y2 * perspective;

          // Цветовая дисперсия Pink Floyd (от стали к аметисту по оси X)
          const normalizedX = (x1 + p.radius) / (p.radius * 2);
          const hue = 220 + (normalizedX * 60); 
          
          // Динамический размер и прозрачность зависят от глубины (Z-индекса)
          const size = Math.max(0.2, (z2 + p.radius) / (p.radius * 2) * 2.0);
          const alpha = Math.max(0.05, (z2 + p.radius) / (p.radius * 2) * 0.6);

          // Отрисовка частицы
          ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${alpha})`;
          ctx.beginPath(); 
          ctx.arc(px, py, size, 0, Math.PI * 2); 
          ctx.fill();
        }
      } 
      // ------------------------------------------
      // РЕЖИМ 2: SONIC RESONANCE (Волна)
      // ------------------------------------------
      else {
        ctx.beginPath(); 
        ctx.lineWidth = 2; 
        ctx.strokeStyle = `rgba(148, 163, 184, 0.8)`; // Стальной сонар

        for (let i = 0; i < width; i += 4) {
          // Комбинирование синусоид для сложного гармонического колебания
          const baseWave = Math.sin(i * 0.01 + time * 15);
          const complexWave = Math.sin(i * 0.05 - time * 20) * Math.cos(i * 0.02);
          
          // Огибающая (сглаживание по краям экрана)
          const envelope = Math.pow(Math.sin((i / width) * Math.PI), 2);
          
          // Итоговая высота точки на волне
          const waveHeight = (baseWave + complexWave * 0.5) * (p.radius * 0.3) * envelope;
          
          if (i === 0) {
            ctx.moveTo(i, cy + waveHeight); 
          } else {
            ctx.lineTo(i, cy + waveHeight);
          }
        }
        ctx.stroke();
      }
      
      // Запрос следующего кадра
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    // Очистка при размонтировании
    return () => { 
      window.removeEventListener("resize", resize); 
      cancelAnimationFrame(animationFrameId); 
    };
  }, []);

  return <canvas ref={canvasRef} id="math-canvas" />;
}
