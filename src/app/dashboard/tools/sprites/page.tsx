"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
  Sparkles,
  Loader2,
  Lightbulb,
  ChevronUp,
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
const EXPORT_SCALES = [1, 2, 4, 8] as const;
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

function encodeGIF(w: number, h: number, imgData: ImageData): Uint8Array {
  const px = imgData.data;
  const colorMap = new Map<string, number>();
  const palette: number[][] = [];

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const k = `${px[i]},${px[i + 1]},${px[i + 2]}`;
    if (!colorMap.has(k)) {
      colorMap.set(k, palette.length);
      palette.push([px[i], px[i + 1], px[i + 2]]);
      if (palette.length >= 255) break;
    }
  }

  const transIdx = palette.length;
  palette.push([0, 0, 0]);

  const bits = Math.max(2, Math.ceil(Math.log2(Math.max(palette.length, 4))));
  const tblSize = 1 << bits;
  while (palette.length < tblSize) palette.push([0, 0, 0]);

  const idx = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (px[p + 3] < 128) {
      idx[i] = transIdx;
    } else {
      idx[i] = colorMap.get(`${px[p]},${px[p + 1]},${px[p + 2]}`) ?? transIdx;
    }
  }

  const clearCode = 1 << bits;
  const eoiCode = clearCode + 1;
  let codeSize = bits + 1;
  let nextCode = eoiCode + 1;

  const lzw: number[] = [];
  let bitBuf = 0,
    bitCnt = 0;

  const emit = (code: number, sz: number) => {
    bitBuf |= code << bitCnt;
    bitCnt += sz;
    while (bitCnt >= 8) {
      lzw.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCnt -= 8;
    }
  };

  let dict = new Map<string, number>();
  const reset = () => {
    dict = new Map();
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i);
    nextCode = eoiCode + 1;
    codeSize = bits + 1;
  };

  emit(clearCode, codeSize);
  reset();

  let cur = String(idx[0]);
  for (let i = 1; i < idx.length; i++) {
    const nxt = cur + "," + idx[i];
    if (dict.has(nxt)) {
      cur = nxt;
    } else {
      emit(dict.get(cur)!, codeSize);
      if (nextCode < 4096) {
        dict.set(nxt, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode, codeSize);
        reset();
      }
      cur = String(idx[i]);
    }
  }
  emit(dict.get(cur)!, codeSize);
  emit(eoiCode, codeSize);
  if (bitCnt > 0) lzw.push(bitBuf & 0xff);

  const out: number[] = [];
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  out.push(w & 0xff, (w >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff);
  out.push(0x80 | ((bits - 1) & 7), transIdx, 0);
  for (const c of palette) out.push(c[0], c[1], c[2]);
  out.push(0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, transIdx, 0x00);
  out.push(0x2c, 0, 0, 0, 0, w & 0xff, (w >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff, 0);
  out.push(bits);
  let o = 0;
  while (o < lzw.length) {
    const n = Math.min(255, lzw.length - o);
    out.push(n);
    for (let i = 0; i < n; i++) out.push(lzw[o + i]);
    o += n;
  }
  out.push(0, 0x3b);

  return new Uint8Array(out);
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
  const [aiPaletteTheme, setAiPaletteTheme] = useState("");
  const [aiPaletteLoading, setAiPaletteLoading] = useState(false);
  const [showAiPaletteInput, setShowAiPaletteInput] = useState(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasAreaMousePos, setCanvasAreaMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [exportScale, setExportScale] = useState(1);
  const [aiDesignSubject, setAiDesignSubject] = useState("");
  const [aiDesignTips, setAiDesignTips] = useState("");
  const [aiDesignLoading, setAiDesignLoading] = useState(false);
  const [showDesignTips, setShowDesignTips] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const drawStart = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef<(string | null)[][] | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const spaceDown = useRef(false);

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
  const canvasPanRef = useRef(canvasPan);
  canvasPanRef.current = canvasPan;

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
    const onMove = (e: MouseEvent) => {
      if (isPanning.current) {
        setCanvasPan({
          x: panStartOffset.current.x + (e.clientX - panStart.current.x),
          y: panStartOffset.current.y + (e.clientY - panStart.current.y),
        });
        return;
      }
      pointerMoveRef.current(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }
      pointerUpRef.current();
    };
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
      if (e.key === " ") {
        e.preventDefault();
        spaceDown.current = true;
        setIsSpaceDown(true);
        return;
      }
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
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spaceDown.current = false;
        setIsSpaceDown(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -1 : 1;
        return Math.max(1, Math.min(32, prev + delta));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
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

  const createExportCanvas = (scale: number = 1): HTMLCanvasElement => {
    const size = canvasSize * scale;
    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const c = compositeData[y]?.[x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return offscreen;
  };

  const downloadPNG = () => {
    const s = canvasSize * exportScale;
    const c = createExportCanvas(exportScale);
    const link = document.createElement("a");
    link.download = `sprite-${s}x${s}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
    notify(`PNG ${s}x${s} downloaded`);
  };

  const downloadGIF = () => {
    const c = createExportCanvas(exportScale);
    const ctx = c.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const gifBytes = encodeGIF(c.width, c.height, imgData);
    const blob = new Blob([gifBytes], { type: "image/gif" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const s = canvasSize * exportScale;
    link.download = `sprite-${s}x${s}.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    notify(`GIF ${s}x${s} downloaded`);
  };

  const copyToClipboard = async () => {
    try {
      const c = createExportCanvas(exportScale);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to create blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      const s = canvasSize * exportScale;
      notify(`Copied ${s}x${s} to clipboard`);
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

  const handleAiPalette = async () => {
    const theme = aiPaletteTheme.trim() || "game character sprites";
    setAiPaletteLoading(true);
    try {
      const prompt = `Suggest a 8-color limited palette for pixel art. Theme: ${theme}. Return exactly 8 hex color codes, one per line. Include skin tone, hair, eyes, clothing (2 colors), outline, highlight, and shadow.`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 256,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const hexMatches = content.match(/#[0-9a-fA-F]{6}/g);
      if (hexMatches && hexMatches.length >= 1) {
        setCustomPalette(hexMatches.slice(0, 8));
        setActivePalette("custom");
        notify(`AI palette loaded (${Math.min(hexMatches.length, 8)} colors)`);
      } else {
        notify("Could not parse palette. Try again.");
      }
    } catch {
      notify("AI palette failed. Try again.");
    } finally {
      setAiPaletteLoading(false);
    }
  };

  const handleAiDesignTips = async () => {
    const subject = aiDesignSubject.trim() || "game character";
    setAiDesignLoading(true);
    setShowDesignTips(true);
    try {
      const prompt = `Give 3 pixel art design tips for drawing a '${subject}' in a ${canvasSize}x${canvasSize} pixel grid. Include: color count suggestion, important details to include, common mistakes to avoid. Be very brief.`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setAiDesignTips(content.trim() || "No tips available. Try again.");
    } catch {
      setAiDesignTips("Failed to get tips. Try again.");
    } finally {
      setAiDesignLoading(false);
    }
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
        <Link
          href="/dashboard/tools"
          className="text-xs text-[#9CA3AF] hover:text-[#F59E0B] transition-colors shrink-0"
        >
          ← All Tools
        </Link>
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
        <div
          ref={canvasAreaRef}
          className={`relative flex flex-1 items-center justify-center overflow-hidden bg-[#0F0F0F] ${isSpaceDown ? "cursor-grab" : ""}`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCanvasAreaMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => {
            setCanvasAreaMousePos(null);
            setCursorPos(null);
          }}
        >
          <div className="p-8" style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)` }}>
            <canvas
              ref={canvasRef}
              className={isSpaceDown ? "cursor-grab" : "cursor-crosshair"}
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
                if (e.button === 1 || spaceDown.current) {
                  isPanning.current = true;
                  panStart.current = { x: e.clientX, y: e.clientY };
                  panStartOffset.current = { ...canvasPanRef.current };
                  return;
                }
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

          {/* Coordinate overlay */}
          {cursorPos && canvasAreaMousePos && (
            <div
              className="pointer-events-none absolute z-20 rounded bg-[#1A1A1A]/90 border border-[#2A2A2A] px-1.5 py-0.5 font-mono text-[10px] text-[#F59E0B]"
              style={{
                left: canvasAreaMousePos.x + 16,
                top: canvasAreaMousePos.y - 8,
              }}
            >
              {cursorPos.x}, {cursorPos.y}
            </div>
          )}

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
              {!showAiPaletteInput ? (
                <button
                  onClick={() => setShowAiPaletteInput(true)}
                  className="mb-2 flex w-full items-center justify-center gap-1 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/5 py-1.5 text-[11px] text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10"
                >
                  <Sparkles size={11} />
                  AI Palette
                </button>
              ) : (
                <div className="mb-2 space-y-1.5">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={aiPaletteTheme}
                      onChange={(e) => setAiPaletteTheme(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiPalette()}
                      placeholder="e.g. forest creature"
                      className="min-w-0 flex-1 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-[11px] text-[#D1D5DB] placeholder-[#4A4A4A] outline-none focus:border-[#F59E0B]/40"
                    />
                    <button
                      onClick={handleAiPalette}
                      disabled={aiPaletteLoading}
                      className="flex shrink-0 items-center gap-1 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[11px] text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50"
                    >
                      {aiPaletteLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAiPaletteInput(false)}
                    className="w-full text-center text-[10px] text-[#4A4A4A] hover:text-[#6B7280]"
                  >
                    cancel
                  </button>
                </div>
              )}
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

            {/* AI Design Tips */}
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]/70">
                AI Design Tips
              </h3>
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={aiDesignSubject}
                    onChange={(e) => setAiDesignSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiDesignTips()}
                    placeholder="e.g. player character"
                    className="min-w-0 flex-1 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-[11px] text-[#D1D5DB] placeholder-[#4A4A4A] outline-none focus:border-[#F59E0B]/40"
                  />
                  <button
                    onClick={handleAiDesignTips}
                    disabled={aiDesignLoading}
                    className="flex shrink-0 items-center gap-1 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[11px] text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50"
                  >
                    {aiDesignLoading ? <Loader2 size={11} className="animate-spin" /> : <Lightbulb size={11} />}
                    Tips
                  </button>
                </div>
                {aiDesignTips && (
                  <div className="rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5">
                    <button
                      onClick={() => setShowDesignTips((v) => !v)}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#F59E0B]">
                        <Lightbulb size={11} />
                        Design Tips
                      </span>
                      <ChevronUp
                        size={12}
                        className={`text-[#F59E0B]/60 transition-transform ${showDesignTips ? "" : "rotate-180"}`}
                      />
                    </button>
                    {showDesignTips && (
                      <div className="border-t border-[#F59E0B]/10 px-2.5 py-2">
                        {aiDesignLoading ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 size={12} className="animate-spin text-[#F59E0B]" />
                            <span className="text-[11px] text-[#9CA3AF]">Getting tips...</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#D1D5DB]">
                            {aiDesignTips}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] text-[#6B7280]">Scale</label>
                  <div className="grid grid-cols-4 gap-1">
                    {EXPORT_SCALES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setExportScale(s)}
                        className={`rounded border py-1 text-[11px] font-medium transition-colors ${
                          exportScale === s
                            ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "border-[#2A2A2A] bg-[#1A1A1A] text-[#6B7280] hover:border-[#F59E0B]/30 hover:text-[#9CA3AF]"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-center text-[10px] text-[#4A4A4A]">
                    {canvasSize * exportScale} &times; {canvasSize * exportScale}px
                  </p>
                </div>

                <button
                  onClick={downloadPNG}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <Download size={13} />
                  Download {canvasSize * exportScale}x{canvasSize * exportScale} PNG
                  {exportScale > 1 && <span className="text-[#6B7280]">({exportScale}x)</span>}
                </button>
                <button
                  onClick={downloadGIF}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <Download size={13} />
                  Download {canvasSize * exportScale}x{canvasSize * exportScale} GIF
                  {exportScale > 1 && <span className="text-[#6B7280]">({exportScale}x)</span>}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1A1A1A] py-1.5 text-xs text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <ClipboardCopy size={13} />
                  Copy to Clipboard
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
