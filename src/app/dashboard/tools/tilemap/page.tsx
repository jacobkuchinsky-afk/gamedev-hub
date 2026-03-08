"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Grid3X3,
  Eraser,
  PaintBucket,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Trash2,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

const GRID_W = 20;
const GRID_H = 15;
const BASE_TILE = 32;

interface TileType {
  id: number;
  name: string;
  color: string;
  key: string;
}

const TILE_TYPES: TileType[] = [
  { id: 0, name: "Empty", color: "transparent", key: "0" },
  { id: 1, name: "Grass", color: "#4CAF50", key: "1" },
  { id: 2, name: "Water", color: "#2196F3", key: "2" },
  { id: 3, name: "Sand", color: "#D2B48C", key: "3" },
  { id: 4, name: "Stone", color: "#78909C", key: "4" },
  { id: 5, name: "Lava", color: "#E53935", key: "5" },
  { id: 6, name: "Ice", color: "#4DD0E1", key: "6" },
  { id: 7, name: "Path", color: "#8D6E63", key: "7" },
  { id: 8, name: "Wall", color: "#37474F", key: "8" },
  { id: 9, name: "Tree", color: "#2E7D32", key: "9" },
];

const LAYERS = ["Ground", "Objects", "Collision"] as const;
type LayerName = (typeof LAYERS)[number];

function createEmptyGrid(): number[][] {
  return Array.from({ length: GRID_H }, () => Array(GRID_W).fill(0));
}

export default function TilemapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<Record<LayerName, number[][]>>({
    Ground: createEmptyGrid(),
    Objects: createEmptyGrid(),
    Collision: createEmptyGrid(),
  });
  const [activeLayer, setActiveLayer] = useState<LayerName>("Ground");
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerName, boolean>>({
    Ground: true,
    Objects: true,
    Collision: true,
  });
  const [selectedTile, setSelectedTile] = useState(1);
  const [tool, setTool] = useState<"paint" | "erase" | "fill">("paint");
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isPainting, setIsPainting] = useState(false);

  const tileSize = BASE_TILE * zoom;
  const canvasW = GRID_W * tileSize;
  const canvasH = GRID_H * tileSize;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const drawOrder: LayerName[] = ["Ground", "Objects", "Collision"];
    for (const layerName of drawOrder) {
      if (!layerVisibility[layerName]) continue;
      const grid = layers[layerName];
      const isCollision = layerName === "Collision";

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const tileId = grid[y][x];
          if (tileId === 0) continue;
          const tile = TILE_TYPES[tileId];
          if (!tile) continue;

          if (isCollision) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
            ctx.beginPath();
            ctx.moveTo(x * tileSize, y * tileSize);
            ctx.lineTo(x * tileSize + tileSize, y * tileSize + tileSize);
            ctx.moveTo(x * tileSize + tileSize, y * tileSize);
            ctx.lineTo(x * tileSize, y * tileSize + tileSize);
            ctx.stroke();
          } else {
            ctx.fillStyle = tile.color;
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      }
    }

    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= GRID_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, canvasH);
        ctx.stroke();
      }
      for (let y = 0; y <= GRID_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(canvasW, y * tileSize);
        ctx.stroke();
      }
    }
  }, [layers, layerVisibility, showGrid, zoom, canvasW, canvasH, tileSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  function getTileCoords(e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
    return [x, y];
  }

  function paintTile(x: number, y: number) {
    setLayers((prev) => {
      const grid = prev[activeLayer].map((row) => [...row]);
      const tileId = tool === "erase" ? 0 : selectedTile;
      if (grid[y][x] === tileId) return prev;
      grid[y][x] = tileId;
      return { ...prev, [activeLayer]: grid };
    });
  }

  function floodFill(startX: number, startY: number) {
    const grid = layers[activeLayer].map((row) => [...row]);
    const target = grid[startY][startX];
    const replacement = tool === "erase" ? 0 : selectedTile;
    if (target === replacement) return;

    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= GRID_W || cy < 0 || cy >= GRID_H) continue;
      if (grid[cy][cx] !== target) continue;
      grid[cy][cx] = replacement;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    setLayers((prev) => ({ ...prev, [activeLayer]: grid }));
  }

  function handleCanvasDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const coords = getTileCoords(e);
    if (!coords) return;
    if (tool === "fill") {
      floodFill(coords[0], coords[1]);
    } else {
      setIsPainting(true);
      paintTile(coords[0], coords[1]);
    }
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPainting) return;
    const coords = getTileCoords(e);
    if (!coords) return;
    paintTile(coords[0], coords[1]);
  }

  function handleCanvasUp() {
    setIsPainting(false);
  }

  function clearLayer() {
    setLayers((prev) => ({ ...prev, [activeLayer]: createEmptyGrid() }));
  }

  function clearAll() {
    setLayers({
      Ground: createEmptyGrid(),
      Objects: createEmptyGrid(),
      Collision: createEmptyGrid(),
    });
  }

  function exportJSON() {
    const data = { width: GRID_W, height: GRID_H, layers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tilemap.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.layers) {
            setLayers(data.layers);
          }
        } catch {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key >= "1" && key <= "9") {
        setSelectedTile(parseInt(key));
        setTool("paint");
      } else if (key === "e") {
        setTool("erase");
      } else if (key === "f") {
        setTool("fill");
      } else if (key === "g") {
        setShowGrid((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toolBtnClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40"
        : "text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] border border-transparent"
    }`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Tilemap Painter</h1>
          <p className="text-xs text-[#9CA3AF]">Design game levels tile by tile</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left Sidebar — Palette & Tools */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Tile Palette */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Tiles
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {TILE_TYPES.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => {
                    setSelectedTile(tile.id);
                    if (tile.id === 0) setTool("erase");
                    else setTool("paint");
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    selectedTile === tile.id && tool !== "fill"
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/40"
                      : "text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-[#2A2A2A]"
                    style={{
                      backgroundColor: tile.color === "transparent" ? "#111" : tile.color,
                      backgroundImage:
                        tile.color === "transparent"
                          ? "repeating-conic-gradient(#222 0% 25%, #333 0% 50%)"
                          : "none",
                      backgroundSize: "8px 8px",
                    }}
                  />
                  <span className="truncate">{tile.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 space-y-1">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Tools
            </h3>
            <button onClick={() => setTool("paint")} className={toolBtnClass(tool === "paint")}>
              <Grid3X3 className="h-4 w-4" /> Paint
            </button>
            <button onClick={() => setTool("erase")} className={toolBtnClass(tool === "erase")}>
              <Eraser className="h-4 w-4" /> Eraser <kbd className="ml-auto text-[10px] opacity-50">E</kbd>
            </button>
            <button onClick={() => setTool("fill")} className={toolBtnClass(tool === "fill")}>
              <PaintBucket className="h-4 w-4" /> Fill <kbd className="ml-auto text-[10px] opacity-50">F</kbd>
            </button>
          </div>

          {/* Layers */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 space-y-1">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Layers className="inline h-3 w-3 mr-1" /> Layers
            </h3>
            {LAYERS.map((layer) => (
              <div key={layer} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveLayer(layer)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                    activeLayer === layer
                      ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                      : "text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]"
                  }`}
                >
                  {layer}
                </button>
                <button
                  onClick={() =>
                    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }))
                  }
                  className="p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  {layerVisibility[layer] ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 space-y-1">
            <button
              onClick={() => setShowGrid((p) => !p)}
              className={toolBtnClass(showGrid)}
            >
              <Grid3X3 className="h-4 w-4" /> Grid <kbd className="ml-auto text-[10px] opacity-50">G</kbd>
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="flex items-center text-xs text-[#9CA3AF] tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>
            <hr className="border-[#2A2A2A]" />
            <button
              onClick={clearLayer}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Layer
            </button>
            <button
              onClick={clearAll}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
            <hr className="border-[#2A2A2A]" />
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
            <button
              onClick={importJSON}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Import JSON
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto rounded-xl border border-[#2A2A2A] bg-[#111] p-4">
          <div className="inline-block" style={{ cursor: tool === "fill" ? "crosshair" : "pointer" }}>
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              onMouseDown={handleCanvasDown}
              onMouseMove={handleCanvasMove}
              onMouseUp={handleCanvasUp}
              onMouseLeave={handleCanvasUp}
              className="rounded-lg"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-[#666]">
            <span>{GRID_W}x{GRID_H} tiles</span>
            <span>{BASE_TILE}px base</span>
            <span>Layer: {activeLayer}</span>
            <span>Tile: {TILE_TYPES[selectedTile]?.name ?? "None"}</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#666]">
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">1-9</kbd> Select tile</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">E</kbd> Eraser</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">F</kbd> Fill</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">G</kbd> Toggle grid</span>
        </div>
      </div>
    </div>
  );
}
