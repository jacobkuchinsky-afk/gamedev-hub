"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Copy,
  Download,
  Pencil,
  Eraser,
  Eye,
  Repeat,
  Plus,
  Trash2,
} from "lucide-react";

const GRID = 16;
const CELL = 20;
const CANVAS_SIZE = GRID * CELL;
const PREVIEW_SIZE = 256;
const STRIP_THUMB = 64;

type PixelGrid = (string | null)[][];

function emptyGrid(): PixelGrid {
  return Array.from({ length: GRID }, () => Array<string | null>(GRID).fill(null));
}

function cloneGrid(g: PixelGrid): PixelGrid {
  return g.map((r) => [...r]);
}

function makeSampleFrames(): PixelGrid[] {
  const frames: PixelGrid[] = [];
  const base = emptyGrid();
  const c = "#F59E0B";
  const h = "#FBBF24";
  const s = "#D97706";

  const drawHead = (g: PixelGrid) => {
    for (let y = 2; y <= 4; y++) for (let x = 6; x <= 9; x++) g[y][x] = h;
    g[3][7] = "#1A1A1A"; g[3][8] = "#1A1A1A";
  };

  const drawBody = (g: PixelGrid) => {
    for (let y = 5; y <= 9; y++) { g[y][7] = c; g[y][8] = c; }
  };

  // Frame 0 — standing
  const f0 = cloneGrid(base);
  drawHead(f0); drawBody(f0);
  f0[6][6] = s; f0[7][5] = s; f0[6][9] = s; f0[7][10] = s;
  f0[10][7] = c; f0[11][7] = c; f0[10][8] = c; f0[11][8] = c;
  f0[12][6] = s; f0[12][9] = s;
  frames.push(f0);

  // Frame 1 — step right
  const f1 = cloneGrid(base);
  drawHead(f1); drawBody(f1);
  f1[6][6] = s; f1[7][5] = s; f1[6][9] = s; f1[7][10] = s;
  f1[10][6] = c; f1[11][5] = c; f1[10][9] = c; f1[11][10] = c;
  f1[12][4] = s; f1[12][11] = s;
  frames.push(f1);

  // Frame 2 — standing (same as 0)
  frames.push(cloneGrid(f0));

  // Frame 3 — step left (mirror of 1)
  const f3 = cloneGrid(base);
  drawHead(f3); drawBody(f3);
  f3[6][6] = s; f3[7][5] = s; f3[6][9] = s; f3[7][10] = s;
  f3[10][9] = c; f3[11][10] = c; f3[10][6] = c; f3[11][5] = c;
  f3[12][11] = s; f3[12][4] = s;
  frames.push(f3);

  return frames;
}

function renderGridToCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  size: number,
  ghost?: PixelGrid | null,
) {
  const px = size / GRID;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0F0F0F";
  ctx.fillRect(0, 0, size, size);

  if (ghost) {
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++)
        if (ghost[y][x]) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = ghost[y][x]!;
          ctx.fillRect(x * px, y * px, px, px);
        }
    ctx.globalAlpha = 1;
  }

  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (grid[y][x]) {
        ctx.fillStyle = grid[y][x]!;
        ctx.fillRect(x * px, y * px, px, px);
      }
}

export default function AnimationPage() {
  const [frames, setFrames] = useState<PixelGrid[]>(makeSampleFrames);
  const [activeFrame, setActiveFrame] = useState(0);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [color, setColor] = useState("#F59E0B");
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [loop, setLoop] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);

  const editorRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stripRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const animRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const isPainting = useRef(false);

  const currentGrid = frames[activeFrame];

  const drawEditor = useCallback(() => {
    const ctx = editorRef.current?.getContext("2d");
    if (!ctx || !currentGrid) return;
    const ghost = onionSkin && activeFrame > 0 ? frames[activeFrame - 1] : null;
    renderGridToCanvas(ctx, currentGrid, CANVAS_SIZE, ghost);

    ctx.strokeStyle = "#2A2A2A";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(CANVAS_SIZE, i * CELL); ctx.stroke();
    }
  }, [currentGrid, onionSkin, activeFrame, frames]);

  const drawPreview = useCallback(() => {
    const ctx = previewRef.current?.getContext("2d");
    if (!ctx || !currentGrid) return;
    renderGridToCanvas(ctx, currentGrid, PREVIEW_SIZE);
  }, [currentGrid]);

  const drawStrip = useCallback((idx: number) => {
    const cvs = stripRefs.current.get(idx);
    if (!cvs || !frames[idx]) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    renderGridToCanvas(ctx, frames[idx], STRIP_THUMB);
  }, [frames]);

  useEffect(() => { drawEditor(); drawPreview(); }, [drawEditor, drawPreview]);
  useEffect(() => { frames.forEach((_, i) => drawStrip(i)); }, [frames, drawStrip]);

  useEffect(() => {
    if (!playing) { if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    const step = (ts: number) => {
      if (ts - lastTickRef.current >= 1000 / fps) {
        lastTickRef.current = ts;
        setActiveFrame((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (!loop) { setPlaying(false); return prev; }
            return 0;
          }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, fps, loop, frames.length]);

  const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = editorRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL);
    const y = Math.floor((e.clientY - rect.top) / CELL);
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return;
    setFrames((prev) => {
      const copy = prev.map(cloneGrid);
      copy[activeFrame][y][x] = tool === "pencil" ? color : null;
      return copy;
    });
  };

  const addFrame = () => {
    setFrames((p) => [...p, emptyGrid()]);
    setActiveFrame(frames.length);
  };

  const duplicateFrame = () => {
    const copy = cloneGrid(frames[activeFrame]);
    setFrames((p) => {
      const n = [...p];
      n.splice(activeFrame + 1, 0, copy);
      return n;
    });
    setActiveFrame(activeFrame + 1);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames((p) => p.filter((_, i) => i !== activeFrame));
    setActiveFrame(Math.min(activeFrame, frames.length - 2));
  };

  const exportSpritesheet = () => {
    const cvs = document.createElement("canvas");
    cvs.width = GRID * frames.length;
    cvs.height = GRID;
    const ctx = cvs.getContext("2d")!;
    frames.forEach((grid, i) => {
      for (let y = 0; y < GRID; y++)
        for (let x = 0; x < GRID; x++)
          if (grid[y][x]) {
            ctx.fillStyle = grid[y][x]!;
            ctx.fillRect(i * GRID + x, y, 1, 1);
          }
    });
    const a = document.createElement("a");
    a.download = "spritesheet.png";
    a.href = cvs.toDataURL();
    a.click();
  };

  const PALETTE = ["#F59E0B", "#FBBF24", "#D97706", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#FFFFFF", "#9CA3AF", "#1A1A1A", "#000000"];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Animation Frame Viewer</h1>
          <p className="text-sm text-[#9CA3AF]">Draw frames, preview animations, export spritesheets</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main area */}
        <div className="space-y-4">
          {/* Editor + Preview side by side */}
          <div className="flex flex-wrap gap-4">
            {/* Pixel editor */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <p className="mb-2 text-xs font-medium text-[#9CA3AF]">
                DRAW — Frame {activeFrame + 1}/{frames.length}
              </p>
              <canvas
                ref={editorRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="cursor-crosshair rounded-lg"
                style={{ imageRendering: "pixelated" }}
                onMouseDown={(e) => { isPainting.current = true; paint(e); }}
                onMouseMove={(e) => { if (isPainting.current) paint(e); }}
                onMouseUp={() => { isPainting.current = false; }}
                onMouseLeave={() => { isPainting.current = false; }}
              />
            </div>
            {/* Preview */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <p className="mb-2 text-xs font-medium text-[#9CA3AF]">PREVIEW</p>
                <canvas
                  ref={previewRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  className="rounded-lg"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>

              {/* Playback */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
                <p className="text-xs font-medium text-[#9CA3AF]">PLAYBACK</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveFrame((p) => Math.max(0, p - 1))} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors" title="Previous frame">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPlaying(!playing)} className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-2 text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors" title={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button onClick={() => { setPlaying(false); setActiveFrame(0); }} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors" title="Stop">
                    <Square className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setActiveFrame((p) => Math.min(frames.length - 1, p + 1))} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors" title="Next frame">
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                    <span>FPS</span><span className="font-mono text-[#F59E0B]">{fps}</span>
                  </div>
                  <input type="range" min={1} max={30} value={fps} onChange={(e) => setFps(+e.target.value)} className="w-full accent-[#F59E0B]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLoop(!loop)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${loop ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF]"}`}>
                    <Repeat className="h-3.5 w-3.5" /> Loop
                  </button>
                  <button onClick={() => setOnionSkin(!onionSkin)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${onionSkin ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF]"}`}>
                    <Eye className="h-3.5 w-3.5" /> Onion
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Frame strip */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[#9CA3AF]">FRAMES</p>
              <div className="flex gap-1.5">
                <button onClick={addFrame} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-1.5 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors" title="New blank frame"><Plus className="h-3.5 w-3.5" /></button>
                <button onClick={duplicateFrame} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-1.5 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors" title="Duplicate frame"><Copy className="h-3.5 w-3.5" /></button>
                <button onClick={deleteFrame} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors" title="Delete frame"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {frames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFrame(i)}
                  className={`relative flex-shrink-0 rounded-lg border-2 transition-colors ${i === activeFrame ? "border-[#F59E0B]" : "border-[#2A2A2A] hover:border-[#3A3A3A]"}`}
                >
                  <canvas
                    ref={(el) => { if (el) stripRefs.current.set(i, el); }}
                    width={STRIP_THUMB}
                    height={STRIP_THUMB}
                    className="rounded-md"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-[#9CA3AF]/60">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tools */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
            <p className="text-xs font-medium text-[#9CA3AF]">TOOLS</p>
            <div className="flex gap-2">
              {([
                { id: "pencil" as const, icon: Pencil, label: "Draw" },
                { id: "eraser" as const, icon: Eraser, label: "Erase" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${tool === t.id ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"}`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
            <p className="text-xs font-medium text-[#9CA3AF]">COLOR</p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg border border-[#2A2A2A]" style={{ backgroundColor: color }} />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 ${color === c ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/40" : "border-[#2A2A2A]"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Export */}
          <button onClick={exportSpritesheet} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors">
            <Download className="h-4 w-4" /> Export Spritesheet
          </button>
        </div>
      </div>
    </div>
  );
}
