"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Flame,
  Circle,
  Minus,
  Crosshair,
} from "lucide-react";

interface ParticleConfig {
  emissionRate: number;
  lifetime: number;
  speed: number;
  spreadAngle: number;
  direction: number;
  size: number;
  sizeOverLifetime: "constant" | "shrink" | "grow";
  startColor: string;
  endColor: string;
  gravity: number;
  shape: "point" | "circle" | "line";
  shapeRadius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  startColor: [number, number, number];
  endColor: [number, number, number];
}

const PRESETS: Record<string, ParticleConfig> = {
  Fire: {
    emissionRate: 60,
    lifetime: 1.2,
    speed: 120,
    spreadAngle: 30,
    direction: 270,
    size: 8,
    sizeOverLifetime: "shrink",
    startColor: "#FF6600",
    endColor: "#FF000000",
    gravity: -40,
    shape: "circle",
    shapeRadius: 10,
  },
  Smoke: {
    emissionRate: 25,
    lifetime: 3,
    speed: 40,
    spreadAngle: 25,
    direction: 270,
    size: 14,
    sizeOverLifetime: "grow",
    startColor: "#666666",
    endColor: "#33333300",
    gravity: -15,
    shape: "circle",
    shapeRadius: 8,
  },
  Sparks: {
    emissionRate: 80,
    lifetime: 0.8,
    speed: 350,
    spreadAngle: 360,
    direction: 270,
    size: 3,
    sizeOverLifetime: "shrink",
    startColor: "#FFD700",
    endColor: "#FF4500",
    gravity: 60,
    shape: "point",
    shapeRadius: 0,
  },
  Rain: {
    emissionRate: 100,
    lifetime: 2,
    speed: 400,
    spreadAngle: 5,
    direction: 100,
    size: 2,
    sizeOverLifetime: "constant",
    startColor: "#7EC8E3",
    endColor: "#4A90D9",
    gravity: 20,
    shape: "line",
    shapeRadius: 200,
  },
  Snow: {
    emissionRate: 40,
    lifetime: 4,
    speed: 50,
    spreadAngle: 40,
    direction: 90,
    size: 5,
    sizeOverLifetime: "constant",
    startColor: "#FFFFFF",
    endColor: "#CCDDFF",
    gravity: 10,
    shape: "line",
    shapeRadius: 200,
  },
  Explosion: {
    emissionRate: 100,
    lifetime: 0.6,
    speed: 400,
    spreadAngle: 360,
    direction: 0,
    size: 6,
    sizeOverLifetime: "shrink",
    startColor: "#FFAA00",
    endColor: "#FF2200",
    gravity: 30,
    shape: "point",
    shapeRadius: 0,
  },
  Magic: {
    emissionRate: 50,
    lifetime: 1.5,
    speed: 80,
    spreadAngle: 360,
    direction: 270,
    size: 5,
    sizeOverLifetime: "shrink",
    startColor: "#AA55FF",
    endColor: "#5599FF",
    gravity: -20,
    shape: "circle",
    shapeRadius: 30,
  },
  Bubbles: {
    emissionRate: 15,
    lifetime: 3.5,
    speed: 60,
    spreadAngle: 30,
    direction: 270,
    size: 10,
    sizeOverLifetime: "grow",
    startColor: "#88CCFF",
    endColor: "#AAEEFF",
    gravity: -30,
    shape: "circle",
    shapeRadius: 20,
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").slice(0, 6);
  return [
    parseInt(clean.substring(0, 2), 16) || 0,
    parseInt(clean.substring(2, 4), 16) || 0,
    parseInt(clean.substring(4, 6), 16) || 0,
  ];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const SHAPE_ICONS = { point: Crosshair, circle: Circle, line: Minus } as const;

export default function ParticlesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const emitAccRef = useRef<number>(0);
  const [playing, setPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>("Fire");
  const [particleCount, setParticleCount] = useState(0);

  const [config, setConfig] = useState<ParticleConfig>(PRESETS.Fire);

  const configRef = useRef(config);
  configRef.current = config;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const updateConfig = useCallback(
    (key: keyof ParticleConfig, value: number | string) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setActivePreset(null);
    },
    []
  );

  const applyPreset = useCallback((name: string) => {
    setConfig(PRESETS[name]);
    setActivePreset(name);
    particlesRef.current = [];
  }, []);

  const spawnParticle = useCallback(
    (cx: number, cy: number) => {
      const c = configRef.current;
      const dirRad = (c.direction * Math.PI) / 180;
      const spreadRad = (c.spreadAngle * Math.PI) / 180;
      const angle = dirRad + (Math.random() - 0.5) * spreadRad;
      const speed = c.speed * (0.8 + Math.random() * 0.4);

      let x = cx;
      let y = cy;

      if (c.shape === "circle") {
        const r = Math.random() * c.shapeRadius;
        const a = Math.random() * Math.PI * 2;
        x += Math.cos(a) * r;
        y += Math.sin(a) * r;
      } else if (c.shape === "line") {
        x += (Math.random() - 0.5) * c.shapeRadius * 2;
      }

      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: c.lifetime,
        maxLife: c.lifetime,
        size: c.size,
        startColor: hexToRgb(c.startColor),
        endColor: hexToRgb(c.endColor),
      } as Particle;
    },
    []
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = now;

    const c = configRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (playingRef.current) {
      emitAccRef.current += c.emissionRate * dt;
      const toEmit = Math.floor(emitAccRef.current);
      emitAccRef.current -= toEmit;
      for (let i = 0; i < toEmit; i++) {
        particlesRef.current.push(spawnParticle(cx, cy));
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    let alive = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (playingRef.current) {
        p.life -= dt;
      }
      if (p.life <= 0) continue;

      if (playingRef.current) {
        p.vy += c.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      const t = 1 - p.life / p.maxLife;
      const alpha = 1 - t;
      const color = lerpColor(p.startColor, p.endColor, t);

      let size = p.size;
      if (c.sizeOverLifetime === "shrink") size *= 1 - t;
      else if (c.sizeOverLifetime === "grow") size *= 1 + t;

      if (size < 0.2) {
        continue;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      particles[alive] = p;
      alive++;
    }
    particles.length = alive;
    ctx.globalAlpha = 1;

    setParticleCount(alive);
    animFrameRef.current = requestAnimationFrame(render);
  }, [spawnParticle]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.getContext("2d")?.scale(devicePixelRatio, devicePixelRatio);
      }
    });
    obs.observe(canvas.parentElement!);
    return () => obs.disconnect();
  }, []);

  const reset = useCallback(() => {
    particlesRef.current = [];
    emitAccRef.current = 0;
  }, []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `particle-${activePreset?.toLowerCase() || "custom"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, activePreset]);

  const copyJSON = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [config]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">
            Particle Effect Designer
          </h1>
          <p className="text-xs text-[#6B7280]">
            Design and preview particle VFX for your game
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activePreset === name
                ? "bg-[#F59E0B] text-[#0F0F0F]"
                : "bg-[#1A1A1A] text-[#9CA3AF] border border-[#2A2A2A] hover:border-[#F59E0B]/40 hover:text-[#F5F5F5]"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <div className="relative overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="relative h-[480px] w-full">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
              style={{ imageRendering: "auto" }}
            />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]/80 border border-[#2A2A2A] text-[#D1D5DB] backdrop-blur transition-colors hover:border-[#F59E0B]/40 hover:text-[#F59E0B]"
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]/80 border border-[#2A2A2A] text-[#D1D5DB] backdrop-blur transition-colors hover:border-[#F59E0B]/40 hover:text-[#F59E0B]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="absolute bottom-3 right-3 rounded-md bg-[#1A1A1A]/80 px-2 py-1 text-[10px] font-mono text-[#6B7280] backdrop-blur border border-[#2A2A2A]">
            {particleCount} particles
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3 overflow-y-auto rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 lg:max-h-[528px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Parameters
          </h3>

          <Slider
            label="Emission Rate"
            value={config.emissionRate}
            min={1}
            max={100}
            step={1}
            unit="/s"
            onChange={(v) => updateConfig("emissionRate", v)}
          />
          <Slider
            label="Lifetime"
            value={config.lifetime}
            min={0.1}
            max={5}
            step={0.1}
            unit="s"
            onChange={(v) => updateConfig("lifetime", v)}
          />
          <Slider
            label="Speed"
            value={config.speed}
            min={10}
            max={500}
            step={5}
            unit="px/s"
            onChange={(v) => updateConfig("speed", v)}
          />
          <Slider
            label="Spread"
            value={config.spreadAngle}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => updateConfig("spreadAngle", v)}
          />
          <Slider
            label="Direction"
            value={config.direction}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => updateConfig("direction", v)}
          />
          <Slider
            label="Size"
            value={config.size}
            min={1}
            max={20}
            step={0.5}
            unit="px"
            onChange={(v) => updateConfig("size", v)}
          />
          <Slider
            label="Gravity"
            value={config.gravity}
            min={-100}
            max={100}
            step={1}
            unit=""
            onChange={(v) => updateConfig("gravity", v)}
          />

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#9CA3AF]">
              Size Over Lifetime
            </span>
            <div className="flex gap-1">
              {(["constant", "shrink", "grow"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    updateConfig("sizeOverLifetime", mode);
                  }}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                    config.sizeOverLifetime === mode
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                      : "bg-[#0F0F0F] text-[#6B7280] border border-[#2A2A2A] hover:text-[#9CA3AF]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[#9CA3AF]">
                Start Color
              </span>
              <div className="flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5">
                <input
                  type="color"
                  value={config.startColor.slice(0, 7)}
                  onChange={(e) => updateConfig("startColor", e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-[10px] text-[#6B7280]">
                  {config.startColor.slice(0, 7)}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[#9CA3AF]">
                End Color
              </span>
              <div className="flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5">
                <input
                  type="color"
                  value={config.endColor.slice(0, 7)}
                  onChange={(e) => updateConfig("endColor", e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-[10px] text-[#6B7280]">
                  {config.endColor.slice(0, 7)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#9CA3AF]">
              Emitter Shape
            </span>
            <div className="flex gap-1">
              {(["point", "circle", "line"] as const).map((shape) => {
                const Icon = SHAPE_ICONS[shape];
                return (
                  <button
                    key={shape}
                    onClick={() => {
                      updateConfig("shape", shape);
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                      config.shape === shape
                        ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                        : "bg-[#0F0F0F] text-[#6B7280] border border-[#2A2A2A] hover:text-[#9CA3AF]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {shape}
                  </button>
                );
              })}
            </div>
          </div>

          {config.shape !== "point" && (
            <Slider
              label={config.shape === "circle" ? "Radius" : "Width"}
              value={config.shapeRadius}
              min={1}
              max={200}
              step={1}
              unit="px"
              onChange={(v) => updateConfig("shapeRadius", v)}
            />
          )}

          <div className="flex gap-2 pt-1 border-t border-[#2A2A2A]">
            <button
              onClick={exportJSON}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-semibold text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              onClick={copyJSON}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#9CA3AF]">{label}</span>
        <span className="font-mono text-[10px] text-[#F59E0B]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#F59E0B]"
      />
    </div>
  );
}
