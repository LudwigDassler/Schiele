"use client";
import { useEffect, useRef, useState } from "react";

export default function GelbetLoader({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [fading, setFading] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const logoEl = logoRef.current;
    if (!canvas || !logoEl) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function finish(){
      setFading(true);
      setTimeout(() => {
        onCompleteRef.current();
      }, 1250);
    }

    if(reduceMotion){
      requestAnimationFrame(() => { logoEl.classList.add('show'); });
      const tmr = setTimeout(finish, 1500);
      return () => clearTimeout(tmr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const lineCanvas = document.createElement('canvas');
    const lctx = lineCanvas.getContext('2d');
    if (!lctx) return;

    let lines: any[] = [];
    let lineSpacing: number;
    let dropStart = { x: 0, y: 0 }, dropEnd = { x: 0, y: 0 };
    const SAMPLE_STEP = 6;
    let sampleX: Float32Array, sampleY: Float32Array;

    function resize(){
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width  = W * DPR; canvas!.height = H * DPR;
      lineCanvas.width = W * DPR; lineCanvas.height = H * DPR;
      ctx!.setTransform(DPR,0,0,DPR,0,0);
      lctx!.setTransform(DPR,0,0,DPR,0,0);

      lineSpacing = Math.max(8, Math.round(H / 80));
      lines = [];
      for(let y = -lineSpacing * 2; y < H + lineSpacing * 2; y += lineSpacing){
        lines.push({ baseY: y, phase: Math.random() * Math.PI * 2 });
      }

      const maxSamples = Math.ceil((W + SAMPLE_STEP*2) / SAMPLE_STEP) + 4;
      sampleX = new Float32Array(maxSamples);
      sampleY = new Float32Array(maxSamples);

      const ballR = Math.max(22, Math.min(W,H) * 0.05);
      dropStart = { x: W * 0.5, y: -ballR * 3 };
      dropEnd   = { x: W * 0.5, y: H * 0.5 };
    }
    resize();
    window.addEventListener('resize', resize);

    const T_DROP_START  = 200;
    const T_DROP_END    = 5200;
    const T_BALL_FADE_1 = 5300;
    const T_BALL_FADE_2 = 6400;
    const T_LOGO_START  = 5400;
    const T_FINISH      = 7800;

    function clamp01(t: number){ return Math.max(0, Math.min(1, t)); }
    function dropEase(p: number){ return 0.5 - 0.5 * Math.cos(p * Math.PI); }

    function getOffset(x: number, baseY: number, ballX: number, ballY: number, ballR: number, now: number) {
      const dx = x - ballX;
      const dy = baseY - ballY;
      const r = Math.hypot(dx, dy);
      const R = ballR * 1.8;
      const frontFactor = 0.5 + 0.5 * Math.tanh(dy / (R * 0.8));
      const backFactor  = 1 - frontFactor;
      const pushFront = R * 0.8 * Math.exp(-(dx*dx + dy*dy) / (R*R * 1.2));
      const wakeDepth = Math.abs(dy);
      const wakeWidth = R * (1.0 + backFactor * wakeDepth * 0.0015);
      const pushBack = -R * 1.1 * Math.exp(-(dx*dx) / (wakeWidth*wakeWidth)) * Math.exp(-wakeDepth/1800);
      let ripple = 0;
      if (dy < 0) {
        const phase = wakeDepth * 0.035 - now * 0.0025;
        const wobble = Math.sin(phase) * (R * 0.45) * Math.exp(-wakeDepth / 900);
        ripple = wobble * Math.sin(dx / wakeWidth * Math.PI) * Math.exp(-(dx*dx)/(wakeWidth*wakeWidth*1.5));
      }
      let d = frontFactor * pushFront + backFactor * pushBack + ripple;
      const coreR = ballR * 1.05;
      if (r < coreR) {
        const penetration = coreR - r;
        d += (dy === 0 ? 1 : Math.sign(dy)) * penetration * 1.1;
      }
      return d;
    }

    let t0: number | null = null;
    let ballY = dropStart.y;
    let running = true;
    let logoShown = false;
    let reqId: number;

    function drawLines(now: number, ballR: number){
      lctx!.clearRect(0,0,W,H);
      lctx!.lineCap = 'round';
      lctx!.lineJoin = 'round';
      const step = SAMPLE_STEP;
      const drift = now * 0.00015;
      for(let i=0; i<lines.length; i++){
        const ln = lines[i];
        let n = 0;
        let maxAbs = 0;
        for(let x = -step; x <= W+step; x += step){
          const d = getOffset(x, ln.baseY, dropEnd.x, ballY, ballR, now);
          const ambient = Math.sin(x*0.004 + ln.phase + drift) * 1.5;
          sampleX[n] = x;
          sampleY[n] = ln.baseY + d + ambient;
          if(Math.abs(d) > maxAbs) maxAbs = Math.abs(d);
          n++;
        }
        lctx!.beginPath();
        lctx!.moveTo(sampleX[0], sampleY[0]);
        for(let k=1; k<n-1; k++){
          const mx = (sampleX[k] + sampleX[k+1]) * 0.5;
          const my = (sampleY[k] + sampleY[k+1]) * 0.5;
          lctx!.quadraticCurveTo(sampleX[k], sampleY[k], mx, my);
        }
        lctx!.lineTo(sampleX[n-1], sampleY[n-1]);
        const deformIntensity = clamp01(maxAbs / (ballR * 1.5));
        lctx!.strokeStyle = `rgba(200, 140, 95, ${0.07 + deformIntensity * 0.35})`;
        lctx!.lineWidth = 1.0 + deformIntensity * 1.4;
        lctx!.stroke();
      }
      if (ballY > dropStart.y) {
        lctx!.save();
        lctx!.globalCompositeOperation = 'source-atop';
        lctx!.filter = 'blur(24px)';
        const grad = lctx!.createLinearGradient(dropEnd.x, dropStart.y, dropEnd.x, dropEnd.y);
        grad.addColorStop(0, 'rgba(125,58,78,0.7)');
        grad.addColorStop(1, 'rgba(187,113,46,0.85)');
        lctx!.strokeStyle = grad;
        lctx!.lineWidth = ballR * 1.6;
        lctx!.beginPath();
        lctx!.moveTo(dropEnd.x, dropStart.y);
        lctx!.lineTo(dropEnd.x, ballY);
        lctx!.stroke();
        lctx!.restore();
      }
    }

    function drawBall(x: number, y: number, r: number, alpha: number){
      if(alpha <= 0) return;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.translate(x, y);
      const grad = ctx!.createRadialGradient(-r*0.3, -r*0.4, r*0.1, 0, 0, r);
      grad.addColorStop(0, '#c2926a');
      grad.addColorStop(0.35, '#452b1e');
      grad.addColorStop(1, '#0f0a07');
      ctx!.shadowColor = 'rgba(0,0,0,0.8)';
      ctx!.shadowBlur = r * 0.8;
      ctx!.shadowOffsetY = r * 0.2;
      ctx!.beginPath();
      ctx!.arc(0,0,r,0,Math.PI*2);
      ctx!.fillStyle = grad;
      ctx!.fill();
      ctx!.globalCompositeOperation = 'screen';
      const rim = ctx!.createRadialGradient(0,0,r*0.7, 0,0,r*1.05);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(1, 'rgba(180,100,60,0.3)');
      ctx!.fillStyle = rim;
      ctx!.fill();
      ctx!.restore();
    }

    function frame(ts: number){
      if(t0 === null) t0 = ts;
      const t = ts - t0;
      const ballR = Math.max(22, Math.min(W,H) * 0.05);

      ctx!.clearRect(0,0,W,H);

      const dropT = clamp01((t - T_DROP_START) / (T_DROP_END - T_DROP_START));
      ballY = dropStart.y + (dropEnd.y - dropStart.y) * dropEase(dropT);

      drawLines(t, ballR);
      ctx!.drawImage(lineCanvas, 0, 0, W, H);

      let ballAlpha = 1;
      if(t > T_BALL_FADE_1){
        ballAlpha = 1 - clamp01((t - T_BALL_FADE_1) / (T_BALL_FADE_2 - T_BALL_FADE_1));
        ballAlpha = 0.08 + ballAlpha * 0.92;
      }

      drawBall(dropEnd.x, ballY, ballR, ballAlpha);

      if(t >= T_LOGO_START && !logoShown){
        logoShown = true;
        logoEl!.classList.add('show');
      }
      if(t >= T_FINISH && running){
        running = false;
        finish();
      }
      if(t < T_FINISH + 300 && running){
        reqId = requestAnimationFrame(frame);
      }
    }

    reqId = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <style>{`
        :root{
          --bg-deep:   #0a070f;
          --bg-mid:    #180f1e;
          --warm-glow: rgba(165,84,30,0.20);
          --logo-color:#e9e3ea;
          --logo-glow: rgba(160,95,60,0.5);
        }
        .gelbet-loader {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow: hidden;
          background:
            radial-gradient(46% 40% at 50% 50%, var(--warm-glow), transparent 68%),
            radial-gradient(120% 100% at 50% 26%, var(--bg-mid), var(--bg-deep) 72%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 1200ms cubic-bezier(.45,0,.2,1);
          opacity: ${fading ? 0 : 1};
          pointer-events: ${fading ? 'none' : 'auto'};
        }
        .gelbet-loader canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .gelbet-loader .grain {
          position:absolute; inset:0;
          pointer-events:none;
          opacity:.045;
          mix-blend-mode: overlay;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .gelbet-loader .vignette {
          position:absolute; inset:0;
          pointer-events:none;
          background: radial-gradient(120% 100% at 50% 50%, transparent 42%, rgba(4,2,8,.72) 100%);
        }
        .gelbet-logo {
          position:absolute;
          left:50%; top:50%;
          transform: translate(-50%,-50%) scale(1.07);
          opacity:0;
          filter: blur(10px);
          font-family:'Poppins', sans-serif;
          font-weight:300;
          font-size: clamp(26px, 5.4vw, 58px);
          letter-spacing: .46em;
          text-indent: .46em;
          color: var(--logo-color);
          text-shadow: 0 0 34px var(--logo-glow), 0 0 80px rgba(120,70,50,.28);
          white-space: nowrap;
          user-select:none;
          transition:
            opacity 1500ms cubic-bezier(.33,.01,.15,1),
            transform 1700ms cubic-bezier(.33,.01,.15,1),
            filter 1500ms cubic-bezier(.33,.01,.15,1);
        }
        .gelbet-logo.show {
          transform: translate(-50%,-50%) scale(1);
          opacity:1;
          filter: blur(0);
        }
        @supports ((background-clip:text) or (-webkit-background-clip:text)){
          .gelbet-logo {
            color: transparent;
            background-image: linear-gradient(120deg,#eee8e4 0%, #e0bd93 42%, #d38b46 58%, #efe8e3 100%);
            background-size: 240% 100%;
            background-position: 0% 0%;
            -webkit-background-clip: text;
            background-clip: text;
            animation: gelbet-sheen 7s ease-in-out infinite;
            animation-play-state: paused;
          }
          .gelbet-logo.show { animation-play-state: running; }
        }
        @keyframes gelbet-sheen {
          0%,100%{ background-position: 0% 0%; }
          50%{ background-position: 100% 0%; }
        }
        @media (prefers-reduced-motion: reduce){
          .gelbet-loader canvas { display:none; }
          .gelbet-logo {
            transform: translate(-50%,-50%) scale(1);
            opacity: 1;
            filter: blur(0);
            transition: opacity 500ms ease;
            animation: none !important;
          }
        }
      `}</style>
      <div className="gelbet-loader">
        <canvas ref={canvasRef}></canvas>
        <div className="vignette"></div>
        <div className="grain"></div>
        <div className="gelbet-logo" ref={logoRef}>GELBET</div>
      </div>
    </>
  );
}