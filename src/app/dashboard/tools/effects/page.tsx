"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Download,
  Combine,
  Heart,
  Star,
  Crosshair,
  Code,
  Camera,
  Copy,
  Check,
  Sword,
  Zap,
  Shield,
  Sparkles,
  Loader2,
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

const EFFECT_NAME_MAP: Record<string, keyof AllEffects> = {
  screenShake: "shake",
  shake: "shake",
  flash: "flash",
  fade: "fade",
  chromaticAberration: "chromatic",
  chromatic: "chromatic",
  vignette: "vignette",
  crt: "crt",
};

interface RecordFrame {
  label: string;
  transform: string;
  overlayColor: string;
  overlayOpacity: number;
  filter: string;
  vignetteStyle: string;
}

function generateCSSCode(effects: AllEffects): string {
  const lines: string[] = ["/* Game Screen Effects - Generated CSS */", ""];

  if (effects.shake.enabled) {
    const { intensity, duration } = effects.shake;
    lines.push("/* Screen Shake */");
    lines.push("@keyframes screenShake {");
    lines.push("  0%, 100% { transform: translate(0, 0); }");
    lines.push(`  10% { transform: translate(${-intensity}px, ${Math.round(intensity * 0.6)}px); }`);
    lines.push(`  20% { transform: translate(${intensity}px, ${Math.round(-intensity * 0.4)}px); }`);
    lines.push(`  30% { transform: translate(${Math.round(-intensity * 0.8)}px, ${intensity}px); }`);
    lines.push(`  40% { transform: translate(${Math.round(intensity * 0.6)}px, ${Math.round(-intensity * 0.8)}px); }`);
    lines.push(`  50% { transform: translate(${Math.round(-intensity * 0.4)}px, ${Math.round(intensity * 0.6)}px); }`);
    lines.push(`  60% { transform: translate(${Math.round(intensity * 0.3)}px, ${Math.round(-intensity * 0.3)}px); }`);
    lines.push(`  70% { transform: translate(${Math.round(-intensity * 0.2)}px, ${Math.round(intensity * 0.2)}px); }`);
    lines.push(`  80% { transform: translate(${Math.round(intensity * 0.1)}px, ${Math.round(-intensity * 0.1)}px); }`);
    lines.push("}");
    lines.push(`.shake-effect { animation: screenShake ${duration}ms ease-in-out; }`);
    lines.push("");
  }

  if (effects.flash.enabled) {
    const { color, duration } = effects.flash;
    lines.push("/* Screen Flash */");
    lines.push("@keyframes screenFlash {");
    lines.push(`  0% { background: ${color}; opacity: 1; }`);
    lines.push("  100% { opacity: 0; }");
    lines.push("}");
    lines.push(`.flash-overlay { position: absolute; inset: 0; pointer-events: none; animation: screenFlash ${duration}ms ease-out forwards; }`);
    lines.push("");
  }

  if (effects.fade.enabled) {
    const { direction, duration, color } = effects.fade;
    const fadeIn = direction === "in";
    lines.push(`/* Screen Fade ${direction} */`);
    lines.push("@keyframes screenFade {");
    lines.push(`  0% { opacity: ${fadeIn ? 1 : 0}; }`);
    lines.push(`  100% { opacity: ${fadeIn ? 0 : 1}; }`);
    lines.push("}");
    lines.push(`.fade-overlay { position: absolute; inset: 0; background: ${color}; pointer-events: none; animation: screenFade ${duration}ms ease forwards; }`);
    lines.push("");
  }

  if (effects.chromatic.enabled) {
    const { intensity } = effects.chromatic;
    lines.push("/* Chromatic Aberration */");
    lines.push(`.chromatic-effect {`);
    lines.push(`  filter: drop-shadow(${intensity}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${intensity}px 0 0 rgba(0,0,255,0.5));`);
    lines.push("}");
    lines.push("");
  }

  if (effects.vignette.enabled) {
    const { intensity, color } = effects.vignette;
    const spread = 100 - intensity;
    lines.push("/* Vignette */");
    lines.push(`.vignette-overlay {`);
    lines.push("  position: absolute; inset: 0; pointer-events: none;");
    lines.push(`  background: radial-gradient(ellipse at center, transparent ${spread}%, ${color} 100%);`);
    lines.push("}");
    lines.push("");
  }

  if (effects.crt.enabled) {
    const { intensity } = effects.crt;
    const opacity = (intensity / 100 * 0.4).toFixed(2);
    lines.push("/* CRT Scanlines */");
    lines.push(".crt-overlay {");
    lines.push("  position: absolute; inset: 0; pointer-events: none;");
    lines.push(`  background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${opacity}) 2px, rgba(0,0,0,${opacity}) 4px);`);
    lines.push("  mix-blend-mode: multiply;");
    lines.push("}");
    lines.push("");
  }

  const enabledCount = Object.values(effects).filter((e) => e.enabled).length;
  if (enabledCount === 0) {
    return "/* No effects enabled. Toggle effects on the right panel, then export. */";
  }

  return lines.join("\n");
}

function captureRecordFrames(effects: AllEffects): RecordFrame[] {
  const timePoints = [
    { t: 0, label: "t=0%" },
    { t: 0.33, label: "t=33%" },
    { t: 0.66, label: "t=66%" },
    { t: 1, label: "t=100%" },
  ];

  return timePoints.map(({ t, label }) => {
    const frame: RecordFrame = {
      label,
      transform: "translate(0,0)",
      overlayColor: "transparent",
      overlayOpacity: 0,
      filter: "none",
      vignetteStyle: "none",
    };

    if (effects.shake.enabled) {
      const { intensity } = effects.shake;
      const decay = 1 - t;
      const x = Math.sin(t * Math.PI * 8) * intensity * decay;
      const y = Math.cos(t * Math.PI * 6) * intensity * decay;
      frame.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }

    if (effects.flash.enabled) {
      frame.overlayColor = effects.flash.color;
      frame.overlayOpacity = Math.max(0, 1 - t);
    }

    if (effects.fade.enabled) {
      const fadeIn = effects.fade.direction === "in";
      frame.overlayColor = effects.fade.color;
      frame.overlayOpacity = fadeIn ? Math.max(0, 1 - t) : t;
    }

    if (effects.chromatic.enabled) {
      const { intensity } = effects.chromatic;
      const i = intensity * (1 - t * 0.7);
      frame.filter = `drop-shadow(${i.toFixed(1)}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${i.toFixed(1)}px 0 0 rgba(0,0,255,0.5))`;
    }

    if (effects.vignette.enabled) {
      const { intensity, color } = effects.vignette;
      const spread = 100 - intensity;
      frame.vignetteStyle = `radial-gradient(ellipse at center, transparent ${spread}%, ${color} 100%)`;
    }

    return frame;
  });
}

export default function EffectsPage() {
  const [effects, setEffects] = useState<AllEffects>({ ...DEFAULT_EFFECTS });
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [showCSS, setShowCSS] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [recordFrames, setRecordFrames] = useState<RecordFrame[]>([]);
  const [copiedCSS, setCopiedCSS] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCombo, setAiCombo] = useState<{
    effects: string[];
    intensity: string;
    reason: string;
  } | null>(null);
  const pendingAiPreview = useRef<string[]>([]);
  const [aiTimingLoading, setAiTimingLoading] = useState(false);
  const [aiTimingResult, setAiTimingResult] = useState("");
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

  function handleExportCSS() {
    setShowCSS(!showCSS);
    setShowRecord(false);
  }

  function handleRecord() {
    const frames = captureRecordFrames(effects);
    setRecordFrames(frames);
    setShowRecord(!showRecord);
    setShowCSS(false);
  }

  function copyCSS() {
    const css = generateCSSCode(effects);
    navigator.clipboard.writeText(css);
    setCopiedCSS(true);
    setTimeout(() => setCopiedCSS(false), 1500);
  }

  useEffect(() => {
    if (pendingAiPreview.current.length > 0) {
      const names = [...pendingAiPreview.current];
      pendingAiPreview.current = [];
      names.forEach((n, i) => setTimeout(() => triggerEffect(n), i * 100));
    }
  });

  async function handleAiCombo() {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiCombo(null);
    try {
      const prompt = `For the game moment '${aiQuery.trim()}', suggest a combination of screen effects. Available: screenShake, flash, fade, chromaticAberration, vignette, crt. Respond with a JSON object: {"effects": ["effect1", "effect2"], "intensity": "low"|"medium"|"high", "reason": "brief explanation"}.`;
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
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const suggestedEffects: string[] = parsed.effects || [];
        const intensity: string = parsed.intensity || "medium";
        const reason: string = parsed.reason || "";
        setAiCombo({ effects: suggestedEffects, intensity, reason });

        const intensityMap: Record<string, number> = { low: 0.5, medium: 1, high: 1.8 };
        const multiplier = intensityMap[intensity] || 1;

        const mappedNames: string[] = [];
        for (const effect of suggestedEffects) {
          const mapped = EFFECT_NAME_MAP[effect];
          if (mapped) mappedNames.push(mapped);
        }

        setEffects((prev) => {
          const next: AllEffects = {
            shake: { ...prev.shake, enabled: false },
            flash: { ...prev.flash, enabled: false },
            fade: { ...prev.fade, enabled: false },
            chromatic: { ...prev.chromatic, enabled: false },
            vignette: { ...prev.vignette, enabled: false },
            crt: { ...prev.crt, enabled: false },
          };
          for (const name of mappedNames) {
            const key = name as keyof AllEffects;
            (next[key] as EffectConfig).enabled = true;
            const def = DEFAULT_EFFECTS[key];
            if (typeof def.intensity === "number") {
              (next[key] as EffectConfig).intensity = Math.round(def.intensity * multiplier);
            }
          }
          return next;
        });

        pendingAiPreview.current = [...mappedNames];
      } else {
        setAiCombo({
          effects: [],
          intensity: "medium",
          reason: content || "Could not parse recommendation.",
        });
      }
    } catch {
      setAiCombo({
        effects: [],
        intensity: "medium",
        reason: "Failed to get recommendation. Check your API key.",
      });
    } finally {
      setAiLoading(false);
    }
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

      {/* AI Effect Combo */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-semibold text-[#F5F5F5]">AI Effect Combo</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiCombo()}
            placeholder='e.g. "boss defeated", "player takes critical damage", "level complete"'
            className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
          />
          <button
            onClick={handleAiCombo}
            disabled={aiLoading || !aiQuery.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Combo
          </button>
        </div>
        {aiCombo && aiCombo.effects.length > 0 && (
          <div className="mt-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {aiCombo.effects.map((e) => (
                <span
                  key={e}
                  className="rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-xs font-medium text-[#F59E0B]"
                >
                  {e}
                </span>
              ))}
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  aiCombo.intensity === "high"
                    ? "bg-[#EF4444]/15 text-[#EF4444]"
                    : aiCombo.intensity === "low"
                      ? "bg-[#10B981]/15 text-[#10B981]"
                      : "bg-[#3B82F6]/15 text-[#3B82F6]"
                }`}
              >
                {aiCombo.intensity}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">{aiCombo.reason}</p>
          </div>
        )}
        {aiCombo && aiCombo.effects.length === 0 && (
          <div className="mt-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-3">
            <p className="text-xs text-[#EF4444]">{aiCombo.reason}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#0a0a0a]">
            <div
              ref={screenRef}
              className="relative w-full aspect-[16/10] p-6"
              style={{
                background: "linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 50%, #1a1a2a 100%)",
              }}
            >
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

              <div ref={overlayRef} />

              {/* HUD */}
              <div className="relative z-10 flex items-start justify-between text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    <div className="h-2.5 w-28 rounded-full bg-[#333] overflow-hidden">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-red-600 to-red-400" />
                    </div>
                    <span className="text-red-300 font-mono text-[10px]">72/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <div className="h-2.5 w-28 rounded-full bg-[#333] overflow-hidden">
                      <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-blue-600 to-blue-400" />
                    </div>
                    <span className="text-blue-300 font-mono text-[10px]">45/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B]" />
                  <span className="font-mono font-bold">12,450</span>
                </div>
              </div>

              {/* Player character */}
              <div className="absolute bottom-16 left-[35%] -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="h-10 w-7 rounded-t-lg bg-[#4CAF50]" />
                  <div className="h-3 w-7 bg-[#3E8E41] rounded-b" />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#FFCC80]" />
                  <div className="absolute -top-1 left-[6px] h-1 w-1 rounded-full bg-[#333]" />
                  <div className="absolute -top-1 right-[6px] h-1 w-1 rounded-full bg-[#333]" />
                  <Sword className="absolute top-1 -right-4 h-5 w-5 text-[#9CA3AF] rotate-45" />
                  <Crosshair className="absolute -top-6 left-1/2 -translate-x-1/2 h-3 w-3 text-[#F59E0B] opacity-60" />
                </div>
              </div>

              {/* Projectile */}
              <div className="absolute bottom-20 left-[52%] z-10">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
                  <div className="h-2 w-6 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]/0" />
                </div>
              </div>

              {/* Enemy */}
              <div className="absolute bottom-16 right-[20%] z-10">
                <div className="relative">
                  <div className="h-10 w-8 rounded-t-lg bg-[#c62828]" />
                  <div className="h-3 w-8 bg-[#b71c1c] rounded-b" />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#8d6e63]" />
                  <div className="absolute -top-1 left-[7px] h-1.5 w-1.5 rounded-full bg-[#ff5252]" />
                  <div className="absolute -top-1 right-[7px] h-1.5 w-1.5 rounded-full bg-[#ff5252]" />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    <div className="h-1 w-8 rounded-full bg-[#333] overflow-hidden">
                      <div className="h-full w-[60%] rounded-full bg-red-500" />
                    </div>
                  </div>
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
                <div className="relative h-full w-full rounded-sm bg-[#1a2a1a]">
                  <div className="absolute bottom-3 left-4 h-1 w-1 rounded-full bg-[#4CAF50]" />
                  <div className="absolute bottom-3 right-2 h-1 w-1 rounded-full bg-red-500" />
                  <div className="absolute bottom-2 right-2 h-1 w-1 rounded-full bg-[#F59E0B]" />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2 flex-wrap">
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
            <button
              onClick={handleExportCSS}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                showCSS
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <Code className="h-4 w-4" /> Export CSS
            </button>
            <button
              onClick={handleRecord}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                showRecord
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <Camera className="h-4 w-4" /> Record
            </button>
          </div>

          {/* CSS Output Panel */}
          {showCSS && (
            <div className="mt-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#9CA3AF]">GENERATED CSS</p>
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
                >
                  {copiedCSS ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                  {copiedCSS ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-lg bg-[#0F0F0F] p-3 text-[11px] font-mono text-[#E5E5E5] leading-relaxed">
                {generateCSSCode(effects)}
              </pre>
            </div>
          )}

          {/* Record Panel */}
          {showRecord && recordFrames.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <p className="text-xs font-medium text-[#9CA3AF] mb-3">EFFECT TIMELINE</p>
              <div className="grid grid-cols-4 gap-2">
                {recordFrames.map((frame, i) => (
                  <div key={i} className="space-y-1">
                    <div
                      className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#2A2A2A]"
                      style={{ filter: frame.filter }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 50%, #1a1a2a 100%)",
                          transform: frame.transform,
                        }}
                      >
                        {/* Mini HUD */}
                        <div className="absolute top-1 left-1.5 flex items-center gap-1">
                          <div className="h-1 w-6 rounded-full bg-[#333] overflow-hidden">
                            <div className="h-full w-[72%] rounded-full bg-red-500" />
                          </div>
                        </div>

                        {/* Mini player */}
                        <div className="absolute bottom-3 left-[30%]">
                          <div className="h-3 w-2 rounded-t bg-[#4CAF50]" />
                          <div className="h-1 w-2 bg-[#3E8E41]" />
                        </div>

                        {/* Mini projectile */}
                        <div className="absolute bottom-4 left-[50%]">
                          <div className="h-0.5 w-2 rounded-full bg-[#F59E0B]" />
                        </div>

                        {/* Mini enemy */}
                        <div className="absolute bottom-3 right-[20%]">
                          <div className="h-3 w-2 rounded-t bg-[#c62828]" />
                          <div className="h-1 w-2 bg-[#b71c1c]" />
                        </div>

                        {/* Ground */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#2E7D32]" />
                      </div>

                      {/* Effect overlay */}
                      {frame.overlayOpacity > 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: frame.overlayColor,
                            opacity: frame.overlayOpacity,
                          }}
                        />
                      )}

                      {/* Vignette */}
                      {frame.vignetteStyle !== "none" && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: frame.vignetteStyle }}
                        />
                      )}
                    </div>
                    <p className="text-center text-[10px] font-mono text-[#6B7280]">{frame.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Effects Panel */}
        <div className="w-72 shrink-0 space-y-2">
          {/* AI Effect Timing */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">AI Timing</span>
              <button
                onClick={async () => {
                  if (aiTimingLoading) return;
                  setAiTimingLoading(true); setAiTimingResult("");
                  const enabledEffects = Object.entries(effects).filter(([,v]) => v.enabled).map(([k]) => k);
                  const effectName = enabledEffects[0] || "shake";
                  try {
                    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                      method: "POST",
                      headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                      body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest ideal timing for a ${effectName} screen effect in a ${aiQuery.trim() || "action"} game. Duration in ms. Just the number and a brief reason.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
                    });
                    const data = await response.json();
                    setAiTimingResult(data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "");
                  } catch {} finally { setAiTimingLoading(false); }
                }}
                disabled={aiTimingLoading}
                className="flex items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[10px] font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-50"
              >
                {aiTimingLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                Suggest
              </button>
            </div>
            {aiTimingResult && <p className="text-[11px] leading-relaxed text-[#D1D5DB]">{aiTimingResult}</p>}
          </div>
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
