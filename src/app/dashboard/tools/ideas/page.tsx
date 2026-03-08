"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lightbulb,
  Sparkles,
  Save,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronDown,
  Bookmark,
} from "lucide-react";

const GENRES = [
  "Platformer",
  "RPG",
  "Roguelike",
  "Puzzle",
  "Strategy",
  "Horror",
  "Racing",
  "Simulation",
  "Fighting",
  "Shooter",
  "Survival",
  "Adventure",
  "Sandbox",
  "Rhythm",
  "Tower Defense",
  "Metroidvania",
  "Card Game",
  "Visual Novel",
];

const AUDIENCES = [
  "Kids (6-12)",
  "Teens (13-17)",
  "Young Adults (18-25)",
  "Adults (25+)",
  "Casual Gamers",
  "Hardcore Gamers",
  "Everyone",
];

const PLATFORMS = [
  "PC",
  "Mobile",
  "Console",
  "Web Browser",
  "VR",
  "Cross-Platform",
];

interface GameIdea {
  id: string;
  raw: string;
  genre: string;
  timestamp: string;
}

const SAVED_IDEAS_KEY = "gameforge_saved_ideas";

function getSavedIdeas(): GameIdea[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SAVED_IDEAS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveIdeas(ideas: GameIdea[]) {
  localStorage.setItem(SAVED_IDEAS_KEY, JSON.stringify(ideas));
}

const FALLBACK_TITLES = [
  "Chrono Drift", "Void Walker", "Pixel Rebellion", "Ember Quest",
  "Shadow Grid", "Neon Harvest", "Storm Forge", "Ghost Circuit",
  "Rune Breaker", "Flux Engine", "Iron Tide", "Prism Shift",
];
const FALLBACK_MECHANICS = [
  "time manipulation", "gravity shifting", "deck building with real-time combat",
  "base building with tower defense", "stealth with rhythm mechanics",
  "procedural storytelling", "ecosystem simulation", "paint-based terraforming",
  "cooperative puzzle solving", "momentum-based movement",
];
const FALLBACK_HOOKS = [
  "every death reshapes the world", "enemies learn from your playstyle",
  "the soundtrack adapts to your choices", "you play as the villain",
  "the map is your inventory", "multiplayer where players are asymmetric",
  "the game remembers across playthroughs", "AI generates unique bosses",
];
const FALLBACK_SETTINGS = [
  "a dying space station", "a cursed medieval kingdom", "inside a computer",
  "a flooded cyberpunk city", "the dreams of a sleeping god",
  "a world made entirely of sound", "an alternate 1920s",
];

function generateFallbackIdea(genre: string, theme: string): string {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const title = pick(FALLBACK_TITLES);
  const mechanic = pick(FALLBACK_MECHANICS);
  const hook = pick(FALLBACK_HOOKS);
  const setting = theme || pick(FALLBACK_SETTINGS);

  return `**Game Title:** ${title}

**Elevator Pitch:** A ${genre.toLowerCase() || "unique"} game set in ${setting} where ${mechanic} meets unexpected twists. ${hook.charAt(0).toUpperCase() + hook.slice(1)}.

**Core Mechanic:** ${mechanic.charAt(0).toUpperCase() + mechanic.slice(1)}

**Unique Hook:** ${hook.charAt(0).toUpperCase() + hook.slice(1)}

**Target Playtime:** ${Math.floor(Math.random() * 20 + 5)} hours

**Key Features:**
1. Procedurally generated ${setting.includes("space") ? "star systems" : "environments"} that react to player decisions
2. Deep ${mechanic} system with unlockable upgrades and synergies
3. Dynamic narrative that branches based on playstyle and choices made`;
}

export default function IdeasPage() {
  const [genre, setGenre] = useState("");
  const [theme, setTheme] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedIdeas, setSavedIdeas] = useState<GameIdea[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[IdeasPage] rendered");
    setSavedIdeas(getSavedIdeas());
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setResult("");

    const prompt = `Generate a unique game idea. Genre: ${genre || "Any"}. Setting/Theme: ${theme || "Surprise me"}. Target: ${audience || "Everyone"}. Platform: ${platform || "Any"}. Keywords: ${keywords || "None"}. Include: game title, elevator pitch (2 sentences), core mechanic, unique hook, target playtime, and 3 key features. Format with markdown bold headers for each section.`;

    try {
      console.log("[IdeasPage] calling Chutes AI");
      const response = await fetch(
        "https://llm.chutes.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " + process.env.NEXT_PUBLIC_CHUTES_API_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2.5-TEE",
            messages: [{ role: "user", content: prompt }],
            stream: false,
            max_tokens: 512,
            temperature: 0.8,
          }),
        }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        console.log("[IdeasPage] AI response received");
        setResult(content);
      } else {
        throw new Error("No content in response");
      }
    } catch (err) {
      console.log("[IdeasPage] AI failed, using fallback generator");
      setError("AI unavailable — generated a random idea instead!");
      setResult(generateFallbackIdea(genre, theme));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const idea: GameIdea = {
      id: `idea_${Date.now()}`,
      raw: result,
      genre: genre || "Mixed",
      timestamp: new Date().toISOString(),
    };
    const updated = [idea, ...savedIdeas];
    saveIdeas(updated);
    setSavedIdeas(updated);
    console.log("[IdeasPage] saved idea:", idea.id);
  };

  const handleDelete = (id: string) => {
    const updated = savedIdeas.filter((i) => i.id !== id);
    saveIdeas(updated);
    setSavedIdeas(updated);
    console.log("[IdeasPage] deleted idea:", id);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const boldMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)/);
      if (boldMatch) {
        return (
          <div key={i} className={i > 0 ? "mt-3" : ""}>
            <span className="text-sm font-semibold text-[#F59E0B]">
              {boldMatch[1]}
            </span>
            {boldMatch[2] && (
              <span className="text-sm text-[#D1D5DB]"> {boldMatch[2]}</span>
            )}
          </div>
        );
      }
      const listMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (listMatch) {
        return (
          <div key={i} className="ml-4 mt-1 flex gap-2 text-sm text-[#D1D5DB]">
            <span className="text-[#F59E0B]">{listMatch[1]}.</span>
            {listMatch[2]}
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-sm text-[#D1D5DB]">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/tools"
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          All Tools
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10">
            <Lightbulb className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Game Idea Generator</h1>
            <p className="text-sm text-[#9CA3AF]">
              Get unique game concepts powered by AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[#9CA3AF]">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="">Any genre</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#9CA3AF]">
                Theme / Setting
              </label>
              <input
                type="text"
                placeholder="e.g. underwater city, post-apocalyptic..."
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#9CA3AF]">
                Target Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="">Any audience</option>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#9CA3AF]">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="">Any platform</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#9CA3AF]">
                Keywords (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. co-op, pixel art, story-driven..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Idea
                </>
              )}
            </button>
          </div>

          {/* Saved Ideas Toggle */}
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex w-full items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-3.5 text-sm transition-colors hover:border-[#F59E0B]/30"
          >
            <div className="flex items-center gap-2 text-[#9CA3AF]">
              <Bookmark className="h-4 w-4" />
              Saved Ideas
              <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs">
                {savedIdeas.length}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[#6B7280] transition-transform ${
                showSaved ? "rotate-180" : ""
              }`}
            />
          </button>

          {showSaved && savedIdeas.length > 0 && (
            <div className="space-y-2">
              {savedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                        {idea.genre}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {new Date(idea.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="rounded p-1 text-[#6B7280] transition-colors hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setResult(idea.raw)}
                    className="mt-2 text-left text-xs text-[#9CA3AF] line-clamp-3 hover:text-[#D1D5DB] transition-colors"
                  >
                    {idea.raw.slice(0, 150)}...
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 min-h-[400px]">
            {!result && !loading && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F59E0B]/10">
                  <Lightbulb className="h-8 w-8 text-[#F59E0B]" />
                </div>
                <p className="mt-4 text-sm font-medium text-[#9CA3AF]">
                  Set your parameters and hit Generate
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  The AI will create a unique game concept for you
                </p>
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                <p className="mt-4 text-sm text-[#9CA3AF]">
                  Cooking up something unique...
                </p>
              </div>
            )}

            {result && !loading && (
              <div>
                {error && (
                  <div className="mb-4 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-2.5 text-xs text-[#F59E0B]">
                    {error}
                  </div>
                )}

                <div className="space-y-1">{renderMarkdown(result)}</div>

                <div className="mt-6 flex gap-2 border-t border-[#2A2A2A] pt-4">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#10B981]/30 hover:text-[#10B981]"
                  >
                    <Save className="h-4 w-4" />
                    Save Idea
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
