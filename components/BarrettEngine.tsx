"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// --- ТИПЫ И ИНТЕРФЕЙСЫ ---
type ToolType = "PAN" | "PEN" | "ERASER" | "LINE" | "RECTANGLE" | "ELLIPSE" | "PICKER";
type FilterType = "NONE" | "GRAYSCALE" | "SEPIA" | "INVERT" | "BLUR";

interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface EditorConfig {
  canvasWidth: number;
  canvasHeight: number;
  primaryColor: string;
  secondaryColor: string;
  lineWidth: number;
  opacity: number;
  activeFilter: FilterType;
}

// --- ИКОНКИ (Встроенные SVG для независимости от библиотек) ---
const Icons = {
  Pan: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"/></svg>,
  Pen: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.58 7.58"/></svg>,
  Eraser: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/><line x1="6" y1="11" x2="15" y2="20"/></svg>,
  Line: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="4"/></svg>,
  Rect: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>,
  Ellipse: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  Undo: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>,
  Redo: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>,
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
};

export default function OmniGraphicEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- СОСТОЯНИЕ РЕДАКТОРА ---
  const [tool, setTool] = useState<ToolType>("PEN");
  const [config, setConfig] = useState<EditorConfig>({
    canvasWidth: 1200,
    canvasHeight: 800,
    primaryColor: "#ffffff",
    secondaryColor: "#000000",
    lineWidth: 4,
    opacity: 100,
    activeFilter: "NONE",
  });

  // --- СОСТОЯНИЕ ВЬЮПОРТА (КАМЕРЫ) ---
  const [viewport, setViewport] = useState<ViewportState>({ offsetX: 0, offsetY: 0, scale: 1 });
  
  // --- ИСТОРИЯ (UNDO / REDO) ---
  const historyStack = useRef<ImageData[]>([]);
  const historyIndex = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // --- ВНУТРЕННИЕ ПЕРЕМЕННЫЕ ОТРИСОВКИ ---
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null); // Для превью фигур в реальном времени

  // 1. ИНИЦИАЛИЗАЦИЯ ХОЛСТА И ЦЕНТРИРОВАНИЕ
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    // Устанавливаем физический размер холста (разрешение)
    canvas.width = config.canvasWidth;
    canvas.height = config.canvasHeight;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    // Заливаем прозрачным (черным) фоном по умолчанию
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Центрируем камеру
    const cx = (container.clientWidth - config.canvasWidth) / 2;
    const cy = (container.clientHeight - config.canvasHeight) / 2;
    
    // Подстраиваем масштаб, чтобы холст помещался в окно
    const scale = Math.min(
      (container.clientWidth - 100) / config.canvasWidth,
      (container.clientHeight - 100) / config.canvasHeight,
      1
    );

    setViewport({ offsetX: cx, offsetY: cy, scale });
    
    // Сохраняем чистое состояние в историю
    saveHistoryState();
  }, [config.canvasWidth, config.canvasHeight]);

  // Утилита: перевод экранных координат мыши в локальные координаты холста (с учетом зума и панорамирования)
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / viewport.scale,
      y: (clientY - rect.top) / viewport.scale
    };
  };

  // 2. УПРАВЛЕНИЕ ИСТОРИЕЙ (Стэк ImageData)
  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Обрезаем ветку Redo, если сделали новое действие после Undo
    if (historyIndex.current < historyStack.current.length - 1) {
      historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    }

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyStack.current.push(currentFrame);
    
    // Ограничиваем историю 50 шагами для экономии памяти
    if (historyStack.current.length > 50) {
      historyStack.current.shift();
    } else {
      historyIndex.current += 1;
    }
    
    updateHistoryButtons();
  };

  const handleUndo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    restoreHistoryState(historyIndex.current);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndex.current >= historyStack.current.length - 1) return;
    historyIndex.current += 1;
    restoreHistoryState(historyIndex.current);
  }, []);

  const restoreHistoryState = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !historyStack.current[index]) return;
    ctx.putImageData(historyStack.current[index], 0, 0);
    updateHistoryButtons();
  };

  const updateHistoryButtons = () => {
    setCanUndo(historyIndex.current > 0);
    setCanRedo(historyIndex.current < historyStack.current.length - 1);
  };

  // Хоткеи для отмены (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // 3. МЫШЬ И РИСОВАНИЕ
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Средняя кнопка мыши (колесико) всегда вызывает панорамирование
    if (e.button === 1 || tool === "PAN" || e.altKey || e.shiftKey) {
      isPanning.current = true;
      startPos.current = { x: e.clientX - viewport.offsetX, y: e.clientY - viewport.offsetY };
      document.body.style.cursor = "grabbing";
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    isDrawing.current = true;
    const pos = getCanvasCoordinates(e.clientX, e.clientY);
    startPos.current = pos;
    lastPos.current = pos;

    // Сохраняем слепок холста для превью фигур
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = config.lineWidth;
    
    // Настройка кисти или ластика
    if (tool === "ERASER") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = config.primaryColor;
      ctx.globalAlpha = config.opacity / 100;
    }

    if (tool === "PEN") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning.current) {
      setViewport(prev => ({
        ...prev,
        offsetX: e.clientX - startPos.current.x,
        offsetY: e.clientY - startPos.current.y
      }));
      return;
    }

    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pos = getCanvasCoordinates(e.clientX, e.clientY);

    // Логика для карандаша / ластика
    if (tool === "PEN" || tool === "ERASER") {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    } 
    // Логика для геометрических фигур (восстанавливаем слепок и рисуем поверх)
    else if (snapshot.current) {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.beginPath();
      
      const w = pos.x - startPos.current.x;
      const h = pos.y - startPos.current.y;

      switch (tool) {
        case "LINE":
          ctx.moveTo(startPos.current.x, startPos.current.y);
          ctx.lineTo(pos.x, pos.y);
          break;
        case "RECTANGLE":
          ctx.rect(startPos.current.x, startPos.current.y, w, h);
          break;
        case "ELLIPSE":
          ctx.ellipse(
            startPos.current.x + w / 2, 
            startPos.current.y + h / 2, 
            Math.abs(w / 2), 
            Math.abs(h / 2), 
            0, 0, 2 * Math.PI
          );
          break;
      }
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      document.body.style.cursor = "default";
      return;
    }
    
    if (isDrawing.current) {
      isDrawing.current = false;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "source-over"; // Сброс ластика
        ctx.globalAlpha = 1.0;
        saveHistoryState(); // Сохраняем финальный мазок/фигуру
      }
    }
  };

  // 4. МАСШТАБИРОВАНИЕ КОЛЕСИКОМ МЫШИ (Зум в точку курсора)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setViewport(prev => {
      let newScale = clip(prev.scale * (1 + delta), 0.1, 10.0);
      
      // Вычисляем смещение, чтобы зум происходил относительно курсора
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return prev;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newOffsetX = mouseX - (mouseX - prev.offsetX) * (newScale / prev.scale);
      const newOffsetY = mouseY - (mouseY - prev.offsetY) * (newScale / prev.scale);

      return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  };

  // 5. ИНСТРУМЕНТЫ И ФИЛЬТРЫ
  const applyFilter = (filterType: FilterType) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Трюк с временным холстом для применения CSS-фильтров прямо в пиксели
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    switch(filterType) {
      case "GRAYSCALE": ctx.filter = "grayscale(100%)"; break;
      case "SEPIA": ctx.filter = "sepia(100%)"; break;
      case "INVERT": ctx.filter = "invert(100%)"; break;
      case "BLUR": ctx.filter = "blur(4px)"; break;
      default: ctx.filter = "none";
    }

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = "none"; // Сброс фильтра для будущих кистей
    saveHistoryState();
    setConfig(prev => ({ ...prev, activeFilter: filterType }));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d", { willReadFrequently: true });
        if (!canvas || !ctx) return;
        
        // Подгоняем холст под размер картинки
        canvas.width = img.width;
        canvas.height = img.height;
        setConfig(prev => ({ ...prev, canvasWidth: img.width, canvasHeight: img.height }));
        
        ctx.drawImage(img, 0, 0);
        
        // Пересчет позиции (центрирование)
        const container = containerRef.current;
        if (container) {
           const scale = Math.min((container.clientWidth - 100) / img.width, (container.clientHeight - 100) / img.height, 1);
           setViewport({
             offsetX: (container.clientWidth - img.width * scale) / 2,
             offsetY: (container.clientHeight - img.height * scale) / 2,
             scale
           });
        }

        saveHistoryState();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `omni-export-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // --- ИНТЕРФЕЙС ---
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-neutral-300 font-sans text-sm overflow-hidden select-none">
      
      {/* HEADER (Топбар) */}
      <header className="h-14 bg-[#141417] border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-white tracking-wider flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-500"></div>
            OMNI EDITOR
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          
          <div className="flex bg-[#0a0a0c] rounded-lg border border-white/5 p-0.5">
            <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={`p-1.5 rounded-md transition-all ${canUndo ? "hover:bg-white/10 text-white" : "opacity-30 cursor-not-allowed"}`}>
              <Icons.Undo />
            </button>
            <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className={`p-1.5 rounded-md transition-all ${canRedo ? "hover:bg-white/10 text-white" : "opacity-30 cursor-not-allowed"}`}>
              <Icons.Redo />
            </button>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Size:</span>
            <input type="number" value={config.canvasWidth} onChange={e => setConfig(p => ({...p, canvasWidth: Number(e.target.value)}))} className="w-16 bg-[#0a0a0c] border border-white/10 rounded px-1.5 py-1 text-white text-center focus:border-indigo-500 outline-none" />
            <span>×</span>
            <input type="number" value={config.canvasHeight} onChange={e => setConfig(p => ({...p, canvasHeight: Number(e.target.value)}))} className="w-16 bg-[#0a0a0c] border border-white/10 rounded px-1.5 py-1 text-white text-center focus:border-indigo-500 outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-neutral-500">{Math.round(viewport.scale * 100)}%</span>
          <button onClick={() => setViewport(p => ({...p, scale: 1}))} className="px-2 py-1 text-xs hover:text-white transition-colors">1:1</button>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all">
            <Icons.Upload /> Import
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <button onClick={downloadCanvas} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Icons.Download /> Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR (Инструменты) */}
        <aside className="w-16 bg-[#141417] border-r border-white/5 flex flex-col items-center py-4 gap-2 z-10 shrink-0">
          {(
            [
              { id: "PAN", icon: <Icons.Pan />, tooltip: "Pan (Space)" },
              { id: "PEN", icon: <Icons.Pen />, tooltip: "Brush (B)" },
              { id: "ERASER", icon: <Icons.Eraser />, tooltip: "Eraser (E)" },
              { id: "LINE", icon: <Icons.Line />, tooltip: "Line (L)" },
              { id: "RECTANGLE", icon: <Icons.Rect />, tooltip: "Rectangle (R)" },
              { id: "ELLIPSE", icon: <Icons.Ellipse />, tooltip: "Ellipse (C)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.tooltip}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                tool === t.id 
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.icon}
            </button>
          ))}
          
          <div className="w-8 h-px bg-white/10 my-2"></div>
          
          {/* Палитра цветов */}
          <div className="relative group w-8 h-8 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer shadow-inner">
            <input 
              type="color" 
              value={config.primaryColor} 
              onChange={e => setConfig(p => ({...p, primaryColor: e.target.value}))}
              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
            />
          </div>
        </aside>

        {/* СЕРЕДИНА: РАБОЧАЯ ОБЛАСТЬ CANVAS */}
        <main 
          ref={containerRef}
          className="flex-1 bg-[#1a1a1f] relative overflow-hidden"
          // Шахматный фон для прозрачности рисуется через CSS паттерн
          style={{
            backgroundImage: `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`,
            backgroundSize: `20px 20px`,
            backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <div 
            className="absolute shadow-[0_0_50px_rgba(0,0,0,0.5)] origin-top-left ring-1 ring-white/10"
            style={{
              transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
              width: config.canvasWidth,
              height: config.canvasHeight,
              cursor: isPanning.current ? "grabbing" : tool === "PAN" ? "grab" : "crosshair"
            }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-full pointer-events-none" // События ловит контейнер main
            />
          </div>
        </main>

        {/* RIGHT SIDEBAR (Свойства и Фильтры) */}
        <aside className="w-64 bg-[#141417] border-l border-white/5 flex flex-col z-10 shrink-0 overflow-y-auto">
          
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Properties</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-neutral-400">Stroke Width</span>
                  <span className="text-white">{config.lineWidth}px</span>
                </div>
                <input 
                  type="range" min="1" max="100" 
                  value={config.lineWidth} 
                  onChange={e => setConfig(p => ({...p, lineWidth: Number(e.target.value)}))}
                  className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-neutral-400">Opacity</span>
                  <span className="text-white">{config.opacity}%</span>
                </div>
                <input 
                  type="range" min="1" max="100" 
                  value={config.opacity} 
                  onChange={e => setConfig(p => ({...p, opacity: Number(e.target.value)}))}
                  className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Adjustments</h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "NONE", label: "Normal" },
                  { id: "GRAYSCALE", label: "B & W" },
                  { id: "SEPIA", label: "Sepia" },
                  { id: "INVERT", label: "Invert" },
                ] as const
              ).map(filter => (
                <button
                  key={filter.id}
                  onClick={() => applyFilter(filter.id)}
                  className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-neutral-300 transition-colors"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 mt-auto">
            <button 
              onClick={clearCanvas}
              className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
            >
              Clear Canvas
            </button>
          </div>
          
        </aside>
      </div>
    </div>
  );
}
