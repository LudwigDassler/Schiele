"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// ==========================================
// TYPES & INTERFACES (ВЕКТОРНАЯ АРХИТЕКТУРА)
// ==========================================
type ToolType = "SELECT" | "PAN" | "PEN" | "RECTANGLE" | "ELLIPSE" | "TEXT";

interface Props {
  query?: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void | Promise<void>;
}

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

type LayerType = "IMAGE" | "RECT" | "ELLIPSE" | "PATH" | "TEXT";

interface VectorPoint {
  x: number;
  y: number;
}

interface CanvasLayer {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  
  // Специфичные свойства
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  
  // Для картинок
  imageObj?: HTMLImageElement;
  
  // Для пути (кисть)
  points?: VectorPoint[];
  
  // Для текста
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

// ==========================================
// ИКОНКИ UI
// ==========================================
const Icons = {
  Select: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  Pan: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"/></svg>,
  Pen: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>,
  Rect: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>,
  Ellipse: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  Text: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Up: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  Down: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

// ==========================================
// УТИЛИТЫ (Включая пропавший clip)
// ==========================================
function clip(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ==========================================
// MAIN COMPONENT: ВЕКТОРНЫЙ РЕДАКТОР (OMNI)
// ==========================================
export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI Состояния
  const [activeTool, setActiveTool] = useState<ToolType>("SELECT");
  const [currentColor, setCurrentColor] = useState<string>("#a855f7");
  const [currentStroke, setCurrentStroke] = useState<number>(4);

  // Реактивное состояние для панелей 
  const [layersUI, setLayersUI] = useState<CanvasLayer[]>([]);
  const [selectedIdUI, setSelectedIdUI] = useState<string | null>(null);

  // ==========================================
  // CORE ENGINE STATE (Ref для 60FPS)
  // ==========================================
  const engine = useRef({
    layers: [] as CanvasLayer[],
    selectedId: null as string | null,
    
    viewport: { x: 0, y: 0, scale: 1 },
    
    isPanning: false,
    isDrawing: false,
    isDraggingObject: false,
    isResizingObject: false,
    resizeHandle: null as string | null, // 'tl', 'tr', 'bl', 'br'
    
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    
    liveLayer: null as CanvasLayer | null,
    
    canvasWidth: 1080,
    canvasHeight: 1080,
  });

  const syncUI = useCallback(() => {
    setLayersUI([...engine.current.layers]);
    setSelectedIdUI(engine.current.selectedId);
  }, []);

  // Инициализация камеры
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const scale = Math.min((cw - 100) / engine.current.canvasWidth, (ch - 100) / engine.current.canvasHeight, 1);
    engine.current.viewport = {
      x: (cw - engine.current.canvasWidth * scale) / 2,
      y: (ch - engine.current.canvasHeight * scale) / 2,
      scale
    };
  }, []);

  // ==========================================
  // РЕНДЕР ЦИКЛ (REQUEST ANIMATION FRAME)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const render = () => {
      const state = engine.current;
      
      if (containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
        }
      }

      // 1. Очистка фона (тёмный интерфейс редактора)
      ctx.fillStyle = "#141417";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Трансформация камеры
      ctx.save();
      ctx.translate(state.viewport.x, state.viewport.y);
      ctx.scale(state.viewport.scale, state.viewport.scale);

      // 3. Шахматный паттерн для прозрачности
      const s = 20;
      for(let i=0; i<state.canvasWidth/s; i++) {
        for(let j=0; j<state.canvasHeight/s; j++) {
          ctx.fillStyle = (i+j)%2 === 0 ? "#222" : "#2a2a2a";
          ctx.fillRect(i*s, j*s, s, s);
        }
      }
      
      // Граница Artboard
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 / state.viewport.scale;
      ctx.strokeRect(0, 0, state.canvasWidth, state.canvasHeight);

      // 4. Отрисовка всех слоев (снизу вверх)
      const layersToDraw = [...state.layers];
      if (state.liveLayer) layersToDraw.push(state.liveLayer);

      layersToDraw.forEach(layer => {
        if (!layer.visible) return;

        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));

        ctx.fillStyle = layer.fill || "transparent";
        ctx.strokeStyle = layer.stroke || "transparent";
        ctx.lineWidth = layer.strokeWidth || 0;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (layer.type === "RECT") {
          ctx.beginPath();
          ctx.rect(layer.x, layer.y, layer.width, layer.height);
          if (layer.fill) ctx.fill();
          if (layer.strokeWidth) ctx.stroke();
        } 
        else if (layer.type === "ELLIPSE") {
          ctx.beginPath();
          ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2);
          if (layer.fill) ctx.fill();
          if (layer.strokeWidth) ctx.stroke();
        }
        else if (layer.type === "IMAGE" && layer.imageObj) {
          ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height);
        }
        else if (layer.type === "TEXT" && layer.text) {
          ctx.font = `${layer.fontSize}px ${layer.fontFamily || "Inter, sans-serif"}`;
          ctx.fillStyle = layer.fill || "#ffffff";
          ctx.textBaseline = "top";
          ctx.fillText(layer.text, layer.x, layer.y);
        }
        else if (layer.type === "PATH" && layer.points && layer.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(layer.x + layer.points[0].x, layer.y + layer.points[0].y);
          for (let i = 1; i < layer.points.length; i++) {
            ctx.lineTo(layer.x + layer.points[i].x, layer.y + layer.points[i].y);
          }
          if (layer.strokeWidth) ctx.stroke();
        }

        ctx.restore();

        // 5. Отрисовка Bounding Box выделения
        if (state.selectedId === layer.id && !layer.locked) {
          ctx.save();
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5 / state.viewport.scale;
          ctx.setLineDash([4 / state.viewport.scale, 4 / state.viewport.scale]);
          
          ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
          
          ctx.setLineDash([]);
          const hSize = 8 / state.viewport.scale;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5 / state.viewport.scale;

          const drawHandle = (hx: number, hy: number) => {
            ctx.fillRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
            ctx.strokeRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
          };

          drawHandle(layer.x, layer.y); 
          drawHandle(layer.x + layer.width, layer.y); 
          drawHandle(layer.x, layer.y + layer.height); 
          drawHandle(layer.x + layer.width, layer.y + layer.height); 
          
          ctx.restore();
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ==========================================
  // ВЗАИМОДЕЙСТВИЕ С МЫШЬЮ
  // ==========================================
  const getCanvasPos = (e: React.PointerEvent) => {
    const state = engine.current;
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - state.viewport.x) / state.viewport.scale,
      y: (e.clientY - rect.top - state.viewport.y) / state.viewport.scale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = engine.current;
    
    if (e.button === 1 || activeTool === "PAN") {
      state.isPanning = true;
      state.startX = e.clientX - state.viewport.x;
      state.startY = e.clientY - state.viewport.y;
      return;
    }

    const pos = getCanvasPos(e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.lastX = pos.x;
    state.lastY = pos.y;

    if (activeTool === "SELECT") {
      if (state.selectedId) {
        const layer = state.layers.find(l => l.id === state.selectedId);
        if (layer && !layer.locked && layer.visible) {
          const hSize = 10 / state.viewport.scale;
          const handles = [
            { id: "tl", x: layer.x, y: layer.y },
            { id: "tr", x: layer.x + layer.width, y: layer.y },
            { id: "bl", x: layer.x, y: layer.y + layer.height },
            { id: "br", x: layer.x + layer.width, y: layer.y + layer.height },
          ];

          for (const h of handles) {
            if (pos.x >= h.x - hSize && pos.x <= h.x + hSize && pos.y >= h.y - hSize && pos.y <= h.y + hSize) {
              state.isResizingObject = true;
              state.resizeHandle = h.id;
              return;
            }
          }
        }
      }

      let hitId: string | null = null;
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i];
        if (!l.visible || l.locked) continue;
        
        if (pos.x >= l.x && pos.x <= l.x + l.width && pos.y >= l.y && pos.y <= l.y + l.height) {
          hitId = l.id;
          break;
        }
      }

      state.selectedId = hitId;
      if (hitId) {
        state.isDraggingObject = true;
      }
      syncUI();
      return;
    }

    state.isDrawing = true;
    state.selectedId = null;

    if (activeTool === "PEN") {
      state.liveLayer = {
        id: "live", name: "Drawing", type: "PATH",
        x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false,
        stroke: currentColor, strokeWidth: currentStroke,
        points: [{ x: 0, y: 0 }] 
      };
    } else if (activeTool === "TEXT") {
      const newText: CanvasLayer = {
        id: generateId(), name: "Text", type: "TEXT",
        x: pos.x, y: pos.y, width: 200, height: 50, rotation: 0, opacity: 100, visible: true, locked: false,
        fill: currentColor, text: "Double click to edit", fontSize: 48, fontFamily: "Inter"
      };
      state.layers.push(newText);
      state.selectedId = newText.id;
      state.isDrawing = false;
      setActiveTool("SELECT");
      syncUI();
    } else {
      state.liveLayer = {
        id: "live", name: activeTool, type: activeTool as LayerType,
        x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false,
        stroke: currentColor, strokeWidth: currentStroke, fill: "transparent"
      };
    }
    syncUI();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = engine.current;

    if (state.isPanning) {
      state.viewport.x = e.clientX - state.startX;
      state.viewport.y = e.clientY - state.startY;
      return;
    }

    const pos = getCanvasPos(e);
    const dx = pos.x - state.lastX;
    const dy = pos.y - state.lastY;

    if (state.isDraggingObject && state.selectedId) {
      const layer = state.layers.find(l => l.id === state.selectedId);
      if (layer) {
        layer.x += dx;
        layer.y += dy;
      }
      state.lastX = pos.x;
      state.lastY = pos.y;
      return;
    }

    if (state.isResizingObject && state.selectedId && state.resizeHandle) {
      const layer = state.layers.find(l => l.id === state.selectedId);
      if (layer) {
        if (state.resizeHandle === "br") { layer.width += dx; layer.height += dy; }
        if (state.resizeHandle === "tr") { layer.width += dx; layer.y += dy; layer.height -= dy; }
        if (state.resizeHandle === "bl") { layer.x += dx; layer.width -= dx; layer.height += dy; }
        if (state.resizeHandle === "tl") { layer.x += dx; layer.y += dy; layer.width -= dx; layer.height -= dy; }
      }
      state.lastX = pos.x;
      state.lastY = pos.y;
      return;
    }

    if (state.isDrawing && state.liveLayer) {
      if (activeTool === "PEN" && state.liveLayer.points) {
        state.liveLayer.points.push({ x: pos.x - state.liveLayer.x, y: pos.y - state.liveLayer.y });
        state.liveLayer.width = Math.max(state.liveLayer.width, pos.x - state.liveLayer.x);
        state.liveLayer.height = Math.max(state.liveLayer.height, pos.y - state.liveLayer.y);
      } else {
        state.liveLayer.width = pos.x - state.startX;
        state.liveLayer.height = pos.y - state.startY;
      }
    }
  };

  const handlePointerUp = () => {
    const state = engine.current;
    
    if (state.isPanning) { state.isPanning = false; return; }
    if (state.isDraggingObject) { state.isDraggingObject = false; syncUI(); return; }
    if (state.isResizingObject) { state.isResizingObject = false; state.resizeHandle = null; syncUI(); return; }

    if (state.isDrawing && state.liveLayer) {
      const newLayer = { ...state.liveLayer, id: generateId(), name: `${activeTool} Layer` };
      
      if (newLayer.type === "RECT" || newLayer.type === "ELLIPSE") {
        if (newLayer.width < 0) { newLayer.x += newLayer.width; newLayer.width = Math.abs(newLayer.width); }
        if (newLayer.height < 0) { newLayer.y += newLayer.height; newLayer.height = Math.abs(newLayer.height); }
      }

      state.layers.push(newLayer);
      state.liveLayer = null;
      state.isDrawing = false;
      
      if (activeTool !== "PEN") {
        setActiveTool("SELECT");
        state.selectedId = newLayer.id;
      }
      syncUI();
    }
  };

  // МАСШТАБИРОВАНИЕ
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const state = engine.current;
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    
    // Безопасное ограничение масштаба
    const newScale = clip(state.viewport.scale * (1 + delta), 0.1, 10.0);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      state.viewport.x = mouseX - (mouseX - state.viewport.x) * (newScale / state.viewport.scale);
      state.viewport.y = mouseY - (mouseY - state.viewport.y) * (newScale / state.viewport.scale);
      state.viewport.scale = newScale;
    }
  };

  // ==========================================
  // ФУНКЦИИ ПАНЕЛИ СЛОЕВ И СВОЙСТВ
  // ==========================================
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const newImage: CanvasLayer = {
          id: generateId(), name: file.name, type: "IMAGE",
          x: 50, y: 50, width: img.width, height: img.height, rotation: 0, opacity: 100, visible: true, locked: false,
          imageObj: img
        };
        engine.current.layers.push(newImage);
        engine.current.selectedId = newImage.id;
        setActiveTool("SELECT");
        syncUI();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deleteSelectedLayer = () => {
    if (!engine.current.selectedId) return;
    engine.current.layers = engine.current.layers.filter(l => l.id !== engine.current.selectedId);
    engine.current.selectedId = null;
    syncUI();
  };

  const updateSelectedLayer = (updates: Partial<CanvasLayer>) => {
    if (!engine.current.selectedId) return;
    const layer = engine.current.layers.find(l => l.id === engine.current.selectedId);
    if (layer) {
      Object.assign(layer, updates);
      syncUI();
    }
  };

  const moveLayer = (id: string, direction: "UP" | "DOWN") => {
    const idx = engine.current.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    const layers = engine.current.layers;
    
    if (direction === "UP" && idx < layers.length - 1) {
      [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
    } else if (direction === "DOWN" && idx > 0) {
      [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
    }
    syncUI();
  };

  const exportCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = engine.current.canvasWidth;
    canvas.height = engine.current.canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    engine.current.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));

      ctx.fillStyle = layer.fill || "transparent";
      ctx.strokeStyle = layer.stroke || "transparent";
      ctx.lineWidth = layer.strokeWidth || 0;
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      if (layer.type === "RECT") { ctx.beginPath(); ctx.rect(layer.x, layer.y, layer.width, layer.height); if (layer.fill) ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
      else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2); if (layer.fill) ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height); }
      else if (layer.type === "TEXT" && layer.text) { ctx.font = `${layer.fontSize}px ${layer.fontFamily || "Inter"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.fillText(layer.text, layer.x, layer.y); }
      else if (layer.type === "PATH" && layer.points) { ctx.beginPath(); ctx.moveTo(layer.x + layer.points[0].x, layer.y + layer.points[0].y); for (let i = 1; i < layer.points.length; i++) ctx.lineTo(layer.x + layer.points[i].x, layer.y + layer.points[i].y); if (layer.strokeWidth) ctx.stroke(); }
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `omni-vector-export-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSecureToArchive = () => {
    const canvas = document.createElement("canvas");
    canvas.width = engine.current.canvasWidth;
    canvas.height = engine.current.canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    engine.current.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));
      ctx.fillStyle = layer.fill || "transparent";
      ctx.strokeStyle = layer.stroke || "transparent";
      ctx.lineWidth = layer.strokeWidth || 0;
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      if (layer.type === "RECT") { ctx.beginPath(); ctx.rect(layer.x, layer.y, layer.width, layer.height); if (layer.fill) ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
      else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2); if (layer.fill) ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height); }
      else if (layer.type === "TEXT" && layer.text) { ctx.font = `${layer.fontSize}px ${layer.fontFamily || "Inter"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.fillText(layer.text, layer.x, layer.y); }
      else if (layer.type === "PATH" && layer.points) { ctx.beginPath(); ctx.moveTo(layer.x + layer.points[0].x, layer.y + layer.points[0].y); for (let i = 1; i < layer.points.length; i++) ctx.lineTo(layer.x + layer.points[i].x, layer.y + layer.points[i].y); if (layer.strokeWidth) ctx.stroke(); }
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png");
    if (onSecureArtifact) {
      onSecureArtifact(dataUrl, `[OMNI VECTOR] ${query || "Art"}`);
    }
  };

  const activeLayer = layersUI.find(l => l.id === selectedIdUI);

  // ==========================================
  // UI РЕНДЕР
  // ==========================================
  return (
    <div className="flex flex-col h-screen max-h-[85vh] bg-[#0a0a0c] text-neutral-300 font-sans text-sm overflow-hidden select-none border border-white/10 rounded-2xl">
      
      {/* HEADER */}
      <header className="h-14 bg-[#141417] border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-white tracking-wider flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-500"></div>
            OMNI VECTOR
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Artboard:</span>
            <input type="number" value={engine.current.canvasWidth} onChange={e => { engine.current.canvasWidth = Number(e.target.value); syncUI(); }} className="w-16 bg-[#0a0a0c] border border-white/10 rounded px-1.5 py-1 text-white text-center focus:border-indigo-500 outline-none" />
            <span>×</span>
            <input type="number" value={engine.current.canvasHeight} onChange={e => { engine.current.canvasHeight = Number(e.target.value); syncUI(); }} className="w-16 bg-[#0a0a0c] border border-white/10 rounded px-1.5 py-1 text-white text-center focus:border-indigo-500 outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all text-xs">
            Import Image
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageImport} accept="image/*" className="hidden" />
          <button onClick={exportCanvas} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] text-xs">
            Export PNG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT TOOLBAR */}
        <aside className="w-16 bg-[#141417] border-r border-white/5 flex flex-col items-center py-4 gap-2 z-10 shrink-0">
          {(
            [
              { id: "SELECT", icon: <Icons.Select /> },
              { id: "PAN", icon: <Icons.Pan /> },
              { id: "PEN", icon: <Icons.Pen /> },
              { id: "RECTANGLE", icon: <Icons.Rect /> },
              { id: "ELLIPSE", icon: <Icons.Ellipse /> },
              { id: "TEXT", icon: <Icons.Text /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); engine.current.selectedId = null; syncUI(); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTool === t.id 
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.icon}
            </button>
          ))}
          
          <div className="w-8 h-px bg-white/10 my-2"></div>
          
          <div className="relative group w-8 h-8 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer shadow-inner">
            <input type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
          </div>
        </aside>

        {/* WORKSPACE CANVAS */}
        <main 
          ref={containerRef}
          className="flex-1 bg-[#1a1a1f] relative overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
        </main>

        {/* RIGHT SIDEBAR (Layers & Properties) */}
        <aside className="w-72 bg-[#141417] border-l border-white/5 flex flex-col z-10 shrink-0 overflow-hidden">
          
          {/* ПРОПЕРТИ ПАНЕЛЬ АКТИВНОГО СЛОЯ */}
          <div className="p-4 border-b border-white/5 bg-[#1a1a1f]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              Design
              {activeLayer && (
                <button onClick={deleteSelectedLayer} className="text-red-400 hover:text-red-300"><Icons.Trash /></button>
              )}
            </h3>
            
            {activeLayer ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-neutral-500 block mb-1">X</span>
                    <input type="number" value={Math.round(activeLayer.x)} onChange={e => updateSelectedLayer({x: Number(e.target.value)})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-neutral-500 block mb-1">Y</span>
                    <input type="number" value={Math.round(activeLayer.y)} onChange={e => updateSelectedLayer({y: Number(e.target.value)})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-neutral-500 block mb-1">W</span>
                    <input type="number" value={Math.round(activeLayer.width)} onChange={e => updateSelectedLayer({width: Number(e.target.value)})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-neutral-500 block mb-1">H</span>
                    <input type="number" value={Math.round(activeLayer.height)} onChange={e => updateSelectedLayer({height: Number(e.target.value)})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  </div>
                </div>

                {activeLayer.type === "TEXT" && (
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-1">Text Content</span>
                    <input type="text" value={activeLayer.text} onChange={e => updateSelectedLayer({text: e.target.value})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-white" />
                    
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-neutral-500 block mb-1">Font Size</span>
                        <input type="number" value={activeLayer.fontSize} onChange={e => updateSelectedLayer({fontSize: Number(e.target.value)})} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {activeLayer.type !== "IMAGE" && (
                  <div className="flex items-center gap-3">
                    <div className="relative w-6 h-6 rounded-md border border-white/20 overflow-hidden shrink-0">
                      <input type="color" value={activeLayer.type === "TEXT" ? activeLayer.fill : activeLayer.stroke} onChange={e => updateSelectedLayer({stroke: e.target.value, fill: e.target.value})} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
                    </div>
                    <span className="text-xs text-neutral-300">Color</span>
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-neutral-400">Opacity</span>
                    <span>{activeLayer.opacity}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={activeLayer.opacity} onChange={e => updateSelectedLayer({opacity: Number(e.target.value)})} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg appearance-none" />
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 text-center py-4">No layer selected</div>
            )}
          </div>

          {/* ПАНЕЛЬ СЛОЕВ */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider p-4 pb-2 border-b border-white/5 shrink-0">Layers</h3>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {[...layersUI].reverse().map(layer => (
                <div 
                  key={layer.id} 
                  onClick={() => { engine.current.selectedId = layer.id; setActiveTool("SELECT"); syncUI(); }}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${selectedIdUI === layer.id ? "bg-indigo-500/20 border-indigo-500/50 text-white" : "border-transparent hover:bg-white/5 text-neutral-400"}`}
                >
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({visible: !layer.visible}); }} className="hover:text-white">
                    {layer.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({locked: !layer.locked}); }} className="hover:text-white">
                    {layer.locked ? <Icons.Lock /> : <Icons.Unlock />}
                  </button>
                  
                  <span className="flex-1 text-xs truncate ml-1 font-medium">{layer.name}</span>
                  
                  {selectedIdUI === layer.id && (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "UP"); }} className="hover:text-white p-0.5"><Icons.Up /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "DOWN"); }} className="hover:text-white p-0.5"><Icons.Down /></button>
                    </div>
                  )}
                </div>
              ))}
              {layersUI.length === 0 && <div className="text-xs text-neutral-500 text-center py-4">Canvas is empty</div>}
            </div>
            
            {/* Кнопка сохранения в Resonance */}
            {onSecureArtifact && (
              <div className="p-4 mt-auto">
                <button 
                  onClick={handleSecureToArchive}
                  className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors shadow-sm"
                >
                  Secure to Saved Resonance
                </button>
              </div>
            )}
          </div>
          
        </aside>
      </div>
    </div>
  );
}
