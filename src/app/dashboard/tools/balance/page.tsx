"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Swords,
  TrendingUp,
  Crosshair,
  Coins,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Sparkles,
  Loader2,
  Gem,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Package,
  Download,
  Shield,
  Zap,
  ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ──

interface WeaponSlot {
  id: string;
  name: string;
  baseDamage: number;
  attackSpeed: number;
  critChance: number;
  critMultiplier: number;
}

type GrowthFormula = "linear" | "exponential" | "logarithmic" | "s-curve" | "custom";

interface ScalingConfig {
  statName: string;
  baseValue: number;
  formula: GrowthFormula;
  growthRate: number;
  levelMin: number;
  levelMax: number;
  customExponent: number;
}

interface AttackerStats {
  damage: number;
  attackSpeed: number;
  critChance: number;
  critMultiplier: number;
}

interface DefenderStats {
  health: number;
  armor: number;
  dodge: number;
}

interface EconomySink {
  id: string;
  name: string;
  cost: number;
  frequency: number; // per hour
}

interface EconomyConfig {
  resourceName: string;
  earnRate: number;
  sinks: EconomySink[];
  targetPlaytime: number;
}

interface DesignerCurrency {
  id: string;
  name: string;
  symbol: string;
  exchangeRate: number;
}

interface DesignerItem {
  id: string;
  name: string;
  cost: number;
  sellPrice: number;
  rarity: string;
}

interface DesignerIncome {
  id: string;
  source: string;
  amount: number;
  frequency: string;
}

interface DifficultyLevel {
  id: string;
  name: string;
  difficulty: number;
}

interface LootItem {
  id: string;
  name: string;
  dropChance: number;
  rarity: string;
  description: string;
}

interface LootPool {
  id: string;
  name: string;
  items: LootItem[];
}

interface SimResult {
  id: string;
  name: string;
  rarity: string;
  expected: number;
  actual: number;
}

type ItemType = "Weapon" | "Armor" | "Consumable" | "Material" | "Key Item";
type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: { attack: number; defense: number; hp: number; speed: number };
  description: string;
  specialAbility: string;
}

const ITEM_TYPES: ItemType[] = ["Weapon", "Armor", "Consumable", "Material", "Key Item"];
const ITEM_RARITIES: ItemRarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

const RARITY_COLORS: Record<ItemRarity, string> = {
  Common: "#9CA3AF",
  Uncommon: "#10B981",
  Rare: "#3B82F6",
  Epic: "#8B5CF6",
  Legendary: "#F59E0B",
};

const RARITY_BG: Record<ItemRarity, string> = {
  Common: "border-neutral-500/40",
  Uncommon: "border-emerald-500/40",
  Rare: "border-blue-500/40",
  Epic: "border-purple-500/40",
  Legendary: "border-amber-500/40",
};

// ── Constants ──

const TABS = [
  { id: "dps", label: "DPS", icon: Swords },
  { id: "scaling", label: "Scaling", icon: TrendingUp },
  { id: "ttk", label: "TTK", icon: Crosshair },
  { id: "economy", label: "Economy", icon: Coins },
  { id: "economy-designer", label: "Economy Designer", icon: Gem },
  { id: "difficulty", label: "Difficulty", icon: Activity },
  { id: "loot", label: "Loot Tables", icon: Package },
  { id: "items", label: "Items", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CHART_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

const SCALING_PRESETS: {
  name: string;
  config: Partial<ScalingConfig>;
}[] = [
  {
    name: "RPG Health",
    config: {
      statName: "Health",
      baseValue: 100,
      formula: "exponential",
      growthRate: 1.08,
      customExponent: 2,
    },
  },
  {
    name: "Souls-like Damage",
    config: {
      statName: "Attack",
      baseValue: 20,
      formula: "logarithmic",
      growthRate: 15,
      customExponent: 2,
    },
  },
  {
    name: "Idle Game Currency",
    config: {
      statName: "Gold/sec",
      baseValue: 1,
      formula: "exponential",
      growthRate: 1.15,
      customExponent: 2,
    },
  },
  {
    name: "Mobile Progression",
    config: {
      statName: "Power",
      baseValue: 10,
      formula: "custom",
      growthRate: 1.5,
      customExponent: 1.4,
    },
  },
  {
    name: "S-Curve Mastery",
    config: {
      statName: "Mastery",
      baseValue: 0,
      formula: "s-curve" as GrowthFormula,
      growthRate: 100,
      customExponent: 1.0,
    },
  },
];

// ── Utility ──

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(decimals) + "K";
  return n.toFixed(decimals);
}

function calcStatAtLevel(level: number, cfg: ScalingConfig): number {
  const l = level - 1;
  switch (cfg.formula) {
    case "linear":
      return cfg.baseValue + cfg.growthRate * l;
    case "exponential":
      return cfg.baseValue * Math.pow(cfg.growthRate, l);
    case "logarithmic":
      return cfg.baseValue + cfg.growthRate * Math.log(l + 1);
    case "s-curve": {
      const range = Math.max(cfg.levelMax - 1, 1);
      const midpoint = range / 2;
      const steepness = (cfg.customExponent * 10) / range;
      const sigmoid = 1 / (1 + Math.exp(-steepness * (l - midpoint)));
      return cfg.baseValue + cfg.growthRate * sigmoid;
    }
    case "custom":
      return cfg.baseValue + cfg.growthRate * Math.pow(l, cfg.customExponent);
  }
}

// ── Reusable Input ──

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? 1}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-500/50"
        />
        {suffix && (
          <span className="shrink-0 text-xs text-neutral-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
      />
    </div>
  );
}

// ── Chart Tooltip ──

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-neutral-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-sm" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value, 2)}
        </p>
      ))}
    </div>
  );
}

// ── DPS Tab ──

function DPSCalculator() {
  const [weapons, setWeapons] = useState<WeaponSlot[]>([
    {
      id: uid(),
      name: "Weapon 1",
      baseDamage: 50,
      attackSpeed: 1.5,
      critChance: 15,
      critMultiplier: 2.0,
    },
  ]);

  const addWeapon = () => {
    if (weapons.length >= 6) return;
    setWeapons((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Weapon ${prev.length + 1}`,
        baseDamage: 50,
        attackSpeed: 1.0,
        critChance: 10,
        critMultiplier: 2.0,
      },
    ]);
  };

  const removeWeapon = (id: string) => {
    if (weapons.length <= 1) return;
    setWeapons((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWeapon = useCallback(
    (id: string, field: keyof WeaponSlot, value: number | string) => {
      setWeapons((prev) =>
        prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
      );
    },
    []
  );

  const results = useMemo(() => {
    const r = weapons.map((w) => {
      const baseDps = w.baseDamage * w.attackSpeed;
      const critRate = Math.min(w.critChance, 100) / 100;
      const effectiveDps =
        baseDps * (1 - critRate + critRate * w.critMultiplier);
      const critDpsBonus = effectiveDps - baseDps;
      const critContribution =
        effectiveDps > 0 ? (critDpsBonus / effectiveDps) * 100 : 0;
      return { ...w, baseDps, effectiveDps, critRate, critDpsBonus, critContribution };
    });
    const maxDps = Math.max(...r.map((x) => x.effectiveDps));
    return r.map((x) => ({
      ...x,
      isBest: x.effectiveDps === maxDps && r.length > 1,
      relativeStrength: maxDps > 0 ? (x.effectiveDps / maxDps) * 100 : 0,
    }));
  }, [weapons]);

  const chartData = useMemo(() => {
    const points: Record<string, number | string>[] = [];
    for (let t = 0; t <= 10; t += 0.5) {
      const point: Record<string, number | string> = { time: `${t}s` };
      results.forEach((r) => {
        point[r.name] = +(r.effectiveDps * t).toFixed(1);
      });
      points.push(point);
    }
    return points;
  }, [results]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const analyzeBalance = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const weaponList = results.map(r =>
        `${r.name}: ${r.baseDamage} base dmg, ${r.attackSpeed} atk/s, ${r.critChance}% crit, ${r.critMultiplier}x crit mult, effective DPS = ${r.effectiveDps.toFixed(1)}`
      ).join('\n');

      const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ''),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'moonshotai/Kimi-K2.5-TEE',
          messages: [{
            role: 'user',
            content: `I have these weapons in my game:\n${weaponList}\nAnalyze the balance. Are any weapons overpowered or underpowered? Suggest specific number changes to improve balance. Be brief and specific.`
          }],
          stream: false,
          max_tokens: 512,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || '';
      setAiAnalysis(content || 'No analysis returned from AI.');
    } catch {
      setAiAnalysis('AI advisor is currently unavailable. Try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Inputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">Weapon Slots</h3>
          <button
            onClick={addWeapon}
            disabled={weapons.length >= 6}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-30"
          >
            <Plus size={14} /> Add Weapon
          </button>
        </div>

        {weapons.map((w, i) => (
          <div
            key={w.id}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <input
                type="text"
                value={w.name}
                onChange={(e) => updateWeapon(w.id, "name", e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-white outline-none"
              />
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {weapons.length > 1 && (
                  <button
                    onClick={() => removeWeapon(w.id)}
                    className="text-neutral-500 transition hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput
                label="Base Damage"
                value={w.baseDamage}
                onChange={(v) => updateWeapon(w.id, "baseDamage", v)}
                min={0}
              />
              <NumInput
                label="Attack Speed"
                value={w.attackSpeed}
                onChange={(v) => updateWeapon(w.id, "attackSpeed", v)}
                min={0.1}
                step={0.1}
                suffix="atk/s"
              />
              <NumInput
                label="Crit Chance"
                value={w.critChance}
                onChange={(v) => updateWeapon(w.id, "critChance", v)}
                min={0}
                max={100}
                suffix="%"
              />
              <NumInput
                label="Crit Multiplier"
                value={w.critMultiplier}
                onChange={(v) => updateWeapon(w.id, "critMultiplier", v)}
                min={1}
                step={0.1}
                suffix="x"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">Results</h3>

        <div className="grid gap-3">
          {results.map((r, i) => (
            <div
              key={r.id}
              className={`rounded-xl border bg-[#1A1A1A] px-4 py-3 ${r.isBest ? "border-amber-500/40" : "border-[#2A2A2A]"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="text-sm text-neutral-300">{r.name}</span>
                  {r.isBest && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400">
                      BEST
                    </span>
                  )}
                </div>
                <div className="flex gap-5">
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-white">
                      {fmt(r.baseDps)}
                    </p>
                    <p className="text-xs text-neutral-500">Base DPS</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-amber-400">
                      {fmt(r.effectiveDps)}
                    </p>
                    <p className="text-xs text-neutral-500">Effective DPS</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-neutral-400">
                      {r.critContribution.toFixed(0)}%
                    </p>
                    <p className="text-xs text-neutral-500">From Crits</p>
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${r.relativeStrength}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-3 text-xs text-neutral-400">
            Total Damage Over Time
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<ChartTooltipContent />} />
                {results.map((r, i) => (
                  <Line
                    key={r.id}
                    type="monotone"
                    dataKey={r.name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Balance Advisor */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <p className="text-sm font-medium text-neutral-300">AI Balance Advisor</p>
            </div>
            <button
              onClick={analyzeBalance}
              disabled={aiLoading || weapons.length < 2}
              className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-amber-500/10"
            >
              {aiLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles size={14} /> Analyze Balance</>
              )}
            </button>
          </div>

          {weapons.length < 2 && !aiAnalysis && (
            <p className="text-xs text-neutral-500">Add at least 2 weapons to get AI balance analysis.</p>
          )}

          {aiLoading && !aiAnalysis && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-amber-400" />
            </div>
          )}

          {aiAnalysis && (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {aiAnalysis}
              </div>
            </div>
          )}

          {!aiLoading && !aiAnalysis && weapons.length >= 2 && (
            <p className="text-xs text-neutral-500">
              Click &quot;Analyze Balance&quot; to get AI-powered feedback on your weapon stats.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Scaling Tab ──

function ScalingCurves() {
  const [config, setConfig] = useState<ScalingConfig>({
    statName: "Health",
    baseValue: 100,
    formula: "exponential",
    growthRate: 1.08,
    levelMin: 1,
    levelMax: 100,
    customExponent: 2,
  });

  const update = useCallback(
    <K extends keyof ScalingConfig>(key: K, val: ScalingConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const applyPreset = (preset: (typeof SCALING_PRESETS)[number]) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
  };

  const chartData = useMemo(() => {
    const points: { level: number; value: number }[] = [];
    const step = Math.max(1, Math.floor((config.levelMax - config.levelMin) / 100));
    for (let l = config.levelMin; l <= config.levelMax; l += step) {
      points.push({ level: l, value: calcStatAtLevel(l, config) });
    }
    if (points[points.length - 1]?.level !== config.levelMax) {
      points.push({
        level: config.levelMax,
        value: calcStatAtLevel(config.levelMax, config),
      });
    }
    return points;
  }, [config]);

  const endValue = chartData[chartData.length - 1]?.value ?? 0;
  const startValue = chartData[0]?.value ?? 0;
  const totalGrowth = startValue > 0 ? ((endValue / startValue - 1) * 100) : 0;
  const midLevel = Math.floor((config.levelMin + config.levelMax) / 2);
  const midValue = calcStatAtLevel(midLevel, config);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">Curve Settings</h3>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
          <TextInput
            label="Stat Name"
            value={config.statName}
            onChange={(v) => update("statName", v)}
          />
          <NumInput
            label="Base Value (Level 1)"
            value={config.baseValue}
            onChange={(v) => update("baseValue", v)}
            min={0}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Growth Formula</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["linear", "exponential", "logarithmic", "s-curve", "custom"] as const
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => update("formula", f)}
                  className={`rounded-lg border px-3 py-2 text-xs capitalize transition ${
                    config.formula === f
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-[#2A2A2A] text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <NumInput
            label={
              config.formula === "exponential"
                ? "Growth Multiplier (per level)"
                : "Growth Rate"
            }
            value={config.growthRate}
            onChange={(v) => update("growthRate", v)}
            step={config.formula === "exponential" ? 0.01 : 1}
          />
          {(config.formula === "custom" || config.formula === "s-curve") && (
            <NumInput
              label={config.formula === "s-curve" ? "Steepness" : "Exponent"}
              value={config.customExponent}
              onChange={(v) => update("customExponent", v)}
              min={0.1}
              step={0.1}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumInput
              label="Min Level"
              value={config.levelMin}
              onChange={(v) => update("levelMin", v)}
              min={1}
            />
            <NumInput
              label="Max Level"
              value={config.levelMax}
              onChange={(v) => update("levelMax", v)}
              min={config.levelMin + 1}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-neutral-400">Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {SCALING_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">
          {config.statName} Curve
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-white">
              {fmt(startValue)}
            </p>
            <p className="text-xs text-neutral-500">Lvl {config.levelMin}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-amber-400">
              {fmt(midValue)}
            </p>
            <p className="text-xs text-neutral-500">Lvl {midLevel}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-white">
              {fmt(endValue)}
            </p>
            <p className="text-xs text-neutral-500">Lvl {config.levelMax}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-1.5 text-center">
          <span className="text-xs text-neutral-400">
            Total Growth:{" "}
            <span className="font-mono text-amber-400">
              {totalGrowth.toFixed(0)}%
            </span>{" "}
            ({fmt(startValue)} → {fmt(endValue)})
          </span>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis
                  dataKey="level"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  label={{
                    value: "Level",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#525252",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={config.statName}
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
          <Info size={14} className="mt-0.5 shrink-0 text-neutral-500" />
          <p className="text-xs leading-relaxed text-neutral-500">
            {config.formula === "linear" &&
              `${config.statName} gains a flat +${config.growthRate} per level.`}
            {config.formula === "exponential" &&
              `${config.statName} multiplied by ${config.growthRate}x each level. Late-game values scale rapidly.`}
            {config.formula === "logarithmic" &&
              `${config.statName} grows quickly early, then tapers off. Good for diminishing returns.`}
            {config.formula === "s-curve" &&
              `${config.statName} follows an S-curve: slow early growth, rapid mid-game scaling, then plateaus at ${fmt(config.baseValue + config.growthRate)}. Steepness: ${config.customExponent}.`}
            {config.formula === "custom" &&
              `${config.statName} = ${config.baseValue} + ${config.growthRate} * level^${config.customExponent}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── TTK Tab ──

function TTKCalculator() {
  const [attacker, setAttacker] = useState<AttackerStats>({
    damage: 50,
    attackSpeed: 1.5,
    critChance: 15,
    critMultiplier: 2.0,
  });

  const [defender, setDefender] = useState<DefenderStats>({
    health: 500,
    armor: 20,
    dodge: 10,
  });

  const [whatIfParam, setWhatIfParam] = useState<string>("damage");
  const [whatIfRange, setWhatIfRange] = useState<number>(50);

  const updateA = useCallback(
    (field: keyof AttackerStats, val: number) =>
      setAttacker((p) => ({ ...p, [field]: val })),
    []
  );
  const updateD = useCallback(
    (field: keyof DefenderStats, val: number) =>
      setDefender((p) => ({ ...p, [field]: val })),
    []
  );

  const calcTTK = useCallback(
    (atk: AttackerStats, def: DefenderStats) => {
      const armorReduction = def.armor / (def.armor + 100);
      const effectiveDamage = atk.damage * (1 - armorReduction);
      const critRate = Math.min(atk.critChance, 100) / 100;
      const avgDamage =
        effectiveDamage * (1 - critRate + critRate * atk.critMultiplier);
      const hitChance = 1 - Math.min(def.dodge, 100) / 100;
      const effectiveAvgDamage = avgDamage * hitChance;
      const hitsToKill =
        effectiveAvgDamage > 0 ? Math.ceil(def.health / effectiveAvgDamage) : Infinity;
      const actualHits = hitChance > 0 ? Math.ceil(hitsToKill / hitChance) : Infinity;
      const timeToKill =
        atk.attackSpeed > 0 ? actualHits / atk.attackSpeed : Infinity;
      const dps = effectiveAvgDamage * atk.attackSpeed;
      return {
        effectiveDamage: avgDamage,
        hitsToKill,
        actualHits,
        timeToKill,
        dps,
        armorReduction,
      };
    },
    []
  );

  const result = useMemo(() => calcTTK(attacker, defender), [attacker, defender, calcTTK]);

  const whatIfData = useMemo(() => {
    const points: { value: number; ttk: number }[] = [];
    const baseVal =
      whatIfParam in attacker
        ? attacker[whatIfParam as keyof AttackerStats]
        : defender[whatIfParam as keyof DefenderStats];
    const low = Math.max(1, baseVal - whatIfRange);
    const high = baseVal + whatIfRange;
    const step = Math.max(1, Math.floor((high - low) / 20));

    for (let v = low; v <= high; v += step) {
      let a = { ...attacker };
      let d = { ...defender };
      if (whatIfParam in attacker) {
        a = { ...a, [whatIfParam]: v };
      } else {
        d = { ...d, [whatIfParam]: v };
      }
      const r = calcTTK(a, d);
      points.push({ value: v, ttk: isFinite(r.timeToKill) ? r.timeToKill : 999 });
    }
    return points;
  }, [attacker, defender, whatIfParam, whatIfRange, calcTTK]);

  const whatIfParams = [
    { id: "damage", label: "Damage" },
    { id: "attackSpeed", label: "Atk Speed" },
    { id: "critChance", label: "Crit %" },
    { id: "health", label: "HP" },
    { id: "armor", label: "Armor" },
    { id: "dodge", label: "Dodge" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
          <h3 className="text-sm font-medium text-red-400">Attacker</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumInput
              label="Damage"
              value={attacker.damage}
              onChange={(v) => updateA("damage", v)}
              min={0}
            />
            <NumInput
              label="Attack Speed"
              value={attacker.attackSpeed}
              onChange={(v) => updateA("attackSpeed", v)}
              min={0.1}
              step={0.1}
              suffix="atk/s"
            />
            <NumInput
              label="Crit Chance"
              value={attacker.critChance}
              onChange={(v) => updateA("critChance", v)}
              min={0}
              max={100}
              suffix="%"
            />
            <NumInput
              label="Crit Multiplier"
              value={attacker.critMultiplier}
              onChange={(v) => updateA("critMultiplier", v)}
              min={1}
              step={0.1}
              suffix="x"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
          <h3 className="text-sm font-medium text-blue-400">Defender</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumInput
              label="Health"
              value={defender.health}
              onChange={(v) => updateD("health", v)}
              min={1}
            />
            <NumInput
              label="Armor"
              value={defender.armor}
              onChange={(v) => updateD("armor", v)}
              min={0}
            />
            <NumInput
              label="Dodge Chance"
              value={defender.dodge}
              onChange={(v) => updateD("dodge", v)}
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
          <h3 className="text-sm font-medium text-neutral-300">
            What If Analysis
          </h3>
          <div className="flex flex-wrap gap-2">
            {whatIfParams.map((p) => (
              <button
                key={p.id}
                onClick={() => setWhatIfParam(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  whatIfParam === p.id
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-[#2A2A2A] text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <NumInput
            label="Range (+/-)"
            value={whatIfRange}
            onChange={setWhatIfRange}
            min={1}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">Results</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center">
            <p className="font-mono text-2xl font-bold text-amber-400">
              {isFinite(result.timeToKill)
                ? result.timeToKill.toFixed(1) + "s"
                : "--"}
            </p>
            <p className="text-xs text-neutral-500">Time to Kill</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center">
            <p className="font-mono text-2xl font-bold text-white">
              {isFinite(result.hitsToKill) ? result.hitsToKill : "--"}
            </p>
            <p className="text-xs text-neutral-500">Hits to Kill</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center">
            <p className="font-mono text-lg font-semibold text-white">
              {fmt(result.effectiveDamage)}
            </p>
            <p className="text-xs text-neutral-500">Avg Damage/Hit</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-center">
            <p className="font-mono text-lg font-semibold text-white">
              {(result.armorReduction * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-neutral-500">Armor Reduction</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-3 text-xs text-neutral-400">
            What If: Varying{" "}
            {whatIfParams.find((p) => p.id === whatIfParam)?.label}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={whatIfData}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis
                  dataKey="value"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  label={{
                    value: whatIfParams.find((p) => p.id === whatIfParam)?.label,
                    position: "insideBottom",
                    offset: -5,
                    fill: "#525252",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickFormatter={(v) => v.toFixed(1) + "s"}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  x={
                    whatIfParam in attacker
                      ? attacker[whatIfParam as keyof AttackerStats]
                      : defender[whatIfParam as keyof DefenderStats]
                  }
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: "Current",
                    fill: "#F59E0B",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ttk"
                  name="TTK"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Economy Tab ──

function EconomyBalance() {
  const [config, setConfig] = useState<EconomyConfig>({
    resourceName: "Gold",
    earnRate: 100,
    sinks: [
      { id: uid(), name: "Health Potion", cost: 50, frequency: 2 },
      { id: uid(), name: "Weapon Upgrade", cost: 500, frequency: 0.1 },
    ],
    targetPlaytime: 10,
  });

  const updateConfig = useCallback(
    <K extends keyof EconomyConfig>(key: K, val: EconomyConfig[K]) => {
      setConfig((p) => ({ ...p, [key]: val }));
    },
    []
  );

  const addSink = () => {
    updateConfig("sinks", [
      ...config.sinks,
      { id: uid(), name: "New Sink", cost: 100, frequency: 1 },
    ]);
  };

  const removeSink = (id: string) => {
    if (config.sinks.length <= 1) return;
    updateConfig(
      "sinks",
      config.sinks.filter((s) => s.id !== id)
    );
  };

  const updateSink = useCallback(
    (id: string, field: keyof EconomySink, val: number | string) => {
      setConfig((p) => ({
        ...p,
        sinks: p.sinks.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
      }));
    },
    []
  );

  const totalSpendRate = useMemo(
    () => config.sinks.reduce((sum, s) => sum + s.cost * s.frequency, 0),
    [config.sinks]
  );

  const netRate = config.earnRate - totalSpendRate;
  const isInflating = netRate > totalSpendRate * 0.5 && totalSpendRate > 0;
  const isDeficit = netRate < 0;

  const chartData = useMemo(() => {
    const points: { hour: number; balance: number; earned: number; spent: number }[] = [];
    let balance = 0;
    for (let h = 0; h <= config.targetPlaytime; h++) {
      const earned = config.earnRate * h;
      const spent = totalSpendRate * h;
      balance = earned - spent;
      points.push({ hour: h, balance, earned, spent });
    }
    return points;
  }, [config.earnRate, config.targetPlaytime, totalSpendRate]);

  const affordability = useMemo(() => {
    return config.sinks.map((sink) => {
      const hoursToAfford =
        netRate > 0 ? sink.cost / config.earnRate : Infinity;
      return { ...sink, hoursToAfford };
    });
  }, [config.sinks, config.earnRate, netRate]);

  const sessionRecs = useMemo(() => {
    const hours = affordability
      .map((a) => a.hoursToAfford)
      .filter((h) => isFinite(h));
    if (hours.length === 0)
      return { quick: Infinity, sweet: Infinity, full: Infinity };
    const sorted = [...hours].sort((a, b) => a - b);
    return {
      quick: sorted[0],
      sweet: sorted[Math.floor(sorted.length / 2)],
      full: sorted[sorted.length - 1],
    };
  }, [affordability]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 space-y-3">
          <h3 className="text-sm font-medium text-neutral-300">
            Resource Settings
          </h3>
          <TextInput
            label="Resource Name"
            value={config.resourceName}
            onChange={(v) => updateConfig("resourceName", v)}
          />
          <NumInput
            label="Earn Rate"
            value={config.earnRate}
            onChange={(v) => updateConfig("earnRate", v)}
            min={0}
            suffix="/hr"
          />
          <NumInput
            label="Target Playtime"
            value={config.targetPlaytime}
            onChange={(v) => updateConfig("targetPlaytime", v)}
            min={1}
            suffix="hrs"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-300">
              Spend Sinks
            </h3>
            <button
              onClick={addSink}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400"
            >
              <Plus size={14} /> Add Sink
            </button>
          </div>

          {config.sinks.map((sink) => (
            <div
              key={sink.id}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <input
                  type="text"
                  value={sink.name}
                  onChange={(e) => updateSink(sink.id, "name", e.target.value)}
                  className="border-none bg-transparent text-sm text-white outline-none"
                />
                {config.sinks.length > 1 && (
                  <button
                    onClick={() => removeSink(sink.id)}
                    className="text-neutral-500 transition hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumInput
                  label="Cost"
                  value={sink.cost}
                  onChange={(v) => updateSink(sink.id, "cost", v)}
                  min={0}
                />
                <NumInput
                  label="Frequency"
                  value={sink.frequency}
                  onChange={(v) => updateSink(sink.id, "frequency", v)}
                  min={0}
                  step={0.1}
                  suffix="/hr"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">
          {config.resourceName} Flow
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-green-400">
              +{fmt(config.earnRate)}
            </p>
            <p className="text-xs text-neutral-500">Earn/hr</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-red-400">
              -{fmt(totalSpendRate)}
            </p>
            <p className="text-xs text-neutral-500">Spend/hr</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p
              className={`font-mono text-lg font-semibold ${
                netRate >= 0 ? "text-amber-400" : "text-red-400"
              }`}
            >
              {netRate >= 0 ? "+" : ""}
              {fmt(netRate)}
            </p>
            <p className="text-xs text-neutral-500">Net/hr</p>
          </div>
        </div>

        {(isInflating || isDeficit) && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3 ${
              isDeficit
                ? "border-red-500/30 bg-red-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            <AlertTriangle
              size={16}
              className={isDeficit ? "text-red-400" : "text-amber-400"}
            />
            <p
              className={`text-xs ${
                isDeficit ? "text-red-400" : "text-amber-400"
              }`}
            >
              {isDeficit
                ? `Deficit: Players lose ${fmt(Math.abs(netRate))} ${config.resourceName}/hr. They'll run out.`
                : `Inflation warning: Earn rate significantly exceeds spend rate. Players will hoard ${config.resourceName}.`}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-3 text-xs text-neutral-400">
            {config.resourceName} Over Time
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  label={{
                    value: "Hours Played",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#525252",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#737373" }}
                />
                <Line
                  type="monotone"
                  dataKey="earned"
                  name="Total Earned"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  name="Total Spent"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Net Balance"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-3 text-xs text-neutral-400">Time to Afford</p>
          <div className="space-y-2">
            {affordability.map((item) => {
              const pct = Math.min(
                100,
                isFinite(item.hoursToAfford)
                  ? (item.hoursToAfford / config.targetPlaytime) * 100
                  : 100
              );
              return (
                <div key={item.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-neutral-300">{item.name}</span>
                    <span className="font-mono text-xs text-neutral-400">
                      {isFinite(item.hoursToAfford)
                        ? item.hoursToAfford.toFixed(1) + "h"
                        : "Never"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-3 text-xs text-neutral-400">
            Recommended Session Length
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className="font-mono text-sm font-semibold text-green-400">
                {isFinite(sessionRecs.quick)
                  ? sessionRecs.quick.toFixed(1) + "h"
                  : "--"}
              </p>
              <p className="text-[10px] text-neutral-500">Quick Session</p>
            </div>
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className="font-mono text-sm font-semibold text-amber-400">
                {isFinite(sessionRecs.sweet)
                  ? sessionRecs.sweet.toFixed(1) + "h"
                  : "--"}
              </p>
              <p className="text-[10px] text-neutral-500">Sweet Spot</p>
            </div>
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className="font-mono text-sm font-semibold text-red-400">
                {isFinite(sessionRecs.full)
                  ? sessionRecs.full.toFixed(1) + "h"
                  : "--"}
              </p>
              <p className="text-[10px] text-neutral-500">Full Grind</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-neutral-600">
            Based on time to afford cheapest / median / most expensive item
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Economy Designer Tab ──

const ECON_RARITY_COLORS: Record<string, string> = {
  common: "text-neutral-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

const RARITY_BAR_COLORS: Record<string, string> = {
  common: "bg-neutral-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-amber-500",
};

const GENRE_OPTIONS = [
  "RPG",
  "MMORPG",
  "Idle / Clicker",
  "Roguelike",
  "Survival",
  "Strategy",
  "Mobile Gacha",
  "Sandbox",
  "Action RPG",
  "City Builder",
];

function EconomyDesigner() {
  const [genre, setGenre] = useState("RPG");
  const [currencies, setCurrencies] = useState<DesignerCurrency[]>([
    { id: uid(), name: "Gold", symbol: "G", exchangeRate: 1 },
  ]);
  const [items, setItems] = useState<DesignerItem[]>([
    { id: uid(), name: "Health Potion", cost: 50, sellPrice: 20, rarity: "common" },
  ]);
  const [income, setIncome] = useState<DesignerIncome[]>([
    { id: uid(), source: "Quest Reward", amount: 100, frequency: "per quest" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("currencies");
  const [primaryCurrency, setPrimaryCurrency] = useState("Gold");

  const toggleSection = (s: string) =>
    setExpandedSection((prev) => (prev === s ? null : s));

  const addCurrency = () =>
    setCurrencies((p) => [...p, { id: uid(), name: "", symbol: "", exchangeRate: 1 }]);
  const removeCurrency = (id: string) => {
    if (currencies.length <= 1) return;
    setCurrencies((p) => p.filter((c) => c.id !== id));
  };
  const updateCurrency = (id: string, field: keyof DesignerCurrency, val: string | number) =>
    setCurrencies((p) => p.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const addItem = () =>
    setItems((p) => [...p, { id: uid(), name: "", cost: 0, sellPrice: 0, rarity: "common" }]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((p) => p.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, field: keyof DesignerItem, val: string | number) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)));

  const addIncome = () =>
    setIncome((p) => [...p, { id: uid(), source: "", amount: 0, frequency: "per hour" }]);
  const removeIncome = (id: string) => {
    if (income.length <= 1) return;
    setIncome((p) => p.filter((i) => i.id !== id));
  };
  const updateIncome = (id: string, field: keyof DesignerIncome, val: string | number) =>
    setIncome((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)));

  const avgIncomePerHour = useMemo(() => {
    let total = 0;
    for (const src of income) {
      const freq = src.frequency.toLowerCase();
      if (freq.includes("hour")) total += src.amount;
      else if (freq.includes("minute")) total += src.amount * 60;
      else if (freq.includes("day") || freq.includes("daily") || freq.includes("login"))
        total += src.amount / 24;
      else if (freq.includes("quest") || freq.includes("kill") || freq.includes("drop"))
        total += src.amount * 4;
      else total += src.amount;
    }
    return total;
  }, [income]);

  const timeToEarn = useMemo(() => {
    if (avgIncomePerHour <= 0) return items.map((i) => ({ ...i, hours: Infinity }));
    return items.map((i) => ({
      ...i,
      hours: i.cost / avgIncomePerHour,
    }));
  }, [items, avgIncomePerHour]);

  const designEconomy = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = `Design a balanced game economy for a ${genre} game. Include: 3 currencies with exchange rates, 10 items with prices across currencies, 5 income sources with amounts. Make it feel rewarding but not too easy. Format as JSON: {"currencies": [{"name": "string", "symbol": "string", "exchangeRate": number}], "items": [{"name": "string", "cost": number, "sellPrice": number, "rarity": "common"|"uncommon"|"rare"|"epic"|"legendary"}], "income": [{"source": "string", "amount": number, "frequency": "string"}]}.`;

      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization:
            "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";

      if (!content) {
        setAiError("No response from AI. Try again.");
        return;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        setAiError("AI returned a response but it wasn't valid JSON. Try again.");
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.currencies?.length) {
        setCurrencies(
          parsed.currencies.map((c: { name: string; symbol: string; exchangeRate: number }) => ({
            id: uid(),
            name: c.name || "",
            symbol: c.symbol || "",
            exchangeRate: c.exchangeRate ?? 1,
          }))
        );
        setPrimaryCurrency(parsed.currencies[0]?.name || "Gold");
      }

      if (parsed.items?.length) {
        setItems(
          parsed.items.map((i: { name: string; cost: number; sellPrice: number; rarity: string }) => ({
            id: uid(),
            name: i.name || "",
            cost: i.cost ?? 0,
            sellPrice: i.sellPrice ?? 0,
            rarity: (i.rarity || "common").toLowerCase(),
          }))
        );
      }

      if (parsed.income?.length) {
        setIncome(
          parsed.income.map((inc: { source: string; amount: number; frequency: string }) => ({
            id: uid(),
            source: inc.source || "",
            amount: inc.amount ?? 0,
            frequency: inc.frequency || "per hour",
          }))
        );
      }

      setExpandedSection(null);
    } catch {
      setAiError("Failed to parse AI response. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Genre + AI Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-400">Game Genre</label>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  genre === g
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-[#2A2A2A] text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={designEconomy}
          disabled={aiLoading}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
        >
          {aiLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Designing...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Design Economy
            </>
          )}
        </button>
      </div>

      {aiError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="text-xs text-red-400">{aiError}</p>
        </div>
      )}

      {aiLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12">
          <Loader2 size={32} className="animate-spin text-amber-400" />
          <p className="text-sm text-neutral-400">
            AI is designing a {genre} economy...
          </p>
          <p className="text-xs text-neutral-600">
            This may take a few seconds
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left Column: Definitions */}
        <div className="space-y-4">
          {/* Currencies */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <button
              onClick={() => toggleSection("currencies")}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-400" />
                <h3 className="text-sm font-medium text-neutral-300">
                  Currencies
                </h3>
                <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-neutral-500">
                  {currencies.length}
                </span>
              </div>
              {expandedSection === "currencies" ? (
                <ChevronUp size={16} className="text-neutral-500" />
              ) : (
                <ChevronDown size={16} className="text-neutral-500" />
              )}
            </button>
            {expandedSection === "currencies" && (
              <div className="border-t border-[#2A2A2A] p-4 space-y-3">
                {currencies.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_60px_80px_32px] items-end gap-2"
                  >
                    <TextInput
                      label="Name"
                      value={c.name}
                      onChange={(v) => updateCurrency(c.id, "name", v)}
                      placeholder="Gold"
                    />
                    <TextInput
                      label="Symbol"
                      value={c.symbol}
                      onChange={(v) => updateCurrency(c.id, "symbol", v)}
                      placeholder="G"
                    />
                    <NumInput
                      label="Rate"
                      value={c.exchangeRate}
                      onChange={(v) => updateCurrency(c.id, "exchangeRate", v)}
                      min={0}
                      step={0.01}
                    />
                    <button
                      onClick={() => removeCurrency(c.id)}
                      className="mb-0.5 self-end p-2 text-neutral-500 transition hover:text-red-400 disabled:opacity-30"
                      disabled={currencies.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCurrency}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] py-2 text-xs text-neutral-500 transition hover:border-amber-500/40 hover:text-amber-400"
                >
                  <Plus size={14} /> Add Currency
                </button>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <button
              onClick={() => toggleSection("items")}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <Gem size={16} className="text-purple-400" />
                <h3 className="text-sm font-medium text-neutral-300">Items</h3>
                <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-neutral-500">
                  {items.length}
                </span>
              </div>
              {expandedSection === "items" ? (
                <ChevronUp size={16} className="text-neutral-500" />
              ) : (
                <ChevronDown size={16} className="text-neutral-500" />
              )}
            </button>
            {expandedSection === "items" && (
              <div className="border-t border-[#2A2A2A] p-4 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateItem(item.id, "name", e.target.value)
                        }
                        placeholder="Item name"
                        className="border-none bg-transparent text-sm font-medium text-white outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={item.rarity}
                          onChange={(e) =>
                            updateItem(item.id, "rarity", e.target.value)
                          }
                          className={`rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs capitalize outline-none ${RARITY_COLORS[item.rarity] || "text-neutral-400"}`}
                        >
                          {Object.keys(RARITY_COLORS).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-neutral-500 transition hover:text-red-400 disabled:opacity-30"
                          disabled={items.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumInput
                        label={`Cost (${primaryCurrency})`}
                        value={item.cost}
                        onChange={(v) => updateItem(item.id, "cost", v)}
                        min={0}
                      />
                      <NumInput
                        label="Sell Price"
                        value={item.sellPrice}
                        onChange={(v) => updateItem(item.id, "sellPrice", v)}
                        min={0}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] py-2 text-xs text-neutral-500 transition hover:border-amber-500/40 hover:text-amber-400"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
            )}
          </div>

          {/* Income Sources */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <button
              onClick={() => toggleSection("income")}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" />
                <h3 className="text-sm font-medium text-neutral-300">
                  Income Sources
                </h3>
                <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-neutral-500">
                  {income.length}
                </span>
              </div>
              {expandedSection === "income" ? (
                <ChevronUp size={16} className="text-neutral-500" />
              ) : (
                <ChevronDown size={16} className="text-neutral-500" />
              )}
            </button>
            {expandedSection === "income" && (
              <div className="border-t border-[#2A2A2A] p-4 space-y-3">
                {income.map((src) => (
                  <div
                    key={src.id}
                    className="grid grid-cols-[1fr_80px_100px_32px] items-end gap-2"
                  >
                    <TextInput
                      label="Source"
                      value={src.source}
                      onChange={(v) => updateIncome(src.id, "source", v)}
                      placeholder="Quest reward"
                    />
                    <NumInput
                      label="Amount"
                      value={src.amount}
                      onChange={(v) => updateIncome(src.id, "amount", v)}
                      min={0}
                    />
                    <TextInput
                      label="Frequency"
                      value={src.frequency}
                      onChange={(v) => updateIncome(src.id, "frequency", v)}
                      placeholder="per hour"
                    />
                    <button
                      onClick={() => removeIncome(src.id)}
                      className="mb-0.5 self-end p-2 text-neutral-500 transition hover:text-red-400 disabled:opacity-30"
                      disabled={income.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addIncome}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] py-2 text-xs text-neutral-500 transition hover:border-amber-500/40 hover:text-amber-400"
                >
                  <Plus size={14} /> Add Income Source
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Overview + Time to Earn */}
        <div className="space-y-4">
          {/* Economy Overview */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-sm font-medium text-neutral-300">
              Economy Overview
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="font-mono text-lg font-semibold text-amber-400">
                  {currencies.length}
                </p>
                <p className="text-[10px] text-neutral-500">Currencies</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="font-mono text-lg font-semibold text-purple-400">
                  {items.length}
                </p>
                <p className="text-[10px] text-neutral-500">Items</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="font-mono text-lg font-semibold text-green-400">
                  {income.length}
                </p>
                <p className="text-[10px] text-neutral-500">Income Sources</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-[#111] p-3 text-center">
              <p className="font-mono text-sm text-neutral-300">
                ~<span className="text-amber-400">{fmt(avgIncomePerHour)}</span>{" "}
                {primaryCurrency}/hr estimated income
              </p>
            </div>
          </div>

          {/* Currency Exchange Rates */}
          {currencies.length > 1 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <h3 className="mb-3 text-sm font-medium text-neutral-300">
                Exchange Rates
              </h3>
              <div className="space-y-2">
                {currencies.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-[#111] px-3 py-2"
                  >
                    <span className="text-sm text-neutral-300">
                      1 {currencies[0]?.name || "Base"}
                    </span>
                    <span className="font-mono text-sm text-amber-400">
                      = {c.exchangeRate} {c.symbol || c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Table */}
          {items.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <h3 className="mb-3 text-sm font-medium text-neutral-300">
                Item Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-neutral-500">
                      <th className="pb-2 pr-4 font-medium">Item</th>
                      <th className="pb-2 pr-4 font-medium">Cost</th>
                      <th className="pb-2 pr-4 font-medium">Sell</th>
                      <th className="pb-2 pr-4 font-medium">Margin</th>
                      <th className="pb-2 font-medium">Rarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const margin =
                        item.cost > 0
                          ? (((item.cost - item.sellPrice) / item.cost) * 100).toFixed(0)
                          : "0";
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[#2A2A2A]/50 last:border-0"
                        >
                          <td className="py-2 pr-4 text-neutral-300">
                            {item.name || "—"}
                          </td>
                          <td className="py-2 pr-4 font-mono text-white">
                            {fmt(item.cost)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-neutral-400">
                            {fmt(item.sellPrice)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-red-400">
                            {margin}%
                          </td>
                          <td
                            className={`py-2 capitalize ${RARITY_COLORS[item.rarity] || "text-neutral-400"}`}
                          >
                            {item.rarity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Time to Earn */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium text-neutral-300">
                Time to Earn
              </h3>
            </div>
            {avgIncomePerHour <= 0 ? (
              <p className="text-xs text-neutral-500">
                Add income sources to see time-to-earn estimates.
              </p>
            ) : (
              <div className="space-y-2">
                {timeToEarn
                  .sort((a, b) => a.hours - b.hours)
                  .map((item) => {
                    const maxHours = Math.max(
                      ...timeToEarn.map((t) => (isFinite(t.hours) ? t.hours : 0))
                    );
                    const pct =
                      maxHours > 0 && isFinite(item.hours)
                        ? (item.hours / maxHours) * 100
                        : 0;

                    let timeLabel: string;
                    if (!isFinite(item.hours)) {
                      timeLabel = "Never";
                    } else if (item.hours < 1) {
                      timeLabel = `${Math.round(item.hours * 60)}m`;
                    } else {
                      timeLabel = `${item.hours.toFixed(1)}h`;
                    }

                    return (
                      <div key={item.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs capitalize ${RARITY_COLORS[item.rarity] || "text-neutral-400"}`}
                            >
                              {item.name || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-neutral-400">
                              {fmt(item.cost)} {primaryCurrency}
                            </span>
                            <span className="font-mono text-xs text-amber-400">
                              {timeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.rarity === "legendary"
                                ? "bg-amber-500"
                                : item.rarity === "epic"
                                  ? "bg-purple-500"
                                  : item.rarity === "rare"
                                    ? "bg-blue-500"
                                    : item.rarity === "uncommon"
                                      ? "bg-green-500"
                                      : "bg-neutral-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Income Breakdown */}
          {income.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <h3 className="mb-3 text-sm font-medium text-neutral-300">
                Income Breakdown
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={income.map((src) => ({
                      name:
                        src.source.length > 12
                          ? src.source.slice(0, 12) + "..."
                          : src.source,
                      amount: src.amount,
                    }))}
                  >
                    <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#737373", fontSize: 10 }}
                      axisLine={{ stroke: "#2A2A2A" }}
                    />
                    <YAxis
                      tick={{ fill: "#737373", fontSize: 11 }}
                      axisLine={{ stroke: "#2A2A2A" }}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Difficulty Tab ──

function DifficultyAnalyzer() {
  const [levels, setLevels] = useState<DifficultyLevel[]>([
    { id: uid(), name: "Tutorial", difficulty: 1 },
    { id: uid(), name: "Forest Path", difficulty: 3 },
    { id: uid(), name: "Dark Caves", difficulty: 5 },
    { id: uid(), name: "Mountain Pass", difficulty: 4 },
    { id: uid(), name: "Dragon's Lair", difficulty: 7 },
    { id: uid(), name: "Shadow Realm", difficulty: 8 },
    { id: uid(), name: "Final Boss", difficulty: 10 },
  ]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const addLevel = () => {
    setLevels((prev) => [
      ...prev,
      { id: uid(), name: `Level ${prev.length + 1}`, difficulty: 5 },
    ]);
  };

  const removeLevel = (id: string) => {
    if (levels.length <= 2) return;
    setLevels((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLevel = useCallback(
    (id: string, field: keyof DifficultyLevel, value: string | number) => {
      setLevels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      );
    },
    []
  );

  const analyzeCurve = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const levelList = levels
        .map(
          (l, i) =>
            `${i + 1}. "${l.name}" - Difficulty: ${l.difficulty}/10`
        )
        .join("\n");

      const response = await fetch(
        "https://llm.chutes.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " +
              (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2.5-TEE",
            messages: [
              {
                role: "user",
                content: `Analyze this game's difficulty curve:\n${levelList}\n\nIdentify: pacing issues, difficulty spikes, too-easy sections. Suggest specific adjustments. Also recommend where to place checkpoints, rest areas, and difficulty options.`,
              },
            ],
            stream: false,
            max_tokens: 512,
            temperature: 0.7,
          }),
        }
      );
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";
      setAiAnalysis(content || "No analysis returned from AI.");
    } catch {
      setAiAnalysis(
        "AI advisor is currently unavailable. Try again later."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const maxDiff = Math.max(...levels.map((l) => l.difficulty));
  const avgDiff =
    levels.reduce((s, l) => s + l.difficulty, 0) / levels.length;

  const spikes = levels.filter(
    (l, i) => i > 0 && l.difficulty - levels[i - 1].difficulty >= 3
  );

  const dips = levels.filter(
    (l, i) => i > 0 && levels[i - 1].difficulty - l.difficulty >= 3
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Level Inputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">Levels</h3>
          <button
            onClick={addLevel}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400"
          >
            <Plus size={14} /> Add Level
          </button>
        </div>

        <div className="space-y-2">
          {levels.map((level, idx) => (
            <div
              key={level.id}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-neutral-500">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) =>
                    updateLevel(level.id, "name", e.target.value)
                  }
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-white outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={level.difficulty}
                    onChange={(e) =>
                      updateLevel(
                        level.id,
                        "difficulty",
                        Number(e.target.value)
                      )
                    }
                    className="w-20 accent-amber-500"
                  />
                  <span
                    className={`w-6 text-center font-mono text-sm font-semibold ${
                      level.difficulty >= 8
                        ? "text-red-400"
                        : level.difficulty >= 5
                          ? "text-amber-400"
                          : "text-green-400"
                    }`}
                  >
                    {level.difficulty}
                  </span>
                  {levels.length > 2 && (
                    <button
                      onClick={() => removeLevel(level.id)}
                      className="text-neutral-500 transition hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Analysis */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">
          Difficulty Curve
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-amber-400">
              {avgDiff.toFixed(1)}
            </p>
            <p className="text-xs text-neutral-500">Avg Difficulty</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-red-400">
              {spikes.length}
            </p>
            <p className="text-xs text-neutral-500">Spikes</p>
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-center">
            <p className="font-mono text-lg font-semibold text-blue-400">
              {dips.length}
            </p>
            <p className="text-xs text-neutral-500">Dips</p>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="mb-4 text-xs text-neutral-400">Difficulty by Level</p>
          <div className="flex items-end gap-1" style={{ height: "200px" }}>
            {levels.map((level, idx) => {
              const pct = (level.difficulty / 10) * 100;
              const isSpike =
                idx > 0 &&
                level.difficulty - levels[idx - 1].difficulty >= 3;
              const isDip =
                idx > 0 &&
                levels[idx - 1].difficulty - level.difficulty >= 3;
              const barColor =
                level.difficulty >= 8
                  ? "#EF4444"
                  : level.difficulty >= 5
                    ? "#F59E0B"
                    : "#10B981";
              return (
                <div
                  key={level.id}
                  className="flex flex-1 flex-col items-center gap-1"
                  style={{ height: "100%" }}
                >
                  <span className="font-mono text-[10px] text-neutral-500">
                    {level.difficulty}
                  </span>
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isSpike
                          ? "ring-2 ring-red-500/60"
                          : isDip
                            ? "ring-2 ring-blue-500/60"
                            : ""
                      }`}
                      style={{
                        height: `${pct}%`,
                        backgroundColor: barColor,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span
                    className="w-full truncate text-center text-[9px] text-neutral-600"
                    title={level.name}
                  >
                    {level.name.length > 8
                      ? level.name.slice(0, 7) + "\u2026"
                      : level.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-neutral-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Easy (1-4)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Medium (5-7)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Hard (8-10)
            </span>
          </div>
        </div>

        {/* Warnings */}
        {spikes.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-red-400"
            />
            <p className="text-xs text-red-400">
              Difficulty spike{spikes.length > 1 ? "s" : ""} detected at:{" "}
              {spikes.map((s) => s.name).join(", ")}. Consider adding rest
              areas or checkpoints before these levels.
            </p>
          </div>
        )}

        {dips.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
            <p className="text-xs text-blue-400">
              Difficulty dip{dips.length > 1 ? "s" : ""} detected at:{" "}
              {dips.map((s) => s.name).join(", ")}. Sudden drops can feel
              anticlimactic unless intentional rest areas.
            </p>
          </div>
        )}

        {/* AI Analysis */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <p className="text-sm font-medium text-neutral-300">
                AI Difficulty Advisor
              </p>
            </div>
            <button
              onClick={analyzeCurve}
              disabled={aiLoading || levels.length < 2}
              className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-amber-500/10"
            >
              {aiLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Analyze Difficulty Curve
                </>
              )}
            </button>
          </div>

          {aiLoading && !aiAnalysis && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-amber-400" />
            </div>
          )}

          {aiAnalysis && (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {aiAnalysis}
              </div>
            </div>
          )}

          {!aiLoading && !aiAnalysis && (
            <p className="text-xs text-neutral-500">
              Click &quot;Analyze Difficulty Curve&quot; to get AI feedback on
              pacing, spikes, and checkpoint placement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loot Table Designer ──

function LootTableDesigner() {
  const [pools, setPools] = useState<LootPool[]>([
    {
      id: uid(),
      name: "Common Drops",
      items: [
        { id: uid(), name: "Gold Coin", dropChance: 40, rarity: "common", description: "" },
        { id: uid(), name: "Health Potion", dropChance: 25, rarity: "common", description: "" },
        { id: uid(), name: "Iron Ore", dropChance: 15, rarity: "uncommon", description: "" },
        { id: uid(), name: "Magic Scroll", dropChance: 12, rarity: "rare", description: "" },
        { id: uid(), name: "Enchanted Ring", dropChance: 5, rarity: "epic", description: "" },
        { id: uid(), name: "Diamond Shard", dropChance: 3, rarity: "legendary", description: "" },
      ],
    },
  ]);
  const [selectedPool, setSelectedPool] = useState(0);
  const [genre, setGenre] = useState("RPG");
  const [aiLoading, setAiLoading] = useState(false);
  const [simResults, setSimResults] = useState<SimResult[] | null>(null);
  const [simRolls, setSimRolls] = useState(100);
  const [copied, setCopied] = useState(false);

  const currentPool = pools[selectedPool] || pools[0];
  const currentItems = currentPool?.items || [];
  const totalChance = currentItems.reduce((s, i) => s + i.dropChance, 0);

  const addPool = () => {
    setPools((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Pool ${prev.length + 1}`,
        items: [
          { id: uid(), name: "New Item", dropChance: 100, rarity: "common", description: "" },
        ],
      },
    ]);
    setSelectedPool(pools.length);
  };

  const removePool = (idx: number) => {
    if (pools.length <= 1) return;
    setPools((prev) => prev.filter((_, i) => i !== idx));
    setSelectedPool((prev) => Math.min(prev, pools.length - 2));
  };

  const renamePool = (idx: number, name: string) => {
    setPools((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)));
  };

  const addItem = () => {
    setPools((prev) =>
      prev.map((p, i) =>
        i === selectedPool
          ? {
              ...p,
              items: [
                ...p.items,
                { id: uid(), name: "New Item", dropChance: 10, rarity: "common", description: "" },
              ],
            }
          : p
      )
    );
  };

  const removeItem = (itemId: string) => {
    if (currentItems.length <= 1) return;
    setPools((prev) =>
      prev.map((p, i) =>
        i === selectedPool
          ? { ...p, items: p.items.filter((item) => item.id !== itemId) }
          : p
      )
    );
  };

  const updateItem = useCallback(
    (itemId: string, field: keyof LootItem, value: string | number) => {
      setPools((prev) =>
        prev.map((p, i) =>
          i === selectedPool
            ? {
                ...p,
                items: p.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : p
        )
      );
    },
    [selectedPool]
  );

  const pieGradient = useMemo(() => {
    if (currentItems.length === 0 || totalChance === 0)
      return "conic-gradient(#2A2A2A 0% 100%)";
    let cumulative = 0;
    const stops = currentItems.map((item, i) => {
      const start = cumulative;
      const normalized = (item.dropChance / totalChance) * 100;
      cumulative += normalized;
      return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cumulative}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [currentItems, totalChance]);

  const runSimulation = useCallback(() => {
    if (currentItems.length === 0 || totalChance === 0) return;
    const counts = new Map<string, number>();
    currentItems.forEach((i) => counts.set(i.id, 0));

    for (let r = 0; r < simRolls; r++) {
      const roll = Math.random() * totalChance;
      let cum = 0;
      for (const item of currentItems) {
        cum += item.dropChance;
        if (roll < cum) {
          counts.set(item.id, (counts.get(item.id) || 0) + 1);
          break;
        }
      }
    }

    setSimResults(
      currentItems.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        expected: (item.dropChance / totalChance) * simRolls,
        actual: counts.get(item.id) || 0,
      }))
    );
  }, [currentItems, totalChance, simRolls]);

  const designLootTable = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const prompt = `Design a loot table for a ${genre} game. Pool name: ${currentPool.name}. Create 8 items with realistic drop rates. Include: item name, drop chance %, rarity (Common/Uncommon/Rare/Epic/Legendary), and a brief description. Format as JSON array: [{"name": "string", "dropChance": number, "rarity": "string", "description": "string"}]. Drop chances should sum to 100.`;

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
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";

      if (!content) return;

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const newItems: LootItem[] = parsed.map(
          (item: { name?: string; dropChance?: number; drop_chance?: number; rarity?: string; description?: string }) => ({
            id: uid(),
            name: item.name || "Unknown",
            dropChance: item.dropChance ?? item.drop_chance ?? 10,
            rarity: (item.rarity || "common").toLowerCase(),
            description: item.description || "",
          })
        );

        setPools((prev) =>
          prev.map((p, i) => (i === selectedPool ? { ...p, items: newItems } : p))
        );
        setSimResults(null);
      }
    } catch {
      // AI parse failure — items unchanged
    } finally {
      setAiLoading(false);
    }
  };

  const exportJSON = () => {
    const exportData = pools.map((p) => ({
      name: p.name,
      items: p.items.map((i) => ({
        name: i.name,
        dropChance: i.dropChance,
        rarity: i.rarity,
        ...(i.description ? { description: i.description } : {}),
      })),
    }));
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Pool tabs + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {pools.map((pool, idx) => (
            <div key={pool.id} className="flex items-center">
              <button
                onClick={() => {
                  setSelectedPool(idx);
                  setSimResults(null);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  selectedPool === idx
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-[#2A2A2A] text-neutral-400 hover:border-neutral-600"
                } ${pools.length > 1 ? "rounded-r-none" : ""}`}
              >
                {pool.name}
              </button>
              {pools.length > 1 && (
                <button
                  onClick={() => removePool(idx)}
                  className={`rounded-r-lg border border-l-0 px-1.5 py-1.5 text-xs transition ${
                    selectedPool === idx
                      ? "border-amber-500/50 bg-amber-500/5 text-neutral-500 hover:text-red-400"
                      : "border-[#2A2A2A] text-neutral-600 hover:text-red-400"
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPool}
            className="flex items-center gap-1 rounded-lg border border-dashed border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-500 transition hover:border-amber-500/40 hover:text-amber-400"
          >
            <Plus size={12} /> Pool
          </button>
        </div>
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400"
        >
          <Download size={14} /> {copied ? "Copied!" : "Export JSON"}
        </button>
      </div>

      {/* Pool name + genre + AI */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextInput
            label="Pool Name"
            value={currentPool.name}
            onChange={(v) => renamePool(selectedPool, v)}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-400">Genre</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          >
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={designLootTable}
          disabled={aiLoading}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
        >
          {aiLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Designing...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Design Loot Table
            </>
          )}
        </button>
      </div>

      {aiLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12">
          <Loader2 size={32} className="animate-spin text-amber-400" />
          <p className="text-sm text-neutral-400">
            AI is designing loot for {currentPool.name}...
          </p>
          <p className="text-xs text-neutral-600">This may take a few seconds</p>
        </div>
      )}

      {/* Drop chance warning */}
      {totalChance !== 100 && currentItems.length > 0 && !aiLoading && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 ${
            Math.abs(totalChance - 100) > 5
              ? "border-red-500/30 bg-red-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <AlertTriangle
            size={16}
            className={
              Math.abs(totalChance - 100) > 5 ? "text-red-400" : "text-amber-400"
            }
          />
          <p
            className={`text-xs ${
              Math.abs(totalChance - 100) > 5 ? "text-red-400" : "text-amber-400"
            }`}
          >
            Drop chances total {totalChance.toFixed(1)}% (should be 100%). Rolls
            will be normalized.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-300">
              Items in {currentPool.name}
            </h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/40 hover:text-amber-400"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {currentItems.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      className="border-none bg-transparent text-sm font-medium text-white outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.rarity}
                      onChange={(e) =>
                        updateItem(item.id, "rarity", e.target.value)
                      }
                      className={`rounded-md border border-[#2A2A2A] bg-[#111] px-2 py-1 text-xs capitalize outline-none ${RARITY_COLORS[item.rarity] || "text-neutral-400"}`}
                    >
                      {Object.keys(RARITY_COLORS).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {currentItems.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-neutral-500 transition hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] text-neutral-500">
                      Drop Chance
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={item.dropChance}
                        onChange={(e) =>
                          updateItem(item.id, "dropChance", Number(e.target.value))
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <span className="w-14 text-right font-mono text-sm text-amber-400">
                        {item.dropChance.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-1 text-[11px] italic text-neutral-500">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pie chart + Simulation + Summary */}
        <div className="space-y-4">
          {/* Pie Chart */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <p className="mb-4 text-xs text-neutral-400">
              Drop Rate Distribution
            </p>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <div
                  className="h-44 w-44 rounded-full"
                  style={{ background: pieGradient }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#1A1A1A]">
                    <span className="font-mono text-lg font-semibold text-white">
                      {currentItems.length}
                    </span>
                    <span className="text-[10px] text-neutral-500">items</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {currentItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                    <span className="flex-1 truncate text-xs text-neutral-300">
                      {item.name}
                    </span>
                    <span className="font-mono text-xs text-neutral-500">
                      {((item.dropChance / totalChance) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulation */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-neutral-400">Loot Simulation</p>
              <div className="flex items-center gap-2">
                {[100, 1000, 10000].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSimRolls(n)}
                    className={`rounded-lg border px-2 py-1 font-mono text-[10px] transition ${
                      simRolls === n
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-[#2A2A2A] text-neutral-500 hover:border-neutral-600"
                    }`}
                  >
                    {n >= 1000 ? `${n / 1000}K` : n}
                  </button>
                ))}
                <button
                  onClick={runSimulation}
                  disabled={currentItems.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
                >
                  Roll {simRolls >= 1000 ? `${simRolls / 1000}K` : simRolls}x
                </button>
              </div>
            </div>

            {simResults ? (
              <div className="space-y-2">
                {simResults.map((r) => {
                  const maxActual = Math.max(
                    ...simResults.map((s) => s.actual),
                    1
                  );
                  const deviation =
                    r.expected > 0
                      ? ((r.actual - r.expected) / r.expected) * 100
                      : 0;
                  return (
                    <div key={r.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={`text-xs capitalize ${RARITY_COLORS[r.rarity] || "text-neutral-400"}`}
                        >
                          {r.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-neutral-500">
                            exp: {r.expected.toFixed(0)}
                          </span>
                          <span className="font-mono text-xs text-white">
                            {r.actual}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              deviation > 0
                                ? "text-green-400"
                                : deviation < 0
                                  ? "text-red-400"
                                  : "text-neutral-500"
                            }`}
                          >
                            {deviation > 0 ? "+" : ""}
                            {deviation.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className="h-full rounded-full bg-amber-500/40 transition-all"
                            style={{
                              width: `${(r.expected / maxActual) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className={`h-full rounded-full transition-all ${RARITY_BAR_COLORS[r.rarity] || "bg-neutral-500"}`}
                            style={{
                              width: `${(r.actual / maxActual) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center gap-4 text-[10px] text-neutral-600">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-4 rounded-full bg-amber-500/40" />
                    Expected
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-4 rounded-full bg-neutral-500" />
                    Actual
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-neutral-500">
                Click a roll button to simulate drops and see statistical results.
              </p>
            )}
          </div>

          {/* Loot Table Summary */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-sm font-medium text-neutral-300">
              Loot Table Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-neutral-500">
                    <th className="pb-2 pr-4 font-medium">Item</th>
                    <th className="pb-2 pr-4 font-medium">Drop %</th>
                    <th className="pb-2 pr-4 font-medium">Rarity</th>
                    <th className="pb-2 font-medium">1-in-X</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems
                    .slice()
                    .sort((a, b) => b.dropChance - a.dropChance)
                    .map((item) => {
                      const normalizedChance =
                        totalChance > 0
                          ? (item.dropChance / totalChance) * 100
                          : 0;
                      const oneInX =
                        normalizedChance > 0
                          ? Math.round(100 / normalizedChance)
                          : Infinity;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[#2A2A2A]/50 last:border-0"
                        >
                          <td className="py-2 pr-4 text-neutral-300">
                            {item.name}
                          </td>
                          <td className="py-2 pr-4 font-mono text-amber-400">
                            {normalizedChance.toFixed(1)}%
                          </td>
                          <td
                            className={`py-2 pr-4 capitalize ${RARITY_COLORS[item.rarity] || "text-neutral-400"}`}
                          >
                            {item.rarity}
                          </td>
                          <td className="py-2 font-mono text-neutral-500">
                            {isFinite(oneInX) ? `1 in ${oneInX}` : "--"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Item Designer Tab ──

function ItemDesigner() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [genre, setGenre] = useState("RPG");
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<ItemType | "All">("All");
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [manualOpen, setManualOpen] = useState(false);
  const [newItem, setNewItem] = useState<Omit<GameItem, "id">>({
    name: "",
    type: "Weapon",
    rarity: "Common",
    stats: { attack: 0, defense: 0, hp: 0, speed: 0 },
    description: "",
    specialAbility: "",
  });

  const filteredItems = useMemo(
    () => (filterType === "All" ? items : items.filter((i) => i.type === filterType)),
    [items, filterType]
  );

  const compareA = useMemo(() => items.find((i) => i.id === compareIds[0]) || null, [items, compareIds]);
  const compareB = useMemo(() => items.find((i) => i.id === compareIds[1]) || null, [items, compareIds]);

  const generateItems = async () => {
    setLoading(true);
    try {
      const prompt = `Design 8 game items for a ${genre} game. Include 2 weapons, 2 armor pieces, 2 consumables, and 2 key items. For each item provide: name, type (Weapon/Armor/Consumable/Material/Key Item), rarity (Common/Uncommon/Rare/Epic/Legendary), stats object with attack/defense/hp/speed as numbers, description (1 sentence), and specialAbility (1 sentence). Return ONLY a valid JSON array, no markdown fences.`;
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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonStr = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed: unknown[] = JSON.parse(jsonStr);
      const generated: GameItem[] = parsed.map((p: any) => ({
        id: uid(),
        name: p.name || "Unknown",
        type: ITEM_TYPES.includes(p.type) ? p.type : "Material",
        rarity: ITEM_RARITIES.includes(p.rarity) ? p.rarity : "Common",
        stats: {
          attack: Number(p.stats?.attack) || 0,
          defense: Number(p.stats?.defense) || 0,
          hp: Number(p.stats?.hp) || 0,
          speed: Number(p.stats?.speed) || 0,
        },
        description: p.description || "",
        specialAbility: p.specialAbility || p.special_ability || "",
      }));
      setItems((prev) => [...prev, ...generated]);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const addManualItem = () => {
    if (!newItem.name.trim()) return;
    setItems((prev) => [...prev, { ...newItem, id: uid() }]);
    setNewItem({
      name: "",
      type: "Weapon",
      rarity: "Common",
      stats: { attack: 0, defense: 0, hp: 0, speed: 0 },
      description: "",
      specialAbility: "",
    });
    setManualOpen(false);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCompareIds((prev) => [
      prev[0] === id ? null : prev[0],
      prev[1] === id ? null : prev[1],
    ]);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev[0] === id) return [null, prev[1]];
      if (prev[1] === id) return [prev[0], null];
      if (!prev[0]) return [id, prev[1]];
      if (!prev[1]) return [prev[0], id];
      return [id, prev[1]];
    });
  };

  const exportItems = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "item_database.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statMax = useMemo(() => {
    if (!items.length) return { attack: 100, defense: 100, hp: 100, speed: 100 };
    return {
      attack: Math.max(...items.map((i) => i.stats.attack), 1),
      defense: Math.max(...items.map((i) => i.stats.defense), 1),
      hp: Math.max(...items.map((i) => i.stats.hp), 1),
      speed: Math.max(...items.map((i) => i.stats.speed), 1),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI Item Designer</h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={exportItems}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-neutral-300 transition hover:border-amber-500/30 hover:text-amber-400"
              >
                <Download size={14} />
                Export JSON
              </button>
            )}
            <button
              onClick={() => setManualOpen(!manualOpen)}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-neutral-300 transition hover:border-amber-500/30 hover:text-amber-400"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Game Genre</label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="RPG, Roguelike, MMORPG..."
              className="w-48 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={generateItems}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Designing..." : "Design Item Set"}
          </button>
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Loader2 size={16} className="animate-spin text-amber-400" />
            <span className="text-sm text-amber-300">
              AI is crafting items for your {genre} game...
            </span>
          </div>
        )}
      </div>

      {/* Manual Add Form */}
      {manualOpen && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-300">Create Item Manually</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <TextInput label="Name" value={newItem.name} onChange={(v) => setNewItem((p) => ({ ...p, name: v }))} placeholder="Excalibur" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Type</label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value as ItemType }))}
                className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              >
                {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Rarity</label>
              <select
                value={newItem.rarity}
                onChange={(e) => setNewItem((p) => ({ ...p, rarity: e.target.value as ItemRarity }))}
                className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              >
                {ITEM_RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <NumInput label="Attack" value={newItem.stats.attack} onChange={(v) => setNewItem((p) => ({ ...p, stats: { ...p.stats, attack: v } }))} min={0} />
            <NumInput label="Defense" value={newItem.stats.defense} onChange={(v) => setNewItem((p) => ({ ...p, stats: { ...p.stats, defense: v } }))} min={0} />
            <NumInput label="HP" value={newItem.stats.hp} onChange={(v) => setNewItem((p) => ({ ...p, stats: { ...p.stats, hp: v } }))} min={0} />
            <NumInput label="Speed" value={newItem.stats.speed} onChange={(v) => setNewItem((p) => ({ ...p, stats: { ...p.stats, speed: v } }))} min={0} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput label="Description" value={newItem.description} onChange={(v) => setNewItem((p) => ({ ...p, description: v }))} placeholder="A legendary blade..." />
            <TextInput label="Special Ability" value={newItem.specialAbility} onChange={(v) => setNewItem((p) => ({ ...p, specialAbility: v }))} placeholder="Deals 2x damage to undead" />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={addManualItem}
              disabled={!newItem.name.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-40"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Filter:</span>
          {(["All", ...ITEM_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filterType === t
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-[#1A1A1A] text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral-500">
            {filteredItems.length} item{filteredItems.length !== 1 && "s"}
          </span>
        </div>
      )}

      {/* Item Cards */}
      {filteredItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const isComparing = compareIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`group relative rounded-xl border-2 bg-[#1A1A1A] p-4 transition ${RARITY_BG[item.rarity]} ${
                  isComparing ? "ring-2 ring-amber-500/50" : ""
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: RARITY_COLORS[item.rarity], backgroundColor: RARITY_COLORS[item.rarity] + "15" }}
                      >
                        {item.rarity}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{item.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => toggleCompare(item.id)}
                      title={isComparing ? "Remove from comparison" : "Compare"}
                      className={`rounded-md p-1 transition ${
                        isComparing
                          ? "bg-amber-500/20 text-amber-400"
                          : "text-neutral-500 hover:bg-[#2A2A2A] hover:text-white"
                      }`}
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stat Bars */}
                <div className="mb-3 space-y-1.5">
                  {(["attack", "defense", "hp", "speed"] as const).map((stat) => {
                    const val = item.stats[stat];
                    const pct = statMax[stat] > 0 ? (val / statMax[stat]) * 100 : 0;
                    const barColor =
                      stat === "attack" ? "#EF4444" : stat === "defense" ? "#3B82F6" : stat === "hp" ? "#10B981" : "#F59E0B";
                    return (
                      <div key={stat} className="flex items-center gap-2">
                        <span className="w-10 text-[10px] uppercase text-neutral-500">{stat === "hp" ? "HP" : stat.slice(0, 3)}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#111]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-[10px] text-neutral-400">{val}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="mb-2 text-xs leading-relaxed text-neutral-400">{item.description}</p>

                {item.specialAbility && (
                  <div className="flex items-start gap-1.5 rounded-md bg-amber-500/5 px-2 py-1.5">
                    <Zap size={12} className="mt-0.5 shrink-0 text-amber-500" />
                    <span className="text-[11px] leading-snug text-amber-300">{item.specialAbility}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-[#2A2A2A] py-16 text-center">
          <Shield size={40} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-sm text-neutral-400">No items yet. Use AI to design a set or add items manually.</p>
        </div>
      )}

      {/* Comparison Panel */}
      {(compareA || compareB) && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
              <ArrowRightLeft size={16} className="text-amber-400" />
              Item Comparison
            </h3>
            <button
              onClick={() => setCompareIds([null, null])}
              className="text-xs text-neutral-500 transition hover:text-neutral-300"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[compareA, compareB].map((item, idx) => (
              <div key={idx}>
                {item ? (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <h4 className="font-semibold text-white">{item.name}</h4>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ color: RARITY_COLORS[item.rarity], backgroundColor: RARITY_COLORS[item.rarity] + "15" }}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(["attack", "defense", "hp", "speed"] as const).map((stat) => {
                        const val = item.stats[stat];
                        const other = idx === 0 ? compareB : compareA;
                        const otherVal = other?.stats[stat] ?? 0;
                        const diff = val - otherVal;
                        return (
                          <div key={stat} className="flex items-center justify-between">
                            <span className="text-xs uppercase text-neutral-500">{stat === "hp" ? "HP" : stat}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-white">{val}</span>
                              {other && diff !== 0 && (
                                <span className={`font-mono text-xs ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {diff > 0 ? "+" : ""}{diff}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {item.specialAbility && (
                      <div className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-500/5 px-2 py-1.5">
                        <Zap size={12} className="mt-0.5 shrink-0 text-amber-500" />
                        <span className="text-[11px] text-amber-300">{item.specialAbility}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] py-8">
                    <p className="text-xs text-neutral-500">
                      Click <ArrowRightLeft size={12} className="mx-1 inline text-neutral-500" /> on a card to compare
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Side by Side Stat Bar Comparison */}
          {compareA && compareB && (
            <div className="mt-6 space-y-3 border-t border-[#2A2A2A] pt-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">Visual Comparison</h4>
              {(["attack", "defense", "hp", "speed"] as const).map((stat) => {
                const aVal = compareA.stats[stat];
                const bVal = compareB.stats[stat];
                const maxVal = Math.max(aVal, bVal, 1);
                return (
                  <div key={stat} className="flex items-center gap-3">
                    <span className="w-14 text-right text-xs uppercase text-neutral-500">{stat === "hp" ? "HP" : stat}</span>
                    <div className="flex flex-1 items-center gap-1">
                      <span className="w-8 text-right font-mono text-xs text-neutral-300">{aVal}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#111]">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${(aVal / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-600">vs</span>
                    <div className="flex flex-1 items-center gap-1">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#111]">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${(bVal / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 font-mono text-xs text-neutral-300">{bVal}</span>
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 flex items-center justify-center gap-6 text-[10px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  {compareA.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  {compareB.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function BalanceCalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dps");

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/tools"
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-amber-400"
          >
            <ArrowLeft size={16} />
            Back to Tools
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Balance Calculator
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Tune stats, economy, and scaling curves for your game.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "dps" && <DPSCalculator />}
        {activeTab === "scaling" && <ScalingCurves />}
        {activeTab === "ttk" && <TTKCalculator />}
        {activeTab === "economy" && <EconomyBalance />}
        {activeTab === "economy-designer" && <EconomyDesigner />}
        {activeTab === "difficulty" && <DifficultyAnalyzer />}
        {activeTab === "loot" && <LootTableDesigner />}
        {activeTab === "items" && <ItemDesigner />}
      </div>
    </div>
  );
}
