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
  Undo2,
  Redo2,
  LayoutGrid,
  Sparkles,
  Loader2,
  Activity,
} from "lucide-react";

const BASE_TILE = 32;
const MAX_UNDO = 30;

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
  { id: 10, name: "Flowers", color: "#EC407A", key: "" },
  { id: 11, name: "Bridge", color: "#BCAAA4", key: "" },
  { id: 12, name: "Door", color: "#7E57C2", key: "" },
];

const MAP_SIZES = [
  { w: 10, h: 10, label: "10 x 10" },
  { w: 20, h: 15, label: "20 x 15" },
  { w: 30, h: 20, label: "30 x 20" },
  { w: 40, h: 30, label: "40 x 30" },
] as const;

const LAYERS = ["Ground", "Objects", "Collision"] as const;
type LayerName = (typeof LAYERS)[number];
type ToolType = "paint" | "erase" | "fill" | "stamp";

function createEmptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function cloneLayers(layers: Record<LayerName, number[][]>): Record<LayerName, number[][]> {
  return {
    Ground: layers.Ground.map((r) => [...r]),
    Objects: layers.Objects.map((r) => [...r]),
    Collision: layers.Collision.map((r) => [...r]),
  };
}

export default function TilemapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const [gridW, setGridW] = useState(20);
  const [gridH, setGridH] = useState(15);
  const [layers, setLayers] = useState<Record<LayerName, number[][]>>(() => ({
    Ground: createEmptyGrid(20, 15),
    Objects: createEmptyGrid(20, 15),
    Collision: createEmptyGrid(20, 15),
  }));
  const [activeLayer, setActiveLayer] = useState<LayerName>("Ground");
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerName, boolean>>({
    Ground: true,
    Objects: true,
    Collision: true,
  });
  const [selectedTile, setSelectedTile] = useState(1);
  const [tool, setTool] = useState<ToolType>("paint");
  const [stampSize, setStampSize] = useState<2 | 3>(2);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isPainting, setIsPainting] = useState(false);

  const [undoStack, setUndoStack] = useState<Record<LayerName, number[][]>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<LayerName, number[][]>[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDecorateLoading, setAiDecorateLoading] = useState(false);
  const [aiDecorateResult, setAiDecorateResult] = useState("");
  const [aiPacingLoading, setAiPacingLoading] = useState(false);
  const [aiPacingResult, setAiPacingResult] = useState("");
  const [aiCollisionLoading, setAiCollisionLoading] = useState(false);
  const [aiCollisionResult, setAiCollisionResult] = useState("");
  const [aiThemeLoading, setAiThemeLoading] = useState(false);
  const [aiThemeResult, setAiThemeResult] = useState("");

  const layersRef = useRef(layers);
  layersRef.current = layers;
  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  const tileSize = BASE_TILE * zoom;
  const canvasW = gridW * tileSize;
  const canvasH = gridH * tileSize;
  const minimapScale = Math.min(8, Math.max(2, Math.floor(140 / Math.max(gridW, gridH))));
  const minimapW = gridW * minimapScale;
  const minimapH = gridH * minimapScale;

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

  const generateFallbackPattern = useCallback((): number[][] => {
    const grid = createEmptyGrid(gridW, gridH);
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (y === 0 || y === gridH - 1 || x === 0 || x === gridW - 1) {
          grid[y][x] = 8;
        } else {
          grid[y][x] = 1;
        }
      }
    }
    const midY = Math.floor(gridH / 2);
    for (let x = 1; x < gridW - 1; x++) {
      grid[midY][x] = 7;
    }
    return grid;
  }, [gridW, gridH]);

  const generateAiLevel = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    pushUndo();

    try {
      const tileList = TILE_TYPES.map((t) => `${t.name}=${t.id}`).join(", ");
      const prompt = `Generate a ${gridW}x${gridH} tilemap for a game level described as: '${aiPrompt.trim()}'. The available tile types are: ${tileList}. Return ONLY a JSON 2D array of tile IDs (${gridH} rows of ${gridW} columns). No explanation.`;
      const maxTokens = Math.min(4096, Math.max(512, Math.ceil(gridW * gridH * 3)));

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
          max_tokens: maxTokens,
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");

      const parsed: number[][] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0]))
        throw new Error("Invalid structure");

      const grid = createEmptyGrid(gridW, gridH);
      for (let y = 0; y < Math.min(parsed.length, gridH); y++) {
        for (let x = 0; x < Math.min(parsed[y]?.length ?? 0, gridW); x++) {
          const val = parsed[y][x];
          if (typeof val === "number" && val >= 0 && val < TILE_TYPES.length) {
            grid[y][x] = val;
          }
        }
      }

      setLayers((prev) => ({ ...prev, Ground: grid }));
    } catch {
      setLayers((prev) => ({ ...prev, Ground: generateFallbackPattern() }));
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, gridW, gridH, pushUndo, generateFallbackPattern]);

  const aiDecorate = async () => {
    if (aiDecorateLoading) return;
    setAiDecorateLoading(true);
    setAiDecorateResult("");
    pushUndo();
    try {
      const groundLayer = layers.Ground;
      const tileNames: Record<number, string> = {};
      TILE_TYPES.forEach((t) => { tileNames[t.id] = t.name; });

      const counts: Record<string, number> = {};
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const id = groundLayer[y]?.[x] ?? 0;
          const name = tileNames[id] || "Empty";
          counts[name] = (counts[name] || 0) + 1;
        }
      }
      const summary = Object.entries(counts)
        .filter(([n]) => n !== "Empty")
        .map(([n, c]) => `${n}: ${c} tiles`)
        .join(", ");

      const prompt = `Given this ${gridW}x${gridH} tilemap, suggest placement for decorative elements. The ground layer has: ${summary || "mostly empty tiles"}. Suggest where to place: trees (id=9), flowers (id=10), and bridges (id=11). Return as JSON array: [{x, y, tile}] where tile is the id number. Only suggest 10-15 decorations. Place trees and flowers on grass tiles, bridges over water adjacent to land. Return ONLY the JSON array, no explanation.`;

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
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON found");

      const decorations: { x: number; y: number; tile: number }[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(decorations)) throw new Error("Invalid format");

      const valid = decorations.filter(
        (d) => d.x >= 0 && d.x < gridW && d.y >= 0 && d.y < gridH && [9, 10, 11].includes(d.tile)
      );

      setLayers((prev) => {
        const objectsGrid = prev.Objects.map((r) => [...r]);
        for (const d of valid) {
          objectsGrid[d.y][d.x] = d.tile;
        }
        return { ...prev, Objects: objectsGrid };
      });

      setAiDecorateResult(`Placed ${valid.length} decorations on the Objects layer.`);
      setActiveLayer("Objects");
      setLayerVisibility((prev) => ({ ...prev, Objects: true }));
    } catch {
      setAiDecorateResult("Failed to generate decorations. Try again.");
    } finally {
      setAiDecorateLoading(false);
    }
  };

  const aiAnalyzePacing = async () => {
    if (aiPacingLoading) return;
    setAiPacingLoading(true);
    setAiPacingResult("");
    try {
      const groundLayer = layers.Ground;
      const tileNames: Record<number, string> = {};
      TILE_TYPES.forEach((t) => { tileNames[t.id] = t.name; });
      const total = gridW * gridH;
      const counts: Record<string, number> = {};
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const id = groundLayer[y]?.[x] ?? 0;
          const name = tileNames[id] || "Empty";
          counts[name] = (counts[name] || 0) + 1;
        }
      }

      const composition = Object.entries(counts)
        .map(([name, count]) => `${Math.round((count / total) * 100)}% ${name}`)
        .join(", ");

      const prompt = `Analyze this game level's pacing based on tile composition: ${composition}. Map size: ${gridW}x${gridH}. Suggest: 1) Is there enough variety? 2) Are there natural rest/safe areas? 3) Where should difficulty ramp up? 4) What's missing? Be brief.`;

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
      setAiPacingResult(content || "No analysis returned. Try again.");
    } catch {
      setAiPacingResult("Failed to analyze pacing. Try again.");
    } finally {
      setAiPacingLoading(false);
    }
  };

  const aiSuggestCollisions = async () => {
    if (aiCollisionLoading) return;
    setAiCollisionLoading(true);
    setAiCollisionResult("");
    pushUndo();
    try {
      const groundLayer = layers.Ground;
      const tileNames: Record<number, string> = {};
      TILE_TYPES.forEach((t) => { tileNames[t.id] = t.name; });

      const present = new Set<string>();
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const id = groundLayer[y]?.[x] ?? 0;
          if (id !== 0) present.add(tileNames[id] || "Empty");
        }
      }

      const available = "Grass, Water, Sand, Stone, Lava, Ice, Path, Wall, Tree, Flowers, Bridge, Door";
      const prompt = `Based on this tilemap ground layer, which tiles should be collidable (solid)? The map contains: ${[...present].join(", ")}. Available types: ${available}. List the collidable ones. Just the names, comma-separated.`;

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
          max_tokens: 128,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";

      const collidableNames = content
        .split(",")
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);

      const collidableIds = new Set<number>();
      TILE_TYPES.forEach((t) => {
        if (collidableNames.includes(t.name.toLowerCase())) collidableIds.add(t.id);
      });

      if (collidableIds.size === 0) throw new Error("No collidable tiles identified");

      setLayers((prev) => {
        const collisionGrid = prev.Collision.map((r) => [...r]);
        let marked = 0;
        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            const groundId = prev.Ground[y]?.[x] ?? 0;
            if (collidableIds.has(groundId)) {
              collisionGrid[y][x] = 1;
              marked++;
            }
          }
        }
        setAiCollisionResult(
          `Marked ${marked} tiles. Collidable: ${[...collidableIds].map((id) => TILE_TYPES[id]?.name).filter(Boolean).join(", ")}`
        );
        return { ...prev, Collision: collisionGrid };
      });

      setActiveLayer("Collision");
      setLayerVisibility((prev) => ({ ...prev, Collision: true }));
    } catch {
      setAiCollisionResult("Failed to suggest collisions. Try again.");
    } finally {
      setAiCollisionLoading(false);
    }
  };

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

      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const tileId = grid[y]?.[x];
          if (tileId === 0 || tileId === undefined) continue;
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
      for (let x = 0; x <= gridW; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, canvasH);
        ctx.stroke();
      }
      for (let y = 0; y <= gridH; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(canvasW, y * tileSize);
        ctx.stroke();
      }
    }

    // Minimap
    const minimap = minimapRef.current;
    if (minimap) {
      const mCtx = minimap.getContext("2d");
      if (mCtx) {
        minimap.width = minimapW;
        minimap.height = minimapH;
        mCtx.fillStyle = "#111111";
        mCtx.fillRect(0, 0, minimapW, minimapH);

        for (const ln of drawOrder) {
          if (!layerVisibility[ln]) continue;
          const grid = layers[ln];
          for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
              const tid = grid[y]?.[x];
              if (tid === 0 || tid === undefined) continue;
              const tile = TILE_TYPES[tid];
              if (!tile) continue;
              mCtx.fillStyle = ln === "Collision" ? "rgba(255,0,0,0.4)" : tile.color;
              mCtx.fillRect(x * minimapScale, y * minimapScale, minimapScale, minimapScale);
            }
          }
        }

        if (showGrid && minimapScale >= 3) {
          mCtx.strokeStyle = "rgba(255,255,255,0.05)";
          mCtx.lineWidth = 0.5;
          for (let x = 0; x <= gridW; x++) {
            mCtx.beginPath();
            mCtx.moveTo(x * minimapScale, 0);
            mCtx.lineTo(x * minimapScale, minimapH);
            mCtx.stroke();
          }
          for (let y = 0; y <= gridH; y++) {
            mCtx.beginPath();
            mCtx.moveTo(0, y * minimapScale);
            mCtx.lineTo(minimapW, y * minimapScale);
            mCtx.stroke();
          }
        }
      }
    }
  }, [layers, layerVisibility, showGrid, zoom, canvasW, canvasH, tileSize, gridW, gridH, minimapScale, minimapW, minimapH]);

  useEffect(() => {
    draw();
  }, [draw]);

  function getTileCoords(e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);
    if (x < 0 || x >= gridW || y < 0 || y >= gridH) return null;
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

  function paintStamp(startX: number, startY: number) {
    setLayers((prev) => {
      const grid = prev[activeLayer].map((row) => [...row]);
      const tileId = selectedTile;
      let changed = false;
      for (let dy = 0; dy < stampSize; dy++) {
        for (let dx = 0; dx < stampSize; dx++) {
          const nx = startX + dx;
          const ny = startY + dy;
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH && grid[ny][nx] !== tileId) {
            grid[ny][nx] = tileId;
            changed = true;
          }
        }
      }
      if (!changed) return prev;
      return { ...prev, [activeLayer]: grid };
    });
  }

  function floodFillAction(startX: number, startY: number) {
    const grid = layers[activeLayer].map((row) => [...row]);
    const target = grid[startY][startX];
    const replacement = tool === "erase" ? 0 : selectedTile;
    if (target === replacement) return;

    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) continue;
      if (grid[cy][cx] !== target) continue;
      grid[cy][cx] = replacement;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    setLayers((prev) => ({ ...prev, [activeLayer]: grid }));
  }

  function handleCanvasDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const coords = getTileCoords(e);
    if (!coords) return;
    pushUndo();
    if (tool === "fill") {
      floodFillAction(coords[0], coords[1]);
    } else if (tool === "stamp") {
      setIsPainting(true);
      paintStamp(coords[0], coords[1]);
    } else {
      setIsPainting(true);
      paintTile(coords[0], coords[1]);
    }
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPainting) return;
    const coords = getTileCoords(e);
    if (!coords) return;
    if (tool === "stamp") {
      paintStamp(coords[0], coords[1]);
    } else {
      paintTile(coords[0], coords[1]);
    }
  }

  function handleCanvasUp() {
    setIsPainting(false);
  }

  function clearLayer() {
    pushUndo();
    setLayers((prev) => ({ ...prev, [activeLayer]: createEmptyGrid(gridW, gridH) }));
  }

  function clearAll() {
    pushUndo();
    setLayers({
      Ground: createEmptyGrid(gridW, gridH),
      Objects: createEmptyGrid(gridW, gridH),
      Collision: createEmptyGrid(gridW, gridH),
    });
  }

  function handleMapSizeChange(w: number, h: number) {
    const newLayers: Record<LayerName, number[][]> = {
      Ground: createEmptyGrid(w, h),
      Objects: createEmptyGrid(w, h),
      Collision: createEmptyGrid(w, h),
    };
    for (const layerName of LAYERS) {
      const oldGrid = layers[layerName];
      const newGrid = newLayers[layerName];
      for (let y = 0; y < Math.min(gridH, h); y++) {
        for (let x = 0; x < Math.min(gridW, w); x++) {
          newGrid[y][x] = oldGrid[y]?.[x] ?? 0;
        }
      }
    }
    setLayers(newLayers);
    setGridW(w);
    setGridH(h);
    setUndoStack([]);
    setRedoStack([]);
  }

  function exportJSON() {
    const usedTileIds = new Set<number>();
    for (const layerName of LAYERS) {
      const grid = layers[layerName];
      for (const row of grid) {
        for (const tileId of row) {
          if (tileId !== 0) usedTileIds.add(tileId);
        }
      }
    }
    const tileTypesUsed = TILE_TYPES.filter((t) => usedTileIds.has(t.id)).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    }));

    const data = {
      version: 1,
      width: gridW,
      height: gridH,
      tileSize: BASE_TILE,
      layers,
      tileTypesUsed,
      layerOrder: [...LAYERS],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tilemap-${gridW}x${gridH}.json`;
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
            const w = data.width || 20;
            const h = data.height || 15;
            setGridW(w);
            setGridH(h);
            setLayers(data.layers);
            setUndoStack([]);
            setRedoStack([]);
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
      } else if (key === "s" && !e.ctrlKey && !e.metaKey) {
        setTool("stamp");
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

  const mapSizeKey = `${gridW}x${gridH}`;

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
        {/* Left Sidebar */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Map Size */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Map Size
            </h3>
            <select
              value={mapSizeKey}
              onChange={(e) => {
                const found = MAP_SIZES.find((s) => `${s.w}x${s.h}` === e.target.value);
                if (found) handleMapSizeChange(found.w, found.h);
              }}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-2 py-1.5 text-xs text-[#D1D5DB] outline-none focus:border-[#F59E0B]/40"
            >
              {MAP_SIZES.map((s) => (
                <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Generate */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="inline h-3 w-3 mr-1" /> AI Level Design
            </h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='e.g. "forest path with a river crossing"'
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-2 py-1.5 text-xs text-[#D1D5DB] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 resize-none"
              rows={2}
              disabled={aiLoading}
            />
            <button
              onClick={generateAiLevel}
              disabled={aiLoading || !aiPrompt.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Generate
                </>
              )}
            </button>
          </div>

          {/* AI Decorate */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="inline h-3 w-3 mr-1" /> AI Decorate
            </h3>
            <p className="mb-2 text-[10px] text-[#6B7280]">
              Auto-place trees, flowers &amp; bridges on the Objects layer based on your ground terrain.
            </p>
            <button
              onClick={aiDecorate}
              disabled={aiDecorateLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiDecorateLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Decorating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Decorate
                </>
              )}
            </button>
            {aiDecorateResult && (
              <div className="mt-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2">
                <p className="text-[11px] text-[#F59E0B]">{aiDecorateResult}</p>
              </div>
            )}
          </div>

          {/* AI Pacing */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Activity className="inline h-3 w-3 mr-1" /> AI Pacing
            </h3>
            <p className="mb-2 text-[10px] text-[#6B7280]">
              Analyze your level&apos;s pacing and get suggestions for variety, rest areas, and difficulty curves.
            </p>
            <button
              onClick={aiAnalyzePacing}
              disabled={aiPacingLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiPacingLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5" />
                  Analyze Pacing
                </>
              )}
            </button>
            {aiPacingResult && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2">
                <p className="text-[11px] text-[#D1D5DB] whitespace-pre-wrap leading-relaxed">{aiPacingResult}</p>
              </div>
            )}
          </div>

          {/* AI Collisions */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="inline h-3 w-3 mr-1" /> AI Collisions
            </h3>
            <p className="mb-2 text-[10px] text-[#6B7280]">
              Auto-mark solid tiles on the Collision layer based on your ground terrain.
            </p>
            <button
              onClick={aiSuggestCollisions}
              disabled={aiCollisionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiCollisionLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Collisions
                </>
              )}
            </button>
            {aiCollisionResult && (
              <div className="mt-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2">
                <p className="text-[11px] text-[#F59E0B]">{aiCollisionResult}</p>
              </div>
            )}
          </div>

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
                    else if (tool === "erase") setTool("paint");
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    selectedTile === tile.id && tool !== "fill" && tool !== "stamp"
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
                  {tile.key && (
                    <kbd className="ml-auto text-[9px] opacity-40">{tile.key}</kbd>
                  )}
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
            <button onClick={() => setTool("stamp")} className={toolBtnClass(tool === "stamp")}>
              <LayoutGrid className="h-4 w-4" /> Stamp <kbd className="ml-auto text-[10px] opacity-50">S</kbd>
            </button>
            {tool === "stamp" && (
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => setStampSize(2)}
                  className={`flex-1 rounded-lg py-1 text-xs font-medium transition-colors ${
                    stampSize === 2
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/40"
                      : "text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  }`}
                >
                  2x2
                </button>
                <button
                  onClick={() => setStampSize(3)}
                  className={`flex-1 rounded-lg py-1 text-xs font-medium transition-colors ${
                    stampSize === 3
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/40"
                      : "text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  }`}
                >
                  3x3
                </button>
              </div>
            )}
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
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={undoStack.length === 0}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="tabular-nums">{undoStack.length}</span>
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors disabled:opacity-30"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-3.5 w-3.5" />
                <span className="tabular-nums">{redoStack.length}</span>
              </button>
            </div>
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

          {/* AI Tilemap Theme */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">AI Theme</span>
              <button
                onClick={async () => {
                  if (aiThemeLoading) return;
                  setAiThemeLoading(true); setAiThemeResult("");
                  const genres = ["platformer", "RPG", "roguelike", "puzzle", "adventure"];
                  const genre = genres[Math.floor(Math.random() * genres.length)];
                  try {
                    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                      method: "POST",
                      headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                      body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest a level theme for a ${gridW}x${gridH} tilemap in a ${genre} game. Just the theme name and 1-sentence description.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
                    });
                    const data = await response.json();
                    setAiThemeResult(data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "");
                  } catch {} finally { setAiThemeLoading(false); }
                }}
                disabled={aiThemeLoading}
                className="flex items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[10px] font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-50"
              >
                {aiThemeLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                Suggest
              </button>
            </div>
            {aiThemeResult && <p className="text-[11px] leading-relaxed text-[#D1D5DB]">{aiThemeResult}</p>}
          </div>

          {/* Minimap */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Minimap
            </h3>
            <canvas
              ref={minimapRef}
              className="w-full rounded border border-[#2A2A2A]"
              style={{ imageRendering: "pixelated", width: minimapW, height: minimapH }}
            />
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
            <span>{gridW}x{gridH} tiles</span>
            <span>{BASE_TILE}px base</span>
            <span>Layer: {activeLayer}</span>
            <span>Tile: {TILE_TYPES[selectedTile]?.name ?? "None"}</span>
            {tool === "stamp" && <span>Stamp: {stampSize}x{stampSize}</span>}
            <span className="ml-auto tabular-nums text-[#4A4A4A]">
              {undoStack.length}/{MAX_UNDO} undo
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#666]">
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">1-9</kbd> Select tile</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">E</kbd> Eraser</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">F</kbd> Fill</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">S</kbd> Stamp</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">G</kbd> Toggle grid</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">Ctrl+Y</kbd> Redo</span>
        </div>
      </div>
    </div>
  );
}
