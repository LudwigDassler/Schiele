"use client";
import { useEffect, useRef, useState } from "react";

export default function MetalLoader() {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  function createParticle() {
    if (!particlesRef.current) return;
    const particle = document.createElement("div");
    particle.className = "particle";
    const left = Math.random() * 100;
    particle.style.left = left + "%";
    particle.style.bottom = "-10px";
    const size = Math.random() * 5 + 3;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particlesRef.current.appendChild(particle);
    setTimeout(() => {
      if (particle.parentNode) particle.remove();
    }, 3800);
  }

  useEffect(() => {
    // Прогресс
    const timer1 = setTimeout(() => setProgress(100), 100);

    // Заголовок
    const timer2 = setTimeout(() => setTitleVisible(true), 600);

    // Частицы
    const particleInterval = setInterval(() => {
      createParticle();
    }, 45);

    // Завершение
    const timer3 = setTimeout(() => {
      setLoaded(true);
      if (containerRef.current) {
        containerRef.current.style.boxShadow = "0 0 60px #c9a66b";
      }
    }, 2800);

    // Очистка
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&family=Cinzel+Decorative:wght@700&display=swap');

        .loader-container {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: radial-gradient(circle at center, #1a0f08 0%, #0a0503 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Cinzel Decorative', cursive;
          color: #c9a66b;
        }

        .loader-inner {
          position: relative;
          width: 420px;
          height: 420px;
          border: 8px solid #3c2f2f;
          border-image: linear-gradient(45deg, #8b0000, #c9a66b, #8b0000) 1;
          box-shadow: 
            0 0 40px #8b0000,
            inset 0 0 60px rgba(0, 0, 0, 0.9),
            0 0 80px rgba(139, 0, 0, 0.6);
          border-radius: 8px;
          overflow: hidden;
          transition: box-shadow 1.2s ease;
        }

        .image-wrapper {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease-in-out;
          background-size: cover;
          background-position: center;
          filter: contrast(1.1) saturate(1.3);
        }
        .image-wrapper.loaded {
          opacity: 1;
        }

        .loader-inner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            linear-gradient(transparent, rgba(10, 5, 3, 0.85)),
            url('https://picsum.photos/id/1015/800/800') center/cover;
          opacity: 0.6;
          mix-blend-mode: multiply;
          pointer-events: none;
        }

        .runes {
          position: absolute;
          inset: 0;
          background: repeating-radial-gradient(
            circle at 30% 40%,
            transparent 0,
            rgba(201, 166, 107, 0.15) 4px,
            transparent 8px
          );
          animation: runePulse 4s linear infinite;
          pointer-events: none;
          opacity: 0.7;
        }

        @keyframes runePulse {
          0% { background-position: 0 0; opacity: 0.4; }
          50% { opacity: 0.9; }
          100% { background-position: 120px 120px; opacity: 0.4; }
        }

        .title {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'UnifrakturCook', cursive;
          font-size: 42px;
          text-shadow: 
            0 0 10px #8b0000,
            0 0 20px #8b0000,
            4px 4px 0 #000;
          letter-spacing: 6px;
          z-index: 10;
          white-space: nowrap;
          animation: titleFlicker 2.5s infinite alternate;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        .title.visible {
          opacity: 0.9;
        }

        @keyframes titleFlicker {
          0% { opacity: 0.7; transform: translate(-50%, -50%) rotate(-2deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) rotate(2deg); }
        }

        .progress-bar {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 6px;
          background: #3c2f2f;
          border: 2px solid #c9a66b;
          border-radius: 2px;
          overflow: hidden;
          box-shadow: 0 0 15px #8b0000;
        }

        .progress {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #8b0000, #c9a66b, #8b0000);
          transition: width 2.8s cubic-bezier(0.25, 0.1, 0.25, 1);
          box-shadow: 0 0 12px #ffcc00;
        }

        .particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ffcc00;
          border-radius: 50%;
          box-shadow: 0 0 8px #ff9900;
          animation: particleFloat 3.5s linear forwards;
          opacity: 0;
        }

        @keyframes particleFloat {
          0% { transform: translateY(0) scale(1); opacity: 0.9; }
          100% { transform: translateY(-280px) scale(0.2); opacity: 0; }
        }
      `}</style>

      <div className="loader-container">
        <div className="loader-inner" ref={containerRef}>
          <div className={`image-wrapper ${loaded ? 'loaded' : ''}`} style={{ backgroundImage: `url('/home/workdir/attachments/220131_r39778_rd.webp')` }} />
          <div className="runes" />
          <div className={`title ${titleVisible ? 'visible' : ''}`}>RUSH</div>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }} />
          </div>
          <div className="particles" ref={particlesRef} />
        </div>
      </div>
    </>
  );
}