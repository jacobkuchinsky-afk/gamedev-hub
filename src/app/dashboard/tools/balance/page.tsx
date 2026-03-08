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

type GrowthFormula = "linear" | "exponential" | "logarithmic" | "custom";

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

// ── Constants ──

const TABS = [
  { id: "dps", label: "DPS", icon: Swords },
  { id: "scaling", label: "Scaling", icon: TrendingUp },
  { id: "ttk", label: "TTK", icon: Crosshair },
  { id: "economy", label: "Economy", icon: Coins },
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
    return weapons.map((w) => {
      const baseDps = w.baseDamage * w.attackSpeed;
      const critRate = Math.min(w.critChance, 100) / 100;
      const effectiveDps =
        baseDps * (1 - critRate + critRate * w.critMultiplier);
      return { ...w, baseDps, effectiveDps, critRate };
    });
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
              className="flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="text-sm text-neutral-300">{r.name}</span>
              </div>
              <div className="flex gap-6">
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
                ["linear", "exponential", "logarithmic", "custom"] as const
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
          {config.formula === "custom" && (
            <NumInput
              label="Exponent"
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
      </div>
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
      </div>
    </div>
  );
}
