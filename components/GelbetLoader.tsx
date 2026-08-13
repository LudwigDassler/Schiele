"use client";
import { useEffect, useState } from "react";

export default function GelbetLoader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 1. Вдох (Старт медленного луча)
    const t1 = setTimeout(() => setPhase(1), 50);   
    // 2. Удар: ядро мягко загорается, плавный выдох спектра
    const t2 = setTimeout(() => setPhase(2), 1400); 
    // 3. Проявление приглушенной типографики
    const t3 = setTimeout(() => setPhase(3), 1800);
    // 4. Начало затухания экрана (уход в темноту)
    const t4 = setTimeout(() => setPhase(4), 3800);
    // 5. Unmount
    const t5 = setTimeout(onComplete, 4600);        
    
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[99999] bg-[#000000] flex items-center justify-center transition-opacity duration-700 ease-in-out ${phase === 4 ? 'opacity-0' : 'opacity-100'}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;600;700&display=swap');
        
        .prism-beam {
            position: absolute; height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0.8) 100%);
            top: 50%; left: 0; width: 50%;
            transform-origin: left; transform: scaleX(0);
            transition: transform 1.4s ease-in-out;
            box-shadow: 0 0 8px rgba(255,255,255,0.3); z-index: 2;
        }
        .prism-beam.active { transform: scaleX(1); }

        .optical-sphere {
            position: absolute; left: 50%; top: 50%;
            width: 26px; height: 26px; border-radius: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.9) 80%);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: inset -2px 0 6px rgba(255,255,255,0.05), 0 0 10px rgba(0,0,0,0.9);
            backdrop-filter: blur(4px);
            z-index: 10;
        }

        .sphere-core-light {
            position: absolute; inset: 0; border-radius: 50%;
            background: radial-gradient(ellipse 70% 50% at 50% 50%, rgba(180,140,255,0.5) 0%, rgba(100,30,200,0.2) 60%, transparent 80%);
            opacity: 0; transform: scaleX(0.7);
            transition: opacity 1.2s ease-out, transform 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            mix-blend-mode: screen;
        }
        .optical-sphere.lit .sphere-core-light {
            opacity: 1; transform: scaleX(1.05);
        }

        .svg-container {
            position: absolute; left: 50%; top: 50%;
            width: 50vw; height: 400px;
            transform: translateY(-50%); z-index: 5; pointer-events: none;
        }
        .fluid-path {
            fill: none; stroke-width: 1.5px; stroke-linecap: round;
            stroke-dasharray: 2000; stroke-dashoffset: 2000;
            transition: stroke-dashoffset 2.4s cubic-bezier(0.25, 1, 0.3, 1);
        }
        .svg-container.active .fluid-path { stroke-dashoffset: 0; }

        #p-red { stroke: rgba(255,0,64,0.9); filter: drop-shadow(0 0 3px rgba(255,0,64,0.3)); }
        #p-org { stroke: rgba(255,102,0,0.9); filter: drop-shadow(0 0 3px rgba(255,102,0,0.3)); }
        #p-yel { stroke: rgba(255,204,0,0.9); filter: drop-shadow(0 0 3px rgba(255,204,0,0.3)); }
        #p-grn { stroke: rgba(0,255,119,0.9); filter: drop-shadow(0 0 3px rgba(0,255,119,0.3)); }
        #p-blu { stroke: rgba(0,136,255,0.9); filter: drop-shadow(0 0 3px rgba(0,136,255,0.3)); }
        #p-pur { stroke: rgba(170,0,255,0.9); filter: drop-shadow(0 0 3px rgba(170,0,255,0.3)); }

        .loader-logo {
            position: absolute; top: calc(50% + 90px); left: 50%;
            transform: translateX(-50%);
            color: rgba(212, 184, 150, 0.55); 
            font-size: 22px; font-weight: 400;
            letter-spacing: 0.1em; padding-left: 0.1em; 
            opacity: 0; filter: blur(6px);
            transition: opacity 1.8s ease, filter 1.8s ease, letter-spacing 2.5s cubic-bezier(0.2, 0.8, 0.2, 1), padding-left 2.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            text-shadow: 0 0 10px rgba(212, 184, 150, 0.15); z-index: 20;
            font-family: 'Syncopate', sans-serif;
        }
        .loader-logo.active {
            opacity: 1; filter: blur(0);
            letter-spacing: 0.8em; padding-left: 0.8em;
        }
      `}} />

      <div className={`prism-beam ${phase >= 1 ? 'active' : ''}`}></div>
      
      <div className={`optical-sphere ${phase >= 2 ? 'lit' : ''}`}>
          <div className="sphere-core-light"></div>
      </div>
      
      <div className={`svg-container ${phase >= 2 ? 'active' : ''}`}>
          <svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <path id="p-red" className="fluid-path" d="M 0 200 C 150 200, 350 120, 1000 0" />
              <path id="p-org" className="fluid-path" d="M 0 200 C 180 200, 400 150, 1000 80" />
              <path id="p-yel" className="fluid-path" d="M 0 200 C 210 200, 450 180, 1000 160" />
              <path id="p-grn" className="fluid-path" d="M 0 200 C 210 200, 450 220, 1000 240" />
              <path id="p-blu" className="fluid-path" d="M 0 200 C 180 200, 400 250, 1000 320" />
              <path id="p-pur" className="fluid-path" d="M 0 200 C 150 200, 350 280, 1000 400" />
          </svg>
      </div>
      
      <div className={`loader-logo ${phase >= 3 ? 'active' : ''}`}>GELBET</div>
    </div>
  );
}
