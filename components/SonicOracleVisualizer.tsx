import React from "react";

interface Props {
  bpmSpeed?: number;
  amplitude?: number;
  isErratic?: boolean;
  isIdle?: boolean;
}

export default function SonicOracleVisualizer({
  bpmSpeed = 16,
  amplitude = 0.05,
  isErratic = false,
  isIdle = true
}: Props) {
  return (
    <div className="sonic-oracle-container" style={{ width: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .visualizer-window {
          width: 100%;
          height: 160px;
          position: relative;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, transparent 100%);
          overflow: hidden;
          transition: opacity 1s ease;
        }
        
        .visualizer-window.idle { animation: breathe 4s ease-in-out infinite alternate; }

        .svg-canvas {
          width: 1800px;
          height: 100%;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .wave-group {
          transform-origin: 50% 100px; 
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .wave-group.erratic { animation: stringJitter 0.08s infinite alternate; }

        .string {
          fill: none;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke; 
        }

        .s-wave1 {
          stroke: #4a3520; stroke-width: 1px; opacity: 0.5;
          animation: drift calc(var(--bpm-speed) * 1.5) linear infinite;
        }
        .s-wave2 {
          stroke: #8a6a4a; stroke-width: 0.8px; opacity: 0.7;
          animation: drift-reverse var(--bpm-speed) linear infinite;
        }
        .s-wave3 {
          stroke: #d4b896; stroke-width: 0.5px; opacity: 0.9;
          filter: drop-shadow(0 0 3px rgba(212,184,150,0.4));
          animation: drift calc(var(--bpm-speed) * 0.8) linear infinite;
        }

        @keyframes drift { 0% { transform: translateX(0); } 100% { transform: translateX(-600px); } }
        @keyframes drift-reverse { 0% { transform: translateX(-600px); } 100% { transform: translateX(0); } }
        @keyframes breathe { 0% { opacity: 0.3; } 100% { opacity: 0.7; } }
        
        @keyframes stringJitter {
          0% { transform: scaleY(var(--amp)); }
          100% { transform: scaleY(calc(var(--amp) * 1.15)); }
        }
      `}} />
      <div 
        className={`visualizer-window ${isIdle ? 'idle' : ''}`}
        style={{ '--bpm-speed': `${bpmSpeed}s`, '--amp': amplitude } as React.CSSProperties}
      >
        <svg viewBox="0 0 1800 200" className="svg-canvas" preserveAspectRatio="none">
          <path stroke="#1a1208" strokeWidth="0.5" opacity="0.3" fill="none" d="M 0 100 L 1800 100" />
          <g className={`wave-group ${isErratic && !isIdle ? 'erratic' : ''}`} style={{ transform: `scaleY(var(--amp))` }}>
            <path className="string s-wave1" d="M 0 100 Q 150 0, 300 100 T 600 100 T 900 100 T 1200 100 T 1500 100 T 1800 100" />
            <path className="string s-wave2" d="M 0 100 Q 75 200, 150 100 T 300 100 T 450 100 T 600 100 T 750 100 T 900 100 T 1050 100 T 1200 100 T 1350 100 T 1500 100 T 1650 100 T 1800 100" />
            <path className="string s-wave3" d="M 0 100 Q 50 30, 100 100 T 200 100 T 300 100 T 400 100 T 500 100 T 600 100 T 700 100 T 800 100 T 900 100 T 1000 100 T 1100 100 T 1200 100 T 1300 100 T 1400 100 T 1500 100 T 1600 100 T 1700 100 T 1800 100" />
          </g>
        </svg>
      </div>
    </div>
  );
}
