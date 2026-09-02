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
  
  const physicsRef = useRef<PhysicsState>({
    baseRadius: 300, 
    radius: 300, 
    currentSpeed: 0.001, 
    targetSpeed: 0.001, 
    chaos: 0, 
    isAudio: false, 
    numParticles: 700,
    baseTime: 0
  });

  useEffect(() => {
    physicsRef.current.isAudio = mode === 'sonic';
    physicsRef.current.targetSpeed = isActive ? 0.003 : 0.001; 
    physicsRef.current.chaos = isActive ? 0.2 : 0; 
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

    const resize = () => {
      width = window.innerWidth; 
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      // Внутреннее разрешение (Retina-ready)
      canvas.width = width * dpr; 
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      
      physicsRef.current.radius = Math.min(width * 0.35, physicsRef.current.baseRadius);
    };

    window.addEventListener("resize", resize);
    resize(); 
    initMath();

    const render = () => {
      const p = physicsRef.current;
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 1, 4, 0.4)'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.globalCompositeOperation = 'lighter';

      const cx = width / 2; 
      const cy = height / 2;
      
      p.currentSpeed += (p.targetSpeed - p.currentSpeed) * 0.05; 
      p.baseTime += p.currentSpeed;
      const time = p.baseTime;

      if (!p.isAudio) {
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

          let x1 = x * cosY - z * sinY; 
          let z1 = z * cosY + x * sinY;
          let y2 = y * cosX - z1 * sinX; 
          let z2 = z1 * cosX + y * sinX;

          const perspective = 1200 / (1200 - z2); 
          const px = cx + x1 * perspective; 
          const py = cy + y2 * perspective;

          const normalizedX = (x1 + p.radius) / (p.radius * 2);
          const hue = 220 + (normalizedX * 60); 
          
          const size = Math.max(0.2, (z2 + p.radius) / (p.radius * 2) * 2.0);
          const alpha = Math.max(0.05, (z2 + p.radius) / (p.radius * 2) * 0.6);

          ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${alpha})`;
          ctx.beginPath(); 
          ctx.arc(px, py, size, 0, Math.PI * 2); 
          ctx.fill();
        }
      } 
      else {
        ctx.beginPath(); 
        ctx.lineWidth = 2; 
        ctx.strokeStyle = `rgba(148, 163, 184, 0.8)`; 

        for (let i = 0; i < width; i += 4) {
          const baseWave = Math.sin(i * 0.01 + time * 15);
          const complexWave = Math.sin(i * 0.05 - time * 20) * Math.cos(i * 0.02);
          const envelope = Math.pow(Math.sin((i / width) * Math.PI), 2);
          const waveHeight = (baseWave + complexWave * 0.5) * (p.radius * 0.3) * envelope;
          
          if (i === 0) {
            ctx.moveTo(i, cy + waveHeight); 
          } else {
            ctx.lineTo(i, cy + waveHeight);
          }
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

  // 🔥 ЖЕСТКАЯ ФИКСАЦИЯ РАЗМЕРА ХОЛСТА (display: block, width: 100%, height: 100%)
  return (
    <canvas 
      ref={canvasRef} 
      id="math-canvas" 
      style={{ width: '100%', height: '100%', display: 'block' }} 
    />
  );
}
