"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Pin, PinOff, Sun, Moon, X } from "lucide-react";

interface FontDef {
  name: string;
  family: string;
  category: "Serif" | "Sans-Serif" | "Monospace" | "Display";
}

const FONTS: FontDef[] = [
  { name: "Georgia", family: "Georgia, serif", category: "Serif" },
  { name: "Times New Roman", family: "'Times New Roman', Times, serif", category: "Serif" },
  { name: "Palatino", family: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", category: "Serif" },
  { name: "Garamond", family: "Garamond, 'EB Garamond', serif", category: "Serif" },
  { name: "Arial", family: "Arial, Helvetica, sans-serif", category: "Sans-Serif" },
  { name: "Verdana", family: "Verdana, Geneva, sans-serif", category: "Sans-Serif" },
  { name: "Trebuchet MS", family: "'Trebuchet MS', Helvetica, sans-serif", category: "Sans-Serif" },
  { name: "Impact", family: "Impact, 'Arial Narrow Bold', sans-serif", category: "Display" },
  { name: "Tahoma", family: "Tahoma, Geneva, sans-serif", category: "Sans-Serif" },
  { name: "Segoe UI", family: "'Segoe UI', Tahoma, Geneva, sans-serif", category: "Sans-Serif" },
  { name: "Courier New", family: "'Courier New', Courier, monospace", category: "Monospace" },
  { name: "Lucida Console", family: "'Lucida Console', Monaco, monospace", category: "Monospace" },
  { name: "Consolas", family: "Consolas, 'Courier New', monospace", category: "Monospace" },
  { name: "Copperplate", family: "Copperplate, 'Copperplate Gothic Light', fantasy", category: "Display" },
  { name: "Papyrus", family: "Papyrus, fantasy", category: "Display" },
  { name: "Brush Script", family: "'Brush Script MT', cursive", category: "Display" },
  { name: "Comic Sans MS", family: "'Comic Sans MS', cursive", category: "Display" },
];

const CATEGORIES = ["All", "Serif", "Sans-Serif", "Monospace", "Display"] as const;
type Category = (typeof CATEGORIES)[number];

export default function FontPreviewPage() {
  const [text, setText] = useState("Dragon Quest");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#F5F5F5");
  const [darkBg, setDarkBg] = useState(true);
  const [category, setCategory] = useState<Category>("All");
  const [copied, setCopied] = useState<string | null>(null);

  const [shadowOn, setShadowOn] = useState(false);
  const [shadowIntensity, setShadowIntensity] = useState(4);
  const [outlineOn, setOutlineOn] = useState(false);
  const [outlineIntensity, setOutlineIntensity] = useState(2);
  const [glowOn, setGlowOn] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(8);

  const [pinned, setPinned] = useState<string[]>([]);

  const previewBg = darkBg ? "#0F0F0F" : "#F0F0F0";
  const previewText = text || "Your Game Title";

  const textStyle = useMemo(() => {
    const effects: string[] = [];
    if (shadowOn)
      effects.push(`${shadowIntensity}px ${shadowIntensity}px ${shadowIntensity * 2}px rgba(0,0,0,0.7)`);
    if (glowOn)
      effects.push(`0 0 ${glowIntensity}px ${textColor}, 0 0 ${glowIntensity * 2}px ${textColor}40`);
    const stroke = outlineOn
      ? `-${outlineIntensity}px -${outlineIntensity}px 0 #000, ${outlineIntensity}px -${outlineIntensity}px 0 #000, -${outlineIntensity}px ${outlineIntensity}px 0 #000, ${outlineIntensity}px ${outlineIntensity}px 0 #000`
      : "";
    const combined = [...effects, ...(stroke ? [stroke] : [])].join(", ");
    return { textShadow: combined || "none" };
  }, [shadowOn, shadowIntensity, outlineOn, outlineIntensity, glowOn, glowIntensity, textColor]);

  const copySnippet = useCallback(
    (font: FontDef) => {
      const lines = [
        `font-family: ${font.family};`,
        `font-size: ${fontSize}px;`,
        `color: ${textColor};`,
      ];
      if (textStyle.textShadow !== "none") lines.push(`text-shadow: ${textStyle.textShadow};`);
      navigator.clipboard.writeText(lines.join("\n"));
      setCopied(font.name);
      setTimeout(() => setCopied(null), 1500);
    },
    [fontSize, textColor, textStyle]
  );

  const togglePin = (name: string) => {
    setPinned((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 2 ? [...prev, name] : prev
    );
  };

  const filtered = useMemo(
    () => FONTS.filter((f) => category === "All" || f.category === category),
    [category]
  );

  const pinnedFonts = FONTS.filter((f) => pinned.includes(f.name));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Game Font Preview</h1>
          <p className="text-sm text-[#9CA3AF]">Preview fonts for your game UI &amp; titles</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Preview Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your game title..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Size: {fontSize}px
              </label>
              <input
                type="range"
                min={12}
                max={120}
                value={fontSize}
                onChange={(e) => setFontSize(+e.target.value)}
                className="w-full accent-[#F59E0B]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-[#2A2A2A] bg-transparent"
                />
                <span className="text-xs text-[#6B7280]">{textColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Background</label>
              <button
                onClick={() => setDarkBg(!darkBg)}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
              >
                {darkBg ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                {darkBg ? "Dark" : "Light"}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5 text-xs text-[#F5F5F5] outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Effects */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Text Effects</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={shadowOn}
                    onChange={(e) => setShadowOn(e.target.checked)}
                    className="accent-[#F59E0B]"
                  />
                  <span className="text-[#F5F5F5]">Shadow</span>
                </label>
                {shadowOn && (
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={shadowIntensity}
                    onChange={(e) => setShadowIntensity(+e.target.value)}
                    className="mt-2 w-full accent-[#F59E0B]"
                  />
                )}
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={outlineOn}
                    onChange={(e) => setOutlineOn(e.target.checked)}
                    className="accent-[#F59E0B]"
                  />
                  <span className="text-[#F5F5F5]">Outline</span>
                </label>
                {outlineOn && (
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={outlineIntensity}
                    onChange={(e) => setOutlineIntensity(+e.target.value)}
                    className="mt-2 w-full accent-[#F59E0B]"
                  />
                )}
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={glowOn}
                    onChange={(e) => setGlowOn(e.target.checked)}
                    className="accent-[#F59E0B]"
                  />
                  <span className="text-[#F5F5F5]">Glow</span>
                </label>
                {glowOn && (
                  <input
                    type="range"
                    min={2}
                    max={30}
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(+e.target.value)}
                    className="mt-2 w-full accent-[#F59E0B]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pinned count */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-4 text-center">
          <Pin className="h-5 w-5 text-[#F59E0B]" />
          <span className="mt-1 text-2xl font-bold text-[#F5F5F5]">{pinned.length}/2</span>
          <span className="text-xs text-[#6B7280]">Pinned</span>
          {pinned.length > 0 && (
            <button
              onClick={() => setPinned([])}
              className="mt-2 text-xs text-[#EF4444] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Compare Panel */}
      {pinnedFonts.length === 2 && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F59E0B]">Side-by-Side Compare</h2>
            <button onClick={() => setPinned([])} className="text-[#6B7280] hover:text-[#F5F5F5]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {pinnedFonts.map((font) => (
              <div key={font.name} className="rounded-lg p-4" style={{ backgroundColor: previewBg }}>
                <p className="mb-2 text-xs font-medium text-[#9CA3AF]">{font.name}</p>
                <p
                  style={{
                    fontFamily: font.family,
                    fontSize: Math.min(fontSize, 72),
                    color: textColor,
                    ...textStyle,
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                  }}
                >
                  {previewText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Font Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((font) => {
          const isPinned = pinned.includes(font.name);
          return (
            <div
              key={font.name}
              className={`group rounded-xl border p-5 transition-all ${
                isPinned
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                  : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#F59E0B]/20"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">{font.name}</h3>
                  <span className="text-[10px] text-[#6B7280]">{font.category}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePin(font.name)}
                    title={isPinned ? "Unpin" : "Pin to compare"}
                    className={`rounded-md p-1.5 transition-colors ${
                      isPinned
                        ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                        : "text-[#6B7280] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => copySnippet(font)}
                    className="flex items-center gap-1 rounded-md bg-[#F59E0B]/10 px-2 py-1 text-[10px] font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                  >
                    {copied === font.name ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Use This
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg p-4" style={{ backgroundColor: previewBg }}>
                <p
                  style={{
                    fontFamily: font.family,
                    fontSize: Math.min(fontSize, 64),
                    color: textColor,
                    ...textStyle,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {previewText}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
