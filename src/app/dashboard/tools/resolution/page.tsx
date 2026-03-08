"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, Smartphone, Gamepad2, Globe, X, Star, Zap, Sparkles, Loader2 } from "lucide-react";

interface Resolution {
  label: string;
  w: number;
  h: number;
  tag: string;
  color: string;
}

const RESOLUTIONS: Resolution[] = [
  { label: "Tiny", w: 320, h: 180, tag: "320x180", color: "#6B7280" },
  { label: "Low", w: 640, h: 360, tag: "640x360", color: "#8B5CF6" },
  { label: "qHD", w: 960, h: 540, tag: "960x540", color: "#3B82F6" },
  { label: "720p", w: 1280, h: 720, tag: "1280x720", color: "#10B981" },
  { label: "1080p", w: 1920, h: 1080, tag: "1080p Full HD", color: "#F59E0B" },
  { label: "1440p", w: 2560, h: 1440, tag: "1440p QHD", color: "#EF4444" },
  { label: "4K", w: 3840, h: 2160, tag: "4K UHD", color: "#EC4899" },
];

const ASPECTS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "1:1", ratio: 1 },
];

interface PlatformRec {
  platform: string;
  icon: typeof Monitor;
  recommended: string;
  min: string;
  aspect: string;
  notes: string;
}

const PLATFORMS: PlatformRec[] = [
  {
    platform: "Desktop",
    icon: Monitor,
    recommended: "1920x1080",
    min: "1280x720",
    aspect: "16:9",
    notes: "Most common. Support 1440p/4K for high-end.",
  },
  {
    platform: "Mobile",
    icon: Smartphone,
    recommended: "1080x1920",
    min: "720x1280",
    aspect: "9:16",
    notes: "Portrait default. Consider notch safe areas.",
  },
  {
    platform: "Console",
    icon: Gamepad2,
    recommended: "1920x1080",
    min: "1920x1080",
    aspect: "16:9",
    notes: "Target 1080p min. Next-gen expects 4K support.",
  },
  {
    platform: "Web / Browser",
    icon: Globe,
    recommended: "960x540",
    min: "640x360",
    aspect: "16:9",
    notes: "Canvas scales to viewport. Keep base res low for perf.",
  },
];

interface PopularGame {
  name: string;
  res: string;
  w: number;
  h: number;
  genre: string;
  style: string;
}

const POPULAR_GAMES: PopularGame[] = [
  { name: "Celeste", res: "320x180", w: 320, h: 180, genre: "Platformer", style: "Pixel Art" },
  { name: "Stardew Valley", res: "416x256", w: 416, h: 256, genre: "Farming Sim", style: "Pixel Art" },
  { name: "Undertale", res: "640x480", w: 640, h: 480, genre: "RPG", style: "Pixel Art" },
  { name: "Hollow Knight", res: "1920x1080", w: 1920, h: 1080, genre: "Metroidvania", style: "Hand-Drawn" },
  { name: "Shovel Knight", res: "400x240", w: 400, h: 240, genre: "Platformer", style: "Retro" },
  { name: "Hyper Light Drifter", res: "480x270", w: 480, h: 270, genre: "Action RPG", style: "Pixel Art" },
  { name: "Dead Cells", res: "480x270", w: 480, h: 270, genre: "Roguelike", style: "Pixel Art" },
  { name: "Ori and the Blind Forest", res: "1920x1080", w: 1920, h: 1080, genre: "Platformer", style: "Painted" },
  { name: "Cuphead", res: "1920x1080", w: 1920, h: 1080, genre: "Run & Gun", style: "Hand-Drawn" },
  { name: "FTL", res: "1280x720", w: 1280, h: 720, genre: "Strategy", style: "Vector" },
];

interface DpiInfo {
  device: string;
  ppi: number;
  note: string;
}

const DPI_TABLE: DpiInfo[] = [
  { device: "Desktop Monitor (24\" 1080p)", ppi: 92, note: "Standard office/gaming setup" },
  { device: "Desktop Monitor (27\" 1440p)", ppi: 109, note: "Popular enthusiast display" },
  { device: "Desktop Monitor (27\" 4K)", ppi: 163, note: "Hi-DPI, consider 2x scaling" },
  { device: "Laptop (15\" 1080p)", ppi: 147, note: "Common dev laptop" },
  { device: "iPhone (6.1\" ~1170x2532)", ppi: 460, note: "@3x asset scale" },
  { device: "iPad (11\" ~1668x2388)", ppi: 264, note: "@2x asset scale" },
  { device: "Nintendo Switch (6.2\" 720p)", ppi: 237, note: "Handheld mode" },
  { device: "Steam Deck (7\" 1280x800)", ppi: 215, note: "Similar to Switch" },
];

const SPRITE_SIZES = [8, 16, 32, 64, 128];

type PlatformKey = "desktop" | "mobile" | "console" | "web";

export default function ResolutionGuidePage() {
  const [calcWidth, setCalcWidth] = useState(1920);
  const [activeRes, setActiveRes] = useState<Resolution | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | null>(null);

  const [aiGenre, setAiGenre] = useState("");
  const [aiArtStyle, setAiArtStyle] = useState("");
  const [aiPlatform, setAiPlatform] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiRecommend = useCallback(async () => {
    if (!aiGenre.trim() || !aiArtStyle.trim() || !aiPlatform.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const prompt = `For a ${aiGenre.trim()} game with ${aiArtStyle.trim()} art targeting ${aiPlatform.trim()}, recommend the best base resolution. Consider: art clarity, performance, and standard conventions. Respond with: resolution (WxH), aspect ratio, and a brief reason. One paragraph.`;
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
      setAiResult(content || "No recommendation returned. Try again.");
    } catch {
      setAiResult("Failed to get recommendation. Check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
  }, [aiGenre, aiArtStyle, aiPlatform]);

  const aspectResults = useMemo(
    () =>
      ASPECTS.map((a) => ({
        label: a.label,
        height: Math.round(calcWidth / a.ratio),
      })),
    [calcWidth]
  );

  const maxW = RESOLUTIONS[RESOLUTIONS.length - 1].w;

  const recommendations = useMemo(() => {
    if (!selectedPlatform) return null;
    const recs: Record<PlatformKey, { res: string; pixel: string; reason: string }[]> = {
      desktop: [
        { res: "1920x1080", pixel: "HD", reason: "95%+ of Steam users. Safe default." },
        { res: "2560x1440", pixel: "QHD", reason: "Growing segment of enthusiasts." },
        { res: "1280x720", pixel: "Min", reason: "Low-end fallback for potato PCs." },
      ],
      mobile: [
        { res: "1080x1920", pixel: "FHD", reason: "Covers 70%+ of iOS/Android devices." },
        { res: "1440x2560", pixel: "QHD", reason: "Flagship phones. Consider optional." },
        { res: "720x1280", pixel: "HD", reason: "Budget phones. Keep as min target." },
      ],
      console: [
        { res: "1920x1080", pixel: "FHD", reason: "Required for PS4/Xbox One era." },
        { res: "3840x2160", pixel: "4K", reason: "PS5/Series X target. Use dynamic scaling." },
        { res: "1280x720", pixel: "HD", reason: "Nintendo Switch docked falls back to this." },
      ],
      web: [
        { res: "960x540", pixel: "qHD", reason: "Good balance of quality + performance." },
        { res: "640x360", pixel: "Low", reason: "Fast fallback for mobile browsers." },
        { res: "1280x720", pixel: "HD", reason: "If targeting desktop browsers only." },
      ],
    };
    return recs[selectedPlatform];
  }, [selectedPlatform]);

  const platformLabels: Record<PlatformKey, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    console: "Console",
    web: "Web / Browser",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Resolution &amp; Aspect Ratio Guide</h1>
          <p className="text-sm text-[#9CA3AF]">
            Pick the right resolution for your game
          </p>
        </div>
      </div>

      {/* Visual Resolution Comparison */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">Resolution Comparison</h2>
        <p className="mb-6 text-xs text-[#6B7280]">
          Boxes are proportional to actual pixel area. Click to preview a mockup viewport.
        </p>
        <div className="relative flex flex-wrap items-end gap-3">
          {RESOLUTIONS.map((res) => {
            const scale = 280 / maxW;
            const boxW = Math.max(res.w * scale, 32);
            const boxH = Math.max(res.h * scale, 20);
            const isActive = activeRes?.label === res.label;
            return (
              <button
                key={res.label}
                onClick={() => setActiveRes(isActive ? null : res)}
                className="group flex flex-col items-center transition-transform hover:scale-105"
              >
                <div
                  className="rounded-md border-2 transition-colors"
                  style={{
                    width: boxW,
                    height: boxH,
                    borderColor: isActive ? res.color : "#2A2A2A",
                    backgroundColor: isActive ? `${res.color}15` : "#0F0F0F",
                  }}
                />
                <span
                  className="mt-1.5 text-[10px] font-semibold"
                  style={{ color: res.color }}
                >
                  {res.label}
                </span>
                <span className="text-[9px] text-[#6B7280]">{res.tag}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Mockup Viewport */}
      {activeRes && (
        <section className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F59E0B]">
              Viewport Mockup &mdash; {activeRes.tag}
            </h2>
            <button
              onClick={() => setActiveRes(null)}
              className="text-[#6B7280] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-lg border border-[#2A2A2A]"
              style={{
                width: Math.min(activeRes.w * 0.35, 600),
                height: Math.min(activeRes.h * 0.35, 340),
                backgroundColor: "#0F0F0F",
              }}
            >
              {/* Sky */}
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  height: "55%",
                  background: "linear-gradient(180deg, #1a1a3e 0%, #2d1b4e 50%, #4a2040 100%)",
                }}
              />
              {/* Stars */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: (i * 7 + 3) % 3 + 1,
                    height: (i * 7 + 3) % 3 + 1,
                    top: `${(i * 37 + 5) % 50}%`,
                    left: `${(i * 53 + 11) % 100}%`,
                    opacity: ((i * 41 + 7) % 70 + 30) / 100,
                  }}
                />
              ))}
              {/* Ground */}
              <div
                className="absolute inset-x-0 bottom-0"
                style={{ height: "45%", background: "#1a3a1a" }}
              />
              {/* Hills */}
              <div
                className="absolute bottom-[42%] left-0 right-0"
                style={{
                  height: 40,
                  background: "#143014",
                  borderRadius: "50% 50% 0 0",
                }}
              />
              {/* Player character */}
              <div
                className="absolute"
                style={{
                  bottom: "48%",
                  left: "20%",
                  width: 16,
                  height: 24,
                  backgroundColor: "#F59E0B",
                  borderRadius: 3,
                }}
              />
              {/* Player eyes */}
              <div
                className="absolute"
                style={{
                  bottom: "calc(48% + 16px)",
                  left: "calc(20% + 3px)",
                  width: 4,
                  height: 3,
                  backgroundColor: "#0F0F0F",
                  borderRadius: 1,
                }}
              />
              <div
                className="absolute"
                style={{
                  bottom: "calc(48% + 16px)",
                  left: "calc(20% + 9px)",
                  width: 4,
                  height: 3,
                  backgroundColor: "#0F0F0F",
                  borderRadius: 1,
                }}
              />

              {/* Health Bar */}
              <div className="absolute left-2.5 top-2.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] font-bold text-[#F5F5F5]">HERO</span>
                  <span className="text-[6px] text-[#9CA3AF]">Lv.12</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div className="h-full w-[72%] rounded-full bg-[#EF4444]" />
                  </div>
                  <span className="text-[6px] text-[#EF4444]">72/100</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div className="h-full w-[45%] rounded-full bg-[#3B82F6]" />
                  </div>
                  <span className="text-[6px] text-[#3B82F6]">MP</span>
                </div>
              </div>

              {/* Score */}
              <div className="absolute right-2.5 top-2.5 text-right">
                <div className="text-[7px] font-bold text-[#F59E0B]">SCORE</div>
                <div className="text-[9px] font-bold tabular-nums text-[#F5F5F5]">12,450</div>
              </div>

              {/* Resolution tag */}
              <div className="absolute bottom-2 right-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[7px] text-[#6B7280]">
                {activeRes.w}&times;{activeRes.h}
              </div>

              {/* Mini-map corner */}
              <div className="absolute bottom-2 left-2.5 h-8 w-10 rounded border border-[#2A2A2A] bg-[#0F0F0F]/80">
                <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#F59E0B]" />
                <div className="absolute left-4 top-3 h-0.5 w-3 bg-[#2A2A2A]" />
                <div className="absolute left-2 top-5 h-0.5 w-5 bg-[#2A2A2A]" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#6B7280]">
            {activeRes.w} &times; {activeRes.h} pixels &mdash;{" "}
            {((activeRes.w * activeRes.h) / 1_000_000).toFixed(2)} megapixels
          </p>
        </section>
      )}

      {/* Popular Games Section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Popular Games &amp; Their Resolutions</h2>
        </div>
        <p className="mb-4 text-xs text-[#6B7280]">
          See what resolutions successful indie games ship at for reference.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {POPULAR_GAMES.map((game) => (
            <div
              key={game.name}
              className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 transition-colors hover:border-[#F59E0B]/20"
            >
              <h3 className="text-xs font-semibold text-[#F5F5F5]">{game.name}</h3>
              <p className="mt-1 text-sm font-bold text-[#F59E0B]">{game.res}</p>
              <div className="mt-1.5 flex gap-1.5">
                <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[9px] text-[#9CA3AF]">
                  {game.genre}
                </span>
                <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[9px] text-[#9CA3AF]">
                  {game.style}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aspect Ratio Calculator */}
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">
            Aspect Ratio Calculator
          </h2>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-[#9CA3AF]">Width (px)</label>
            <input
              type="number"
              value={calcWidth}
              onChange={(e) => setCalcWidth(Math.max(1, +e.target.value || 1))}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {aspectResults.map((ar) => (
              <div
                key={ar.label}
                className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center"
              >
                <span className="text-lg font-bold text-[#F59E0B]">{ar.label}</span>
                <p className="mt-1 text-sm text-[#F5F5F5]">
                  {calcWidth} &times; {ar.height}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pixel Density / DPI */}
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">
            DPI / PPI Reference
          </h2>
          <p className="mb-3 text-xs text-[#6B7280]">
            Pixels per inch across common devices. Determines whether you need @2x or @3x assets.
          </p>
          <div className="space-y-2">
            {DPI_TABLE.map((d) => (
              <div
                key={d.device}
                className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#F5F5F5]">{d.device}</p>
                  <p className="text-[10px] text-[#6B7280]">{d.note}</p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-bold text-[#F59E0B]">{d.ppi} PPI</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sprite Size Table */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">
          Sprite Size at Each Resolution
        </h2>
        <p className="mb-3 text-xs text-[#6B7280]">
          How much screen % a sprite of a given size occupies.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-[#9CA3AF]">
                <th className="pb-2 pr-3">Resolution</th>
                {SPRITE_SIZES.map((s) => (
                  <th key={s} className="pb-2 pr-3">{s}px</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOLUTIONS.map((res) => (
                <tr key={res.label} className="border-b border-[#2A2A2A]/50">
                  <td className="py-2 pr-3 font-medium" style={{ color: res.color }}>
                    {res.label}
                  </td>
                  {SPRITE_SIZES.map((s) => (
                    <td key={s} className="py-2 pr-3 text-[#F5F5F5]">
                      {((s / res.w) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Recommend */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
            <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">AI Resolution Advisor</h2>
            <p className="text-[10px] text-[#6B7280]">Describe your game and get a tailored recommendation</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-[#9CA3AF]">Genre</label>
            <input
              type="text"
              placeholder="e.g. Platformer, RPG, Strategy"
              value={aiGenre}
              onChange={(e) => setAiGenre(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#9CA3AF]">Art Style</label>
            <input
              type="text"
              placeholder="e.g. Pixel Art, Hand-Drawn, 3D"
              value={aiArtStyle}
              onChange={(e) => setAiArtStyle(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#9CA3AF]">Target Platform</label>
            <input
              type="text"
              placeholder="e.g. Desktop, Mobile, Web"
              value={aiPlatform}
              onChange={(e) => setAiPlatform(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
            />
          </div>
        </div>
        <button
          onClick={handleAiRecommend}
          disabled={aiLoading || !aiGenre.trim() || !aiArtStyle.trim() || !aiPlatform.trim()}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-[#0F0F0F] transition-all hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI Recommend
            </>
          )}
        </button>
        {aiResult && (
          <div className="mt-4 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#F59E0B]">AI Recommendation</span>
            </div>
            <p className="text-sm leading-relaxed text-[#E5E7EB]">{aiResult}</p>
          </div>
        )}
      </section>

      {/* Platform Recommendations */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">
          Platform Recommendations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((p) => {
            const key = p.platform.toLowerCase().replace(/ \/ /g, "").replace(/ /g, "") as string;
            const platformKey = key === "web/browser" || key === "webbrowser" ? "web" : key as PlatformKey;
            const isSelected = selectedPlatform === platformKey;
            return (
              <button
                key={p.platform}
                onClick={() => setSelectedPlatform(isSelected ? null : platformKey)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                    : "border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#F59E0B]/20"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isSelected ? "bg-[#F59E0B]/20" : "bg-[#F59E0B]/10"
                  }`}>
                    <p.icon className="h-4.5 w-4.5 text-[#F59E0B]" />
                  </div>
                  <span className="text-sm font-semibold text-[#F5F5F5]">{p.platform}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Recommended</span>
                    <span className="font-medium text-[#F59E0B]">{p.recommended}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Minimum</span>
                    <span className="text-[#9CA3AF]">{p.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Aspect</span>
                    <span className="text-[#9CA3AF]">{p.aspect}</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-[#6B7280]">{p.notes}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recommended for your game */}
      {selectedPlatform && recommendations && (
        <section className="rounded-xl border border-[#F59E0B]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="text-sm font-semibold text-[#F59E0B]">
                Recommended for {platformLabels[selectedPlatform]}
              </h2>
            </div>
            <button
              onClick={() => setSelectedPlatform(null)}
              className="text-[#6B7280] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {recommendations.map((rec, i) => (
              <div
                key={rec.res}
                className={`rounded-lg border p-4 ${
                  i === 0
                    ? "border-[#F59E0B]/30 bg-[#F59E0B]/5"
                    : "border-[#2A2A2A] bg-[#0F0F0F]"
                }`}
              >
                {i === 0 && (
                  <span className="mb-2 inline-block rounded bg-[#F59E0B]/20 px-2 py-0.5 text-[10px] font-semibold text-[#F59E0B]">
                    TOP PICK
                  </span>
                )}
                <p className="text-lg font-bold text-[#F5F5F5]">{rec.res}</p>
                <p className="text-[10px] font-medium text-[#9CA3AF]">{rec.pixel}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">{rec.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
