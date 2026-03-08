"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ruler,
  Blend,
  Rocket,
  Dices,
  Grid3X3,
  Timer,
  Swords,
  Sparkles,
  Loader2,
} from "lucide-react";

function fmt(n: number, decimals = 4): string {
  if (!isFinite(n)) return "—";
  const rounded = parseFloat(n.toFixed(decimals));
  return rounded.toString();
}

function InputField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[#9CA3AF]">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step ?? "any"}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#6B7280]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg bg-[#0F0F0F] px-3 py-2">
      <span className="text-xs text-[#9CA3AF]">{label}</span>
      <span className="font-mono text-sm font-semibold text-[#F59E0B]">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-[#6B7280]">{unit}</span>}
      </span>
    </div>
  );
}

function CardShell({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof Ruler;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold text-[#F5F5F5]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

async function callMathAI(prompt: string): Promise<string> {
  try {
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
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
  } catch {
    return "";
  }
}

function AiExplainButton({ getPrompt }: { getPrompt: () => string }) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setExplanation("");
    const result = await callMathAI(getPrompt());
    setExplanation(result || "Could not generate explanation.");
    setLoading(false);
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {loading ? "Explaining..." : "AI Explain"}
      </button>
      {explanation && (
        <div className="mt-2 rounded-lg border border-[#F59E0B]/10 bg-[#F59E0B]/5 px-3 py-2">
          <p className="text-xs leading-relaxed text-[#D1D5DB]">{explanation}</p>
        </div>
      )}
    </div>
  );
}

// ── Distance Calculator ──

function DistanceCalc() {
  const [x1, setX1] = useState("0");
  const [y1, setY1] = useState("0");
  const [x2, setX2] = useState("100");
  const [y2, setY2] = useState("100");

  const result = useMemo(() => {
    const dx = parseFloat(x2) - parseFloat(x1);
    const dy = parseFloat(y2) - parseFloat(y1);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;
    return { dx, dy, dist, angleRad, angleDeg };
  }, [x1, y1, x2, y2]);

  return (
    <CardShell icon={Ruler} title="Distance & Angle" color="#3B82F6">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="X1" value={x1} onChange={setX1} />
        <InputField label="Y1" value={y1} onChange={setY1} />
        <InputField label="X2" value={x2} onChange={setX2} />
        <InputField label="Y2" value={y2} onChange={setY2} />
      </div>
      <div className="mt-4 space-y-1.5">
        <ResultRow label="Distance" value={fmt(result.dist)} unit="px" />
        <ResultRow label="Angle" value={fmt(result.angleDeg, 2)} unit="°" />
        <ResultRow label="Delta" value={`(${fmt(result.dx, 1)}, ${fmt(result.dy, 1)})`} />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Distance & Angle between points (${x1},${y1}) and (${x2},${y2}). Distance: ${fmt(result.dist)}px, Angle: ${fmt(result.angleDeg, 2)} degrees. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── Lerp Calculator ──

function LerpCalc() {
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("100");
  const [t, setT] = useState("0.5");

  const tVal = parseFloat(t) || 0;
  const sVal = parseFloat(start) || 0;
  const eVal = parseFloat(end) || 0;
  const result = sVal + (eVal - sVal) * tVal;
  const clampedT = Math.max(0, Math.min(1, tVal));

  return (
    <CardShell icon={Blend} title="Lerp (Linear Interpolation)" color="#10B981">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Start" value={start} onChange={setStart} />
          <InputField label="End" value={end} onChange={setEnd} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-[#9CA3AF]">t = {fmt(tVal, 3)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={clampedT}
            onChange={(e) => setT(e.target.value)}
            className="w-full accent-[#F59E0B]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#6B7280]">
            <span>{fmt(sVal, 1)}</span>
            <span>{fmt(eVal, 1)}</span>
          </div>
        </div>
        {/* visual bar */}
        <div className="relative h-3 rounded-full bg-[#0F0F0F]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#F59E0B]/30"
            style={{ width: `${clampedT * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#F59E0B] bg-[#1A1A1A]"
            style={{ left: `${clampedT * 100}%` }}
          />
        </div>
        <ResultRow label="Result" value={fmt(result)} />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Lerp with start=${start}, end=${end}, t=${t}. Result: ${fmt(result)}. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── Projectile Motion ──

function ProjectileCalc() {
  const [velocity, setVelocity] = useState("50");
  const [angle, setAngle] = useState("45");
  const [gravity, setGravity] = useState("9.8");

  const result = useMemo(() => {
    const v = parseFloat(velocity) || 0;
    const a = ((parseFloat(angle) || 0) * Math.PI) / 180;
    const g = parseFloat(gravity) || 9.8;
    if (g === 0) return { maxHeight: 0, range: 0, flightTime: 0 };

    const vy = v * Math.sin(a);
    const vx = v * Math.cos(a);
    const maxHeight = (vy * vy) / (2 * g);
    const flightTime = (2 * vy) / g;
    const range = vx * flightTime;
    return { maxHeight, range, flightTime };
  }, [velocity, angle, gravity]);

  return (
    <CardShell icon={Rocket} title="Projectile Motion" color="#A855F7">
      <div className="space-y-3">
        <InputField label="Initial Velocity" value={velocity} onChange={setVelocity} suffix="u/s" />
        <InputField label="Launch Angle" value={angle} onChange={setAngle} suffix="°" />
        <InputField label="Gravity" value={gravity} onChange={setGravity} suffix="u/s²" />
      </div>
      <div className="mt-4 space-y-1.5">
        <ResultRow label="Max Height" value={fmt(result.maxHeight, 2)} unit="u" />
        <ResultRow label="Range" value={fmt(result.range, 2)} unit="u" />
        <ResultRow label="Flight Time" value={fmt(result.flightTime, 3)} unit="s" />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Projectile Motion with velocity=${velocity}u/s, angle=${angle} degrees, gravity=${gravity}u/s2. Max height: ${fmt(result.maxHeight, 2)}u, Range: ${fmt(result.range, 2)}u, Flight time: ${fmt(result.flightTime, 3)}s. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── Random Range ──

function RandomRangeCalc() {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [count, setCount] = useState("10");
  const [seed, setSeed] = useState(0);

  const numbers = useMemo(() => {
    const lo = parseFloat(min) || 0;
    const hi = parseFloat(max) || 100;
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 200);
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      arr.push(lo + Math.random() * (hi - lo));
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, count, seed]);

  const stats = useMemo(() => {
    if (numbers.length === 0) return { avg: 0, min: 0, max: 0 };
    const sum = numbers.reduce((a, b) => a + b, 0);
    return {
      avg: sum / numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  }, [numbers]);

  return (
    <CardShell icon={Dices} title="Random Range" color="#EF4444">
      <div className="grid grid-cols-3 gap-3">
        <InputField label="Min" value={min} onChange={setMin} />
        <InputField label="Max" value={max} onChange={setMax} />
        <InputField label="Count" value={count} onChange={setCount} min={1} max={200} />
      </div>
      <button
        onClick={() => setSeed((s) => s + 1)}
        className="mt-3 w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-xs font-medium text-[#F59E0B] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/5"
      >
        Re-roll
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {numbers.map((n, i) => (
          <span
            key={i}
            className="rounded bg-[#0F0F0F] px-2 py-0.5 font-mono text-[11px] text-[#D1D5DB]"
          >
            {fmt(n, 2)}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <ResultRow label="Average" value={fmt(stats.avg, 2)} />
        <ResultRow label="Min Generated" value={fmt(stats.min, 2)} />
        <ResultRow label="Max Generated" value={fmt(stats.max, 2)} />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Random Range with min=${min}, max=${max}, ${count} samples. Avg: ${fmt(stats.avg, 2)}, Min: ${fmt(stats.min, 2)}, Max: ${fmt(stats.max, 2)}. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── Grid Position ──

function GridCalc() {
  const [pixelX, setPixelX] = useState("150");
  const [pixelY, setPixelY] = useState("230");
  const [tileW, setTileW] = useState("32");
  const [tileH, setTileH] = useState("32");

  const gridX = Math.floor((parseFloat(pixelX) || 0) / (parseFloat(tileW) || 1));
  const gridY = Math.floor((parseFloat(pixelY) || 0) / (parseFloat(tileH) || 1));
  const snapX = gridX * (parseFloat(tileW) || 1);
  const snapY = gridY * (parseFloat(tileH) || 1);

  return (
    <CardShell icon={Grid3X3} title="Grid Position" color="#22C55E">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Pixel X" value={pixelX} onChange={setPixelX} suffix="px" />
        <InputField label="Pixel Y" value={pixelY} onChange={setPixelY} suffix="px" />
        <InputField label="Tile Width" value={tileW} onChange={setTileW} suffix="px" />
        <InputField label="Tile Height" value={tileH} onChange={setTileH} suffix="px" />
      </div>
      <div className="mt-4 space-y-1.5">
        <ResultRow label="Grid Cell" value={`(${gridX}, ${gridY})`} />
        <ResultRow label="Snap Position" value={`(${snapX}, ${snapY})`} unit="px" />
        <ResultRow
          label="Cell Center"
          value={`(${fmt(snapX + (parseFloat(tileW) || 1) / 2, 1)}, ${fmt(snapY + (parseFloat(tileH) || 1) / 2, 1)})`}
          unit="px"
        />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Grid Position with pixel (${pixelX},${pixelY}) on ${tileW}x${tileH} tiles. Grid cell: (${gridX},${gridY}), Snap: (${snapX},${snapY}). What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── FPS / Frame Time ──

function FpsCalc() {
  const [mode, setMode] = useState<"fps" | "ms">("fps");
  const [value, setValue] = useState("60");

  const v = parseFloat(value) || 0;
  const fps = mode === "fps" ? v : v > 0 ? 1000 / v : 0;
  const ms = mode === "ms" ? v : v > 0 ? 1000 / v : 0;
  const ticksPerSecond = fps;
  const updatesIn1s = fps;

  return (
    <CardShell icon={Timer} title="FPS ↔ Frame Time" color="#06B6D4">
      <div className="mb-3 flex rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-0.5">
        {(["fps", "ms"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                : "text-[#6B7280] hover:text-[#9CA3AF]"
            }`}
          >
            {m === "fps" ? "FPS → ms" : "ms → FPS"}
          </button>
        ))}
      </div>
      <InputField
        label={mode === "fps" ? "Frames Per Second" : "Milliseconds Per Frame"}
        value={value}
        onChange={setValue}
        suffix={mode === "fps" ? "fps" : "ms"}
        min={0}
      />
      <div className="mt-4 space-y-1.5">
        <ResultRow label="FPS" value={fmt(fps, 2)} unit="fps" />
        <ResultRow label="Frame Time" value={fmt(ms, 3)} unit="ms" />
        <ResultRow label="Updates/sec" value={fmt(updatesIn1s, 2)} />
        <ResultRow
          label="Budget"
          value={ms <= 16.67 ? "Within 60fps" : ms <= 33.33 ? "Within 30fps" : "Below 30fps"}
        />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: FPS conversion. ${fmt(fps, 2)} FPS = ${fmt(ms, 3)}ms per frame. Budget: ${ms <= 16.67 ? "Within 60fps" : ms <= 33.33 ? "Within 30fps" : "Below 30fps"}. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── Damage Calculator ──

function DamageCalc() {
  const [baseDmg, setBaseDmg] = useState("50");
  const [critChance, setCritChance] = useState("25");
  const [critMult, setCritMult] = useState("2");
  const [armor, setArmor] = useState("20");
  const [defense, setDefense] = useState("10");
  const [attackSpeed, setAttackSpeed] = useState("1.5");

  const result = useMemo(() => {
    const base = parseFloat(baseDmg) || 0;
    const cc = (parseFloat(critChance) || 0) / 100;
    const cm = parseFloat(critMult) || 1;
    const arm = parseFloat(armor) || 0;
    const def = parseFloat(defense) || 0;
    const as_ = parseFloat(attackSpeed) || 1;

    const avgHit = base * (1 - cc) + base * cm * cc;
    const reduction = arm / (arm + 100);
    const afterArmor = avgHit * (1 - reduction);
    const afterDefense = Math.max(0, afterArmor - def);
    const dps = afterDefense * as_;
    const critHit = base * cm;
    const normalHit = base;
    const ttk100 = dps > 0 ? 100 / dps : Infinity;
    const ttk1000 = dps > 0 ? 1000 / dps : Infinity;

    return { avgHit, afterArmor, afterDefense, dps, critHit, normalHit, reduction, ttk100, ttk1000 };
  }, [baseDmg, critChance, critMult, armor, defense, attackSpeed]);

  return (
    <CardShell icon={Swords} title="Damage Calculator" color="#F59E0B">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Base Damage" value={baseDmg} onChange={setBaseDmg} />
        <InputField label="Crit Chance" value={critChance} onChange={setCritChance} suffix="%" />
        <InputField label="Crit Multiplier" value={critMult} onChange={setCritMult} suffix="×" />
        <InputField label="Attack Speed" value={attackSpeed} onChange={setAttackSpeed} suffix="/s" />
        <InputField label="Armor" value={armor} onChange={setArmor} />
        <InputField label="Flat Defense" value={defense} onChange={setDefense} />
      </div>
      <div className="mt-4 space-y-1.5">
        <ResultRow label="Normal Hit" value={fmt(result.normalHit, 1)} />
        <ResultRow label="Crit Hit" value={fmt(result.critHit, 1)} />
        <ResultRow label="Avg Hit (pre-armor)" value={fmt(result.avgHit, 1)} />
        <ResultRow label="Armor Reduction" value={`${fmt(result.reduction * 100, 1)}%`} />
        <ResultRow label="After Armor" value={fmt(result.afterArmor, 1)} />
        <ResultRow label="After Defense" value={fmt(result.afterDefense, 1)} />
        <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-[#F59E0B]">DPS</span>
            <span className="font-mono text-lg font-bold text-[#F59E0B]">
              {fmt(result.dps, 1)}
            </span>
          </div>
        </div>
        <ResultRow label="TTK (100 HP)" value={fmt(result.ttk100, 2)} unit="s" />
        <ResultRow label="TTK (1000 HP)" value={fmt(result.ttk1000, 2)} unit="s" />
      </div>
      <AiExplainButton getPrompt={() => `Explain this game math result: Damage Calculator with ${baseDmg} base dmg, ${critChance}% crit, ${critMult}x crit mult, ${armor} armor, ${defense} defense, ${attackSpeed}/s speed. DPS: ${fmt(result.dps, 1)}, TTK(100HP): ${fmt(result.ttk100, 2)}s. What does this mean for game design? 1-2 sentences.`} />
    </CardShell>
  );
}

// ── AI Formula Suggest ──

function AiFormulaSuggest() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSuggest = async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{
            role: "user",
            content: `Suggest a game math formula for: '${description.trim()}'. Give the formula, explain the variables, and show an example calculation. Be brief.`,
          }],
          stream: false,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setResult(content || "Could not generate a formula suggestion.");
    } catch {
      setResult("Failed to reach AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#F59E0B]/20 bg-[#1A1A1A] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
          <Sparkles className="h-4.5 w-4.5 text-[#F59E0B]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F5]">AI Formula Suggest</h3>
          <p className="text-[11px] text-[#6B7280]">Describe what you need and get a formula</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
          placeholder="e.g. XP curve for RPG leveling, enemy respawn timer..."
          className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4A4A4A] outline-none transition-colors focus:border-[#F59E0B]/50"
        />
        <button
          onClick={handleSuggest}
          disabled={loading || !description.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-50 disabled:hover:bg-[#F59E0B]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Thinking..." : "Suggest"}
        </button>
      </div>
      {result && (
        <div className="mt-3 rounded-lg border border-[#F59E0B]/10 bg-[#F59E0B]/5 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">{result}</p>
        </div>
      )}
    </div>
  );
}

// ── AI Math Game Application ──

function AiMathGameApp() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const calcTypes = ["distance", "lerp", "projectile motion", "random range", "grid position", "FPS/frame time", "damage"];
  const [calcIdx, setCalcIdx] = useState(0);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">AI Game Application</h3>
        </div>
        <button
          onClick={async () => {
            if (loading) return;
            setLoading(true); setResult("");
            const ct = calcTypes[calcIdx % calcTypes.length];
            setCalcIdx(i => i + 1);
            try {
              const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest a game mechanic that uses the ${ct} formula. 1 sentence.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
              });
              const data = await response.json();
              setResult(data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "");
            } catch {} finally { setLoading(false); }
          }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Suggest Mechanic
        </button>
      </div>
      {result && <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{result}</p>}
    </div>
  );
}

// ── Main Page ──

export default function GameMathPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/tools"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Game Math</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            Common game dev calculations — results update as you type
          </p>
        </div>
      </div>

      <AiFormulaSuggest />
      <AiMathGameApp />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DistanceCalc />
        <LerpCalc />
        <ProjectileCalc />
        <RandomRangeCalc />
        <GridCalc />
        <FpsCalc />
        <div className="md:col-span-2 xl:col-span-1">
          <DamageCalc />
        </div>
      </div>
    </div>
  );
}
