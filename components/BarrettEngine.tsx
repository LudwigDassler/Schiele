"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// ==========================================
// TYPES & INTERFACES (ВЕКТОРНАЯ АРХИТЕКТУРА)
// ==========================================
type ToolType = "SELECT" | "PAN" | "PEN" | "LINE" | "RECTANGLE" | "ELLIPSE" | "TEXT";
type LayerType = "IMAGE" | "RECT" | "ELLIPSE" | "PATH" | "TEXT" | "LINE";
type BlendMode = "source-over" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "difference" | "exclusion";

interface VectorPoint { x: number; y: number; }

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
  blendMode: BlendMode;
  
  // Style properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  
  // Effects
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  blur?: number;

  // Image Specifics
  imageObj?: HTMLImageElement;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  
  // Path Specifics
  points?: VectorPoint[];
  
  // Text Specifics
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

interface Props {
  query?: string;
  onSecureArtifact?: (dataUrl: string, title: string) => void | Promise<void>;
}

// ==========================================
// ИКОНКИ UI
// ==========================================
const Icons = {
  Select: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  Pan: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"/></svg>,
  Pen: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>,
  Line: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="4"/></svg>,
  Rect: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>,
  Ellipse: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  Text: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Image: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Up: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  Down: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>,
  Redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

function clip(v: number, min = 0.0, max = 1.0): number { return Math.max(min, Math.min(max, v)); }
function generateId() { return Math.random().toString(36).substr(2, 9); }

// ==========================================
// MAIN COMPONENT: OMNI STUDIO PRO
// ==========================================
export default function BarrettEngine({ query, onSecureArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- UI STATES ---
  const [activeTool, setActiveTool] = useState<ToolType>("SELECT");
  const [currentColor, setCurrentColor] = useState<string>("#ffffff");
  const [currentStrokeColor, setCurrentStrokeColor] = useState<string>("#3b82f6");
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(4);
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#121212"); // Цвет самого артборда

  const [layersUI, setLayersUI] = useState<CanvasLayer[]>([]);
  const [selectedIdUI, setSelectedIdUI] = useState<string | null>(null);

  // --- CORE ENGINE (Mutable Ref for 60FPS) ---
  const engine = useRef({
    layers: [] as CanvasLayer[],
    selectedId: null as string | null,
    
    viewport: { x: 0, y: 0, scale: 1 },
    canvasWidth: 1920,
    canvasHeight: 1080,
    
    isPanning: false,
    isDrawing: false,
    isDraggingObject: false,
    isResizingObject: false,
    resizeHandle: null as string | null, // 'tl', 'tr', 'bl', 'br'
    
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    
    liveLayer: null as CanvasLayer | null,
    historyStack: [] as string[], // Сохраняем JSON слепки
    historyIndex: -1,
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
    state.historyStack.push(JSON.stringify(state.layers));
    if (state.historyStack.length > 30) state.historyStack.shift();
    else state.historyIndex++;
  }, []);

  const handleUndo = useCallback(() => {
    const state = engine.current;
    if (state.historyIndex > 0) {
      state.historyIndex--;
      state.layers = JSON.parse(state.historyStack[state.historyIndex]);
      state.selectedId = null;
      syncUI();
    }
  }, [syncUI]);

  const handleRedo = useCallback(() => {
    const state = engine.current;
    if (state.historyIndex < state.historyStack.length - 1) {
      state.historyIndex++;
      state.layers = JSON.parse(state.historyStack[state.historyIndex]);
      state.selectedId = null;
      syncUI();
    }
  }, [syncUI]);

  // Хоткеи
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = engine.current;
        if (state.selectedId) {
          state.layers = state.layers.filter(l => l.id !== state.selectedId);
          state.selectedId = null;
          saveHistory();
          syncUI();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, saveHistory, syncUI]);

  // Инициализация (Центрирование Full HD холста)
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    // Даем запас в 100px со всех сторон
    const scale = Math.min((cw - 100) / engine.current.canvasWidth, (ch - 100) / engine.current.canvasHeight, 1);
    engine.current.viewport = {
      x: (cw - engine.current.canvasWidth * scale) / 2,
      y: (ch - engine.current.canvasHeight * scale) / 2,
      scale
    };
    saveHistory(); // Сохраняем пустой стейт
  }, [saveHistory]);

  // ==========================================
  // РЕНДЕР ЦИКЛ
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const render = () => {
      const state = engine.current;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      // 1. Очистка пространства за пределами холста
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Трансформация камеры
      ctx.save();
      ctx.translate(state.viewport.x, state.viewport.y);
      ctx.scale(state.viewport.scale, state.viewport.scale);

      // 3. Отрисовка Artboard (Холста)
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
      
      // Тень холста для визуального выделения
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1 / state.viewport.scale;
      ctx.strokeRect(0, 0, state.canvasWidth, state.canvasHeight);
      ctx.restore();

      // 4. Отрисовка всех слоев
      const layersToDraw = [...state.layers];
      if (state.liveLayer) layersToDraw.push(state.liveLayer);

      layersToDraw.forEach(layer => {
        if (!layer.visible) return;

        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode || "source-over";

        // Центр для вращения
        const cx = layer.x + layer.width / 2;
        const cy = layer.y + layer.height / 2;
        
        ctx.translate(cx, cy);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);

        // Применение эффектов (Тень и Размытие)
        if (layer.shadowColor && layer.shadowBlur !== undefined && layer.shadowBlur > 0) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = layer.shadowOffsetX || 0;
          ctx.shadowOffsetY = layer.shadowOffsetY || 0;
        }
        
        // CSS Фильтры для картинок
        if (layer.type === "IMAGE") {
          let filterStr = "";
          if (layer.brightness !== undefined && layer.brightness !== 100) filterStr += `brightness(${layer.brightness}%) `;
          if (layer.contrast !== undefined && layer.contrast !== 100) filterStr += `contrast(${layer.contrast}%) `;
          if (layer.saturation !== undefined && layer.saturation !== 100) filterStr += `saturate(${layer.saturation}%) `;
          if (layer.blur && layer.blur > 0) filterStr += `blur(${layer.blur}px) `;
          if (filterStr) ctx.filter = filterStr.trim();
        } else if (layer.blur && layer.blur > 0) {
          ctx.filter = `blur(${layer.blur}px)`;
        }

        ctx.fillStyle = layer.fill || "transparent";
        ctx.strokeStyle = layer.stroke || "transparent";
        ctx.lineWidth = layer.strokeWidth || 0;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // РЕНДЕР ФИГУР
        if (layer.type === "RECT") {
          ctx.beginPath();
          if (layer.cornerRadius && (ctx as any).roundRect) {
            (ctx as any).roundRect(layer.x, layer.y, layer.width, layer.height, layer.cornerRadius);
          } else {
            ctx.rect(layer.x, layer.y, layer.width, layer.height);
          }
          if (layer.fill && layer.fill !== "transparent") ctx.fill();
          if (layer.strokeWidth) ctx.stroke();
        } 
        else if (layer.type === "ELLIPSE") {
          ctx.beginPath();
          ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2);
          if (layer.fill && layer.fill !== "transparent") ctx.fill();
          if (layer.strokeWidth) ctx.stroke();
        }
        else if (layer.type === "LINE") {
          ctx.beginPath();
          ctx.moveTo(layer.x, layer.y);
          ctx.lineTo(layer.x + layer.width, layer.y + layer.height);
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
          
          // Хак: Обновляем Bounding Box текста для правильного выделения
          const textMetrics = ctx.measureText(layer.text);
          layer.width = textMetrics.width;
          layer.height = layer.fontSize || 24; 
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

        // 5. Отрисовка Bounding Box (Выделение)
        if (state.selectedId === layer.id && !layer.locked) {
          ctx.save();
          // Отрисовка трансформационной рамки (учитываем вращение)
          ctx.translate(cx, cy);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);

          ctx.strokeStyle = "#3b82f6"; // Blue-500
          ctx.lineWidth = 1.5 / state.viewport.scale;
          
          ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
          
          const hSize = 8 / state.viewport.scale;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5 / state.viewport.scale;

          const drawHandle = (hx: number, hy: number) => {
            ctx.fillRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
            ctx.strokeRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
          };

          drawHandle(layer.x, layer.y); // TL
          drawHandle(layer.x + layer.width, layer.y); // TR
          drawHandle(layer.x, layer.y + layer.height); // BL
          drawHandle(layer.x + layer.width, layer.y + layer.height); // BR
          
          ctx.restore();
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [canvasBgColor]);

  // ==========================================
  // ЛОГИКА МЫШИ (РИСОВАНИЕ И ВЫДЕЛЕНИЕ)
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
    
    // Панорамирование
    if (e.button === 1 || activeTool === "PAN" || e.altKey || e.shiftKey) {
      state.isPanning = true;
      state.startX = e.clientX - state.viewport.x;
      state.startY = e.clientY - state.viewport.y;
      document.body.style.cursor = "grabbing";
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
          // Простая проверка ручек (без учета угла поворота для простоты клика)
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

      // Выделение объекта (Сверху вниз)
      let hitId: string | null = null;
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i];
        if (!l.visible || l.locked) continue;
        
        // AABB Hit Test (Нормализованный для отрицательных ширин)
        const minX = Math.min(l.x, l.x + l.width);
        const maxX = Math.max(l.x, l.x + l.width);
        const minY = Math.min(l.y, l.y + l.height);
        const maxY = Math.max(l.y, l.y + l.height);

        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          hitId = l.id;
          break;
        }
      }

      state.selectedId = hitId;
      if (hitId) state.isDraggingObject = true;
      syncUI();
      return;
    }

    // Создание новой фигуры
    state.isDrawing = true;
    state.selectedId = null; 

    if (activeTool === "PEN") {
      state.liveLayer = {
        id: "live", name: "Path", type: "PATH",
        x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over",
        stroke: currentStrokeColor, strokeWidth: currentStroke,
        points: [{ x: 0, y: 0 }] 
      };
    } else if (activeTool === "TEXT") {
      const newText: CanvasLayer = {
        id: generateId(), name: "Text", type: "TEXT",
        x: pos.x, y: pos.y, width: 200, height: 50, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over",
        fill: currentColor, text: "Double click to edit", fontSize: 64, fontFamily: "Inter"
      };
      state.layers.push(newText);
      state.selectedId = newText.id;
      state.isDrawing = false;
      setActiveTool("SELECT");
      saveHistory();
      syncUI();
    } else {
      state.liveLayer = {
        id: "live", name: activeTool, type: activeTool as LayerType,
        x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over",
        stroke: currentStrokeColor, strokeWidth: currentStroke, fill: currentColor
      };
      // Для линий убираем заливку
      if (activeTool === "LINE") state.liveLayer.fill = "transparent";
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
      if (layer) { layer.x += dx; layer.y += dy; }
      state.lastX = pos.x; state.lastY = pos.y;
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
      state.lastX = pos.x; state.lastY = pos.y;
      return;
    }

    if (state.isDrawing && state.liveLayer) {
      if (activeTool === "PEN" && state.liveLayer.points) {
        state.liveLayer.points.push({ x: pos.x - state.liveLayer.x, y: pos.y - state.liveLayer.y });
      } else {
        state.liveLayer.width = pos.x - state.startX;
        state.liveLayer.height = pos.y - state.startY;
      }
    }
  };

  const handlePointerUp = () => {
    const state = engine.current;
    
    if (state.isPanning) { 
      state.isPanning = false; 
      document.body.style.cursor = "default";
      return; 
    }
    
    if (state.isDraggingObject || state.isResizingObject) { 
      state.isDraggingObject = false; 
      state.isResizingObject = false; 
      state.resizeHandle = null; 
      saveHistory();
      syncUI(); 
      return; 
    }

    if (state.isDrawing && state.liveLayer) {
      const newLayer = { ...state.liveLayer, id: generateId(), name: `${activeTool}` };
      
      // ИДЕАЛЬНОЕ ВЫЧИСЛЕНИЕ BOUNDING BOX ДЛЯ ПЕРА (PATH)
      if (newLayer.type === "PATH" && newLayer.points && newLayer.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        newLayer.points.forEach(p => {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        });
        
        newLayer.x += minX;
        newLayer.y += minY;
        newLayer.width = Math.max(10, maxX - minX); // Мин. ширина, чтобы можно было кликнуть
        newLayer.height = Math.max(10, maxY - minY);
        
        // Смещаем точки относительно нового X/Y
        newLayer.points = newLayer.points.map(p => ({ x: p.x - minX, y: p.y - minY }));
      } 
      // Нормализация отрицательных ширин для фигур
      else if (newLayer.type === "RECT" || newLayer.type === "ELLIPSE" || newLayer.type === "LINE") {
        if (newLayer.width < 0) { newLayer.x += newLayer.width; newLayer.width = Math.abs(newLayer.width); }
        if (newLayer.height < 0) { newLayer.y += newLayer.height; newLayer.height = Math.abs(newLayer.height); }
        // Защита от микро-кликов
        if (newLayer.width < 5 && newLayer.height < 5) { newLayer.width = 100; newLayer.height = 100; }
      }

      state.layers.push(newLayer);
      state.liveLayer = null;
      state.isDrawing = false;
      
      if (activeTool !== "PEN") {
        setActiveTool("SELECT");
        state.selectedId = newLayer.id;
      }
      
      saveHistory();
      syncUI();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const state = engine.current;
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    
    const newScale = clip(state.viewport.scale * (1 + delta), 0.05, 20.0);
    
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
  // ПАНЕЛЬ СЛОЕВ И ЭКСПОРТ
  // ==========================================
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Вычисляем масштаб, чтобы картинка не была огромной
        const state = engine.current;
        let imgW = img.width;
        let imgH = img.height;
        if (imgW > state.canvasWidth * 0.8) {
          const ratio = (state.canvasWidth * 0.8) / imgW;
          imgW *= ratio; imgH *= ratio;
        }

        const newImage: CanvasLayer = {
          id: generateId(), name: file.name, type: "IMAGE",
          x: (state.canvasWidth - imgW) / 2, y: (state.canvasHeight - imgH) / 2, 
          width: imgW, height: imgH, rotation: 0, opacity: 100, visible: true, locked: false, blendMode: "source-over",
          imageObj: img
        };
        state.layers.push(newImage);
        state.selectedId = newImage.id;
        setActiveTool("SELECT");
        saveHistory();
        syncUI();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateSelectedLayer = (updates: Partial<CanvasLayer>) => {
    if (!engine.current.selectedId) return;
    const layer = engine.current.layers.find(l => l.id === engine.current.selectedId);
    if (layer) {
      Object.assign(layer, updates);
      syncUI();
    }
  };

  const commitLayerUpdate = () => saveHistory();

  const moveLayer = (id: string, direction: "UP" | "DOWN") => {
    const idx = engine.current.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    const layers = engine.current.layers;
    
    if (direction === "UP" && idx < layers.length - 1) {
      [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
    } else if (direction === "DOWN" && idx > 0) {
      [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
    }
    saveHistory();
    syncUI();
  };

  const exportCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = engine.current.canvasWidth;
    canvas.height = engine.current.canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    engine.current.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode || "source-over";

      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      if (layer.shadowColor && layer.shadowBlur) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = layer.shadowOffsetX || 0;
        ctx.shadowOffsetY = layer.shadowOffsetY || 0;
      }
      
      if (layer.type === "IMAGE") {
        let filterStr = "";
        if (layer.brightness !== undefined && layer.brightness !== 100) filterStr += `brightness(${layer.brightness}%) `;
        if (layer.contrast !== undefined && layer.contrast !== 100) filterStr += `contrast(${layer.contrast}%) `;
        if (layer.saturation !== undefined && layer.saturation !== 100) filterStr += `saturate(${layer.saturation}%) `;
        if (layer.blur && layer.blur > 0) filterStr += `blur(${layer.blur}px) `;
        if (filterStr) ctx.filter = filterStr.trim();
      } else if (layer.blur && layer.blur > 0) {
        ctx.filter = `blur(${layer.blur}px)`;
      }

      ctx.fillStyle = layer.fill || "transparent";
      ctx.strokeStyle = layer.stroke || "transparent";
      ctx.lineWidth = layer.strokeWidth || 0;
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      if (layer.type === "RECT") { ctx.beginPath(); if (layer.cornerRadius && (ctx as any).roundRect) { (ctx as any).roundRect(layer.x, layer.y, layer.width, layer.height, layer.cornerRadius); } else { ctx.rect(layer.x, layer.y, layer.width, layer.height); } if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
      else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "LINE") { ctx.beginPath(); ctx.moveTo(layer.x, layer.y); ctx.lineTo(layer.x + layer.width, layer.y + layer.height); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height); }
      else if (layer.type === "TEXT" && layer.text) { ctx.font = `${layer.fontSize}px ${layer.fontFamily || "Inter"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.fillText(layer.text, layer.x, layer.y); }
      else if (layer.type === "PATH" && layer.points) { ctx.beginPath(); ctx.moveTo(layer.x + layer.points[0].x, layer.y + layer.points[0].y); for (let i = 1; i < layer.points.length; i++) ctx.lineTo(layer.x + layer.points[i].x, layer.y + layer.points[i].y); if (layer.strokeWidth) ctx.stroke(); }
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `omni-studio-export-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSecureToArchive = () => {
    // Тот же код рендера, что и в exportCanvas, но вызываем onSecureArtifact
    const canvas = document.createElement("canvas");
    canvas.width = engine.current.canvasWidth;
    canvas.height = engine.current.canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    engine.current.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode || "source-over";
      const cx = layer.x + layer.width / 2, cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy); ctx.rotate((layer.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
      if (layer.shadowColor && layer.shadowBlur) { ctx.shadowColor = layer.shadowColor; ctx.shadowBlur = layer.shadowBlur; ctx.shadowOffsetX = layer.shadowOffsetX || 0; ctx.shadowOffsetY = layer.shadowOffsetY || 0; }
      if (layer.type === "IMAGE") {
        let filterStr = "";
        if (layer.brightness !== 100) filterStr += `brightness(${layer.brightness}%) `;
        if (layer.contrast !== 100) filterStr += `contrast(${layer.contrast}%) `;
        if (layer.saturation !== 100) filterStr += `saturate(${layer.saturation}%) `;
        if (layer.blur) filterStr += `blur(${layer.blur}px) `;
        if (filterStr) ctx.filter = filterStr.trim();
      } else if (layer.blur) { ctx.filter = `blur(${layer.blur}px)`; }
      ctx.fillStyle = layer.fill || "transparent"; ctx.strokeStyle = layer.stroke || "transparent"; ctx.lineWidth = layer.strokeWidth || 0; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (layer.type === "RECT") { ctx.beginPath(); if (layer.cornerRadius && (ctx as any).roundRect) { (ctx as any).roundRect(layer.x, layer.y, layer.width, layer.height, layer.cornerRadius); } else { ctx.rect(layer.x, layer.y, layer.width, layer.height); } if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); } 
      else if (layer.type === "ELLIPSE") { ctx.beginPath(); ctx.ellipse(layer.x + layer.width/2, layer.y + layer.height/2, Math.abs(layer.width/2), Math.abs(layer.height/2), 0, 0, Math.PI * 2); if (layer.fill && layer.fill !== "transparent") ctx.fill(); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "LINE") { ctx.beginPath(); ctx.moveTo(layer.x, layer.y); ctx.lineTo(layer.x + layer.width, layer.y + layer.height); if (layer.strokeWidth) ctx.stroke(); }
      else if (layer.type === "IMAGE" && layer.imageObj) { ctx.drawImage(layer.imageObj, layer.x, layer.y, layer.width, layer.height); }
      else if (layer.type === "TEXT" && layer.text) { ctx.font = `${layer.fontSize}px ${layer.fontFamily || "Inter"}`; ctx.fillStyle = layer.fill || "#ffffff"; ctx.textBaseline = "top"; ctx.fillText(layer.text, layer.x, layer.y); }
      else if (layer.type === "PATH" && layer.points) { ctx.beginPath(); ctx.moveTo(layer.x + layer.points[0].x, layer.y + layer.points[0].y); for (let i = 1; i < layer.points.length; i++) ctx.lineTo(layer.x + layer.points[i].x, layer.y + layer.points[i].y); if (layer.strokeWidth) ctx.stroke(); }
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png", 0.95);
    if (onSecureArtifact) {
      onSecureArtifact(dataUrl, `[OMNI PRO] ${query || "Vector Art"}`);
    }
  };

  const activeLayer = layersUI.find(l => l.id === selectedIdUI);

  // ==========================================
  // UI РЕНДЕР
  // ==========================================
  return (
    <div className="flex flex-col h-screen max-h-[85vh] bg-[#0a0a0c] text-neutral-300 font-sans text-sm overflow-hidden select-none border border-white/10 rounded-2xl">
      
      {/* HEADER */}
      <header className="h-12 bg-[#141417] border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-white tracking-wider flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-blue-500 to-indigo-500"></div>
            OMNI STUDIO
          </div>
          
          <div className="h-5 w-px bg-white/10 mx-2"></div>

          {/* Инструменты холста */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-1">
              <span>W:</span>
              <input type="number" value={engine.current.canvasWidth} onChange={e => { engine.current.canvasWidth = Number(e.target.value); syncUI(); }} className="w-14 bg-black/50 border border-white/10 rounded px-1 py-0.5 text-white text-center focus:border-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-1">
              <span>H:</span>
              <input type="number" value={engine.current.canvasHeight} onChange={e => { engine.current.canvasHeight = Number(e.target.value); syncUI(); }} className="w-14 bg-black/50 border border-white/10 rounded px-1 py-0.5 text-white text-center focus:border-blue-500 outline-none" />
            </div>
            
            <div className="h-4 w-px bg-white/10 mx-1"></div>
            
            <div className="flex items-center gap-2">
              <span>Bg:</span>
              <div className="relative w-5 h-5 rounded overflow-hidden border border-white/20">
                <input type="color" value={canvasBgColor} onChange={e => setCanvasBgColor(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-500">{Math.round(engine.current.viewport.scale * 100)}%</span>
          <div className="h-5 w-px bg-white/10 mx-1"></div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-all text-xs font-medium">
            <Icons.Image /> Import Image
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageImport} accept="image/*" className="hidden" />
          <button onClick={exportCanvas} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-all shadow-lg text-xs">
            Export PNG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT TOOLBAR */}
        <aside className="w-14 bg-[#141417] border-r border-white/5 flex flex-col items-center py-3 gap-1 z-10 shrink-0">
          {(
            [
              { id: "SELECT", icon: <Icons.Select /> },
              { id: "PAN", icon: <Icons.Pan /> },
              { id: "PEN", icon: <Icons.Pen /> },
              { id: "LINE", icon: <Icons.Line /> },
              { id: "RECTANGLE", icon: <Icons.Rect /> },
              { id: "ELLIPSE", icon: <Icons.Ellipse /> },
              { id: "TEXT", icon: <Icons.Text /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); engine.current.selectedId = null; syncUI(); }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                activeTool === t.id 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.icon}
            </button>
          ))}
          
          <div className="w-6 h-px bg-white/10 my-3"></div>
          
          {/* Быстрые цвета */}
          <div className="flex flex-col gap-2 w-full px-2">
            <div className="text-[9px] text-neutral-500 text-center uppercase tracking-widest">Fill</div>
            <div className="relative group w-8 h-8 rounded border border-white/20 overflow-hidden mx-auto cursor-pointer shadow-inner">
              <input type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
            </div>
            
            <div className="text-[9px] text-neutral-500 text-center uppercase tracking-widest mt-2">Stroke</div>
            <div className="relative group w-8 h-8 rounded border border-white/20 overflow-hidden mx-auto cursor-pointer shadow-inner">
              <input type="color" value={currentStrokeColor} onChange={e => setCurrentStrokeColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
            </div>
            
            <input type="number" value={currentStroke} onChange={e => setCurrentStroke(Number(e.target.value))} className="w-8 mx-auto mt-1 bg-black/50 border border-white/10 rounded text-center text-xs text-white p-1" />
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

        {/* RIGHT SIDEBAR (Properties & Layers) */}
        <aside className="w-72 bg-[#141417] border-l border-white/5 flex flex-col z-10 shrink-0 overflow-y-auto">
          
          {/* ПРОПЕРТИ ПАНЕЛЬ */}
          <div className="p-4 border-b border-white/5 bg-[#1a1a1f] min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Properties</h3>
              {activeLayer && (
                <button onClick={() => {
                  engine.current.layers = engine.current.layers.filter(l => l.id !== activeLayer.id);
                  engine.current.selectedId = null;
                  saveHistory();
                  syncUI();
                }} className="text-red-400 hover:text-red-300 bg-red-400/10 p-1.5 rounded"><Icons.Trash /></button>
              )}
            </div>
            
            {activeLayer ? (
              <div className="space-y-4">
                
                {/* 1. LAYOUT */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase">Layout</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                      <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">X</span>
                      <input type="number" value={Math.round(activeLayer.x)} onChange={e => { updateSelectedLayer({x: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                    </div>
                    <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                      <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">Y</span>
                      <input type="number" value={Math.round(activeLayer.y)} onChange={e => { updateSelectedLayer({y: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                    </div>
                    <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                      <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">W</span>
                      <input type="number" value={Math.round(activeLayer.width)} onChange={e => { updateSelectedLayer({width: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                    </div>
                    <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                      <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">H</span>
                      <input type="number" value={Math.round(activeLayer.height)} onChange={e => { updateSelectedLayer({height: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                      <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">°</span>
                      <input type="number" value={Math.round(activeLayer.rotation)} onChange={e => { updateSelectedLayer({rotation: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                    </div>
                    {activeLayer.type === "RECT" && (
                      <div className="flex bg-[#0a0a0c] border border-white/10 rounded overflow-hidden">
                        <span className="bg-white/5 px-2 py-1 text-xs text-neutral-500 border-r border-white/10">R</span>
                        <input type="number" value={activeLayer.cornerRadius || 0} onChange={e => { updateSelectedLayer({cornerRadius: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-transparent px-2 py-1 text-xs text-white outline-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. TEXT PROPERTIES */}
                {activeLayer.type === "TEXT" && (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase">Typography</div>
                    <textarea value={activeLayer.text} onChange={e => { updateSelectedLayer({text: e.target.value}); commitLayerUpdate(); }} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none min-h-[60px]" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={activeLayer.fontSize} onChange={e => { updateSelectedLayer({fontSize: Number(e.target.value)}); commitLayerUpdate(); }} placeholder="Size" className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" />
                      <select value={activeLayer.fontFamily} onChange={e => { updateSelectedLayer({fontFamily: e.target.value}); commitLayerUpdate(); }} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none appearance-none">
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Times New Roman, serif">Serif</option>
                        <option value="monospace">Mono</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 3. APPEARANCE (Fill, Stroke, Blend) */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase">Appearance</div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Blend Mode</span>
                    <select value={activeLayer.blendMode || "source-over"} onChange={e => { updateSelectedLayer({blendMode: e.target.value as BlendMode}); commitLayerUpdate(); }} className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none w-32">
                      <option value="source-over">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="color-dodge">Color Dodge</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Opacity</span>
                    <input type="range" min="0" max="100" value={activeLayer.opacity} onChange={e => updateSelectedLayer({opacity: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-32 accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none" />
                  </div>

                  {activeLayer.type !== "IMAGE" && (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                        <input type="color" value={activeLayer.fill === "transparent" ? "#000000" : activeLayer.fill} onChange={e => { updateSelectedLayer({fill: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
                      </div>
                      <span className="text-xs text-neutral-300 flex-1">Fill</span>
                      <button onClick={() => { updateSelectedLayer({fill: "transparent"}); commitLayerUpdate(); }} className="text-[10px] text-neutral-500 hover:text-white px-2 py-1 bg-white/5 rounded">Clear</button>
                    </div>
                  )}

                  {activeLayer.type !== "IMAGE" && activeLayer.type !== "TEXT" && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                        <input type="color" value={activeLayer.stroke === "transparent" ? "#000000" : activeLayer.stroke} onChange={e => { updateSelectedLayer({stroke: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
                      </div>
                      <span className="text-xs text-neutral-300">Stroke</span>
                      <input type="number" value={activeLayer.strokeWidth || 0} onChange={e => { updateSelectedLayer({strokeWidth: Number(e.target.value)}); commitLayerUpdate(); }} className="w-12 bg-[#0a0a0c] border border-white/10 rounded px-1 py-1 text-xs text-white ml-auto text-center" />
                    </div>
                  )}
                </div>

                {/* 4. EFFECTS & ADJUSTMENTS */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase">Effects</div>
                  
                  {activeLayer.type === "IMAGE" && (
                    <div className="space-y-2 bg-black/20 p-2 rounded border border-white/5">
                      <div className="flex justify-between text-[10px] text-neutral-400"><span>Brightness</span><span>{activeLayer.brightness || 100}%</span></div>
                      <input type="range" min="0" max="200" value={activeLayer.brightness || 100} onChange={e => updateSelectedLayer({brightness: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none" />
                      
                      <div className="flex justify-between text-[10px] text-neutral-400"><span>Contrast</span><span>{activeLayer.contrast || 100}%</span></div>
                      <input type="range" min="0" max="200" value={activeLayer.contrast || 100} onChange={e => updateSelectedLayer({contrast: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none" />
                      
                      <div className="flex justify-between text-[10px] text-neutral-400"><span>Saturation</span><span>{activeLayer.saturation || 100}%</span></div>
                      <input type="range" min="0" max="200" value={activeLayer.saturation || 100} onChange={e => updateSelectedLayer({saturation: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                      <input type="color" value={activeLayer.shadowColor || "#000000"} onChange={e => { updateSelectedLayer({shadowColor: e.target.value}); commitLayerUpdate(); }} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" />
                    </div>
                    <span className="text-xs text-neutral-300">Drop Shadow</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Blur" value={activeLayer.shadowBlur || 0} onChange={e => { updateSelectedLayer({shadowBlur: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" title="Blur" />
                    <input type="number" placeholder="X" value={activeLayer.shadowOffsetX || 0} onChange={e => { updateSelectedLayer({shadowOffsetX: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" title="Offset X" />
                    <input type="number" placeholder="Y" value={activeLayer.shadowOffsetY || 0} onChange={e => { updateSelectedLayer({shadowOffsetY: Number(e.target.value)}); commitLayerUpdate(); }} className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" title="Offset Y" />
                  </div>

                  <div className="flex justify-between text-[10px] text-neutral-400 pt-1"><span>Gaussian Blur</span><span>{activeLayer.blur || 0}px</span></div>
                  <input type="range" min="0" max="100" value={activeLayer.blur || 0} onChange={e => updateSelectedLayer({blur: Number(e.target.value)})} onMouseUp={commitLayerUpdate} className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none" />
                </div>
                
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 space-y-2">
                <Icons.Select />
                <span className="text-xs">Select an object to edit</span>
              </div>
            )}
          </div>

          {/* ПАНЕЛЬ СЛОЕВ */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#141417]">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider p-4 pb-2 border-b border-white/5 shrink-0">Layers</h3>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {[...layersUI].reverse().map(layer => (
                <div 
                  key={layer.id} 
                  onClick={() => { engine.current.selectedId = layer.id; setActiveTool("SELECT"); syncUI(); }}
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all border ${selectedIdUI === layer.id ? "bg-blue-500/20 border-blue-500/30 text-white" : "border-transparent hover:bg-white/5 text-neutral-400"}`}
                >
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({visible: !layer.visible}); commitLayerUpdate(); }} className="hover:text-white shrink-0">
                    {layer.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); updateSelectedLayer({locked: !layer.locked}); commitLayerUpdate(); }} className="hover:text-white shrink-0">
                    {layer.locked ? <Icons.Lock /> : <Icons.Unlock />}
                  </button>
                  
                  <span className="flex-1 text-xs truncate ml-1 font-medium">{layer.name}</span>
                  
                  {selectedIdUI === layer.id && (
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "UP"); }} className="hover:text-white p-0.5"><Icons.Up /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "DOWN"); }} className="hover:text-white p-0.5"><Icons.Down /></button>
                    </div>
                  )}
                </div>
              ))}
              {layersUI.length === 0 && <div className="text-xs text-neutral-600 text-center py-6">Canvas is empty</div>}
            </div>
            
            {onSecureArtifact && (
              <div className="p-4 border-t border-white/5">
                <button 
                  onClick={handleSecureToArchive}
                  className="w-full py-2.5 rounded bg-white text-black hover:bg-neutral-200 text-[10px] uppercase tracking-wider font-bold transition-colors shadow-sm"
                >
                  Secure to Resonance
                </button>
              </div>
            )}
          </div>
          
        </aside>
      </div>
    </div>
  );
}
