"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Copy,
  Check,
  GitCompareArrows,
  SlidersHorizontal,
  X,
} from "lucide-react";

type EasingFn = (t: number) => number;

interface EasingDef {
  name: string;
  fn: EasingFn;
  css?: string;
  js: string;
  category: "basic" | "bounce" | "elastic" | "back" | "power";
  params?: { label: string; key: string; min: number; max: number; step: number; default: number }[];
}

function makeEasings(overrides: Record<string, number> = {}): EasingDef[] {
  const elasticAmp = overrides.elasticAmp ?? 1;
  const elasticFreq = overrides.elasticFreq ?? 3;
  const bounceDecay = overrides.bounceDecay ?? 0.5;
  const backOvershoot = overrides.backOvershoot ?? 1.70158;

  return [
    {
      name: "Linear",
      fn: (t) => t,
      css: "linear",
      js: "function linear(t) { return t; }",
      category: "basic",
    },
    {
      name: "Ease In Quad",
      fn: (t) => t * t,
      css: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
      js: "function easeInQuad(t) { return t * t; }",
      category: "power",
    },
    {
      name: "Ease Out Quad",
      fn: (t) => t * (2 - t),
      css: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      js: "function easeOutQuad(t) { return t * (2 - t); }",
      category: "power",
    },
    {
      name: "Ease In Out Quad",
      fn: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
      css: "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
      js: "function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }",
      category: "power",
    },
    {
      name: "Ease In Cubic",
      fn: (t) => t * t * t,
      css: "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
      js: "function easeInCubic(t) { return t * t * t; }",
      category: "power",
    },
    {
      name: "Ease Out Cubic",
      fn: (t) => 1 - Math.pow(1 - t, 3),
      css: "cubic-bezier(0.215, 0.61, 0.355, 1)",
      js: "function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }",
      category: "power",
    },
    {
      name: "Ease In Out",
      fn: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      css: "ease-in-out",
      js: "function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }",
      category: "basic",
    },
    {
      name: "Ease In Expo",
      fn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
      css: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
      js: "function easeInExpo(t) { return t === 0 ? 0 : Math.pow(2, 10*t-10); }",
      category: "power",
    },
    {
      name: "Ease Out Expo",
      fn: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      css: "cubic-bezier(0.19, 1, 0.22, 1)",
      js: "function easeOutExpo(t) { return t === 1 ? 1 : 1-Math.pow(2,-10*t); }",
      category: "power",
    },
    {
      name: "Bounce",
      fn: (t) => {
        let p = t;
        const d = bounceDecay;
        if (p < 1 / 2.75) return 7.5625 * p * p;
        if (p < 2 / 2.75) { p -= 1.5 / 2.75; return 7.5625 * p * p + (1 - d) * (1 - d * 0.5); }
        if (p < 2.5 / 2.75) { p -= 2.25 / 2.75; return 7.5625 * p * p + (1 - d * 0.25); }
        p -= 2.625 / 2.75;
        return 7.5625 * p * p + (1 - d * 0.0625);
      },
      js: `function bounce(t) {\n  if (t < 1/2.75) return 7.5625*t*t;\n  if (t < 2/2.75) { t -= 1.5/2.75; return 7.5625*t*t + 0.75; }\n  if (t < 2.5/2.75) { t -= 2.25/2.75; return 7.5625*t*t + 0.9375; }\n  t -= 2.625/2.75; return 7.5625*t*t + 0.984375;\n}`,
      category: "bounce",
      params: [{ label: "Decay", key: "bounceDecay", min: 0.1, max: 1, step: 0.05, default: 0.5 }],
    },
    {
      name: "Elastic",
      fn: (t) => {
        if (t === 0 || t === 1) return t;
        return -elasticAmp * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - 0.075) * (2 * Math.PI) / (0.3 / elasticFreq));
      },
      js: `function elastic(t) {\n  if (t===0||t===1) return t;\n  return -Math.pow(2,10*(t-1)) * Math.sin((t-1.075)*(2*Math.PI)/0.3);\n}`,
      category: "elastic",
      params: [
        { label: "Amplitude", key: "elasticAmp", min: 0.5, max: 3, step: 0.1, default: 1 },
        { label: "Frequency", key: "elasticFreq", min: 1, max: 8, step: 0.5, default: 3 },
      ],
    },
    {
      name: "Back",
      fn: (t) => {
        const s = backOvershoot;
        return t * t * ((s + 1) * t - s);
      },
      js: `function back(t) {\n  const s = 1.70158;\n  return t*t*((s+1)*t - s);\n}`,
      category: "back",
      params: [{ label: "Overshoot", key: "backOvershoot", min: 0.5, max: 4, step: 0.1, default: 1.70158 }],
    },
  ];
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  fn: EasingFn,
  w: number,
  h: number,
  color: string,
  lineWidth = 2,
  pad = 8,
) {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  ctx.beginPath();
  for (let i = 0; i <= iw; i++) {
    const t = i / iw;
    const v = fn(t);
    const x = pad + i;
    const y = pad + ih - v * ih;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function MiniCard({
  easing,
  selected,
  comparing,
  onClick,
  onCompareToggle,
  compareMode,
}: {
  easing: EasingDef;
  selected: boolean;
  comparing: boolean;
  onClick: () => void;
  onCompareToggle: () => void;
  compareMode: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const s = 100;
    ctx.clearRect(0, 0, s, s);

    ctx.strokeStyle = "#2A2A2A";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(8, 92); ctx.lineTo(92, 8); ctx.stroke();
    ctx.setLineDash([]);

    drawCurve(ctx, easing.fn, s, s, selected ? "#F59E0B" : "#6B7280", 2.5);
  }, [easing.fn, selected]);

  return (
    <div
      className={`group relative cursor-pointer rounded-xl border transition-all ${
        selected
          ? "border-[#F59E0B] bg-[#F59E0B]/5 ring-1 ring-[#F59E0B]/20"
          : comparing
          ? "border-[#3B82F6] bg-[#3B82F6]/5"
          : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
      }`}
      onClick={onClick}
    >
      <canvas ref={ref} width={100} height={100} className="mx-auto block" />
      <div className="px-3 pb-3 pt-0 text-center">
        <p className={`text-xs font-medium ${selected ? "text-[#F59E0B]" : "text-[#E5E5E5]"}`}>
          {easing.name}
        </p>
        <p className="text-[10px] text-[#6B7280]">{easing.category}</p>
      </div>
      {compareMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onCompareToggle(); }}
          className={`absolute right-1.5 top-1.5 rounded-md border p-1 text-xs transition-colors ${
            comparing
              ? "border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6]"
              : "border-[#2A2A2A] bg-[#0F0F0F] text-[#6B7280] hover:text-[#F5F5F5]"
          }`}
        >
          <GitCompareArrows className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function EasingPage() {
  const [selected, setSelected] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSet, setCompareSet] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [paramOverrides, setParamOverrides] = useState<Record<string, number>>({});
  const [customBezier, setCustomBezier] = useState({ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
  const [showCustom, setShowCustom] = useState(false);
  const [animating, setAnimating] = useState(false);

  const easings = useMemo(() => makeEasings(paramOverrides), [paramOverrides]);
  const bigRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number | null>(null);

  const current = easings[selected];

  const customFn: EasingFn = useCallback((t: number) => {
    const { x1, y1, x2, y2 } = customBezier;
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const bx = 3 * x1 * (1 - mid) * (1 - mid) * mid + 3 * x2 * (1 - mid) * mid * mid + mid * mid * mid;
      if (bx < t) lo = mid; else hi = mid;
    }
    const s = (lo + hi) / 2;
    return 3 * y1 * (1 - s) * (1 - s) * s + 3 * y2 * (1 - s) * s * s + s * s * s;
  }, [customBezier]);

  const activeFn = showCustom ? customFn : current.fn;

  const drawBig = useCallback(() => {
    const ctx = bigRef.current?.getContext("2d");
    if (!ctx) return;
    const w = 320, h = 280;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#2A2A2A";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = 20 + (i / 4) * 240;
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(300, y); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const x = 20 + (i / 4) * 280;
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 260); ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "#6B7280";
    ctx.font = "10px monospace";
    ctx.fillText("0", 8, 264);
    ctx.fillText("1", 302, 264);
    ctx.fillText("1", 8, 24);

    if (compareMode && compareSet.size > 0) {
      const colors = ["#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"];
      let ci = 0;
      compareSet.forEach((idx) => {
        drawCurve(ctx, easings[idx].fn, 320, 280, colors[ci % colors.length], 2.5, 20);
        ci++;
      });
    } else {
      drawCurve(ctx, activeFn, 320, 280, "#F59E0B", 3, 20);
    }
  }, [activeFn, compareMode, compareSet, easings]);

  useEffect(() => { drawBig(); }, [drawBig]);

  const runAnimation = () => {
    if (animating) return;
    setAnimating(true);
    const start = performance.now();
    const dur = 1500;

    const step = (ts: number) => {
      const elapsed = ts - start;
      let t = Math.min(elapsed / dur, 1);
      const v = activeFn(t);
      if (ballRef.current) {
        ballRef.current.style.left = `${v * 100}%`;
      }
      if (t < 1) {
        animFrame.current = requestAnimationFrame(step);
      } else {
        setAnimating(false);
      }
    };
    animFrame.current = requestAnimationFrame(step);
  };

  const copyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleCompare = (idx: number) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Easing Function Visualizer</h1>
          <p className="text-sm text-[#9CA3AF]">Preview, compare, and copy easing functions for game animations</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Grid of easings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#9CA3AF]">EASING FUNCTIONS</p>
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareSet(new Set()); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                compareMode
                  ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" /> Compare
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {easings.map((e, i) => (
              <MiniCard
                key={e.name}
                easing={e}
                selected={selected === i && !compareMode}
                comparing={compareSet.has(i)}
                onClick={() => setSelected(i)}
                onCompareToggle={() => toggleCompare(i)}
                compareMode={compareMode}
              />
            ))}
          </div>

          {/* Custom cubic-bezier */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#9CA3AF]">CUSTOM CUBIC-BEZIER</p>
              <button
                onClick={() => setShowCustom(!showCustom)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                  showCustom
                    ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#2A2A2A] text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {showCustom ? "Active" : "Use"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["x1", "y1", "x2", "y2"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] font-mono text-[#6B7280]">{k}</label>
                  <input
                    type="number"
                    step={0.05}
                    min={k.startsWith("x") ? 0 : -1}
                    max={k.startsWith("x") ? 1 : 2}
                    value={customBezier[k]}
                    onChange={(e) => setCustomBezier((p) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5 text-xs font-mono text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>
              ))}
            </div>
            <p className="font-mono text-[11px] text-[#6B7280]">
              cubic-bezier({customBezier.x1}, {customBezier.y1}, {customBezier.x2}, {customBezier.y2})
            </p>
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {compareMode && compareSet.size > 0
                  ? `Comparing ${compareSet.size} easings`
                  : showCustom
                  ? "Custom Bezier"
                  : current.name}
              </p>
              {!compareMode && <span className="rounded-md bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">{showCustom ? "custom" : current.category}</span>}
            </div>

            <canvas ref={bigRef} width={320} height={280} className="w-full rounded-lg" />

            {/* Ball animation preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#9CA3AF]">Live Preview</p>
                <button
                  onClick={runAnimation}
                  disabled={animating}
                  className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-40"
                >
                  <Play className="h-3.5 w-3.5" /> {animating ? "Running..." : "Animate"}
                </button>
              </div>
              <div className="relative h-10 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F]">
                <div className="absolute inset-x-4 top-0 h-full">
                  <div
                    ref={ballRef}
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    style={{ left: "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Compare legend */}
            {compareMode && compareSet.size > 0 && (
              <div className="space-y-1.5">
                {Array.from(compareSet).map((idx, ci) => {
                  const colors = ["#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"];
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[ci % colors.length] }} />
                      <span className="text-xs text-[#E5E5E5]">{easings[idx].name}</span>
                      <button onClick={() => toggleCompare(idx)} className="ml-auto text-[#6B7280] hover:text-[#EF4444]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parameters (for elastic, bounce, back) */}
          {!showCustom && current.params && current.params.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF]">
                <SlidersHorizontal className="h-3.5 w-3.5" /> PARAMETERS
              </p>
              {current.params.map((p) => (
                <div key={p.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">{p.label}</span>
                    <span className="font-mono text-[#F59E0B]">{(paramOverrides[p.key] ?? p.default).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={paramOverrides[p.key] ?? p.default}
                    onChange={(e) => setParamOverrides((prev) => ({ ...prev, [p.key]: parseFloat(e.target.value) }))}
                    className="w-full accent-[#F59E0B]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Copy buttons */}
          <div className="space-y-2">
            {!showCustom && current.css && (
              <button
                onClick={() => copyCode(`transition-timing-function: ${current.css};`, "css")}
                className="flex w-full items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-left transition-colors hover:border-[#3A3A3A]"
              >
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF]">CSS</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#F5F5F5] truncate">{current.css}</p>
                </div>
                {copied === "css" ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4 text-[#6B7280]" />}
              </button>
            )}
            {showCustom && (
              <button
                onClick={() => copyCode(`transition-timing-function: cubic-bezier(${customBezier.x1}, ${customBezier.y1}, ${customBezier.x2}, ${customBezier.y2});`, "css")}
                className="flex w-full items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-left transition-colors hover:border-[#3A3A3A]"
              >
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF]">CSS</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#F5F5F5] truncate">cubic-bezier({customBezier.x1}, {customBezier.y1}, {customBezier.x2}, {customBezier.y2})</p>
                </div>
                {copied === "css" ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4 text-[#6B7280]" />}
              </button>
            )}
            <button
              onClick={() => copyCode(showCustom
                ? `function cubicBezier(t) {\n  // cubic-bezier(${customBezier.x1}, ${customBezier.y1}, ${customBezier.x2}, ${customBezier.y2})\n  const x1=${customBezier.x1},y1=${customBezier.y1},x2=${customBezier.x2},y2=${customBezier.y2};\n  let lo=0,hi=1;\n  for(let i=0;i<20;i++){const m=(lo+hi)/2;const bx=3*x1*(1-m)*(1-m)*m+3*x2*(1-m)*m*m+m*m*m;if(bx<t)lo=m;else hi=m;}\n  const s=(lo+hi)/2;\n  return 3*y1*(1-s)*(1-s)*s+3*y2*(1-s)*s*s+s*s*s;\n}`
                : current.js, "js")}
              className="flex w-full items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-left transition-colors hover:border-[#3A3A3A]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#9CA3AF]">JavaScript</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#F5F5F5] truncate">{showCustom ? "cubicBezier(t)" : current.js.split("\n")[0]}</p>
              </div>
              {copied === "js" ? <Check className="h-4 w-4 flex-shrink-0 text-[#10B981]" /> : <Copy className="h-4 w-4 flex-shrink-0 text-[#6B7280]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
