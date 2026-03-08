"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Pencil,
  Eraser,
  PaintBucket,
  Minus,
  Square,
  Pipette,
  Undo2,
  Redo2,
  Grid3X3,
  Trash2,
  Download,
  ClipboardCopy,
  FlipHorizontal,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";

type Tool = "pencil" | "eraser" | "fill" | "line" | "rectangle" | "eyedropper";
type GridSize = 8 | 16 | 32 | 64;
type PaletteName = "pico8" | "gameboy" | "nes" | "grayscale" | "monochrome" | "custom";

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  data: (string | null)[][];
}

const MAX_UNDO = 20;
const MAX_LAYERS = 4;
const GRID_SIZES: GridSize[] = [8, 16, 32, 64];
const DEFAULT_ZOOM: Record<GridSize, number> = { 8: 32, 16: 20, 32: 16, 64: 8 };
const MINIMAP_TARGET = 64;

const TOOL_DEFS: { id: Tool; icon: typeof Pencil; label: string; shortcut: string }[] = [
  { id: "pencil", icon: Pencil, label: "Pencil", shortcut: "P" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
  { id: "fill", icon: PaintBucket, label: "Fill", shortcut: "F" },
  { id: "line", icon: Minus, label: "Line", shortcut: "L" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "eyedropper", icon: Pipette, label: "Eyedropper", shortcut: "I" },
];

const PALETTES: Record<Exclude<PaletteName, "custom">, { name: string; colors: string[] }> = {
  pico8: {
    name: "PICO-8",
    colors: [
      "#000000","#1D2B53","#7E2553","#008751",
      "#AB5236","#5F574F","#C2C3C7","#FFF1E8",
      "#FF004D","#FFA300","#FFEC27","#00E436",
      "#29ADFF","#83769C","#FF77A8","#FFCCAA",
    ],
  },
  gameboy: {
    name: "Game Boy",
    colors: ["#0F380F","#306230","#8BAC0F","#9BBC0F"],
  },
  nes: {
    name: "NES",
    colors: [
      "#7C7C7C","#0000FC","#0000BC","#4428BC","#940084","#A80020","#A81000",
      "#881400","#503000","#007800","#006800","#005800","#004058","#000000",
      "#BCBCBC","#0078F8","#0058F8","#6844FC","#D800CC","#E40058","#F83800",
      "#E45C10","#AC7C00","#00B800","#00A800","#00A844","#008888","#404040",
      "#F8F8F8","#3CBCFC","#6888FC","#9878F8","#F878F8","#F85898","#F87858",
      "#FCA044","#F8B800","#B8F818","#58D854","#58F898","#00E8D8","#787878",
      "#FCFCFC","#A4E4FC","#B8B8F8","#D8B8F8","#F8B8F8","#F8A4C0","#F0D0B0",
      "#FCE0A8","#F8D878","#D8F878","#B8F8B8","#B8F8D8","#00FCFC","#B8B8B8",
    ],
  },
  grayscale: {
    name: "Grayscale",
    colors: ["#000000","#242424","#484848","#6D6D6D","#919191","#B6B6B6","#DADADA","#FFFFFF"],
  },
  monochrome: {
    name: "Mono",
    colors: ["#000000","#FFFFFF"],
  },
};

function createEmptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map((row) => [...row]);
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((l) => ({ ...l, data: cloneGrid(l.data) }));
}

function colorsMatch(a: string | null, b: string | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.toUpperCase() === b.toUpperCase();
}

function floodFill(
  grid: (string | null)[][],
  startX: number,
  startY: number,
  fillColor: string,
): (string | null)[][] {
  const size = grid.length;
  const targetColor = grid[startY][startX];
  if (colorsMatch(targetColor, fillColor)) return grid;

  const next = cloneGrid(grid);
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = y * size + x;
    if (visited.has(key)) continue;
    if (x < 0 || x >= size || y < 0 || y >= size) continue;
    if (!colorsMatch(next[y][x], targetColor)) continue;

    visited.add(key);
    next[y][x] = fillColor;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return next;
}

function getLinePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pixels: [number, number][] = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;

  while (true) {
    pixels.push([cx, cy]);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return pixels;
}

function getRectPixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pixels: [number, number][] = [];
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  for (let x = minX; x <= maxX; x++) {
    pixels.push([x, minY]);
    if (minY !== maxY) pixels.push([x, maxY]);
  }
  for (let y = minY + 1; y < maxY; y++) {
    pixels.push([minX, y]);
    if (minX !== maxX) pixels.push([maxX, y]);
  }
  return pixels;
}

export default function SpriteEditorPage() {
  const [canvasSize, setCanvasSize] = useState<GridSize>(32);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: "1", name: "Layer 1", visible: true, data: createEmptyGrid(32) },
  ]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [currentTool, setCurrentTool] = useState<Tool>("pencil");
  const [currentColor, setCurrentColor] = useState("#F59E0B");
  const [recentColors, setRecentColors] = useState<string[]>(["#F59E0B"]);
  const [zoom, setZoom] = useState(16);
  const [showGrid, setShowGrid] = useState(true);
  const [activePalette, setActivePalette] = useState<PaletteName>("pico8");
  const [customPalette, setCustomPalette] = useState<string[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [undoStack, setUndoStack] = useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = useState<Layer[][]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState("#F59E0B");
  const [mirrorMode, setMirrorMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const drawStart = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef<(string | null)[][] | null>(null);

  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const activeLayerIndexRef = useRef(activeLayerIndex);
  activeLayerIndexRef.current = activeLayerIndex;
  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  const compositeData = useMemo(() => {
    const result = createEmptyGrid(canvasSize);
    for (const layer of layers) {
      if (!layer.visible) continue;
      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          const c = layer.data[y]?.[x];
          if (c) result[y][x] = c;
        }
      }
    }
    return result;
  }, [layers, canvasSize]);

  const compositeRef = useRef(compositeData);
  compositeRef.current = compositeData;

  const safeActiveIndex = Math.min(activeLayerIndex, layers.length - 1);
  const displaySize = canvasSize * zoom;
  const minimapScale = Math.max(1, Math.floor(MINIMAP_TARGET / canvasSize));
  const minimapPx = canvasSize * minimapScale;

  const currentPaletteColors =
    activePalette === "custom" ? customPalette : PALETTES[activePalette].colors;

  const updateActiveLayerData = useCallback(
    (updater: (data: (string | null)[][]) => (string | null)[][]) => {
      setLayers((prev) =>
        prev.map((layer, i) =>
          i === activeLayerIndexRef.current ? { ...layer, data: updater(layer.data) } : layer
        )
      );
    },
    []
  );

  const setActiveLayerData = useCallback((data: (string | null)[][]) => {
    setLayers((prev) =>
      prev.map((layer, i) =>
        i === activeLayerIndexRef.current ? { ...layer, data } : layer
      )
    );
  }, []);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const addRecentColor = useCallback((color: string) => {
    setRecentColors((prev) => {
      const upper = color.toUpperCase();
      const filtered = prev.filter((c) => c.toUpperCase() !== upper);
      return [color, ...filtered].slice(0, 8);
    });
  }, []);

  const pushUndo = useCallback(() => {
    const snap = cloneLayers(layersRef.current);
    setUndoStack((prev) => [...prev.slice(-(MAX_UNDO - 1)), snap]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const restored = stack[stack.length - 1];
    setRedoStack((prev) => [...prev, cloneLayers(layersRef.current)]);
    setLayers(cloneLayers(restored));
    setUndoStack(stack.slice(0, -1));
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const restored = stack[stack.length - 1];
    setUndoStack((prev) => [...prev, cloneLayers(layersRef.current)]);
    setLayers(cloneLayers(restored));
    setRedoStack(stack.slice(0, -1));
  }, []);

  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;

  const getPixelCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const size = canvasSizeRef.current;
      const x = Math.floor(((clientX - rect.left) * size) / rect.width);
      const y = Math.floor(((clientY - rect.top) * size) / rect.height);
      return {
        x: Math.max(0, Math.min(size - 1, x)),
        y: Math.max(0, Math.min(size - 1, y)),
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const coords = getPixelCoords(clientX, clientY);
      if (!coords) return;
      const { x, y } = coords;
      isDrawing.current = true;

      if (currentTool === "pencil" || currentTool === "eraser") {
        pushUndo();
        lastPos.current = { x, y };
        const color = currentTool === "pencil" ? currentColor : null;
        const size = canvasSizeRef.current;
        updateActiveLayerData((prev) => {
          const next = cloneGrid(prev);
          next[y][x] = color;
          if (mirrorMode) {
            const mx = size - 1 - x;
            if (mx >= 0 && mx < size && mx !== x) next[y][mx] = color;
          }
          return next;
        });
        if (currentTool === "pencil") addRecentColor(currentColor);
      } else if (currentTool === "fill") {
        pushUndo();
        updateActiveLayerData((prev) => floodFill(prev, x, y, currentColor));
        addRecentColor(currentColor);
      } else if (currentTool === "line" || currentTool === "rectangle") {
        pushUndo();
        drawStart.current = { x, y };
        snapshotRef.current = cloneGrid(
          layersRef.current[activeLayerIndexRef.current].data
        );
      } else if (currentTool === "eyedropper") {
        const picked = compositeRef.current[y]?.[x];
        if (picked) {
          setCurrentColor(picked);
          setHexInput(picked);
          addRecentColor(picked);
        }
      }
    },
    [currentTool, currentColor, mirrorMode, getPixelCoords, pushUndo, addRecentColor, updateActiveLayerData],
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const coords = getPixelCoords(clientX, clientY);
      if (coords) setCursorPos(coords);
      if (!isDrawing.current || !coords) return;

      const { x, y } = coords;

      if (currentTool === "pencil" || currentTool === "eraser") {
        const lp = lastPos.current;
        const pixels = lp ? getLinePixels(lp.x, lp.y, x, y) : [[x, y] as [number, number]];
        lastPos.current = { x, y };
        const color = currentTool === "pencil" ? currentColor : null;
        const size = canvasSizeRef.current;
        updateActiveLayerData((prev) => {
          const next = cloneGrid(prev);
          for (const [px, py] of pixels) {
            if (px >= 0 && px < size && py >= 0 && py < size) {
              next[py][px] = color;
              if (mirrorMode) {
                const mx = size - 1 - px;
                if (mx >= 0 && mx < size) next[py][mx] = color;
              }
            }
          }
          return next;
        });
      } else if (currentTool === "line" && snapshotRef.current) {
        const pixels = getLinePixels(drawStart.current.x, drawStart.current.y, x, y);
        const next = cloneGrid(snapshotRef.current);
        const size = canvasSizeRef.current;
        for (const [px, py] of pixels) {
          if (px >= 0 && px < size && py >= 0 && py < size) {
            next[py][px] = currentColor;
            if (mirrorMode) {
              const mx = size - 1 - px;
              if (mx >= 0 && mx < size) next[py][mx] = currentColor;
            }
          }
        }
        setActiveLayerData(next);
      } else if (currentTool === "rectangle" && snapshotRef.current) {
        const pixels = getRectPixels(drawStart.current.x, drawStart.current.y, x, y);
        const next = cloneGrid(snapshotRef.current);
        const size = canvasSizeRef.current;
        for (const [px, py] of pixels) {
          if (px >= 0 && px < size && py >= 0 && py < size) {
            next[py][px] = currentColor;
            if (mirrorMode) {
              const mx = size - 1 - px;
              if (mx >= 0 && mx < size) next[py][mx] = currentColor;
            }
          }
        }
        setActiveLayerData(next);
      }
    },
    [currentTool, currentColor, mirrorMode, getPixelCoords, updateActiveLayerData, setActiveLayerData],
  );

  const handlePointerUp = useCallback(() => {
    if (currentTool === "line" || currentTool === "rectangle") {
      if (isDrawing.current) addRecentColor(currentColor);
    }
    isDrawing.current = false;
    lastPos.current = null;
    snapshotRef.current = null;
  }, [currentTool, currentColor, addRecentColor]);

  const pointerDownRef = useRef(handlePointerDown);
  pointerDownRef.current = handlePointerDown;
  const pointerMoveRef = useRef(handlePointerMove);
  pointerMoveRef.current = handlePointerMove;
  const pointerUpRef = useRef(handlePointerUp);
  pointerUpRef.current = handlePointerUp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (canvas.width !== displaySize || canvas.height !== displaySize) {
      canvas.width = displaySize;
      canvas.height = displaySize;
    }

    ctx.clearRect(0, 0, displaySize, displaySize);

    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#1E1E1E" : "#161616";
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const color = compositeData[y]?.[x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }

    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvasSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * zoom + 0.5, 0);
        ctx.lineTo(i * zoom + 0.5, displaySize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * zoom + 0.5);
        ctx.lineTo(displaySize, i * zoom + 0.5);
        ctx.stroke();
      }
    }

    if (mirrorMode && zoom >= 4) {
      const cx = Math.floor(canvasSize / 2) * zoom;
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, displaySize);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const minimap = minimapRef.current;
    if (minimap) {
      const mCtx = minimap.getContext("2d")!;
      if (minimap.width !== minimapPx || minimap.height !== minimapPx) {
        minimap.width = minimapPx;
        minimap.height = minimapPx;
      }
      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          mCtx.fillStyle = (x + y) % 2 === 0 ? "#1E1E1E" : "#161616";
          mCtx.fillRect(x * minimapScale, y * minimapScale, minimapScale, minimapScale);
        }
      }
      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          const color = compositeData[y]?.[x];
          if (color) {
            mCtx.fillStyle = color;
            mCtx.fillRect(x * minimapScale, y * minimapScale, minimapScale, minimapScale);
          }
        }
      }
    }
  }, [compositeData, canvasSize, zoom, showGrid, displaySize, mirrorMode, minimapScale, minimapPx]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => pointerMoveRef.current(e.clientX, e.clientY);
    const onUp = () => pointerUpRef.current();
    const onTouchMove = (e: TouchEvent) => {
      if (isDrawing.current) e.preventDefault();
      const t = e.touches[0];
      if (t) pointerMoveRef.current(t.clientX, t.clientY);
    };
    const onTouchEnd = () => pointerUpRef.current();

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redoRef.current();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "p": setCurrentTool("pencil"); break;
        case "e": setCurrentTool("eraser"); break;
        case "f": setCurrentTool("fill"); break;
        case "l": setCurrentTool("line"); break;
        case "r": setCurrentTool("rectangle"); break;
        case "i": setCurrentTool("eyedropper"); break;
        case "g": setShowGrid((v) => !v); break;
        case "m": setMirrorMode((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setHexInput(currentColor);
  }, [currentColor]);

  const clearCanvas = () => {
    pushUndo();
    updateActiveLayerData(() => createEmptyGrid(canvasSize));
  };

  const handleCanvasSizeChange = (newSize: GridSize) => {
    setLayers((prev) =>
      prev.map((layer) => {
        const newGrid = createEmptyGrid(newSize);
        const copySize = Math.min(newSize, canvasSize);
        for (let y = 0; y < copySize; y++) {
          for (let x = 0; x < copySize; x++) {
            newGrid[y][x] = layer.data[y]?.[x] ?? null;
          }
        }
        return { ...layer, data: newGrid };
      })
    );
    setCanvasSize(newSize);
    setZoom(DEFAULT_ZOOM[newSize]);
    setUndoStack([]);
    setRedoStack([]);
  };

  const createExportCanvas = (): HTMLCanvasElement => {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasSize;
    offscreen.height = canvasSize;
    const ctx = offscreen.getContext("2d")!;
    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const c = compositeData[y]?.[x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return offscreen;
  };

  const downloadPNG = () => {
    const c = createExportCanvas();
    const link = document.createElement("a");
    link.download = `sprite-${canvasSize}x${canvasSize}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
    notify("PNG downloaded");
  };

  const copyToClipboard = async () => {
    try {
      const c = createExportCanvas();
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to create blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      notify("Copied to clipboard");
    } catch {
      notify("Copy failed");
    }
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setCurrentColor(value);
      addRecentColor(value);
    }
  };

  const selectPaletteColor = (color: string) => {
    setCurrentColor(color);
    setHexInput(color);
    addRecentColor(color);
  };

  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    pushUndo();
    const newLayer: Layer = {
      id: String(Date.now()),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      data: createEmptyGrid(canvasSize),
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerIndex(layers.length);
  };

  const deleteLayer = (index: number) => {
    if (layers.length <= 1) return;
    pushUndo();
    const newLength = layers.length - 1;
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setActiveLayerIndex((prevIdx) => {
      if (prevIdx >= newLength) return Math.max(0, newLength - 1);
      if (prevIdx > index) return prevIdx - 1;
      return prevIdx;
    });
  };

  const toggleLayerVisibility = (index: number) => {
    setLayers((prev) =>
      prev.map((layer, i) => (i === index ? { ...layer, visible: !layer.visible } : layer))
    );
  };

  return (
    <div className="-m-6 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[#2A2A2A] bg-[#141414] px-4">
        <h1 className="text-sm font-semibold text-[#F5F5F5]">Sprite Editor</h1>
        <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
          {canvasSize}&times;{canvasSize}
        </span>
        {mirrorMode && (
          <span className="rounded bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
            Mirror
          </span>
        )}
        {layers.length > 1 && (
          <span className="rounded bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
            {layers.length} Layers
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-[#6B7280]">
          {TOOL_DEFS.map((t) => (
            <span key={t.id} className="hidden md:inline">
              <kbd className="rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1 py-0.5 text-[10px]">
                {t.shortcut}
              </kbd>{" "}
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#2A2A2A] bg-[#141414] py-2">
          {TOOL_DEFS.map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                currentTool === t.id
                  ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                  : "text-[#6B7280] hover:bg-[#1F1F1F] hover:text-[#D1D5DB]"
              }`}
            >
              <t.icon size={18} />
            </button>
          ))}

          <div className="mx-2 my-1 w-6 border-t border-[#2A2A2A]" />

          <button
            onClick={() => setMirrorMode((v) => !v)}
            title="Mirror (M)"
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              mirrorMode
                ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                : "text-[#6B7280] hover:bg-[#1F1F1F] hover:text-[#D1D5DB]"
            }`}
          >
            <FlipHorizontal size={18} />
          </button>

          <div className="mx-2 my-1 w-6 border-t border-[#2A2A2A]" />

          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#1F1F1F] hover:text-[#D1D5DB] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#1F1F1F] hover:text-[#D1D5DB] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 size={18} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-[#0F0F0F]">
          <div className="p-8">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair"
              style={{
                width: displaySize,
                height: displaySize,
                imageRendering: "pixelated",
                touchAction: "none",
                boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                border: "1px solid #2A2A2A",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                pointerDownRef.current(e.clientX, e.clientY);
              }}
              onMouseLeave={() => setCursorPos(null)}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                if (t) pointerDownRef.current(t.clientX, t.clientY);
              }}
            />
          </div>

          {/* Minimap */}
          <div className="absolute bottom-4 right-4 rounded-lg border border-[#2A2A2A] bg-[#141414] p-2">
            <p className="mb-1 text-center text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">
              1:1 Preview
            </p>
            <canvas
              ref={minimapRef}
              className="rounded border border-[#2A2A2A]"
              style={{ imageRendering: "pixelated", width: minimapPx, height: minimapPx }}
            />
          </div>

          {notification && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black shadow-lg">
              {notification}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-[#2A2A2A] bg-[#141414]">
          <div className="space-y-5 p-3">
            {/* Color */}
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                Color
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 shrink-0 rounded-md border border-[#2A2A2A]"
                  style={{ backgroundColor: currentColor }}
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  spellCheck={false}
                  className="h-8 w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 font-mono text-xs text-[#D1D5DB] outline-none focus:border-[#F59E0B]/40"
                />
                <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded border border-[#2A2A2A]">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      setCurrentColor(e.target.value);
                      setHexInput(e.target.value);
                      addRecentColor(e.target.value);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div className="flex h-full w-full items-center justify-center bg-[#1A1A1A] text-[#6B7280]">
                    <Pipette size={14} />
                  </div>
                </label>
              </div>
            </section>

            {/* Recent colors */}
            {recentColors.length > 0 && (
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                  Recent
                </h3>
                <div className="flex flex-wrap gap-1">
                  {recentColors.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => selectPaletteColor(c)}
                      title={c}
                      className={`h-6 w-6 rounded-sm border transition-all ${
                        currentColor.toUpperCase() === c.toUpperCase()
                          ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/50"
                          : "border-[#2A2A2A] hover:border-[#4A4A4A]"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Layers */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                  Layers
                </h3>
                <button
                  onClick={addLayer}
                  disabled={layers.length >= MAX_LAYERS}
                  className="flex items-center gap-0.5 rounded border border-[#2A2A2A] px-1.5 py-0.5 text-[11px] text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-30 disabled:hover:border-[#2A2A2A] disabled:hover:text-[#9CA3AF]"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>
              <div className="space-y-0.5">
                {layers
                  .slice()
                  .reverse()
                  .map((layer, revIdx) => {
                    const idx = layers.length - 1 - revIdx;
                    const isActive = safeActiveIndex === idx;
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayerIndex(idx)}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                          isActive
                            ? "border border-[#F59E0B]/25 bg-[#F59E0B]/10"
                            : "border border-transparent hover:bg-[#1F1F1F]"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(idx);
                          }}
                          className="shrink-0 transition-colors"
                        >
                          {layer.visible ? (
                            <Eye size={13} className="text-[#F59E0B]" />
                          ) : (
                            <EyeOff size={13} className="text-[#4A4A4A]" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-xs ${
                            isActive ? "text-[#F59E0B]" : "text-[#D1D5DB]"
                          }`}
                        >
                          {layer.name}
                        </span>
                        {layers.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayer(idx);
                            }}
                            className="shrink-0 text-[#4A4A4A] transition-colors hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* Palette */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                  Palette
                </h3>
                <select
                  value={activePalette}
                  onChange={(e) => setActivePalette(e.target.value as PaletteName)}
                  className="rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1.5 py-0.5 text-[11px] text-[#9CA3AF] outline-none focus:border-[#F59E0B]/40"
                >
                  <option value="pico8">PICO-8</option>
                  <option value="gameboy">Game Boy</option>
                  <option value="nes">NES</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="monochrome">Mono</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div
                className={`grid gap-0.5 ${
                  currentPaletteColors.length <= 4 ? "grid-cols-4" : "grid-cols-8"
                }`}
              >
                {currentPaletteColors.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    onClick={() => selectPaletteColor(c)}
                    title={c}
                    className={`aspect-square w-full rounded-sm border transition-all ${
                      currentColor.toUpperCase() === c.toUpperCase()
                        ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/50 scale-110 z-10"
                        : "border-[#2A2A2A] hover:border-[#4A4A4A] hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {activePalette === "custom" && (
                <button
                  onClick={() => {
                    if (!customPalette.some((c) => c.toUpperCase() === currentColor.toUpperCase())) {
                      setCustomPalette((prev) => [...prev, currentColor]);
                    }
                  }}
                  className="mt-2 w-full rounded border border-dashed border-[#2A2A2A] py-1.5 text-[11px] text-[#6B7280] transition-colors hover:border-[#F59E0B]/40 hover:text-[#F59E0B]"
                >
                  + Add current color
                </button>
              )}
            </section>

            {/* Canvas settings */}
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                Canvas
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] text-[#6B7280]">Size</label>
                  <select
                    value={canvasSize}
                    onChange={(e) => handleCanvasSizeChange(Number(e.target.value) as GridSize)}
                    className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1.5 text-xs text-[#D1D5DB] outline-none focus:border-[#F59E0B]/40"
                  >
                    {GRID_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s} &times; {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>Zoom</span>
                    <span className="font-mono text-[#9CA3AF]">{zoom}x</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-[#F59E0B]"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-[#F59E0B]"
                  />
                  <Grid3X3 size={13} className="text-[#6B7280]" />
                  Grid lines
                  <kbd className="ml-auto rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1 text-[10px] text-[#6B7280]">
                    G
                  </kbd>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={mirrorMode}
                    onChange={(e) => setMirrorMode(e.target.checked)}
                    className="accent-[#F59E0B]"
                  />
                  <FlipHorizontal size={13} className="text-[#6B7280]" />
                  Mirror draw
                  <kbd className="ml-auto rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1 text-[10px] text-[#6B7280]">
                    M
                  </kbd>
                </label>

                <button
                  onClick={clearCanvas}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#9CA3AF] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={13} />
                  Clear layer
                </button>
              </div>
            </section>

            {/* Export */}
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                Export
              </h3>
              <div className="space-y-2">
                <button
                  onClick={downloadPNG}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <Download size={13} />
                  Download PNG
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <ClipboardCopy size={13} />
                  Copy to clipboard
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-7 shrink-0 items-center gap-4 border-t border-[#2A2A2A] bg-[#141414] px-4 text-[11px] text-[#6B7280]">
        <span className="font-mono">
          {cursorPos ? `X: ${cursorPos.x}  Y: ${cursorPos.y}` : "---"}
        </span>
        <span className="text-[#2A2A2A]">|</span>
        <span>
          {canvasSize}&times;{canvasSize}
        </span>
        <span className="text-[#2A2A2A]">|</span>
        <span>{zoom}x zoom</span>
        <span className="text-[#2A2A2A]">|</span>
        <span className="capitalize">{currentTool}</span>
        <span className="text-[#2A2A2A]">|</span>
        <span className="text-[#F59E0B]">{layers[safeActiveIndex]?.name}</span>
        {mirrorMode && (
          <>
            <span className="text-[#2A2A2A]">|</span>
            <span className="text-[#F59E0B]">Mirror</span>
          </>
        )}
        <span className="ml-auto text-[#4A4A4A]">
          {undoStack.length}/{MAX_UNDO} undo
        </span>
      </div>
    </div>
  );
}
