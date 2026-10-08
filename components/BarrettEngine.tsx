"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
type ToolCategory = "SELECT" | "PAN" | "PEN" | "ERASER" | "SHAPE" | "TEXT";
type ShapeType = "RECTANGLE" | "ELLIPSE" | "POLYGON" | "STAR" | "ARROW" | "LINE";
type LayerType = "IMAGE" | "PATH" | "TEXT" | ShapeType;
type BlendMode = "source-over" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "difference" | "exclusion" | "destination-out" | "hue" | "saturation" | "color" | "luminosity";

interface VectorPoint { x: number; y: number; }

interface CanvasLayer {
  id: string; name: string; type: LayerType;
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; visible: boolean; locked: boolean; blendMode: BlendMode;
  
  fill?: string; stroke?: string; strokeWidth?: number; cornerRadius?: number; sides?: number; 
  shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number; blur?: number;

  src?: string; 
  imageObj?: HTMLImageElement; 
  originalImageData?: ImageData; 
  
  bgTolerance?: number; autoBgRemoved?: boolean;
  brightness?: number; contrast?: number; saturation?: number; hue?: number; sepia?: number; invert?: number; grayscale?: number;
  twirl?: number; bulge?: number; 
  
  points?: VectorPoint[];
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: string; textAlign?: "left" | "center" | "right";
}

interface Props {
  query?: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void | Promise<void>;
}

// ==========================================
// СЖАТЫЕ ИКОНКИ ДЛЯ ПЛОТНОГО UI
// ==========================================
const I = {
  Sel: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  Pan: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"/></svg>,
  Pen: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>,
  Erase: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/><line x1="6" y1="11" x2="15" y2="20"/></svg>,
  Shape: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/></svg>,
  Txt: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Img: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Magic: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 21.5l14-14M17 3l4 4M21 11.5v-2M15 5.5h-2M3 13.5v-2M9 7.5h-2M19 19.5v-2M13 21.5h-2"/></svg>,
  Warp: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M4 12c4 0 4 4 8 4s4-4 8-4"/></svg>,
  Eye: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Lock: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Trash: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Dup: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Undo: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>,
  Redo: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>,
  AlignLeft: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  AlignCenter: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="17" y1="18" x2="7" y2="18"/></svg>,
  AlignRight: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  Up: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  Down: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

const FONTS = [
  "Inter", "Roboto", "Montserrat", "Open Sans", "Poppins", "Lato",
  "Playfair Display", "Merriweather", "Georgia", 
  "Courier New", "Monaco", "Pacifico", "Impact", "Comic Sans MS"
];

function clip(v: number, min = 0.0, max = 1.0): number { return Math.max(min, Math.min(max, v)); }
function generateId() { return Math.random().toString(36).substr(2, 9); }

// ==========================================
// MAIN COMPONENT: OMNI STUDIO 7.0
// ==========================================
export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI Состояния
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("SELECT");
  const [activeShape, setActiveShape] = useState<ShapeType>("RECTANGLE");
  
  const [currentColor, setCurrentColor] = useState<string>("#e5e5e5");
  const [currentStrokeColor, setCurrentStrokeColor] = useState<string>("#3b82f6");
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(4);
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#111111"); 

  const [layersUI, setLayersUI] = useState<CanvasLayer[]>([]);
  const [selectedIdUI, setSelectedIdUI] = useState<string | null>(null);
  
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // CORE ENGINE
  const engine = useRef({
    layers: [] as CanvasLayer[],
    selectedId: null as string | null,
    viewport: { x: 0, y: 0, scale: 1 },
    canvasWidth: 1920, canvasHeight: 1080,
    isPanning: false, isDrawing: false, isDraggingObject: false, isResizingObject: false, isRotatingObject: false,
    resizeHandle: null as string | null, 
    startX: 0, startY: 0, lastX: 0, lastY: 0,
    liveLayer: null as CanvasLayer | null,
    historyStack: [] as string[], historyIndex: -1,
  });

  const syncUI = useCallback(() => {
    setLayersUI([...engine.current.layers]);
    setSelectedIdUI(engine.current.selectedId);
  }, []);

  const saveHistory = useCallback(() => {
    const state = engine.current;
    if (state.historyIndex < state.historyStack.length - 1) {
      state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
    }
    
    // Очищаем DOM объекты для localStorage, оставляем только base64 (src)
    const serializableLayers = state.layers.map(l => {
      const copy = { ...l };
      delete copy.imageObj; delete copy.originalImageData;
      return copy;
    });

    const jsonState = JSON.stringify({ w: state.canvasWidth, h: state.canvasHeight, bg: canvasBgColor, layers: serializableLayers });
    state.historyStack.push(jsonState);
    if (state.historyStack.length > 20) state.historyStack.shift(); // Меньше лимит, чтобы не забить память
    else state.historyIndex++;
    
    try { localStorage.setItem("omni-studio-pro", jsonState); } catch (e) { console.warn("Quota exceeded"); }
  }, [canvasBgColor]);

  const loadStateFromJson = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      engine.current.canvasWidth = parsed.w || 1920; engine.current.canvasHeight = parsed.h || 1080;
      if (parsed.bg) setCanvasBgColor(parsed.bg);
      
      const newLayers: CanvasLayer[] = parsed.layers || [];
      
      newLayers.forEach(nl => {
        if (nl.type === "IMAGE" && nl.src) {
          const img = new Image();
          img.onload = () => { 
            nl.imageObj = img;
            const cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height;
            const ctx = cvs.getContext('2d');
            if (ctx) { ctx.drawImage(img, 0, 0); nl.originalImageData = ctx.getImageData(0, 0, img.width, img.height); }
            if (nl.bgTolerance || nl.twirl || nl.bulge || nl.autoBgRemoved) processImagePixels(nl);
            syncUI(); 
          };
          img.src = nl.src;
        }
      });
      
      engine.current.layers = newLayers; engine.current.selectedId = null; syncUI();
    } catch (e) {}
  }, [syncUI]);

  const handleUndo = useCallback(() => {
    const state = engine.current;
    if (state.historyIndex > 0) {
      state.historyIndex--; loadStateFromJson(state.historyStack[state.historyIndex]);
    }
  }, [loadStateFromJson]);

  const handleRedo = useCallback(() => {
    const state = engine.current;
    if (state.historyIndex < state.historyStack.length - 1) {
      state.historyIndex++; loadStateFromJson(state.historyStack[state.historyIndex]);
    }
  }, [loadStateFromJson]);

  // ЦЕНТРОВКА ХОЛСТА ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth; const ch = containerRef.current.clientHeight;
    
    const savedState = localStorage.getItem("omni-studio-pro");
    if (savedState) {
      loadStateFromJson(savedState); engine.current.historyStack = [savedState]; engine.current.historyIndex = 0;
    } else { saveHistory(); }

    const scale = Math.min((cw - 120) / engine.current.canvasWidth, (ch - 120) / engine.current.canvasHeight, 1);
    engine.current.viewport = { x: (cw - engine.current.canvasWidth * scale) / 2, y: (ch - engine.current.canvasHeight * scale) / 2, scale };
  }, [saveHistory, loadStateFromJson]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelectedLayer(); }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelectedLayer(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, editingTextId]);

  // ==========================================
  // IMAGE PROCESSING (БЕЗ ОБРЕЗАНИЯ И ПОРЧИ РАЗРЕШЕНИЯ)
  // ==========================================
  const processImagePixels = (layer: CanvasLayer) => {
    if (!layer.originalImageData) return;
    const w = layer.originalImageData.width; const h = layer.originalImageData.height;
    
    const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d')!;
    ctx.putImageData(layer.originalImageData, 0, 0);
    
    let imgData = ctx.getImageData(0, 0, w, h);
    let data = imgData.data;

    // 1. LIQUIFY
    if (layer.twirl || layer.bulge) {
      const tempCvs = document.createElement('canvas'); tempCvs.width = w; tempCvs.height = h;
      const tempCtx = tempCvs.getContext('2d')!; tempCtx.putImageData(imgData, 0, 0);
      const srcData = tempCtx.getImageData(0, 0, w, h).data;
      const cx = w / 2; const cy = h / 2; const radius = Math.min(w, h) / 2;
      const twirlAngle = (layer.twirl || 0) * Math.PI / 180; const bulge = layer.bulge || 0; 

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let dx = x - cx; let dy = y - cy; let r = Math.sqrt(dx * dx + dy * dy); let a = Math.atan2(dy, dx);
          if (r < radius) {
            a += twirlAngle * ((radius - r) / radius);
            if (bulge !== 0) { let rn = r / radius; rn = Math.pow(rn, Math.exp(-bulge * 2)); r = rn * radius; }
            dx = r * Math.cos(a); dy = r * Math.sin(a);
          }
          const sx = Math.max(0, Math.min(w - 1, Math.round(cx + dx))); const sy = Math.max(0, Math.min(h - 1, Math.round(cy + dy)));
          const dstIdx = (y * w + x) * 4; const srcIdx = (sy * w + sx) * 4;
          data[dstIdx] = srcData[srcIdx]; data[dstIdx+1] = srcData[srcIdx+1]; data[dstIdx+2] = srcData[srcIdx+2]; data[dstIdx+3] = srcData[srcIdx+3];
        }
      }
    }

    // 2. MAGIC ERASER
    if (layer.autoBgRemoved || (layer.bgTolerance && layer.bgTolerance > 0)) {
      const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
      let rSum = 0, gSum = 0, bSum = 0;
      corners.forEach(idx => { rSum+=data[idx]; gSum+=data[idx+1]; bSum+=data[idx+2]; });
      const bgR = rSum/4, bgG = gSum/4, bgB = bSum/4;
      const tol = layer.autoBgRemoved ? 45 : (layer.bgTolerance || 0);
      
      for (let i = 0; i < data.length; i += 4) {
        const distance = Math.sqrt(Math.pow(data[i]-bgR,2) + Math.pow(data[i+1]-bgG,2) + Math.pow(data[i+2]-bgB,2));
        if (distance < tol) data[i + 3] = 0; 
        else if (distance < tol + 20) data[i + 3] = ((distance - tol) / 20) * data[i + 3];
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const newImg = new Image();
    newImg.onload = () => { layer.imageObj = newImg; syncUI(); };
    newImg.src = cvs.toDataURL("image/png");
  };

  const handleAutoBgRemove = () => {
    if (!engine.current.selectedId) return;
    const layer = engine.current.layers.find(l => l.id === engine.current.selectedId);
    if (layer && layer.type === "IMAGE") {
      layer.autoBgRemoved = true; layer.bgTolerance = 45;
      processImagePixels(layer); saveHistory();
    }
  };

  // ==========================================
  // РЕНДЕР ЦИКЛ CANVAS
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let animId = 0;

    const render = () => {
      const state = engine.current;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr);
      }

      ctx.fillStyle = "#18181B"; // Darker UI background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(state.viewport.x, state.viewport.y); ctx.scale(state.viewport.scale, state.viewport.scale);

      // Artboard shadow
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 15;
      ctx.fillStyle = canvasBgColor; ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
      ctx.shadowColor = "transparent";

      const layersToDraw = [...state.layers]; if (state.liveLayer) layersToDraw.push(state.liveLayer);

      layersToDraw.forEach(layer => {
        if (!layer.visible) return;
        ctx.save();
        ctx.globalAlpha = layer.opacity / 100; ctx.globalCompositeOperation = layer.blendMode || "source-over";

        const cx = layer.x + layer.width / 2; const cy = layer.y + layer.height / 2;
        ctx.translate(cx, cy); ctx.rotate((layer.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);

        if (layer.shadowColor && layer.shadowBlur) {
          ctx.shadowColor = layer.shadowColor; ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = layer.shadowOffsetX || 0; ctx.shadowOffsetY = layer.shadowOffsetY || 0;
        }
        
        if (layer.type === "IMAGE") {
          let filterStr = "";
          if (layer.brightness !== undefined && layer.brightness !== 100) filterStr += `brightness(${layer.brightness}%) `;
          if (layer.contrast !== undefined && layer.contrast !== 100) filterStr += `contrast(${layer.contrast}%) `;
          if (layer.saturation !== undefined && layer.saturation !== 100) filterStr += `saturate(${layer.saturation}%) `;
          if (layer.hue && layer.hue !== 0) filterStr += `hue-rotate(${layer.hue}deg) `;
          if (layer.sepia && layer.sepia > 0) filterStr += `sepia(${layer.sepia}%) `;
          if (layer.invert && layer.invert > 0) filterStr += `invert(${layer.invert}%) `;
          if (layer.grayscale && layer.grayscale > 0) filterStr += `grayscale(${layer.grayscale}%) `;
          if (layer.blur && layer.blur > 0) filterStr += `blur(${layer.blur}px) `;
          if (filterStr) ctx.filter = filterStr.trim();
        } else if (layer.blur && layer.blur > 0) { ctx.filter = `blur(${layer.blur}px)`; }

        ctx.fillStyle = layer.fill || "transparent"; ctx.strokeStyle = layer.stroke || "transparent"; ctx.lineWidth = layer.strokeWidth || 0; ctx.lineCap = "round"; ctx.lineJoin = "round";

        const w2 = layer.width/2; const h2 = layer.height/2;

        if (layer.type === "RECTANGLE") { ctx.beginPath(); if (layer.cornerRadius && (ctx as any).roundRect) { (ctx as any).roundRect(layer.x, layer.y, layer.width, layer.height, layer.cornerRadius); } else { ctx.rect(layer.x, layer.y, layer.width, layer.height); } if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
        else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(w2), Math.abs(h2), 0, 0, Math.PI * 2); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
        else if (layer.type === "POLYGON") { ctx.beginPath(); const sides = layer.sides || 3; const r = Math.min(Math.abs(layer.width), Math.abs(layer.height)) / 2; for (let i = 0; i < sides; i++) { const a = (Math.PI * 2 * i) / sides - Math.PI / 2; if (i === 0) ctx.moveTo(layer.x + layer.width/2 + r * Math.cos(a), layer.y + layer.height/2 + r * Math.sin(a)); else ctx.lineTo(layer.x + layer.width/2 + r * Math.cos(a), layer.y + layer.height/2 + r * Math.sin(a)); } ctx.closePath(); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
        else if (layer.type === "STAR") { ctx.beginPath(); const points = layer.sides || 5; const outerR = Math.min(Math.abs(layer.width), Math.abs(layer.height)) / 2; const innerR = outerR * 0.4; for (let i = 0; i < points * 2; i++) { const r = i % 2 === 0 ? outerR : innerR; const a = (Math.PI * i) / points - Math.PI / 2; if (i === 0) ctx.moveTo(layer.x + layer.width/2 + r * Math.cos(a), layer.y + layer.height/2 + r * Math.sin(a)); else ctx.lineTo(layer.x + layer.width/2 + r * Math.cos(a), layer.y + layer.height/2 + r * Math.sin(a)); } ctx.closePath(); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
        else if (layer.type === "ARROW") { ctx.beginPath(); const hw = layer.strokeWidth || 4; const headL = Math.max(15, hw * 3); const headW = Math.max(15, hw * 3); const p1 = {x: layer.x, y: cy}; const p2 = {x: layer.x + layer.width, y: cy}; const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x - headL * Math.cos(angle - Math.PI/6), p2.y - headW * Math.sin(angle - Math.PI/6)); ctx.lineTo(p2.x - headL * Math.cos(angle + Math.PI/6), p2.y - headW * Math.sin(angle + Math.PI/6)); ctx.closePath(); ctx.fill(); }
        else if (layer.type === "LINE") { ctx.beginPath(); ctx.moveTo(layer.x, layer.y); ctx.lineTo(layer.x + layer.width, layer.y + layer.height); if (layer.strokeWidth) ctx.stroke(); }
        else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height); }
        else if (layer.type === "TEXT" && layer.text && editingTextId !== layer.id) { ctx.font = `${layer.fontWeight || "normal"} ${layer.fontSize}px ${layer.fontFamily || "Inter, sans-serif"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.textAlign = layer.textAlign || "left"; const textLines = layer.text.split('\n'); let tX = layer.x; if (layer.textAlign === "center") tX = cx; if (layer.textAlign === "right") tX = layer.x + layer.width; textLines.forEach((line, i) => { ctx.fillText(line, tX, layer.y + i * (layer.fontSize || 24) * 1.2); }); }
        else if (layer.type === "PATH" && layer.points && layer.points.length > 0) { ctx.beginPath(); ctx.moveTo(layer.points[0].x + layer.x, layer.points[0].y + layer.y); for (let i = 1; i < layer.points.length; i++) { ctx.lineTo(layer.points[i].x + layer.x, layer.points[i].y + layer.y); } if (layer.strokeWidth) ctx.stroke(); }

        ctx.restore();

        // Отрисовка Bounding Box (Выделение)
        if (state.selectedId === layer.id && !layer.locked && !editingTextId) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate((layer.rotation * Math.PI) / 180); 
          ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1.5 / state.viewport.scale; ctx.strokeRect(-w2, -h2, layer.width, layer.height);
          const hSize = 8 / state.viewport.scale; ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1.5 / state.viewport.scale;
          const drawHandle = (hx: number, hy: number) => { ctx.beginPath(); ctx.arc(hx, hy, hSize/2, 0, Math.PI*2); ctx.fill(); ctx.stroke(); };
          drawHandle(-w2, -h2); drawHandle(w2, -h2); drawHandle(-w2, h2); drawHandle(w2, h2); 
          ctx.beginPath(); ctx.moveTo(0, -h2); ctx.lineTo(0, -h2 - 25 / state.viewport.scale); ctx.stroke(); drawHandle(0, -h2 - 25 / state.viewport.scale);
          ctx.restore();
        }
      });
      ctx.restore(); animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render); return () => cancelAnimationFrame(animId);
  }, [canvasBgColor, editingTextId]);

  // ==========================================
  // ВЗАИМОДЕЙСТВИЕ С МЫШЬЮ
  // ==========================================
  const getCanvasPos = (e: React.PointerEvent) => {
    const state = engine.current; if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left - state.viewport.x) / state.viewport.scale, y: (e.clientY - rect.top - state.viewport.y) / state.viewport.scale };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editingTextId) return; 
    const state = engine.current;
    if (e.button === 1 || activeCategory === "PAN" || e.altKey || e.shiftKey) {
      state.isPanning = true; state.startX = e.clientX - state.viewport.x; state.startY = e.clientY - state.viewport.y; document.body.style.cursor = "grabbing"; return;
    }

    const pos = getCanvasPos(e); state.startX = pos.x; state.startY = pos.y; state.lastX = pos.x; state.lastY = pos.y;

    if (activeCategory === "SELECT") {
      if (state.selectedId) {
        const layer = state.layers.find(l => l.id === state.selectedId);
        if (layer && !layer.locked && layer.visible) {
          const hSize = 12 / state.viewport.scale; const cx = layer.x + layer.width/2; const cy = layer.y + layer.height/2;
          const rad = (-layer.rotation * Math.PI) / 180; const dx = pos.x - cx; const dy = pos.y - cy;
          const lx = dx * Math.cos(rad) - dy * Math.sin(rad); const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
          const w2 = Math.abs(layer.width)/2; const h2 = Math.abs(layer.height)/2;

          if (Math.hypot(lx - 0, ly - (-h2 - 25 / state.viewport.scale)) < hSize) { state.isRotatingObject = true; return; }

          const handles = [{ id: "tl", x: -w2, y: -h2 }, { id: "tr", x: w2, y: -h2 }, { id: "bl", x: -w2, y: h2 }, { id: "br", x: w2, y: h2 }];
          for (const h of handles) { if (lx >= h.x - hSize && lx <= h.x + hSize && ly >= h.y - hSize && ly <= h.y + hSize) { state.isResizingObject = true; state.resizeHandle = h.id; return; } }
        }
      }

      let hitId: string | null = null;
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i]; if (!l.visible || l.locked) continue;
        const cx = l.x + l.width/2; const cy = l.y + l.height/2; const rad = (-l.rotation * Math.PI) / 180;
        const dx = pos.x - cx; const dy = pos.y - cy; const lx = dx * Math.cos(rad) - dy * Math.sin(rad); const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        const w2 = Math.abs(l.width)/2; const h2 = Math.abs(l.height)/2;
        const padding = l.type === "PATH" || l.type === "LINE" || l.type === "ARROW" ? 10 / state.viewport.scale : 0;

        if (lx >= -w2 - padding && lx <= w2 + padding && ly >= -h2 - padding && ly <= h2 + padding) { hitId = l.id; break; }
      }
      state.selectedId = hitId; if (hitId) state.isDraggingObject = true; syncUI(); return;
    }

    state.isDrawing = true; state.selectedId = null;

    if (activeCategory === "PEN" || activeCategory === "ERASER") {
      state.liveLayer = { id: "live", name: activeCategory === "ERASER" ? "Eraser Path" : "Vector Path", type: "PATH", x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: activeCategory === "ERASER" ? "destination-out" : "source-over", stroke: activeCategory === "ERASER" ? "#000000" : currentStrokeColor, strokeWidth: currentStrokeWidth * (activeCategory === "ERASER" ? 6 : 1), points: [{ x: 0, y: 0 }] };
    } else if (activeCategory === "TEXT") {
      const newText: CanvasLayer = { id: generateId(), name: "Text", type: "TEXT", x: pos.x, y: pos.y, width: 300, height: 50, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over", fill: currentColor, text: "Double click to edit", fontSize: 64, fontFamily: "Inter", fontWeight: "600", textAlign: "left" };
      state.layers.push(newText); state.selectedId = newText.id; state.isDrawing = false; setActiveCategory("SELECT"); saveHistory(); syncUI();
    } else if (activeCategory === "SHAPE") {
      state.liveLayer = { id: "live", name: activeShape, type: activeShape, x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over", stroke: currentStrokeWidth > 0 ? currentStrokeColor : "transparent", strokeWidth: currentStrokeWidth, fill: currentColor, cornerRadius: 0, sides: activeShape === "STAR" ? 5 : 3 };
      if (activeShape === "LINE" || activeShape === "ARROW") state.liveLayer.fill = "transparent";
    }
    syncUI();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editingTextId) return; const state = engine.current;
    if (state.isPanning) { state.viewport.x = e.clientX - state.startX; state.viewport.y = e.clientY - state.startY; return; }
    const pos = getCanvasPos(e); const dx = pos.x - state.lastX; const dy = pos.y - state.lastY;

    if (state.isRotatingObject && state.selectedId) {
      const layer = state.layers.find(l => l.id === state.selectedId);
      if (layer) { const cx = layer.x + layer.width / 2; const cy = layer.y + layer.height / 2; const angle = Math.atan2(pos.y - cy, pos.x - cx); layer.rotation = (angle * 180) / Math.PI + 90; } return;
    }
    if (state.isDraggingObject && state.selectedId) {
      const layer = state.layers.find(l => l.id === state.selectedId); if (layer) { layer.x += dx; layer.y += dy; } state.lastX = pos.x; state.lastY = pos.y; return;
    }
    if (state.isResizingObject && state.selectedId && state.resizeHandle) {
      const layer = state.layers.find(l => l.id === state.selectedId);
      if (layer) {
        if (state.resizeHandle === "br") { layer.width += dx; layer.height += dy; }
        if (state.resizeHandle === "tr") { layer.width += dx; layer.y += dy; layer.height -= dy; }
        if (state.resizeHandle === "bl") { layer.x += dx; layer.width -= dx; layer.height += dy; }
        if (state.resizeHandle === "tl") { layer.x += dx; layer.y += dy; layer.width -= dx; layer.height -= dy; }
      }
      state.lastX = pos.x; state.lastY = pos.y; return;
    }
    if (state.isDrawing && state.liveLayer) {
      if ((activeCategory === "PEN" || activeCategory === "ERASER") && state.liveLayer.points) { state.liveLayer.points.push({ x: pos.x - state.liveLayer.x, y: pos.y - state.liveLayer.y }); } else { state.liveLayer.width = pos.x - state.startX; state.liveLayer.height = pos.y - state.startY; }
    }
  };

  const handlePointerUp = () => {
    const state = engine.current;
    if (state.isPanning) { state.isPanning = false; document.body.style.cursor = "default"; return; }
    if (state.isDraggingObject || state.isResizingObject || state.isRotatingObject) { state.isDraggingObject = false; state.isResizingObject = false; state.isRotatingObject = false; state.resizeHandle = null; saveHistory(); syncUI(); return; }

    if (state.isDrawing && state.liveLayer) {
      const newLayer = { ...state.liveLayer, id: generateId(), name: `${activeCategory === "SHAPE" ? activeShape : activeCategory}` };
      
      if (newLayer.type === "PATH" && newLayer.points && newLayer.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        newLayer.points.forEach(p => { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
        newLayer.x += minX; newLayer.y += minY; newLayer.width = Math.max(10, maxX - minX); newLayer.height = Math.max(10, maxY - minY);
        newLayer.points = newLayer.points.map(p => ({ x: p.x - minX, y: p.y - minY }));
      } 
      else if (newLayer.type !== "IMAGE" && newLayer.type !== "TEXT" && newLayer.type !== "PATH") {
        if (newLayer.width < 0) { newLayer.x += newLayer.width; newLayer.width = Math.abs(newLayer.width); }
        if (newLayer.height < 0) { newLayer.y += newLayer.height; newLayer.height = Math.abs(newLayer.height); }
        if (newLayer.width < 5 && newLayer.height < 5) { newLayer.width = 100; newLayer.height = 100; }
      }
      state.layers.push(newLayer); state.liveLayer = null; state.isDrawing = false;
      if (activeCategory !== "PEN" && activeCategory !== "ERASER") { setActiveCategory("SELECT"); state.selectedId = newLayer.id; }
      saveHistory(); syncUI();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeCategory !== "SELECT" || !engine.current.selectedId) return;
    const layer = engine.current.layers.find(l => l.id === engine.current.selectedId);
    if (layer && layer.type === "TEXT") setEditingTextId(layer.id);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); const state = engine.current; const zoomSensitivity = 0.002; const delta = -e.deltaY * zoomSensitivity;
    const newScale = clip(state.viewport.scale * (1 + delta), 0.05, 20.0);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
      state.viewport.x = mouseX - (mouseX - state.viewport.x) * (newScale / state.viewport.scale);
      state.viewport.y = mouseY - (mouseY - state.viewport.y) * (newScale / state.viewport.scale);
      state.viewport.scale = newScale;
    }
  };

  // ==========================================
  // ПАНЕЛЬ СЛОЕВ И ЭКСПОРТ
  // ==========================================
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const state = engine.current; let imgW = img.width, imgH = img.height;
        // Масштабируем пиксели при импорте (Ограничение до 1600px для экономии памяти localStorage)
        const MAX_SIZE = 1600;
        if (imgW > MAX_SIZE || imgH > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / imgW, MAX_SIZE / imgH);
          imgW = Math.round(imgW * ratio); imgH = Math.round(imgH * ratio);
        }

        const cvs = document.createElement('canvas'); cvs.width = imgW; cvs.height = imgH;
        const ctx = cvs.getContext('2d')!; ctx.drawImage(img, 0, 0, imgW, imgH);
        const originalData = ctx.getImageData(0, 0, imgW, imgH);
        // Сжимаем в jpeg для localStorage, чтобы не убить 5MB квоту
        const compressedSrc = cvs.toDataURL("image/jpeg", 0.8);

        const cw = containerRef.current?.clientWidth || state.canvasWidth; const ch = containerRef.current?.clientHeight || state.canvasHeight;
        const vX = (cw / 2 - state.viewport.x) / state.viewport.scale; const vY = (ch / 2 - state.viewport.y) / state.viewport.scale;

        const newImage: CanvasLayer = { id: generateId(), name: file.name, type: "IMAGE", x: vX - imgW / 2, y: vY - imgH / 2, width: imgW, height: imgH, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over", imageObj: img, originalImageObj: img, originalImageData: originalData, src: compressedSrc, bgTolerance: 0, brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0, grayscale: 0, invert: 0, twirl: 0, bulge: 0 };
        state.layers.push(newImage); state.selectedId = newImage.id; setActiveCategory("SELECT"); saveHistory(); syncUI();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deleteSelectedLayer = () => { if (!engine.current.selectedId) return; engine.current.layers = engine.current.layers.filter(l => l.id !== engine.current.selectedId); engine.current.selectedId = null; saveHistory(); syncUI(); };
  const duplicateSelectedLayer = () => { const state = engine.current; if (!state.selectedId) return; const layer = state.layers.find(l => l.id === state.selectedId); if (layer) { const clone = { ...layer, id: generateId(), x: layer.x + 40, y: layer.y + 40, name: layer.name + " Copy" }; state.layers.push(clone); state.selectedId = clone.id; saveHistory(); syncUI(); } };
  const updateSelectedLayer = (updates: Partial<CanvasLayer>) => { if (!engine.current.selectedId) return; const layer = engine.current.layers.find(l => l.id === engine.current.selectedId); if (layer) { Object.assign(layer, updates); if (layer.type === "IMAGE" && (updates.bgTolerance !== undefined || updates.twirl !== undefined || updates.bulge !== undefined || updates.autoBgRemoved !== undefined)) { processImagePixels(layer); } else { syncUI(); } } };
  const commitLayerUpdate = () => saveHistory();
  const moveLayer = (id: string, direction: "UP" | "DOWN" | "FRONT" | "BACK") => { const idx = engine.current.layers.findIndex(l => l.id === id); if (idx === -1) return; const layers = engine.current.layers; const l = layers.splice(idx, 1)[0]; if (direction === "UP") layers.splice(Math.min(layers.length, idx + 1), 0, l); if (direction === "DOWN") layers.splice(Math.max(0, idx - 1), 0, l); if (direction === "FRONT") layers.push(l); if (direction === "BACK") layers.unshift(l); saveHistory(); syncUI(); };

  const exportCanvas = () => {
    const canvas = document.createElement("canvas"); canvas.width = engine.current.canvasWidth; canvas.height = engine.current.canvasHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = canvasBgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    engine.current.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save(); ctx.globalAlpha = layer.opacity / 100; ctx.globalCompositeOperation = layer.blendMode || "source-over";
      const cx = layer.x + layer.width / 2, cy = layer.y + layer.height / 2; ctx.translate(cx, cy); ctx.rotate((layer.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
      if (layer.shadowColor && layer.shadowBlur) { ctx.shadowColor = layer.shadowColor; ctx.shadowBlur = layer.shadowBlur; ctx.shadowOffsetX = layer.shadowOffsetX || 0; ctx.shadowOffsetY = layer.shadowOffsetY || 0; }
      if (layer.type === "IMAGE") {
        let filterStr = "";
        if (layer.brightness !== undefined && layer.brightness !== 100) filterStr += `brightness(${layer.brightness}%) `;
        if (layer.contrast !== undefined && layer.contrast !== 100) filterStr += `contrast(${layer.contrast}%) `;
        if (layer.saturation !== undefined && layer.saturation !== 100) filterStr += `saturate(${layer.saturation}%) `;
        if (layer.hue && layer.hue !== 0) filterStr += `hue-rotate(${layer.hue}deg) `;
        if (layer.sepia && layer.sepia > 0) filterStr += `sepia(${layer.sepia}%) `;
        if (layer.grayscale && layer.grayscale > 0) filterStr += `grayscale(${layer.grayscale}%) `;
        if (layer.invert && layer.invert > 0) filterStr += `invert(${layer.invert}%) `;
        if (layer.blur && layer.blur > 0) filterStr += `blur(${layer.blur}px) `;
        if (filterStr) ctx.filter = filterStr.trim();
      } else if (layer.blur && layer.blur > 0) { ctx.filter = `blur(${layer.blur}px)`; }
      ctx.fillStyle = layer.fill || "transparent"; ctx.strokeStyle = layer.stroke || "transparent"; ctx.lineWidth = layer.strokeWidth || 0; ctx.lineCap = "round"; ctx.lineJoin = "round";

      const w2 = layer.width/2; const h2 = layer.height/2;
      if (layer.type === "RECTANGLE") { ctx.beginPath(); if (layer.cornerRadius && (ctx as any).roundRect) { (ctx as any).roundRect(-w2, -h2, layer.width, layer.height, layer.cornerRadius); } else { ctx.rect(-w2, -h2, layer.width, layer.height); } if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
      else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(w2), Math.abs(h2), 0, 0, Math.PI * 2); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "POLYGON") { ctx.beginPath(); const sides = layer.sides || 3; const r = Math.min(Math.abs(layer.width), Math.abs(layer.height)) / 2; for (let i = 0; i < sides; i++) { const a = (Math.PI * 2 * i) / sides - Math.PI / 2; if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a)); else ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); } ctx.closePath(); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "STAR") { ctx.beginPath(); const points = layer.sides || 5; const outerR = Math.min(Math.abs(layer.width), Math.abs(layer.height)) / 2; const innerR = outerR * 0.4; for (let i = 0; i < points * 2; i++) { const r = i % 2 === 0 ? outerR : innerR; const a = (Math.PI * i) / points - Math.PI / 2; if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a)); else ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); } ctx.closePath(); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "LINE") { ctx.beginPath(); ctx.moveTo(-w2, -h2); ctx.lineTo(w2, h2); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "ARROW") { ctx.beginPath(); const hw = layer.strokeWidth || 4; const headL = Math.max(15, hw * 3); const headW = Math.max(15, hw * 3); const p1 = {x: -w2, y: 0}; const p2 = {x: w2, y: 0}; const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x - headL * Math.cos(angle - Math.PI/6), p2.y - headW * Math.sin(angle - Math.PI/6)); ctx.lineTo(p2.x - headL * Math.cos(angle + Math.PI/6), p2.y - headW * Math.sin(angle + Math.PI/6)); ctx.closePath(); ctx.fill(); }
      else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, -w2, -h2, layer.width, layer.height); }
      else if (layer.type === "TEXT" && layer.text) { ctx.font = `${layer.fontWeight || "normal"} ${layer.fontSize}px ${layer.fontFamily || "Inter"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.textAlign = layer.textAlign || "left"; const textLines = layer.text.split('\n'); let tX = -w2; if (layer.textAlign === "center") tX = 0; if (layer.textAlign === "right") tX = w2; textLines.forEach((line, i) => { ctx.fillText(line, tX, -h2 + i * (layer.fontSize || 24) * 1.2); }); }
      else if (layer.type === "PATH" && layer.points) { ctx.beginPath(); ctx.moveTo(layer.points[0].x - w2, layer.points[0].y - h2); for (let i = 1; i < layer.points.length; i++) ctx.lineTo(layer.points[i].x - w2, layer.points[i].y - h2); if (layer.strokeWidth) ctx.stroke(); }
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a"); link.download = `omni-studio-${Date.now()}.png`; link.href = dataUrl; link.click();
  };

  const handleSecureToArchive = () => {
    if (onSecureArtifact) onSecureArtifact(canvasRef.current?.toDataURL() || "", "OMNI PROJECT");
  };

  // FLOATING TEXT EDITOR
  const renderInlineTextEditor = () => {
    if (!editingTextId) return null;
    const layer = engine.current.layers.find(l => l.id === editingTextId);
    if (!layer || layer.type !== "TEXT") return null;

    const { x, y, scale } = engine.current.viewport;
    const cx = layer.x + layer.width/2; const cy = layer.y + layer.height/2;
    const screenCx = x + cx * scale; const screenCy = y + cy * scale;

    return (
      <div style={{ position: "absolute", left: screenCx, top: screenCy, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`, zIndex: 100, pointerEvents: "auto" }}>
        <textarea
          autoFocus value={layer.text}
          onChange={(e) => {
            layer.text = e.target.value;
            const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.font = `${layer.fontWeight || "normal"} ${layer.fontSize}px ${layer.fontFamily || "Inter, sans-serif"}`;
              const textLines = layer.text.split('\n');
              layer.width = Math.max(...textLines.map(line => ctx.measureText(line).width));
              layer.height = textLines.length * (layer.fontSize || 24) * 1.2;
            }
            syncUI();
          }}
          onBlur={() => { setEditingTextId(null); saveHistory(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditingTextId(null); saveHistory(); } e.stopPropagation(); }}
          style={{ minWidth: Math.max(100, layer.width * scale + 20), height: Math.max(50, layer.height * scale + 20), fontSize: `${(layer.fontSize || 24) * scale}px`, fontFamily: layer.fontFamily, fontWeight: layer.fontWeight, textAlign: layer.textAlign, color: layer.fill, background: "rgba(0,0,0,0.8)", border: "2px solid #3B82F6", borderRadius: "6px", outline: "none", padding: "8px", lineHeight: 1.2, resize: "none", overflow: "hidden" }}
        />
      </div>
    );
  };

  const activeLayer = layersUI.find(l => l.id === selectedIdUI);

  // ==========================================
  // UI РЕНДЕР
  // ==========================================
  return (
    <div className="flex flex-col h-screen max-h-[85vh] bg-[#18181A] text-neutral-300 font-sans text-sm select-none border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* HEADER TOP (ADOBE / FIGMA STYLE) */}
      <header className="h-12 bg-[#27272A] border-b border-black/40 flex items-center justify-between px-4 z-20 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="font-bold text-white tracking-wider flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]"></div>
            OMNI 7.0 PRO
          </div>
          <div className="h-4 w-px bg-white/10 mx-1"></div>

          {activeLayer ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-1 rounded font-bold uppercase tracking-widest border border-[#3B82F6]/20">
                {activeLayer.type} SELECTED
              </span>
              {activeLayer.type === "IMAGE" && (
                <>
                  <button onClick={handleAutoBgRemove} className="text-[10px] flex items-center gap-1 text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all ml-2">
                    <I.Magic /> Remove Background
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1"><span>W</span><input type="number" value={engine.current.canvasWidth} onChange={e => { engine.current.canvasWidth = Number(e.target.value); syncUI(); saveHistory(); }} className="w-12 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-white text-center focus:border-[#3B82F6] outline-none hover:bg-black/50" /></div>
              <div className="flex items-center gap-1"><span>H</span><input type="number" value={engine.current.canvasHeight} onChange={e => { engine.current.canvasHeight = Number(e.target.value); syncUI(); saveHistory(); }} className="w-12 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-white text-center focus:border-[#3B82F6] outline-none hover:bg-black/50" /></div>
              <div className="flex items-center gap-2 ml-2"><span>Bg</span><div className="relative w-4 h-4 rounded overflow-hidden border border-white/20"><input type="color" value={canvasBgColor} onChange={e => { setCanvasBgColor(e.target.value); saveHistory(); }} className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer" /></div></div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-500 bg-black/30 px-2 py-1 rounded">{Math.round(engine.current.viewport.scale * 100)}%</span>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-all text-xs font-medium border border-white/10">
            <I.Img /> Import
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageImport} accept="image/*" className="hidden" />
          <button onClick={exportCanvas} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-500 rounded text-white font-medium transition-all text-xs shadow-lg">
             Export PNG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT SIDEBAR: LAYERS */}
        <aside className="w-[240px] bg-[#27272A] border-r border-black/40 flex flex-col z-10 shrink-0 shadow-[4px_0_15px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center p-3 border-b border-white/5 shrink-0">
             <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Layers</h3>
             <span className="text-[9px] text-neutral-500 bg-black/30 px-2 py-0.5 rounded">{layersUI.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {[...layersUI].reverse().map(layer => (
              <div 
                key={layer.id} 
                onClick={() => { engine.current.selectedId = layer.id; setActiveCategory("SELECT"); syncUI(); }}
                onDoubleClick={() => { if(layer.type === "TEXT") setEditingTextId(layer.id); }}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all border text-xs ${selectedIdUI === layer.id ? "bg-[#3B82F6]/15 border-[#3B82F6]/30 text-white" : "border-transparent hover:bg-white/5 text-neutral-300"}`}
              >
                <div className="flex gap-1 shrink-0 text-neutral-500">
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({visible: !layer.visible}); commitLayerUpdate(); }} className="hover:text-white">
                    {layer.visible ? <I.Eye /> : <I.EyeOff />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({locked: !layer.locked}); commitLayerUpdate(); }} className="hover:text-white">
                    {layer.locked ? <I.Lock /> : <I.Unlock />}
                  </button>
                </div>
                
                <span className="flex-1 truncate font-medium select-none ml-1">{layer.name}</span>
                
                {selectedIdUI === layer.id && (
                  <div className="flex gap-0.5 shrink-0 text-neutral-400">
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "FRONT"); }} className="hover:text-white p-0.5 rounded hover:bg-white/10" title="Bring to Front"><I.Up /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "BACK"); }} className="hover:text-white p-0.5 rounded hover:bg-white/10" title="Send to Back"><I.Down /></button>
                  </div>
                )}
              </div>
            ))}
            {layersUI.length === 0 && <div className="text-[11px] text-neutral-500 text-center py-8">Canvas is empty</div>}
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <main 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#18181A]"
          style={{ touchAction: "none", overscrollBehavior: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
          
          {/* FLOATING ACTION BAR OVER OBJECT */}
          {activeLayer && !engine.current.isPanning && !engine.current.isDraggingObject && !editingTextId && (
            <div className="absolute z-30 pointer-events-auto flex items-center gap-1 bg-[#27272A] border border-white/10 rounded-lg p-1 shadow-2xl transition-all"
                 style={{
                   left: engine.current.viewport.x + (activeLayer.x + activeLayer.width/2) * engine.current.viewport.scale,
                   top: engine.current.viewport.y + (activeLayer.y * engine.current.viewport.scale) - 45,
                   transform: 'translateX(-50%)'
                 }}>
              <button onClick={duplicateSelectedLayer} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white" title="Duplicate"><I.Dup /></button>
              <button onClick={deleteSelectedLayer} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300" title="Delete"><I.Trash /></button>
            </div>
          )}

          {/* FLOATING BOTTOM TOOLBAR (Centered) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#27272A] border border-black/50 p-1.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-1 z-20 pointer-events-auto">
            <button onClick={() => { setActiveCategory("SELECT"); engine.current.selectedId = null; syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "SELECT" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-400 hover:bg-white/10"}`} title="Select"><I.Sel /></button>
            <button onClick={() => { setActiveCategory("PAN"); syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "PAN" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-400 hover:bg-white/10"}`} title="Pan (Space)"><I.Pan /></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button onClick={() => { setActiveCategory("PEN"); engine.current.selectedId = null; syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "PEN" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-400 hover:bg-white/10"}`} title="Pen"><I.Pen /></button>
            <button onClick={() => { setActiveCategory("ERASER"); engine.current.selectedId = null; syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "ERASER" ? "bg-red-500/20 text-red-500" : "text-neutral-400 hover:bg-white/10"}`} title="Eraser"><I.Erase /></button>
            <button onClick={() => { setActiveCategory("TEXT"); engine.current.selectedId = null; syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "TEXT" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-400 hover:bg-white/10"}`} title="Text"><I.Txt /></button>
            
            <div className="relative group">
              <button onClick={() => { setActiveCategory("SHAPE"); engine.current.selectedId = null; syncUI(); }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeCategory === "SHAPE" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-400 hover:bg-white/10"}`} title="Shapes">
                <I.Shape />
              </button>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-[#27272A] border border-black/40 rounded-lg p-1.5 shadow-xl z-50 min-w-[120px]">
                {(["RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "ARROW", "LINE"] as ShapeType[]).map(shape => (
                  <button key={shape} onClick={() => { setActiveCategory("SHAPE"); setActiveShape(shape); engine.current.selectedId = null; syncUI(); }} className={`px-3 py-2 text-[11px] font-medium text-left rounded transition-colors ${activeShape === shape ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-neutral-300 hover:bg-white/10"}`}>
                    {shape.charAt(0) + shape.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1"></div>
            
            {/* COLORS */}
            <div className="flex gap-2 mx-1 items-center">
              <div className="relative w-6 h-6 rounded-full border border-white/20 overflow-hidden shadow-inner cursor-pointer" title="Fill">
                <input type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
              </div>
              <div className="relative w-6 h-6 rounded-full border border-white/20 overflow-hidden shadow-inner cursor-pointer" title="Stroke">
                <input type="color" value={currentStrokeColor} onChange={e => setCurrentStrokeColor(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
              </div>
              <input type="number" min="0" max="100" value={currentStrokeWidth} onChange={e => setCurrentStrokeWidth(Number(e.target.value))} className="w-10 bg-black/30 border border-white/10 rounded text-center text-xs text-white p-1 ml-1 hover:bg-black/50 outline-none" title="Width" />
            </div>

            <div className="w-px h-6 bg-white/10 mx-1"></div>

            <div className="flex gap-1 ml-1 mr-2">
              <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"><I.Undo /></button>
              <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"><I.Redo /></button>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR (Inspector) */}
        <aside className="w-[300px] bg-[#27272A] border-l border-black/40 flex flex-col z-10 shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.2)]">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Inspector</h3>
              {activeLayer && (
                <div className="flex gap-1">
                  <button onClick={duplicateSelectedLayer} className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10" title="Duplicate"><I.Dup /></button>
                  <button onClick={deleteSelectedLayer} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1 rounded" title="Delete"><I.Trash /></button>
                </div>
              )}
            </div>
            
            {activeLayer ? (
              <div className="space-y-6">
                
                {/* 1. LAYOUT */}
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Alignment & Size</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500 font-mono">X</span><input type="number" value={Math.round(activeLayer.x)} onChange={e => { updateSelectedLayer({x: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>
                    <div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500 font-mono">Y</span><input type="number" value={Math.round(activeLayer.y)} onChange={e => { updateSelectedLayer({y: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>
                    <div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500 font-mono">W</span><input type="number" value={Math.round(activeLayer.width)} onChange={e => { updateSelectedLayer({width: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>
                    <div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500 font-mono">H</span><input type="number" value={Math.round(activeLayer.height)} onChange={e => { updateSelectedLayer({height: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]" title="Rotation"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500">°</span><input type="number" value={Math.round(activeLayer.rotation)} onChange={e => { updateSelectedLayer({rotation: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>
                    {activeLayer.type === "RECTANGLE" && (<div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]" title="Corner Radius"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500">R</span><input type="number" value={activeLayer.cornerRadius || 0} onChange={e => { updateSelectedLayer({cornerRadius: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>)}
                    {(activeLayer.type === "POLYGON" || activeLayer.type === "STAR") && (<div className="flex bg-[#18181A] border border-white/10 rounded overflow-hidden focus-within:border-[#3B82F6]" title="Sides / Points"><span className="bg-transparent px-2 py-1.5 text-xs text-neutral-500">Pts</span><input type="number" min="3" max="20" value={activeLayer.sides || (activeLayer.type==="STAR"?5:3)} onChange={e => { updateSelectedLayer({sides: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-1 py-1.5 text-xs text-white outline-none font-mono" /></div>)}
                  </div>
                </div>

                {/* 2. TEXT */}
                {activeLayer.type === "TEXT" && (
                  <div className="border-t border-white/5 pt-4">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Typography</div>
                    <select value={activeLayer.fontFamily} onChange={e => { updateSelectedLayer({fontFamily: e.target.value}); commitLayerUpdate(); }} className="w-full bg-[#18181A] border border-white/10 rounded px-2 py-2 text-xs text-white outline-none focus:border-[#3B82F6] cursor-pointer mb-2">{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select>
                    <div className="flex gap-2 mb-2">
                      <select value={activeLayer.fontWeight} onChange={e => { updateSelectedLayer({fontWeight: e.target.value}); commitLayerUpdate(); }} className="flex-1 bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#3B82F6] cursor-pointer">
                        <option value="400">Regular</option><option value="600">Semi Bold</option><option value="800">Extra Bold</option>
                      </select>
                      <input type="number" value={activeLayer.fontSize} onChange={e => { updateSelectedLayer({fontSize: Number(e.target.value)}); commitLayerUpdate(); }} className="w-16 bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none text-center focus:border-[#3B82F6]" />
                    </div>
                    <div className="flex bg-[#18181A] border border-white/10 rounded p-0.5">
                      <button onClick={() => { updateSelectedLayer({textAlign: "left"}); commitLayerUpdate(); }} className={`flex-1 flex justify-center py-1.5 rounded ${activeLayer.textAlign === "left" ? "bg-white/10 text-white" : "text-neutral-500"}`}><I.AlignLeft /></button>
                      <button onClick={() => { updateSelectedLayer({textAlign: "center"}); commitLayerUpdate(); }} className={`flex-1 flex justify-center py-1.5 rounded ${activeLayer.textAlign === "center" ? "bg-white/10 text-white" : "text-neutral-500"}`}><I.AlignCenter /></button>
                      <button onClick={() => { updateSelectedLayer({textAlign: "right"}); commitLayerUpdate(); }} className={`flex-1 flex justify-center py-1.5 rounded ${activeLayer.textAlign === "right" ? "bg-white/10 text-white" : "text-neutral-500"}`}><I.AlignRight /></button>
                    </div>
                  </div>
                )}

                {/* 3. APPEARANCE */}
                <div className="border-t border-white/5 pt-4">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Appearance</div>
                  <div className="flex items-center justify-between mb-3"><span className="text-xs text-neutral-400">Blend Mode</span><select value={activeLayer.blendMode || "source-over"} onChange={e => { updateSelectedLayer({blendMode: e.target.value as BlendMode}); commitLayerUpdate(); }} className="bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none w-32 cursor-pointer"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="color-dodge">Color Dodge</option></select></div>
                  <div className="flex items-center justify-between gap-3 mb-4"><span className="text-xs text-neutral-400">Opacity</span><input type="range" min="0" max="100" value={activeLayer.opacity} onChange={e => updateSelectedLayer({opacity: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="flex-1 accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" /><span className="text-xs w-8 text-right font-mono text-white">{activeLayer.opacity}%</span></div>

                  {activeLayer.type !== "IMAGE" && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0"><input type="color" value={activeLayer.fill === "transparent" ? "#000000" : activeLayer.fill} onChange={e => { updateSelectedLayer({fill: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" /></div>
                      <span className="text-xs text-neutral-300 flex-1">Fill</span>
                      <button onClick={() => { updateSelectedLayer({fill: "transparent"}); commitLayerUpdate(); }} className="text-[10px] text-neutral-500 hover:text-white px-2 py-1 bg-white/5 rounded border border-white/10">CLEAR</button>
                    </div>
                  )}
                  {activeLayer.type !== "IMAGE" && activeLayer.type !== "TEXT" && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0"><input type="color" value={activeLayer.stroke === "transparent" ? "#000000" : activeLayer.stroke} onChange={e => { updateSelectedLayer({stroke: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" /></div>
                      <span className="text-xs text-neutral-300">Stroke</span>
                      <input type="number" value={activeLayer.strokeWidth || 0} onChange={e => { updateSelectedLayer({strokeWidth: Number(e.target.value)}); commitLayerUpdate(); }} className="w-14 bg-[#18181A] border border-white/10 rounded px-2 py-1.5 text-xs text-white ml-auto text-center" />
                    </div>
                  )}
                </div>

                {/* 4. EFFECTS */}
                <div className="border-t border-white/5 pt-4">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Effects & Adjustments</div>
                  {activeLayer.type === "IMAGE" && (
                    <div className="space-y-4 bg-[#18181A] p-3.5 rounded-xl border border-white/5 mb-4">
                      <div className="space-y-3 border-b border-white/5 pb-3">
                        <div className="text-[10px] text-purple-400 font-bold flex items-center gap-1.5 mb-1"><I.Warp /> Liquify</div>
                        <div className="flex justify-between text-[10px] text-neutral-400"><span>Twirl</span><span className="font-mono">{activeLayer.twirl || 0}°</span></div>
                        <input type="range" min="-360" max="360" value={activeLayer.twirl || 0} onChange={e => updateSelectedLayer({twirl: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-[10px] text-neutral-400 mt-2"><span>Pinch / Bulge</span><span className="font-mono">{activeLayer.bulge || 0}</span></div>
                        <input type="range" min="-1" max="1" step="0.05" value={activeLayer.bulge || 0} onChange={e => updateSelectedLayer({bulge: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="space-y-1.5"><div className="flex justify-between text-[10px] text-neutral-400"><span>Brightness</span><span className="font-mono">{activeLayer.brightness || 100}%</span></div><input type="range" min="0" max="200" value={activeLayer.brightness || 100} onChange={e => updateSelectedLayer({brightness: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" /></div>
                      <div className="space-y-1.5"><div className="flex justify-between text-[10px] text-neutral-400"><span>Contrast</span><span className="font-mono">{activeLayer.contrast || 100}%</span></div><input type="range" min="0" max="200" value={activeLayer.contrast || 100} onChange={e => updateSelectedLayer({contrast: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" /></div>
                      <div className="space-y-1.5"><div className="flex justify-between text-[10px] text-neutral-400"><span>Saturation</span><span className="font-mono">{activeLayer.saturation || 100}%</span></div><input type="range" min="0" max="200" value={activeLayer.saturation || 100} onChange={e => updateSelectedLayer({saturation: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" /></div>
                      <div className="space-y-1.5"><div className="flex justify-between text-[10px] text-neutral-400"><span>Hue Rotation</span><span className="font-mono">{activeLayer.hue || 0}°</span></div><input type="range" min="-180" max="180" value={activeLayer.hue || 0} onChange={e => updateSelectedLayer({hue: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-green-400 h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer" /></div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="text-[9px] text-neutral-500 text-center">Sepia</div>
                          <input type="range" min="0" max="100" value={activeLayer.sepia || 0} onChange={e => updateSelectedLayer({sepia: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] text-neutral-500 text-center">Invert</div>
                          <input type="range" min="0" max="100" value={activeLayer.invert || 0} onChange={e => updateSelectedLayer({invert: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] text-neutral-500 text-center">Gray</div>
                          <input type="range" min="0" max="100" value={activeLayer.grayscale || 0} onChange={e => updateSelectedLayer({grayscale: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#18181A] p-3.5 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0"><input type="color" value={activeLayer.shadowColor || "#000000"} onChange={e => { updateSelectedLayer({shadowColor: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" /></div>
                      <span className="text-xs text-neutral-300">Drop Shadow</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center"><span className="text-[9px] text-neutral-500 mb-1 block">Blur</span><input type="number" value={activeLayer.shadowBlur || 0} onChange={e => { updateSelectedLayer({shadowBlur: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#27272A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none text-center" /></div>
                      <div className="text-center"><span className="text-[9px] text-neutral-500 mb-1 block">X</span><input type="number" value={activeLayer.shadowOffsetX || 0} onChange={e => { updateSelectedLayer({shadowOffsetX: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#27272A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none text-center" /></div>
                      <div className="text-center"><span className="text-[9px] text-neutral-500 mb-1 block">Y</span><input type="number" value={activeLayer.shadowOffsetY || 0} onChange={e => { updateSelectedLayer({shadowOffsetY: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#27272A] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none text-center" /></div>
                    </div>
                    <div className="pt-3 border-t border-white/5"><div className="flex justify-between text-[10px] text-neutral-400 mb-2"><span>Layer Blur</span><span className="font-mono">{activeLayer.blur || 0}px</span></div><input type="range" min="0" max="100" value={activeLayer.blur || 0} onChange={e => updateSelectedLayer({blur: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-[#3B82F6] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" /></div>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-neutral-600 space-y-3 opacity-40">
                <I.Sel />
                <span className="text-xs">Select a layer</span>
              </div>
            )}
          </div>
          
          {/* SECURE BUTTON FIXED AT BOTTOM */}
          {onSecureArtifact && (
            <div className="p-4 border-t border-black/40 bg-[#27272A] mt-auto shrink-0">
              <button onClick={() => onSecureArtifact(canvasRef.current?.toDataURL() || "", "OMNI PROJECT")} className="w-full py-3 rounded-lg bg-white text-black hover:bg-neutral-200 text-[11px] uppercase tracking-wider font-bold transition-colors shadow-lg">Secure to Resonance</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
