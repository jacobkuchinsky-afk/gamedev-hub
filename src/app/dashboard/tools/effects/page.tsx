"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Download,
  Combine,
  Heart,
  Star,
  Crosshair,
} from "lucide-react";

interface EffectConfig {
  enabled: boolean;
  [key: string]: number | string | boolean;
}

interface AllEffects {
  shake: EffectConfig & { intensity: number; duration: number };
  flash: EffectConfig & { color: string; duration: number };
  fade: EffectConfig & { direction: string; duration: number; color: string };
  chromatic: EffectConfig & { intensity: number };
  vignette: EffectConfig & { intensity: number; color: string };
  crt: EffectConfig & { enabled: boolean; intensity: number };
}

const DEFAULT_EFFECTS: AllEffects = {
  shake: { enabled: false, intensity: 5, duration: 500 },
  flash: { enabled: false, color: "#ffffff", duration: 200 },
  fade: { enabled: false, direction: "out", duration: 1000, color: "#000000" },
  chromatic: { enabled: false, intensity: 3 },
  vignette: { enabled: false, intensity: 50, color: "#000000" },
  crt: { enabled: false, intensity: 50 },
};

export default function EffectsPage() {
  const [effects, setEffects] = useState<AllEffects>({ ...DEFAULT_EFFECTS });
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const screenRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const updateEffect = useCallback(
    <K extends keyof AllEffects>(name: K, updates: Partial<AllEffects[K]>) => {
      setEffects((prev) => ({ ...prev, [name]: { ...prev[name], ...updates } }));
    },
    []
  );

  function triggerEffect(name: string) {
    const screen = screenRef.current;
    const overlay = overlayRef.current;
    if (!screen || !overlay) return;

    setActiveEffects((prev) => new Set(prev).add(name));

    switch (name) {
      case "shake": {
        const { intensity, duration } = effects.shake;
        const start = performance.now();
        const animate = (now: number) => {
          const elapsed = now - start;
          if (elapsed > duration) {
            screen.style.transform = "translate(0,0)";
            setActiveEffects((prev) => {
              const next = new Set(prev);
              next.delete("shake");
              return next;
            });
            return;
          }
          const x = (Math.random() - 0.5) * intensity * 2;
          const y = (Math.random() - 0.5) * intensity * 2;
          screen.style.transform = `translate(${x}px, ${y}px)`;
          requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        break;
      }
      case "flash": {
        const { color, duration } = effects.flash;
        overlay.style.cssText = `
          position:absolute;inset:0;z-index:30;pointer-events:none;
          background:${color};opacity:1;
          transition:opacity ${duration}ms ease-out;
        `;
        requestAnimationFrame(() => {
          overlay.style.opacity = "0";
        });
        setTimeout(() => {
          overlay.style.cssText = "";
          setActiveEffects((prev) => {
            const next = new Set(prev);
            next.delete("flash");
            return next;
          });
        }, duration + 50);
        break;
      }
      case "fade": {
        const { direction, duration, color } = effects.fade;
        const fadeIn = direction === "in";
        overlay.style.cssText = `
          position:absolute;inset:0;z-index:30;pointer-events:none;
          background:${color};opacity:${fadeIn ? 1 : 0};
          transition:opacity ${duration}ms ease;
        `;
        requestAnimationFrame(() => {
          overlay.style.opacity = fadeIn ? "0" : "1";
        });
        setTimeout(() => {
          overlay.style.cssText = "";
          setActiveEffects((prev) => {
            const next = new Set(prev);
            next.delete("fade");
            return next;
          });
        }, duration + 100);
        break;
      }
      case "chromatic": {
        const { intensity } = effects.chromatic;
        screen.style.filter = `drop-shadow(${intensity}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${intensity}px 0 0 rgba(0,0,255,0.5))`;
        setTimeout(() => {
          screen.style.filter = "";
          setActiveEffects((prev) => {
            const next = new Set(prev);
            next.delete("chromatic");
            return next;
          });
        }, 1500);
        break;
      }
      case "vignette": {
        const { intensity, color } = effects.vignette;
        const spread = 100 - intensity;
        overlay.style.cssText = `
          position:absolute;inset:0;z-index:25;pointer-events:none;
          background:radial-gradient(ellipse at center, transparent ${spread}%, ${color} 100%);
          opacity:1;transition:opacity 1.5s ease;
        `;
        setTimeout(() => {
          overlay.style.opacity = "0";
          setTimeout(() => {
            overlay.style.cssText = "";
            setActiveEffects((prev) => {
              const next = new Set(prev);
              next.delete("vignette");
              return next;
            });
          }, 1500);
        }, 2000);
        break;
      }
      case "crt": {
        setActiveEffects((prev) => {
          const next = new Set(prev);
          if (next.has("crt")) {
            next.delete("crt");
          } else {
            next.add("crt");
          }
          return next;
        });
        break;
      }
    }
  }

  function triggerAll() {
    const names = Object.entries(effects)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k);
    if (names.length === 0) {
      const all = ["shake", "flash", "chromatic"];
      all.forEach((n, i) => setTimeout(() => triggerEffect(n), i * 100));
    } else {
      names.forEach((n, i) => setTimeout(() => triggerEffect(n), i * 80));
    }
  }

  function exportSettings() {
    const blob = new Blob([JSON.stringify(effects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "screen_effects.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const crtIntensity = effects.crt.intensity;
  const showCrt = activeEffects.has("crt");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Screen Effect Previewer</h1>
          <p className="text-xs text-[#9CA3AF]">
            Preview and tune game screen effects in real time
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Game Screen Preview */}
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#0a0a0a]">
            <div
              ref={screenRef}
              className="relative w-full aspect-[16/10] p-6"
              style={{
                background: "linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 50%, #1a1a2a 100%)",
              }}
            >
              {/* CRT scanlines overlay */}
              {showCrt && (
                <div
                  className="pointer-events-none absolute inset-0 z-20"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(0,0,0,${crtIntensity / 100 * 0.4}) 2px,
                      rgba(0,0,0,${crtIntensity / 100 * 0.4}) 4px
                    )`,
                    mixBlendMode: "multiply",
                  }}
                />
              )}

              {/* Flash / Fade / Vignette overlay target */}
              <div ref={overlayRef} />

              {/* Fake game HUD */}
              <div className="relative z-10 flex items-start justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                  <div className="h-2.5 w-28 rounded-full bg-[#333] overflow-hidden">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-red-600 to-red-400" />
                  </div>
                  <span className="text-red-300 font-mono text-[10px]">72/100</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B]" />
                  <span className="font-mono font-bold">12,450</span>
                </div>
              </div>

              {/* Mini character */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="h-10 w-7 rounded-t-lg bg-[#4CAF50]" />
                  <div className="h-3 w-7 bg-[#3E8E41] rounded-b" />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#FFCC80]" />
                  <div className="absolute -top-1 left-[6px] h-1 w-1 rounded-full bg-[#333]" />
                  <div className="absolute -top-1 right-[6px] h-1 w-1 rounded-full bg-[#333]" />
                  <Crosshair className="absolute -top-6 left-1/2 -translate-x-1/2 h-3 w-3 text-[#F59E0B] opacity-60" />
                </div>
              </div>

              {/* Ground tiles */}
              <div className="absolute bottom-0 left-0 right-0 z-0 flex">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 flex-1"
                    style={{
                      backgroundColor: i % 3 === 0 ? "#2E7D32" : i % 3 === 1 ? "#388E3C" : "#33691E",
                    }}
                  />
                ))}
              </div>
              <div className="absolute bottom-10 left-0 right-0 z-0 flex">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#4CAF50" : "#43A047",
                    }}
                  />
                ))}
              </div>

              {/* Mini-map */}
              <div className="absolute bottom-4 right-4 z-10 h-16 w-16 rounded border border-[#444] bg-[#111]/80 p-1">
                <div className="h-full w-full rounded-sm bg-[#1a2a1a]">
                  <div className="absolute bottom-2 right-2 h-1 w-1 rounded-full bg-[#F59E0B]" />
                </div>
              </div>
            </div>
          </div>

          {/* Combine & Export */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={triggerAll}
              className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-black hover:bg-[#D97706] transition-colors"
            >
              <Combine className="h-4 w-4" /> Combine Effects
            </button>
            <button
              onClick={exportSettings}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
            >
              <Download className="h-4 w-4" /> Export JSON
            </button>
          </div>
        </div>

        {/* Effects Panel */}
        <div className="w-72 shrink-0 space-y-2">
          {/* Screen Shake */}
          <EffectCard
            title="Screen Shake"
            active={activeEffects.has("shake")}
            enabled={effects.shake.enabled}
            onToggle={() => updateEffect("shake", { enabled: !effects.shake.enabled })}
            onPreview={() => triggerEffect("shake")}
          >
            <Slider
              label="Intensity"
              value={effects.shake.intensity}
              min={1}
              max={20}
              onChange={(v) => updateEffect("shake", { intensity: v })}
            />
            <Slider
              label="Duration (ms)"
              value={effects.shake.duration}
              min={50}
              max={2000}
              step={50}
              onChange={(v) => updateEffect("shake", { duration: v })}
            />
          </EffectCard>

          {/* Flash */}
          <EffectCard
            title="Flash"
            active={activeEffects.has("flash")}
            enabled={effects.flash.enabled}
            onToggle={() => updateEffect("flash", { enabled: !effects.flash.enabled })}
            onPreview={() => triggerEffect("flash")}
          >
            <ColorInput
              label="Color"
              value={effects.flash.color}
              onChange={(v) => updateEffect("flash", { color: v })}
            />
            <Slider
              label="Duration (ms)"
              value={effects.flash.duration}
              min={50}
              max={1000}
              step={50}
              onChange={(v) => updateEffect("flash", { duration: v })}
            />
          </EffectCard>

          {/* Fade */}
          <EffectCard
            title="Fade In/Out"
            active={activeEffects.has("fade")}
            enabled={effects.fade.enabled}
            onToggle={() => updateEffect("fade", { enabled: !effects.fade.enabled })}
            onPreview={() => triggerEffect("fade")}
          >
            <div className="flex gap-1 mb-2">
              {(["in", "out"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => updateEffect("fade", { direction: dir })}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    effects.fade.direction === dir
                      ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                      : "text-[#9CA3AF] bg-[#222] hover:bg-[#2A2A2A]"
                  }`}
                >
                  Fade {dir}
                </button>
              ))}
            </div>
            <ColorInput
              label="Color"
              value={effects.fade.color}
              onChange={(v) => updateEffect("fade", { color: v })}
            />
            <Slider
              label="Duration (ms)"
              value={effects.fade.duration}
              min={100}
              max={3000}
              step={100}
              onChange={(v) => updateEffect("fade", { duration: v })}
            />
          </EffectCard>

          {/* Chromatic Aberration */}
          <EffectCard
            title="Chromatic Aberration"
            active={activeEffects.has("chromatic")}
            enabled={effects.chromatic.enabled}
            onToggle={() => updateEffect("chromatic", { enabled: !effects.chromatic.enabled })}
            onPreview={() => triggerEffect("chromatic")}
          >
            <Slider
              label="Intensity"
              value={effects.chromatic.intensity}
              min={1}
              max={15}
              onChange={(v) => updateEffect("chromatic", { intensity: v })}
            />
          </EffectCard>

          {/* Vignette */}
          <EffectCard
            title="Vignette"
            active={activeEffects.has("vignette")}
            enabled={effects.vignette.enabled}
            onToggle={() => updateEffect("vignette", { enabled: !effects.vignette.enabled })}
            onPreview={() => triggerEffect("vignette")}
          >
            <Slider
              label="Intensity"
              value={effects.vignette.intensity}
              min={10}
              max={90}
              onChange={(v) => updateEffect("vignette", { intensity: v })}
            />
            <ColorInput
              label="Color"
              value={effects.vignette.color}
              onChange={(v) => updateEffect("vignette", { color: v })}
            />
          </EffectCard>

          {/* CRT / Scanlines */}
          <EffectCard
            title="CRT / Scanlines"
            active={activeEffects.has("crt")}
            enabled={effects.crt.enabled}
            onToggle={() => updateEffect("crt", { enabled: !effects.crt.enabled })}
            onPreview={() => triggerEffect("crt")}
          >
            <Slider
              label="Intensity"
              value={effects.crt.intensity}
              min={10}
              max={100}
              onChange={(v) => updateEffect("crt", { intensity: v })}
            />
          </EffectCard>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function EffectCard({
  title,
  active,
  enabled,
  onToggle,
  onPreview,
  children,
}: {
  title: string;
  active: boolean;
  enabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-[#1A1A1A] p-3 transition-colors ${
        active ? "border-[#F59E0B]/50" : "border-[#2A2A2A]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`h-4 w-4 rounded border transition-colors ${
              enabled
                ? "bg-[#F59E0B] border-[#F59E0B]"
                : "border-[#555] bg-transparent hover:border-[#888]"
            }`}
          />
          <span className="text-sm font-medium text-[#F5F5F5]">{title}</span>
        </div>
        <button
          onClick={onPreview}
          className="flex items-center gap-1 rounded-md bg-[#2A2A2A] px-2 py-1 text-[10px] font-medium text-[#F59E0B] hover:bg-[#333] transition-colors"
        >
          <Play className="h-2.5 w-2.5 fill-current" /> Preview
        </button>
      </div>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-[10px] text-[#666] mb-0.5">
        <span>{label}</span>
        <span className="font-mono text-[#9CA3AF]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-[#2A2A2A] cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F59E0B]
          [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(245,158,11,0.4)]
          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#F59E0B] [&::-moz-range-thumb]:border-none"
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[10px] text-[#666]">{label}</span>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-8 cursor-pointer rounded border border-[#2A2A2A] bg-transparent"
        />
      </div>
      <span className="text-[10px] font-mono text-[#9CA3AF]">{value}</span>
    </div>
  );
}
