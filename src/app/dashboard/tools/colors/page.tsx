"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Copy,
  Check,
  RefreshCw,
  Download,
  Trash2,
  Bookmark,
  Code,
  Palette,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface PaletteColor {
  hex: string;
  locked: boolean;
}

interface SavedPalette {
  id: string;
  colors: string[];
  name: string;
  timestamp: number;
}

type HarmonyMode = "random" | "analogous" | "complementary" | "triadic" | "monochromatic";
type ExportFormat = "css" | "json" | "png";

const HARMONY_MODES: { id: HarmonyMode; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "analogous", label: "Analogous" },
  { id: "complementary", label: "Complementary" },
  { id: "triadic", label: "Triadic" },
  { id: "monochromatic", label: "Monochromatic" },
];

const GAME_PRESETS: { name: string; colors: string[] }[] = [
  { name: "NES", colors: ["#FCE4A8", "#F08030", "#E82010", "#7890F8", "#0058F8"] },
  { name: "SNES", colors: ["#F8D878", "#A83800", "#503000", "#0078F8", "#005800"] },
  { name: "Game Boy", colors: ["#9BBC0F", "#8BAC0F", "#306230", "#0F380F", "#E0F8CF"] },
  { name: "Arcade", colors: ["#FF0055", "#FFDD00", "#00DDFF", "#FF6600", "#AA00FF"] },
  { name: "Pixel Art", colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#2C3E50", "#95E1D3"] },
  { name: "Fantasy RPG", colors: ["#8B4513", "#DAA520", "#2E8B57", "#4B0082", "#DC143C"] },
  { name: "Sci-Fi", colors: ["#00F0FF", "#FF00E5", "#0D0D2B", "#1A1A4E", "#4D4DFF"] },
  { name: "Horror", colors: ["#1A0A0A", "#4A0E0E", "#8B0000", "#2D1B1B", "#C0392B"] },
  { name: "Cyberpunk", colors: ["#FF003C", "#00FFF0", "#120458", "#7B2FBE", "#FF6EC7"] },
  { name: "Forest", colors: ["#1B4332", "#2D6A4F", "#52B788", "#95D5B2", "#D8F3DC"] },
  { name: "Ocean", colors: ["#03045E", "#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8"] },
  { name: "Retro", colors: ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F", "#F4F1DE"] },
  { name: "Neon", colors: ["#FF00FF", "#39FF14", "#FF3503", "#00DFFF", "#FFFF00"] },
  { name: "Pastel", colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF"] },
  { name: "Autumn", colors: ["#9B2226", "#BB3E03", "#CA6702", "#EE9B00", "#E9D8A6"] },
  { name: "Sunset", colors: ["#220033", "#8B1E3F", "#DB4C40", "#E9724D", "#FFC857"] },
  { name: "Arctic", colors: ["#CAE9FF", "#62B6CB", "#1B4965", "#5FA8D3", "#BEE9E8"] },
  { name: "Volcanic", colors: ["#1A1110", "#4A1A2E", "#B22222", "#FF4500", "#FF8C00"] },
];

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generateHarmony(mode: HarmonyMode, locked: PaletteColor[]): string[] {
  const baseH = Math.random() * 360;
  const baseS = 55 + Math.random() * 35;
  const baseL = 40 + Math.random() * 25;

  const gen = (count: number, fn: (i: number) => string): string[] => {
    const result: string[] = [];
    let genIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (locked[i]?.locked) {
        result.push(locked[i].hex);
      } else {
        result.push(fn(genIdx));
        genIdx++;
      }
    }
    return result;
  };

  switch (mode) {
    case "analogous":
      return gen(5, (i) => hslToHex(baseH + (i - 2) * 30, baseS + (i - 2) * 5, baseL + (i - 2) * 8));
    case "complementary":
      return gen(5, (i) => {
        const hues = [baseH, baseH, baseH + 180, baseH + 180, baseH + 30];
        const ls = [baseL - 10, baseL, baseL, baseL + 10, baseL + 20];
        return hslToHex(hues[i] ?? baseH, baseS, ls[i] ?? baseL);
      });
    case "triadic":
      return gen(5, (i) => {
        const hues = [baseH, baseH, baseH + 120, baseH + 120, baseH + 240];
        const ls = [baseL - 8, baseL + 8, baseL, baseL + 12, baseL];
        return hslToHex(hues[i] ?? baseH, baseS, ls[i] ?? baseL);
      });
    case "monochromatic":
      return gen(5, (i) => hslToHex(baseH, baseS - i * 8, 25 + i * 14));
    default:
      return gen(5, () => hslToHex(Math.random() * 360, 50 + Math.random() * 40, 35 + Math.random() * 35));
  }
}

const STORAGE_KEY = "gameforge_saved_palettes";

export default function ColorsPage() {
  const [colors, setColors] = useState<PaletteColor[]>(() =>
    generateHarmony("random", []).map((hex) => ({ hex, locked: false }))
  );
  const [mode, setMode] = useState<HarmonyMode>("random");
  const [saved, setSaved] = useState<SavedPalette[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [paletteName, setPaletteName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [colorStory, setColorStory] = useState("");
  const [colorStoryLoading, setColorStoryLoading] = useState(false);
  const [aiHarmonyScore, setAiHarmonyScore] = useState("");
  const [aiHarmonyLoading, setAiHarmonyLoading] = useState(false);
  const [aiAccessibility, setAiAccessibility] = useState("");
  const [aiAccessibilityLoading, setAiAccessibilityLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setSaved(JSON.parse(data));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const regenerate = useCallback(() => {
    const newHexes = generateHarmony(mode, colors);
    setColors(newHexes.map((hex, i) => ({
      hex: colors[i]?.locked ? colors[i].hex : hex,
      locked: colors[i]?.locked ?? false,
    })));
  }, [mode, colors]);

  const toggleLock = (idx: number) => {
    setColors((prev) => prev.map((c, i) => (i === idx ? { ...c, locked: !c.locked } : c)));
  };

  const copyHex = (hex: string, idx: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(idx);
    showToast(`Copied ${hex}`);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const applyPreset = (preset: { name: string; colors: string[] }) => {
    setColors(preset.colors.map((hex) => ({ hex, locked: false })));
  };

  const savePalette = () => {
    const name = paletteName.trim() || `Palette ${saved.length + 1}`;
    setSaved((prev) => [
      ...prev,
      { id: crypto.randomUUID(), colors: colors.map((c) => c.hex), name, timestamp: Date.now() },
    ]);
    setPaletteName("");
  };

  const deleteSaved = (id: string) => {
    setSaved((prev) => prev.filter((p) => p.id !== id));
  };

  const loadPalette = (palette: SavedPalette) => {
    setColors(palette.colors.map((hex) => ({ hex, locked: false })));
  };

  const copyAsCSS = () => {
    const hexes = colors.map((c) => c.hex);
    const css = `:root {\n${hexes.map((h, i) => `  --palette-${i + 1}: ${h};`).join("\n")}\n}`;
    navigator.clipboard.writeText(css);
    showToast("CSS variables copied!");
  };

  const copyAsTailwind = () => {
    const hexes = colors.map((c) => c.hex);
    const shades = [100, 200, 300, 400, 500];
    const config = `// tailwind.config.ts\ncolors: {\n  palette: {\n${hexes.map((h, i) => `    '${shades[i]}': '${h}',`).join("\n")}\n  },\n}`;
    navigator.clipboard.writeText(config);
    showToast("Tailwind config copied!");
  };

  const generateAiPalette = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
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
            content: `Suggest a 5-color palette for a game with theme: ${aiPrompt.trim()}. Return exactly 5 hex color codes, one per line, no other text.`
          }],
          stream: false,
          max_tokens: 512,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || '';
      const hexCodes = content.match(/#[0-9A-Fa-f]{6}/g);
      if (hexCodes && hexCodes.length >= 5) {
        setColors(hexCodes.slice(0, 5).map((hex: string) => ({ hex: hex.toUpperCase(), locked: false })));
        showToast("AI palette generated!");
      } else {
        regenerate();
        showToast("AI returned unexpected format — random palette used");
      }
    } catch {
      regenerate();
      showToast("AI unavailable — random palette generated");
    } finally {
      setAiLoading(false);
    }
  };

  const generateColorStory = async () => {
    if (colorStoryLoading) return;
    setColorStoryLoading(true);
    setColorStory("");
    try {
      const hexList = colors.map((c) => c.hex).join(", ");
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
            content: `Explain the emotional story and game design rationale for this color palette: ${hexList}. What mood does it create? What genre does it suit? What elements should use each color (backgrounds, characters, UI, accents)? Be brief and practical.`,
          }],
          stream: false,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setColorStory(content || "No analysis available.");
    } catch {
      setColorStory("Failed to generate color story. Try again.");
    } finally {
      setColorStoryLoading(false);
    }
  };

  const aiCheckHarmony = async () => {
    if (aiHarmonyLoading) return;
    setAiHarmonyLoading(true);
    setAiHarmonyScore("");
    try {
      const hexList = colors.map((c) => c.hex).join(", ");
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
            content: `Rate this color palette's harmony: ${hexList}. Score 1-10 and explain in 1 sentence. Just the score and reason.`,
          }],
          stream: false,
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiHarmonyScore(content || "No response. Try again.");
    } catch {
      setAiHarmonyScore("Failed to check harmony. Try again.");
    } finally {
      setAiHarmonyLoading(false);
    }
  };

  const aiCheckAccessibility = async () => {
    if (aiAccessibilityLoading) return;
    setAiAccessibilityLoading(true);
    setAiAccessibility("");
    try {
      const hexList = colors.map((c) => c.hex).join(", ");
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
            content: `Check this game color palette for colorblind accessibility: ${hexList}. Would someone with protanopia, deuteranopia, or tritanopia have difficulty? Suggest which colors to adjust. 2 sentences max.`,
          }],
          stream: false,
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiAccessibility(content || "No response. Try again.");
    } catch {
      setAiAccessibility("Failed to check accessibility. Try again.");
    } finally {
      setAiAccessibilityLoading(false);
    }
  };

  const exportPalette = (format: ExportFormat) => {
    const hexes = colors.map((c) => c.hex);

    if (format === "css") {
      const css = `:root {\n${hexes.map((h, i) => `  --color-${i + 1}: ${h};`).join("\n")}\n}`;
      downloadText(css, "palette.css", "text/css");
    } else if (format === "json") {
      downloadText(JSON.stringify(hexes, null, 2), "palette.json", "application/json");
    } else if (format === "png") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      canvas.width = 500;
      canvas.height = 100;
      hexes.forEach((hex, i) => {
        ctx.fillStyle = hex;
        ctx.fillRect(i * 100, 0, 100, 100);
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "palette.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-slide-up">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes toastOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Color Palette Generator</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            Generate harmonious palettes for your game&apos;s art direction
          </p>
        </div>
      </div>

      {/* Main palette display */}
      <div className="overflow-hidden rounded-xl border border-[#2A2A2A]">
        <div className="grid grid-cols-5">
          {colors.map((color, i) => {
            const [h, s, l] = hexToHSL(color.hex);
            const [r, g, b] = hexToRGB(color.hex);
            const textColor = relativeLuminance(color.hex) > 0.4 ? "#0F0F0F" : "#F5F5F5";
            const whiteContrast = contrastRatio(color.hex, "#FFFFFF").toFixed(1);
            const blackContrast = contrastRatio(color.hex, "#000000").toFixed(1);

            return (
              <div
                key={i}
                className="group relative flex flex-col items-center justify-end pb-4 pt-20 transition-all hover:pt-14"
                style={{ backgroundColor: color.hex }}
              >
                <button
                  onClick={() => toggleLock(i)}
                  className="absolute right-2 top-2 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: textColor, backgroundColor: `${textColor}15` }}
                >
                  {color.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>

                {color.locked && (
                  <Lock
                    className="absolute left-2 top-2 h-3 w-3"
                    style={{ color: textColor, opacity: 0.5 }}
                  />
                )}

                <button
                  onClick={() => copyHex(color.hex, i)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold tracking-wide transition-all hover:scale-105"
                  style={{ color: textColor }}
                >
                  {copiedIdx === i ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /> {color.hex}</>
                  )}
                </button>

                {/* Hover tooltip with all color values */}
                <div
                  className="mt-1 rounded-md px-2 py-1.5 text-center text-[10px] font-medium opacity-0 transition-all group-hover:opacity-100"
                  style={{ color: textColor, backgroundColor: `${textColor}10` }}
                >
                  <div className="font-mono">RGB({r}, {g}, {b})</div>
                  <div className="font-mono">HSL({h}, {s}%, {l}%)</div>
                  <div className="mt-1 flex justify-center gap-2 text-[9px]">
                    <span title="Contrast with white">W:{whiteContrast}</span>
                    <span title="Contrast with black">B:{blackContrast}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-1">
          {HARMONY_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                mode === m.id
                  ? "bg-[#F59E0B] text-[#0F0F0F]"
                  : "text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={regenerate}
          className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97]"
        >
          <RefreshCw className="h-4 w-4" /> Generate
        </button>

        <button
          onClick={() => setColors(colors.map((c) => ({ ...c, locked: false })))}
          className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          Unlock All
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* Preset game palettes */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Game Presets
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {GAME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group flex flex-col gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 transition-all hover:border-[#F59E0B]/40"
                >
                  <div className="flex gap-0.5 overflow-hidden rounded">
                    {preset.colors.map((c, i) => (
                      <div key={i} className="h-5 flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[#9CA3AF] transition-colors group-hover:text-[#F5F5F5]">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Suggest */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              AI Suggest
            </h2>
            <p className="mb-3 text-xs text-[#6B7280]">
              Describe a mood, environment, or genre and let AI generate a palette.
            </p>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateAiPalette()}
                placeholder="e.g. underwater cave, haunted forest, cyberpunk city..."
                className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/50"
                disabled={aiLoading}
              />
              <button
                onClick={generateAiPalette}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97] disabled:opacity-50 disabled:hover:bg-[#F59E0B]"
              >
                {aiLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate</>
                )}
              </button>
            </div>
          </div>

          {/* AI Color Story */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              AI Color Story
            </h2>
            <p className="mb-3 text-xs text-[#6B7280]">
              Get an AI analysis of your palette&apos;s mood, genre fit, and how to use each color in your game.
            </p>
            <button
              onClick={generateColorStory}
              disabled={colorStoryLoading}
              className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97] disabled:opacity-50 disabled:hover:bg-[#F59E0B]"
            >
              {colorStoryLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> {colorStory ? "Re-analyze" : "Analyze Palette"}</>
              )}
            </button>
            {colorStoryLoading && !colorStory && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
                <span className="text-sm text-[#9CA3AF]">Reading the emotional story of your palette...</span>
              </div>
            )}
            {colorStory && !colorStoryLoading && (
              <div className="mt-4 space-y-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                <div className="flex gap-2">
                  {colors.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-6 w-6 rounded-md" style={{ backgroundColor: c.hex }} />
                      <span className="text-[9px] font-mono text-[#6B7280]">{c.hex}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[#F59E0B]/10" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">{colorStory}</p>
              </div>
            )}
          </div>

          {/* AI Harmony Check */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              AI Harmony Check
            </h2>
            <p className="mb-3 text-xs text-[#6B7280]">
              Get an instant harmony score for your current palette.
            </p>
            <button
              onClick={aiCheckHarmony}
              disabled={aiHarmonyLoading}
              className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2.5 text-sm font-bold text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 active:scale-[0.97] disabled:opacity-50"
            >
              {aiHarmonyLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> AI Harmony</>
              )}
            </button>
            {aiHarmonyScore && !aiHarmonyLoading && (
              <div className="mt-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiHarmonyScore}</p>
              </div>
            )}
            {aiHarmonyLoading && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                <span className="text-xs text-[#9CA3AF]">Evaluating harmony...</span>
              </div>
            )}
          </div>

          {/* AI Accessibility Check */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              AI Accessibility
            </h2>
            <p className="mb-3 text-xs text-[#6B7280]">
              Check if your palette is accessible for colorblind players.
            </p>
            <button
              onClick={aiCheckAccessibility}
              disabled={aiAccessibilityLoading}
              className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2.5 text-sm font-bold text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 active:scale-[0.97] disabled:opacity-50"
            >
              {aiAccessibilityLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Check Accessibility</>
              )}
            </button>
            {aiAccessibility && !aiAccessibilityLoading && (
              <div className="mt-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiAccessibility}</p>
              </div>
            )}
            {aiAccessibilityLoading && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                <span className="text-xs text-[#9CA3AF]">Checking colorblind accessibility...</span>
              </div>
            )}
          </div>

          {/* Copy to Clipboard */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Copy to Clipboard
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyAsCSS}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
              >
                <Code className="h-3.5 w-3.5 text-[#F59E0B]" />
                Copy as CSS
              </button>
              <button
                onClick={copyAsTailwind}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
              >
                <Palette className="h-3.5 w-3.5 text-[#F59E0B]" />
                Copy as Tailwind
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(colors.map((c) => c.hex).join(", "));
                  showToast("Hex values copied!");
                }}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
              >
                <Copy className="h-3.5 w-3.5 text-[#F59E0B]" />
                Copy Hex List
              </button>
            </div>
          </div>

          {/* Export / Download */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Download
            </h2>
            <div className="flex gap-2">
              {(["css", "json", "png"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => exportPalette(fmt)}
                  className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
                >
                  <Download className="h-3.5 w-3.5 text-[#F59E0B]" />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Contrast checker */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Contrast Checker
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6B7280]">
                    <th className="pb-2 text-left font-medium">Color</th>
                    <th className="pb-2 text-center font-medium">vs White</th>
                    <th className="pb-2 text-center font-medium">vs Black</th>
                    <th className="pb-2 text-center font-medium">AA Text</th>
                    <th className="pb-2 text-center font-medium">AA Large</th>
                    <th className="pb-2 text-center font-medium">AAA</th>
                  </tr>
                </thead>
                <tbody>
                  {colors.map((color, i) => {
                    const wc = contrastRatio(color.hex, "#FFFFFF");
                    const bc = contrastRatio(color.hex, "#000000");
                    return (
                      <tr key={i} className="border-t border-[#2A2A2A]">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyHex(color.hex, i)}
                              className="h-5 w-5 rounded transition-transform hover:scale-110"
                              style={{ backgroundColor: color.hex }}
                              title={`Click to copy ${color.hex}`}
                            />
                            <span className="font-mono text-[#F5F5F5]">{color.hex}</span>
                          </div>
                        </td>
                        <td className="py-2 text-center font-mono text-[#9CA3AF]">{wc.toFixed(1)}</td>
                        <td className="py-2 text-center font-mono text-[#9CA3AF]">{bc.toFixed(1)}</td>
                        <td className="py-2 text-center">
                          <ContrastBadge pass={Math.max(wc, bc) >= 4.5} />
                        </td>
                        <td className="py-2 text-center">
                          <ContrastBadge pass={Math.max(wc, bc) >= 3} />
                        </td>
                        <td className="py-2 text-center">
                          <ContrastBadge pass={Math.max(wc, bc) >= 7} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Saved palettes sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Save Current
            </h3>
            <div className="flex gap-2">
              <input
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="Palette name..."
                className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
              />
              <button
                onClick={savePalette}
                className="rounded-lg bg-[#F59E0B] px-3 py-2 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97]"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Saved Palettes
            </h3>
            {saved.length === 0 ? (
              <p className="text-xs text-[#4B5563]">No saved palettes yet</p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {saved.map((palette) => (
                  <div
                    key={palette.id}
                    className="group rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2.5 transition-all hover:border-[#F59E0B]/30"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <button
                        onClick={() => loadPalette(palette)}
                        className="text-xs font-medium text-[#F5F5F5] transition-colors hover:text-[#F59E0B]"
                      >
                        {palette.name}
                      </button>
                      <button
                        onClick={() => deleteSaved(palette.id)}
                        className="text-[#4B5563] opacity-0 transition-all hover:text-[#EF4444] group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => loadPalette(palette)}
                      className="flex w-full gap-0.5 overflow-hidden rounded"
                    >
                      {palette.colors.map((c, i) => (
                        <div key={i} className="h-6 flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-[#0F0F0F] shadow-lg shadow-[#F59E0B]/20"
          style={{ animation: "toastIn 0.2s ease both" }}
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ContrastBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
        pass ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
      }`}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
