"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Copy,
  Check,
  Loader2,
  Sparkles,
  X,
  Calculator,
  Zap,
  Brain,
  Monitor,
  Volume2,
  Gauge,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface CheatEntry {
  title: string;
  code: string;
  lang?: string;
}

interface CheatCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  entries: CheatEntry[];
}

const CHEAT_DATA: CheatCategory[] = [
  {
    id: "math",
    name: "Math",
    icon: Calculator,
    color: "#F59E0B",
    entries: [
      { title: "Distance Between Points", code: "dist = sqrt((x2-x1)² + (y2-y1)²)" },
      { title: "Linear Interpolation (Lerp)", code: "result = a + (b - a) * t    // t = 0..1" },
      { title: "Angle Between Points", code: "angle = atan2(y2 - y1, x2 - x1)" },
      { title: "Clamp Value", code: "clamped = max(min, min(max, value))" },
      { title: "Normalize Vector", code: "len = sqrt(x² + y²)\nnx = x / len\nny = y / len" },
      { title: "Dot Product", code: "dot = a.x*b.x + a.y*b.y    // projection / facing" },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    icon: Zap,
    color: "#3B82F6",
    entries: [
      { title: "Velocity Integration", code: "position += velocity * deltaTime" },
      { title: "Gravity", code: "velocity.y += gravity * deltaTime    // 9.8 m/s²" },
      { title: "Friction / Drag", code: "velocity *= (1 - friction * deltaTime)" },
      { title: "Bounce Reflection", code: "vel = vel - 2 * dot(vel, normal) * normal" },
      { title: "AABB Collision", code: "overlap = a.max > b.min && a.min < b.max\n// check both X and Y axes" },
      { title: "Circle Collision", code: "colliding = dist(a, b) < a.radius + b.radius" },
    ],
  },
  {
    id: "ai",
    name: "AI / Pathfinding",
    icon: Brain,
    color: "#8B5CF6",
    entries: [
      {
        title: "Finite State Machine",
        code: "states: IDLE → PATROL → CHASE → ATTACK\ntransitions: on detect → CHASE\n             on lose → PATROL\n             on in-range → ATTACK",
      },
      {
        title: "A* Pathfinding Steps",
        code: "1. Add start to open list\n2. Pick node with lowest f = g + h\n3. Move to closed list\n4. Expand neighbors, calc g+h\n5. Repeat until goal reached",
      },
      { title: "Steering: Seek", code: "desired = normalize(target - pos) * maxSpeed\nsteering = desired - velocity" },
      { title: "Steering: Flee", code: "desired = normalize(pos - target) * maxSpeed\nsteering = desired - velocity" },
      {
        title: "Behavior Tree Order",
        code: "Selector: try children until SUCCESS\nSequence: run children until FAILURE\nLeaf: actual action or check",
      },
    ],
  },
  {
    id: "ui",
    name: "UI Patterns",
    icon: Monitor,
    color: "#10B981",
    entries: [
      {
        title: "Screen Shake",
        code: "offset.x = random(-intensity, intensity)\noffset.y = random(-intensity, intensity)\nintensity *= decay    // e.g. 0.9",
      },
      {
        title: "Smooth Camera Follow",
        code: "cam.x = lerp(cam.x, target.x, smoothing * dt)\ncam.y = lerp(cam.y, target.y, smoothing * dt)",
      },
      { title: "Health Bar Width", code: "barWidth = (currentHP / maxHP) * maxBarWidth" },
      { title: "Cooldown Timer", code: "if (cooldown > 0) cooldown -= dt;\ncanFire = cooldown <= 0;" },
      {
        title: "Floating Damage Numbers",
        code: "spawn text at hit pos\ntext.y -= floatSpeed * dt\ntext.alpha -= fadeSpeed * dt\nremove when alpha <= 0",
      },
    ],
  },
  {
    id: "audio",
    name: "Audio",
    icon: Volume2,
    color: "#EC4899",
    entries: [
      { title: "Distance Attenuation", code: "volume = 1.0 / (1.0 + dist * falloff)" },
      { title: "Pitch Variation", code: "pitch = basePitch + random(-0.1, 0.1)" },
      { title: "Crossfade Tracks", code: "trackA.volume = 1.0 - t\ntrackB.volume = t    // t = 0..1" },
      { title: "Audio Priority", code: "SFX > Dialogue > Ambient > Music\nDuck lower priority when higher plays" },
      { title: "Doppler Effect", code: "pitch *= (speedOfSound + listener.vel)\n       / (speedOfSound + source.vel)" },
    ],
  },
  {
    id: "optimization",
    name: "Optimization",
    icon: Gauge,
    color: "#F97316",
    entries: [
      { title: "Object Pooling", code: "reuse dead objects instead of new/delete\npool.get() → use → pool.release()" },
      {
        title: "Spatial Hashing",
        code: "cellKey = floor(x/cellSize) + floor(y/cellSize)*width\nonly check entities in nearby cells",
      },
      { title: "Frame Budget (60fps)", code: "16.67ms per frame total\nUpdate: ~5ms | Render: ~8ms | Audio: ~2ms" },
      { title: "LOD Distances", code: "High: 0-50m | Medium: 50-150m | Low: 150m+" },
      {
        title: "Frustum Culling",
        code: "skip rendering objects outside camera view\ncheck AABB against 6 frustum planes",
      },
      { title: "Batching Draw Calls", code: "group sprites by texture/material\n1 draw call per batch, not per sprite" },
    ],
  },
];

export default function CheatsheetPage() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CHEAT_DATA.forEach((c) => (init[c.id] = true));
    return init;
  });
  const [aiExplain, setAiExplain] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiOpen, setAiOpen] = useState<Record<string, boolean>>({});
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [aiTipLoading, setAiTipLoading] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return CHEAT_DATA;
    const q = search.toLowerCase();
    return CHEAT_DATA.map((cat) => ({
      ...cat,
      entries: cat.entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.entries.length > 0);
  }, [search]);

  const totalEntries = useMemo(
    () => CHEAT_DATA.reduce((acc, c) => acc + c.entries.length, 0),
    []
  );

  const copyCode = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const toggleCat = useCallback((id: string) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const explainEntry = useCallback(
    async (catId: string, entryIdx: number, title: string, code: string) => {
      const key = `${catId}_${entryIdx}`;
      if (aiLoading[key]) return;
      setAiLoading((prev) => ({ ...prev, [key]: true }));
      setAiOpen((prev) => ({ ...prev, [key]: true }));
      setAiExplain((prev) => ({ ...prev, [key]: "" }));
      try {
        const prompt = `Explain this game development concept in detail for someone learning game dev. Concept: "${title}". Formula/pattern: ${code}. Give a clear explanation of what it does, when to use it, and a practical example in pseudocode. Keep it concise but thorough (max 200 words).`;
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
            temperature: 0.7,
          }),
        });
        const data = await response.json();
        const content =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.message?.reasoning ||
          "Could not generate an explanation. Try again.";
        setAiExplain((prev) => ({ ...prev, [key]: content }));
      } catch {
        setAiExplain((prev) => ({
          ...prev,
          [key]: "Failed to generate explanation. Check your API key and try again.",
        }));
      } finally {
        setAiLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [aiLoading]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/tools"
          className="mb-2 inline-block text-xs text-[#9CA3AF] hover:text-[#F59E0B] transition-colors"
        >
          ← All Tools
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold">Game Dev Cheat Sheet</h1>
        </div>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          {totalEntries} quick-reference formulas and patterns across {CHEAT_DATA.length} categories
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search formulas, patterns, concepts..."
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CHEAT_DATA.map((cat) => {
          const matchCount = filtered.find((f) => f.id === cat.id)?.entries.length || 0;
          const hasResults = !search.trim() || matchCount > 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (hasResults) {
                  setExpandedCats((prev) => ({ ...prev, [cat.id]: true }));
                  document.getElementById(`cheat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              disabled={!hasResults}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                hasResults
                  ? "bg-[#1A1A1A] text-[#D1D5DB] hover:text-[#F5F5F5]"
                  : "bg-[#1A1A1A]/50 text-[#4B5563] cursor-not-allowed"
              }`}
              style={hasResults ? { borderLeft: `3px solid ${cat.color}` } : undefined}
            >
              <cat.icon className="h-3 w-3" style={{ color: hasResults ? cat.color : "#4B5563" }} />
              {cat.name}
              {search.trim() && (
                <span className="ml-1 text-[10px] opacity-60">{matchCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-[#2A2A2A]" />
          <p className="mt-4 text-sm text-[#6B7280]">
            No entries match &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {filtered.map((cat) => {
          const isOpen = expandedCats[cat.id] ?? true;
          return (
            <div
              key={cat.id}
              id={`cheat-${cat.id}`}
              className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              <button
                onClick={() => toggleCat(cat.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold">{cat.name}</span>
                  <span className="ml-2 text-xs text-[#6B7280]">{cat.entries.length} entries</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-[#2A2A2A]">
                  {cat.entries.map((entry, idx) => {
                    const entryKey = `${cat.id}_${idx}`;
                    const isCopied = copiedId === entryKey;
                    const explanation = aiExplain[entryKey];
                    const isExplainLoading = aiLoading[entryKey] || false;
                    const isExplainOpen = aiOpen[entryKey] || false;

                    return (
                      <div
                        key={entryKey}
                        className={idx < cat.entries.length - 1 ? "border-b border-[#2A2A2A]/50" : ""}
                      >
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-[#F5F5F5]">{entry.title}</h4>
                              <pre className="mt-2 overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 font-mono text-xs leading-relaxed text-[#D1D5DB]">
                                {entry.code}
                              </pre>
                            </div>
                            <div className="flex shrink-0 gap-1 pt-0.5">
                              <button
                                onClick={() => copyCode(entry.code, entryKey)}
                                className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                title="Copy"
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (isExplainOpen) {
                                    setAiOpen((prev) => ({ ...prev, [entryKey]: false }));
                                  } else if (explanation) {
                                    setAiOpen((prev) => ({ ...prev, [entryKey]: true }));
                                  } else {
                                    explainEntry(cat.id, idx, entry.title, entry.code);
                                  }
                                }}
                                disabled={isExplainLoading}
                                className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] disabled:opacity-50"
                                title="AI Explain"
                              >
                                {isExplainLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={async () => {
                                  if (aiTipLoading[entryKey]) return;
                                  setAiTipLoading(prev => ({ ...prev, [entryKey]: true }));
                                  try {
                                    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                                      method: "POST",
                                      headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                                      body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Give a quick pro-tip for using ${entry.title} in games. 1 sentence.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
                                    });
                                    const data = await response.json();
                                    setAiTips(prev => ({ ...prev, [entryKey]: data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "" }));
                                  } catch {} finally { setAiTipLoading(prev => ({ ...prev, [entryKey]: false })); }
                                }}
                                disabled={aiTipLoading[entryKey]}
                                className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:bg-[#10B981]/10 hover:text-[#10B981] disabled:opacity-50"
                                title="Quick Tip"
                              >
                                {aiTipLoading[entryKey] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#10B981]" />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {aiTips[entryKey] && (
                            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 px-3 py-2">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#10B981]" />
                              <p className="text-[11px] leading-relaxed text-[#D1D5DB]">{aiTips[entryKey]}</p>
                            </div>
                          )}

                          {isExplainOpen && (
                            <div className="mt-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                                  <span className="text-xs font-semibold text-[#F59E0B]">AI Explanation</span>
                                </div>
                                <button
                                  onClick={() => setAiOpen((prev) => ({ ...prev, [entryKey]: false }))}
                                  className="rounded p-0.5 text-[#6B7280] hover:text-[#F5F5F5]"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              {isExplainLoading ? (
                                <div className="flex items-center gap-2 py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                                  <span className="text-xs text-[#9CA3AF]">Generating explanation...</span>
                                </div>
                              ) : (
                                <div className="whitespace-pre-wrap text-xs leading-relaxed text-[#D1D5DB]">
                                  {(explanation || "").split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                                    part.startsWith("**") && part.endsWith("**") ? (
                                      <strong key={i} className="text-[#F59E0B]">
                                        {part.slice(2, -2)}
                                      </strong>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
