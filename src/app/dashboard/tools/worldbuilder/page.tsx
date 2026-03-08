"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

const SETTINGS = ["Fantasy", "Sci-Fi", "Post-Apocalyptic", "Modern", "Historical"] as const;
const TONES = ["Dark", "Light", "Mysterious", "Epic"] as const;
const WORLD_SIZES = ["Small", "Medium", "Large", "Massive"] as const;

interface SavedWorld {
  id: string;
  name: string;
  setting: string;
  tone: string;
  size: string;
  content: string;
  createdAt: string;
}

const STORAGE_KEY = "gameforge_worlds";

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) => {
    const bold = part.match(/^\*\*(.+?)\*\*$/);
    if (bold)
      return (
        <strong key={j} className="font-semibold text-[#F5F5F5]">
          {bold[1]}
        </strong>
      );
    return <span key={j}>{part}</span>;
  });
}

function FormatContent({
  text,
  onSectionClick,
  loadingSection,
}: {
  text: string;
  onSectionClick?: (section: string) => void;
  loadingSection?: string | null;
}) {
  const lines = text.split("\n");

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.trim() === "---")
          return <hr key={i} className="border-[#2A2A2A] my-4" />;
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        const headerMatch = line.match(/^\*\*(.+?)\*\*(.*)/);
        if (headerMatch) {
          const sectionName = headerMatch[1];
          const rest = headerMatch[2] || "";
          const isLoading = loadingSection === sectionName;

          return (
            <div
              key={i}
              className="mt-3 first:mt-0 group flex items-start gap-1.5"
            >
              {onSectionClick && (
                <button
                  onClick={() => onSectionClick(sectionName)}
                  disabled={!!loadingSection}
                  className="shrink-0 mt-0.5 rounded p-0.5 text-[#444] opacity-0 group-hover:opacity-100 hover:text-[#F59E0B] transition-all disabled:opacity-30"
                  title={`More details: ${sectionName}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#F59E0B]" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </button>
              )}
              <p className="text-sm leading-relaxed text-[#D1D5DB]">
                <strong className="font-semibold text-[#F59E0B]">
                  {sectionName}
                </strong>
                {rest && renderInline(rest)}
              </p>
            </div>
          );
        }

        return (
          <p
            key={i}
            className={`text-sm leading-relaxed text-[#D1D5DB] ${onSectionClick ? "pl-5" : ""}`}
          >
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function WorldBuilderPage() {
  const [name, setName] = useState("");
  const [setting, setSetting] = useState<string>(SETTINGS[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [worldSize, setWorldSize] = useState<string>(WORLD_SIZES[1]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailSection, setDetailSection] = useState<string | null>(null);
  const [savedWorlds, setSavedWorlds] = useState<SavedWorld[]>([]);
  const [expandedWorld, setExpandedWorld] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedWorlds(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToStorage = useCallback((worlds: SavedWorld[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
  }, []);

  const generateWorld = useCallback(async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setResult("");

    try {
      const prompt = `Create a brief game world overview for '${name.trim()}'. Setting: ${setting}. Tone: ${tone}. Scale: ${worldSize}. Include: a 2-sentence overview, 3 key locations with descriptions, 2 factions with motivations, 1 central conflict, and 3 plot hooks. Format with bold headers.`;

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
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";
      setResult(content || "No content generated. Please try again.");
    } catch {
      setResult("Failed to generate world. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, setting, tone, worldSize, loading]);

  const saveWorld = useCallback(() => {
    if (!result || !name.trim()) return;
    const world: SavedWorld = {
      id: Date.now().toString(),
      name: name.trim(),
      setting,
      tone,
      size: worldSize,
      content: result,
      createdAt: new Date().toISOString(),
    };
    const updated = [world, ...savedWorlds];
    setSavedWorlds(updated);
    saveToStorage(updated);
  }, [result, name, setting, tone, worldSize, savedWorlds, saveToStorage]);

  const deleteWorld = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = savedWorlds.filter((w) => w.id !== id);
      setSavedWorlds(updated);
      saveToStorage(updated);
      if (expandedWorld === id) setExpandedWorld(null);
    },
    [savedWorlds, expandedWorld, saveToStorage],
  );

  const generateMoreDetails = useCallback(
    async (section: string, worldContent: string) => {
      setDetailSection(section);

      try {
        const prompt = `Given this game world:\n\n${worldContent}\n\nGenerate more detailed lore about: "${section}". Include history, notable characters, unique features, and connections to the rest of the world. Format with bold headers. Keep it concise (under 250 words).`;

        const response = await fetch(
          "https://llm.chutes.ai/v1/chat/completions",
          {
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
              max_tokens: 512,
              temperature: 0.8,
            }),
          },
        );

        const data = await response.json();
        const content =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.message?.reasoning ||
          "";
        setResult((prev) => prev + "\n\n---\n\n" + content);
      } catch {
        setResult(
          (prev) =>
            prev + "\n\n---\n\nFailed to generate details for: " + section,
        );
      } finally {
        setDetailSection(null);
      }
    },
    [],
  );

  const loadWorld = useCallback(
    (world: SavedWorld) => {
      setName(world.name);
      setSetting(world.setting);
      setTone(world.tone);
      setWorldSize(world.size);
      setResult(world.content);
    },
    [],
  );

  const selectBtnClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-xs font-medium transition-all ${
      active
        ? "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/30"
        : "bg-[#111] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
    }`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#F59E0B]" />
            World Builder
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            Generate rich game world lore with AI
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: Input Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                World Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your world's name..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Setting
              </label>
              <div className="flex flex-wrap gap-2">
                {SETTINGS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSetting(s)}
                    className={selectBtnClass(setting === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={selectBtnClass(tone === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                World Size
              </label>
              <div className="flex flex-wrap gap-2">
                {WORLD_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setWorldSize(sz)}
                    className={selectBtnClass(worldSize === sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateWorld}
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating World...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate World
                </>
              )}
            </button>
          </div>

          {/* Saved Worlds */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Saved Worlds ({savedWorlds.length})
            </h3>
            {savedWorlds.length === 0 ? (
              <p className="text-xs text-[#555] py-4 text-center">
                No worlds saved yet. Generate one and click Save.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {savedWorlds.map((world) => (
                  <div
                    key={world.id}
                    className="rounded-lg border border-[#2A2A2A] bg-[#111] overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedWorld(
                          expandedWorld === world.id ? null : world.id,
                        )
                      }
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1A1A1A] transition-colors"
                    >
                      {expandedWorld === world.id ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F5F5F5] truncate">
                          {world.name}
                        </p>
                        <p className="text-[10px] text-[#666]">
                          {world.setting} &middot; {world.tone} &middot;{" "}
                          {world.size}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteWorld(world.id, e)}
                        className="shrink-0 p-1 text-[#555] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                    {expandedWorld === world.id && (
                      <div className="border-t border-[#2A2A2A] px-3 py-3 space-y-3">
                        <FormatContent
                          text={world.content}
                          onSectionClick={(section) => {
                            loadWorld(world);
                            generateMoreDetails(section, world.content);
                          }}
                          loadingSection={detailSection}
                        />
                        <button
                          onClick={() => loadWorld(world)}
                          className="text-xs text-[#F59E0B] hover:underline"
                        >
                          Load into editor
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Results Panel */}
        <div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] min-h-[300px] sticky top-4">
            {!result && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Globe className="h-12 w-12 text-[#2A2A2A] mb-4" />
                <p className="text-sm text-[#555]">
                  Configure your world settings and click Generate to create
                  rich lore
                </p>
              </div>
            ) : loading && !result ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B] mb-3" />
                <p className="text-sm text-[#9CA3AF]">
                  Building your world...
                </p>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">
                    {name || "Generated World"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#555] px-2 py-0.5 rounded bg-[#111] border border-[#2A2A2A]">
                      {setting}
                    </span>
                    <span className="text-[10px] text-[#555] px-2 py-0.5 rounded bg-[#111] border border-[#2A2A2A]">
                      {tone}
                    </span>
                    <button
                      onClick={saveWorld}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>
                </div>
                <FormatContent
                  text={result}
                  onSectionClick={(section) =>
                    generateMoreDetails(section, result)
                  }
                  loadingSection={detailSection}
                />
                {detailSection && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <Loader2 className="h-3 w-3 animate-spin text-[#F59E0B]" />
                    Expanding: {detailSection}...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
