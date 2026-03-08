"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Pin,
  PinOff,
  Sun,
  Moon,
  X,
  Shuffle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Sparkles,
  Loader2,
} from "lucide-react";

interface FontDef {
  name: string;
  family: string;
  category: "Serif" | "Sans-Serif" | "Monospace" | "Display";
}

interface FontPairing {
  heading: FontDef;
  body: FontDef;
  reason: string;
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

const RANDOM_TEXTS = [
  "GAME OVER",
  "LEVEL UP!",
  "100 HP",
  "PLAYER 1",
  "SCORE: 9999",
  "PRESS START",
  "VICTORY!",
  "QUEST COMPLETE",
  "NEW HIGH SCORE",
  "LOADING...",
  "COMBO x5",
  "+500 XP",
  "BOSS FIGHT",
  "ROUND 1",
  "CONTINUE?",
  "READY?",
  "FLAWLESS",
  "CRITICAL HIT!",
  "GAME PAUSED",
  "RESPAWNING...",
];

const CHARSET_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHARSET_LOWER = "abcdefghijklmnopqrstuvwxyz";
const CHARSET_NUMS = "0123456789";
const CHARSET_SPECIAL = "!@#$%^&*()-_=+[]{}|;:'\",.<>?/~`";

type Alignment = "left" | "center" | "right";

export default function FontPreviewPage() {
  const [text, setText] = useState("Dragon Quest");
  const [fontSize, setFontSize] = useState(48);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.3);
  const [textAlign, setTextAlign] = useState<Alignment>("left");
  const [textColor, setTextColor] = useState("#F5F5F5");
  const [darkBg, setDarkBg] = useState(true);
  const [category, setCategory] = useState<Category>("All");
  const [copied, setCopied] = useState<string | null>(null);
  const [charsetFont, setCharsetFont] = useState<string | null>(null);

  const [shadowOn, setShadowOn] = useState(false);
  const [shadowIntensity, setShadowIntensity] = useState(4);
  const [outlineOn, setOutlineOn] = useState(false);
  const [outlineIntensity, setOutlineIntensity] = useState(2);
  const [glowOn, setGlowOn] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(8);

  const [pinned, setPinned] = useState<string[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ fontName: string; reason: string } | null>(null);
  const [pairingGameType, setPairingGameType] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingResults, setPairingResults] = useState<FontPairing[]>([]);
  const [pairingError, setPairingError] = useState("");

  const previewBg = darkBg ? "#0F0F0F" : "#F0F0F0";
  const previewText = text || "Your Game Title";

  const randomizeText = () => {
    const idx = Math.floor(Math.random() * RANDOM_TEXTS.length);
    setText(RANDOM_TEXTS[idx]);
  };

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
        `letter-spacing: ${letterSpacing}px;`,
        `line-height: ${lineHeight};`,
        `text-align: ${textAlign};`,
      ];
      if (textStyle.textShadow !== "none") lines.push(`text-shadow: ${textStyle.textShadow};`);
      navigator.clipboard.writeText(lines.join("\n"));
      setCopied(font.name);
      setTimeout(() => setCopied(null), 1500);
    },
    [fontSize, textColor, textStyle, letterSpacing, lineHeight, textAlign]
  );

  const togglePin = (name: string) => {
    setPinned((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 2 ? [...prev, name] : prev
    );
  };

  const handleAiRecommend = async () => {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const fontNames = FONTS.map((f) => f.name).join(", ");
      const prompt = `For a game UI described as '${aiQuery.trim()}', recommend the best web-safe font from this list: ${fontNames}. Respond with ONLY the font name and a one-line reason.`;
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
      const matchedFont = FONTS.find((f) =>
        content.toLowerCase().includes(f.name.toLowerCase())
      );
      if (matchedFont) {
        const reason =
          content
            .replace(new RegExp(matchedFont.name, "gi"), "")
            .replace(/^[\s\-:.,*]+/, "")
            .trim() || "Best match for your description";
        setAiResult({ fontName: matchedFont.name, reason });
        setPinned((prev) =>
          prev.includes(matchedFont.name)
            ? prev
            : prev.length < 2
              ? [...prev, matchedFont.name]
              : [matchedFont.name]
        );
      } else {
        setAiResult({ fontName: "", reason: content || "Could not determine a recommendation." });
      }
    } catch {
      setAiResult({ fontName: "", reason: "Failed to get recommendation. Check your API key." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiPairFonts = async () => {
    if (!pairingGameType.trim() || pairingLoading) return;
    setPairingLoading(true);
    setPairingResults([]);
    setPairingError("");
    try {
      const fontNames = "Georgia, Times New Roman, Palatino, Arial, Verdana, Trebuchet MS, Impact, Courier New, Lucida Console";
      const prompt = `Suggest 3 font pairings for a ${pairingGameType.trim()} game UI. For each pair: pick a heading font and a body font from ONLY these fonts: ${fontNames}. Explain why they pair well. Format each on its own line exactly as:\nPair 1: [HeadingFont] + [BodyFont] - reason\nPair 2: [HeadingFont] + [BodyFont] - reason\nPair 3: [HeadingFont] + [BodyFont] - reason`;
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
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const pairs: FontPairing[] = [];
      const lines = content.split("\n");
      for (const line of lines) {
        if (!line.includes("+")) continue;
        const m = line.match(/([A-Za-z\s]+?)\s*\+\s*([A-Za-z\s]+?)\s*[—\-–]\s*(.+)/);
        if (!m) continue;
        const hName = m[1].replace(/[\[\]"'*]/g, "").trim();
        const bName = m[2].replace(/[\[\]"'*]/g, "").trim();
        const reason = m[3].trim();
        const hFont = FONTS.find((f) => f.name.toLowerCase() === hName.toLowerCase());
        const bFont = FONTS.find((f) => f.name.toLowerCase() === bName.toLowerCase());
        if (hFont && bFont) {
          pairs.push({ heading: hFont, body: bFont, reason });
        }
      }
      if (pairs.length === 0) {
        setPairingError("Could not parse pairings. Try a different game type.");
      } else {
        setPairingResults(pairs);
      }
    } catch {
      setPairingError("Failed to get pairings. Check your API key.");
    } finally {
      setPairingLoading(false);
    }
  };

  const applyPairing = (pair: FontPairing) => {
    setPinned([pair.heading.name, pair.body.name]);
  };

  const filtered = useMemo(
    () => FONTS.filter((f) => category === "All" || f.category === category),
    [category]
  );

  const pinnedFonts = FONTS.filter((f) => pinned.includes(f.name));
  const charsetFontDef = FONTS.find((f) => f.name === charsetFont);

  const alignIcons: { key: Alignment; icon: typeof AlignLeft }[] = [
    { key: "left", icon: AlignLeft },
    { key: "center", icon: AlignCenter },
    { key: "right", icon: AlignRight },
  ];

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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Preview Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your game title..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={randomizeText}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/40 hover:text-[#F59E0B]"
                title="Random game UI text"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Random
              </button>
            </div>
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
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Spacing: {letterSpacing}px
              </label>
              <input
                type="range"
                min={-5}
                max={20}
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(+e.target.value)}
                className="w-full accent-[#F59E0B]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Line Height: {lineHeight.toFixed(1)}
              </label>
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(+e.target.value)}
                className="w-full accent-[#F59E0B]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Alignment</label>
              <div className="flex gap-1">
                {alignIcons.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTextAlign(key)}
                    className={`flex h-[34px] flex-1 items-center justify-center rounded-lg border transition-colors ${
                      textAlign === key
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#6B7280] hover:text-[#9CA3AF]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      {/* AI Font Recommend */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-semibold text-[#F5F5F5]">AI Font Recommend</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiRecommend()}
            placeholder='e.g. "retro arcade title", "elegant RPG menu", "sci-fi HUD"'
            className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
          />
          <button
            onClick={handleAiRecommend}
            disabled={aiLoading || !aiQuery.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Recommend
          </button>
        </div>
        {aiResult && aiResult.fontName && (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
            <div>
              <span className="text-sm font-semibold text-[#F59E0B]">{aiResult.fontName}</span>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">{aiResult.reason}</p>
            </div>
          </div>
        )}
        {aiResult && !aiResult.fontName && (
          <div className="mt-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-3">
            <p className="text-xs text-[#EF4444]">{aiResult.reason}</p>
          </div>
        )}
      </div>

      {/* AI Font Pairing */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-semibold text-[#F5F5F5]">AI Pair Fonts</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={pairingGameType}
            onChange={(e) => setPairingGameType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiPairFonts()}
            placeholder='Game type or style — e.g. "dark fantasy RPG", "pixel platformer"'
            className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
          />
          <button
            onClick={handleAiPairFonts}
            disabled={pairingLoading || !pairingGameType.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pairingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Pair Fonts
          </button>
        </div>

        {pairingLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
            Finding perfect pairings...
          </div>
        )}

        {pairingError && !pairingLoading && (
          <div className="mt-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-3">
            <p className="text-xs text-[#EF4444]">{pairingError}</p>
          </div>
        )}

        {pairingResults.length > 0 && !pairingLoading && (
          <div className="mt-4 space-y-4">
            {pairingResults.map((pair, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[10px] font-bold text-[#F59E0B]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#F5F5F5]">
                      {pair.heading.name}{" "}
                      <span className="text-[#6B7280]">+</span>{" "}
                      {pair.body.name}
                    </span>
                  </div>
                  <button
                    onClick={() => applyPairing(pair)}
                    className="rounded-md bg-[#F59E0B]/10 px-2.5 py-1 text-[11px] font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                  >
                    Apply &amp; Compare
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: previewBg }}>
                    <p className="mb-1 text-[9px] uppercase tracking-wider text-[#6B7280]">Heading</p>
                    <p
                      style={{
                        fontFamily: pair.heading.family,
                        fontSize: Math.min(fontSize, 36),
                        color: textColor,
                        lineHeight: 1.2,
                        ...textStyle,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      {previewText}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: previewBg }}>
                    <p className="mb-1 text-[9px] uppercase tracking-wider text-[#6B7280]">Body</p>
                    <p
                      style={{
                        fontFamily: pair.body.family,
                        fontSize: Math.min(fontSize * 0.45, 16),
                        color: textColor,
                        lineHeight: 1.5,
                        ...textStyle,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      The quick brown fox jumps over the lazy dog. Press START to continue your adventure.
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-[#9CA3AF]">{pair.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compare Panel */}
      {pinnedFonts.length === 2 && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-3">
            <h2 className="text-sm font-semibold text-[#F59E0B]">Side-by-Side Compare</h2>
            <button onClick={() => setPinned([])} className="text-[#6B7280] hover:text-[#F5F5F5]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2">
            {pinnedFonts.map((font, i) => (
              <div
                key={font.name}
                className={`p-5 ${i === 0 ? "border-r border-[#2A2A2A]" : ""}`}
              >
                <p className="mb-3 text-xs font-semibold text-[#F59E0B]">{font.name}</p>
                <div className="rounded-lg p-4" style={{ backgroundColor: previewBg }}>
                  <p
                    style={{
                      fontFamily: font.family,
                      fontSize: Math.min(fontSize, 72),
                      color: textColor,
                      letterSpacing: `${letterSpacing}px`,
                      lineHeight,
                      textAlign,
                      ...textStyle,
                      wordBreak: "break-word" as const,
                    }}
                  >
                    {previewText}
                  </p>
                </div>
                <p className="mt-2 text-[10px] text-[#6B7280]">{font.family}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Set Preview */}
      {charsetFontDef && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Character Set &mdash; {charsetFontDef.name}
              </h2>
            </div>
            <button
              onClick={() => setCharsetFont(null)}
              className="text-[#6B7280] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3" style={{ fontFamily: charsetFontDef.family }}>
            {[
              { label: "Uppercase", chars: CHARSET_UPPER },
              { label: "Lowercase", chars: CHARSET_LOWER },
              { label: "Numbers", chars: CHARSET_NUMS },
              { label: "Symbols", chars: CHARSET_SPECIAL },
            ].map((row) => (
              <div key={row.label}>
                <span className="mb-1 block text-[10px] font-medium text-[#6B7280]">{row.label}</span>
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: previewBg }}
                >
                  <p
                    className="tracking-wider"
                    style={{
                      fontSize: Math.min(fontSize * 0.6, 36),
                      color: textColor,
                      letterSpacing: `${Math.max(letterSpacing, 2)}px`,
                      lineHeight: 1.6,
                      ...textStyle,
                    }}
                  >
                    {row.chars}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Font Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((font) => {
          const isPinned = pinned.includes(font.name);
          const isCharset = charsetFont === font.name;
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
                    onClick={() => setCharsetFont(isCharset ? null : font.name)}
                    title="View character set"
                    className={`rounded-md p-1.5 transition-colors ${
                      isCharset
                        ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                        : "text-[#6B7280] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <Type className="h-3.5 w-3.5" />
                  </button>
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
                    letterSpacing: `${letterSpacing}px`,
                    lineHeight,
                    textAlign,
                    ...textStyle,
                    wordBreak: "break-word" as const,
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
