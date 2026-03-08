"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gamepad2, Swords, Puzzle, BookOpen, Sparkles, Calendar, Wand2, Loader2 } from "lucide-react";
import Link from "next/link";
import { addProject, type Project } from "@/lib/store";
import { useToast } from "@/components/Toast";

const ENGINES = ["Unity", "Unreal", "Godot", "GameMaker", "Custom"];
const GENRES = [
  "RPG",
  "Platformer",
  "FPS",
  "Puzzle",
  "Strategy",
  "Simulation",
  "Horror",
  "Racing",
  "Other",
];
const COVER_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#84CC16",
];

const DESCRIPTION_MAX = 500;

interface QuickTemplate {
  label: string;
  icon: React.ReactNode;
  genre: string;
  engine: string;
  description: string;
  color: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: "2D Platformer",
    icon: <Gamepad2 className="h-5 w-5" />,
    genre: "Platformer",
    engine: "Godot",
    description: "A side-scrolling 2D platformer with tight controls, collectibles, and challenging level design.",
    color: "#10B981",
  },
  {
    label: "RPG",
    icon: <Swords className="h-5 w-5" />,
    genre: "RPG",
    engine: "Unity",
    description: "An immersive RPG with character progression, quests, inventory management, and turn-based combat.",
    color: "#6366F1",
  },
  {
    label: "Puzzle Game",
    icon: <Puzzle className="h-5 w-5" />,
    genre: "Puzzle",
    engine: "Godot",
    description: "A brain-teasing puzzle game with progressively harder levels, hints, and satisfying solve mechanics.",
    color: "#F59E0B",
  },
  {
    label: "Visual Novel",
    icon: <BookOpen className="h-5 w-5" />,
    genre: "Other",
    engine: "Custom",
    description: "A story-driven visual novel with branching narratives, character dialogue, and multiple endings.",
    color: "#EC4899",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState("Godot");
  const [genre, setGenre] = useState("RPG");
  const [coverColor, setCoverColor] = useState("#6366F1");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [suggestingNames, setSuggestingNames] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);

  async function suggestNames() {
    setSuggestingNames(true);
    setNameSuggestions([]);
    try {
      const desc = description.trim() || "a fun and engaging game";
      const prompt = `Suggest 5 catchy game titles for a ${genre} game described as: '${desc}'. Just list the names, one per line. Be creative and memorable.`;
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
          temperature: 0.9,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const names = content
        .split("\n")
        .map((line: string) => line.replace(/^\d+[\.\)\-]\s*/, "").replace(/^\*+\s*/, "").replace(/\*+$/, "").trim())
        .filter((line: string) => line.length > 0 && line.length < 60);
      setNameSuggestions(names.slice(0, 5));
    } catch {
      toast({ title: "Couldn't get suggestions", description: "Check your API key or try again", type: "error" });
    } finally {
      setSuggestingNames(false);
    }
  }

  async function suggestDescription() {
    if (!genre) return;
    setAiDescLoading(true);
    try {
      const gameName = name.trim() || "an untitled game";
      const prompt = `Write a brief game project description for a ${genre} game called '${gameName}'. 2-3 sentences describing the concept, target audience, and unique angle. Be specific and compelling.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.trim().replace(/^["']|["']$/g, "");
      if (cleaned && cleaned.length <= DESCRIPTION_MAX) {
        setDescription(cleaned);
      } else if (cleaned) {
        setDescription(cleaned.slice(0, DESCRIPTION_MAX));
      }
    } catch {
      toast({ title: "Couldn't generate description", description: "Check your API key or try again", type: "error" });
    } finally {
      setAiDescLoading(false);
    }
  }

  function applyTemplate(tpl: QuickTemplate) {
    setGenre(tpl.genre);
    setEngine(tpl.engine);
    setDescription(tpl.description);
    setCoverColor(tpl.color);
    setActiveTemplate(tpl.label);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!name.trim()) return;

    setSubmitting(true);
    const project = addProject({
      name: name.trim(),
      description: description.trim(),
      engine,
      genre,
      status: "concept" as Project["status"],
      coverColor,
    });
    toast({ title: "Project created!", description: `${name.trim()} is ready to go`, type: "success" });
    router.push(`/dashboard/projects/${project.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Create New Project</h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Set up a new game development project
        </p>
      </div>

      {/* Quick Templates */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-medium text-[#D1D5DB]">Quick Templates</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all hover:scale-[1.02] ${
                activeTemplate === tpl.label
                  ? "border-[#F59E0B] bg-[#F59E0B]/5"
                  : "border-[#2A2A2A] hover:border-[#3A3A3A]"
              }`}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${tpl.color}20`, color: tpl.color }}
              >
                {tpl.icon}
              </div>
              <span className="text-xs font-medium text-[#D1D5DB]">{tpl.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Project Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Game"
              className={`w-full rounded-lg border bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50 ${
                attempted && !name.trim() ? "border-[#EF4444]" : "border-[#2A2A2A]"
              }`}
            />
            {attempted && !name.trim() && (
              <p className="mt-1 text-xs text-[#EF4444]">Project name is required</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={suggestNames}
                disabled={suggestingNames}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-50"
              >
                {suggestingNames ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {suggestingNames ? "Thinking..." : "AI Suggest Names"}
              </button>
              {nameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setName(suggestion);
                    setNameSuggestions([]);
                  }}
                  className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#D1D5DB] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 hover:text-[#F59E0B]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[#D1D5DB]">Description</label>
                <button
                  type="button"
                  onClick={suggestDescription}
                  disabled={aiDescLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-50"
                >
                  {aiDescLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {aiDescLoading ? "Writing..." : "AI Help"}
                </button>
              </div>
              <span className={`text-xs ${description.length > DESCRIPTION_MAX ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX) {
                  setDescription(e.target.value);
                }
              }}
              placeholder="What's this game about?"
              rows={3}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50 resize-none"
            />
          </div>

          {/* Engine */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Engine
            </label>
            <div className="flex flex-wrap gap-2">
              {ENGINES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEngine(e)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    engine === e
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#F5F5F5]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    genre === g
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#F5F5F5]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Color */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Cover Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  className={`h-8 w-8 rounded-lg border-2 transition-all ${
                    coverColor === c
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Target Launch Date */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#D1D5DB]">
              <Calendar className="h-4 w-4 text-[#F59E0B]" />
              Target Launch Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50 [color-scheme:dark]"
            />
            {targetDate && (
              <p className="mt-1.5 text-xs text-[#6B7280]">
                {(() => {
                  const diff = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (diff < 0) return "This date is in the past";
                  if (diff === 0) return "That's today!";
                  const weeks = Math.floor(diff / 7);
                  const months = Math.floor(diff / 30);
                  if (months > 0) return `~${months} month${months > 1 ? "s" : ""} from now`;
                  if (weeks > 0) return `~${weeks} week${weeks > 1 ? "s" : ""} from now`;
                  return `${diff} day${diff > 1 ? "s" : ""} from now`;
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="h-2" style={{ backgroundColor: coverColor }} />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${coverColor}20` }}
              >
                <Gamepad2 className="h-5 w-5" style={{ color: coverColor }} />
              </div>
              <div>
                <p className="font-semibold">
                  {name || "Project Name"}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {engine} &middot; {genre} &middot; Concept
                  {targetDate && ` \u00B7 Launch: ${targetDate}`}
                </p>
              </div>
            </div>
            {description && (
              <p className="mt-3 text-sm text-[#9CA3AF]">{description}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
