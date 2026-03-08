"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, Smartphone, Gamepad2, Globe, X } from "lucide-react";

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

const SPRITE_SIZES = [8, 16, 32, 64, 128];

export default function ResolutionGuidePage() {
  const [calcWidth, setCalcWidth] = useState(1920);
  const [activeRes, setActiveRes] = useState<Resolution | null>(null);

  const aspectResults = useMemo(
    () =>
      ASPECTS.map((a) => ({
        label: a.label,
        height: Math.round(calcWidth / a.ratio),
      })),
    [calcWidth]
  );

  const maxW = RESOLUTIONS[RESOLUTIONS.length - 1].w;

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
                    width: Math.random() * 2 + 1,
                    height: Math.random() * 2 + 1,
                    top: `${Math.random() * 50}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.7 + 0.3,
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
              {/* Player */}
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
              {/* HUD */}
              <div className="absolute left-2 top-2 flex items-center gap-1">
                <div className="h-1.5 w-12 rounded-full bg-[#EF4444]" />
                <span className="text-[7px] text-[#EF4444]">HP</span>
              </div>
              <div className="absolute right-2 top-2 text-[7px] text-[#F59E0B]">
                {activeRes.w}x{activeRes.h}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#6B7280]">
            {activeRes.w} &times; {activeRes.h} pixels &mdash;{" "}
            {((activeRes.w * activeRes.h) / 1_000_000).toFixed(2)} megapixels
          </p>
        </section>
      )}

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

        {/* Pixel Density */}
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
      </div>

      {/* Platform Recommendations */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#F5F5F5]">
          Platform Recommendations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((p) => (
            <div
              key={p.platform}
              className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
