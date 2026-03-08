"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Save,
  FileText,
  Gamepad2,
  BookOpen,
  Palette,
  Volume2,
  Cpu,
  DollarSign,
  Flag,
  RotateCcw,
  Download,
} from "lucide-react";
import { getProject, type Project } from "@/lib/store";

interface GDDSection {
  id: string;
  title: string;
  icon: React.ElementType;
  fields: GDDField[];
}

interface GDDField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  options?: string[];
}

const GDD_SECTIONS: GDDSection[] = [
  {
    id: "overview",
    title: "Overview",
    icon: FileText,
    fields: [
      { key: "gameTitle", label: "Game Title", type: "text", placeholder: "e.g. Constellar" },
      { key: "tagline", label: "Tagline", type: "text", placeholder: "A short, punchy description" },
      { key: "elevatorPitch", label: "Elevator Pitch", type: "textarea", placeholder: "Describe your game in 2-3 sentences as if pitching to a publisher..." },
      { key: "targetAudience", label: "Target Audience", type: "text", placeholder: "e.g. Casual gamers aged 18-35" },
      { key: "platforms", label: "Platforms", type: "text", placeholder: "e.g. PC, Switch, PS5" },
      { key: "genre", label: "Genre", type: "text", placeholder: "e.g. Action RPG, Metroidvania" },
    ],
  },
  {
    id: "coreMechanics",
    title: "Core Mechanics",
    icon: Gamepad2,
    fields: [
      { key: "gameplayLoop", label: "Primary Gameplay Loop", type: "textarea", placeholder: "Describe the core loop: what does the player do every 30 seconds? Every 5 minutes? Every session?" },
      { key: "controls", label: "Controls", type: "textarea", placeholder: "Describe the control scheme. Keyboard/mouse? Controller? Touch?" },
      { key: "cameraType", label: "Camera Type", type: "select", placeholder: "Select camera type", options: ["First Person", "Third Person", "Top-Down", "Side-Scrolling", "Isometric", "Fixed", "Free Camera"] },
      { key: "coreVerbs", label: "Core Verbs", type: "text", placeholder: "e.g. Jump, Shoot, Build, Explore, Craft" },
    ],
  },
  {
    id: "storySetting",
    title: "Story & Setting",
    icon: BookOpen,
    fields: [
      { key: "setting", label: "Setting", type: "textarea", placeholder: "Where does the game take place? Describe the world." },
      { key: "timePeriod", label: "Time Period", type: "text", placeholder: "e.g. Far future, Medieval fantasy, Modern day" },
      { key: "protagonist", label: "Protagonist", type: "textarea", placeholder: "Who is the player character? What drives them?" },
      { key: "antagonist", label: "Antagonist", type: "textarea", placeholder: "Who or what opposes the player?" },
      { key: "narrativeStyle", label: "Narrative Style", type: "select", placeholder: "Select narrative style", options: ["Linear", "Branching", "Open World", "Environmental Storytelling", "Emergent", "No Story"] },
      { key: "themes", label: "Themes", type: "text", placeholder: "e.g. Survival, Discovery, Redemption" },
    ],
  },
  {
    id: "artDirection",
    title: "Art Direction",
    icon: Palette,
    fields: [
      { key: "visualStyle", label: "Visual Style", type: "select", placeholder: "Select visual style", options: ["Pixel Art", "Low-Poly", "Realistic", "Stylized/Cel-Shaded", "Hand-Drawn", "Voxel", "Vector", "Mixed Media"] },
      { key: "colorPalette", label: "Color Palette Notes", type: "textarea", placeholder: "Describe the color mood. Warm? Cold? Neon? Muted? Reference specific hex codes if you have them." },
      { key: "referenceImages", label: "Reference Images (URLs)", type: "textarea", placeholder: "Paste links to reference images, mood boards, or inspiration. One per line." },
      { key: "uiStyle", label: "UI Style", type: "textarea", placeholder: "Describe the UI approach. Diegetic? Minimalist? HUD-heavy? Describe menus, fonts, iconography." },
    ],
  },
  {
    id: "audio",
    title: "Audio",
    icon: Volume2,
    fields: [
      { key: "musicStyle", label: "Music Style", type: "textarea", placeholder: "Describe the soundtrack direction. Genre, mood, instruments, references." },
      { key: "soundDesign", label: "Sound Design Approach", type: "textarea", placeholder: "How should the game sound? Realistic? Exaggerated? Retro chiptune?" },
      { key: "voiceActing", label: "Voice Acting", type: "select", placeholder: "Voice acting plan", options: ["Full Voice Acting", "Partial (Key Scenes)", "Grunts/Reactions Only", "No Voice Acting"] },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    icon: Cpu,
    fields: [
      { key: "engine", label: "Engine", type: "text", placeholder: "e.g. Unity, Unreal, Godot, Custom" },
      { key: "targetFPS", label: "Target FPS", type: "select", placeholder: "Select target", options: ["30 FPS", "60 FPS", "120 FPS", "Uncapped"] },
      { key: "minSpecs", label: "Minimum Specs", type: "textarea", placeholder: "CPU, GPU, RAM requirements for minimum playable experience" },
      { key: "networking", label: "Networking", type: "select", placeholder: "Select networking model", options: ["Singleplayer Only", "Local Co-op", "Online Multiplayer", "MMO", "Async Multiplayer"] },
      { key: "techPlatforms", label: "Target Platforms", type: "text", placeholder: "e.g. Windows, macOS, Linux, Switch, PS5, Xbox" },
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    icon: DollarSign,
    fields: [
      { key: "model", label: "Business Model", type: "select", placeholder: "Select model", options: ["Premium (Pay Once)", "Free-to-Play", "Freemium", "Subscription", "DLC/Expansion Packs", "Early Access"] },
      { key: "pricePoint", label: "Price Point", type: "text", placeholder: "e.g. $19.99, $29.99, Free" },
      { key: "iapStrategy", label: "IAP / DLC Strategy", type: "textarea", placeholder: "If applicable, describe what you'd sell. Cosmetics? Expansions? Season passes?" },
    ],
  },
  {
    id: "milestones",
    title: "Milestones",
    icon: Flag,
    fields: [
      { key: "prototype", label: "Prototype", type: "text", placeholder: "Target date and deliverables for prototype" },
      { key: "alpha", label: "Alpha", type: "text", placeholder: "Target date and deliverables for alpha" },
      { key: "beta", label: "Beta", type: "text", placeholder: "Target date and deliverables for beta" },
      { key: "launch", label: "Launch", type: "text", placeholder: "Target launch date and launch deliverables" },
      { key: "postLaunch", label: "Post-Launch", type: "textarea", placeholder: "Post-launch plans: patches, DLC, content updates, community support" },
    ],
  },
];

const CONSTELLAR_SEED: Record<string, string> = {
  gameTitle: "Constellar",
  tagline: "Chart the stars. Build your legacy. Survive the void.",
  elevatorPitch: "A space exploration game where players navigate procedurally generated star systems, build outposts on alien worlds, and uncover ancient artifacts left by a long-dead civilization. Combines real-time combat with strategic base building and a mystery-driven narrative.",
  targetAudience: "Core gamers aged 16-35 who enjoy exploration, crafting, and sci-fi narratives. Fans of No Man's Sky, Subnautica, and Outer Wilds.",
  platforms: "PC (Steam), PlayStation 5, Xbox Series X",
  genre: "Space Exploration / Action-Adventure",
  gameplayLoop: "Explore star system -> Scan planets -> Land and gather resources -> Build outpost -> Discover artifacts -> Decode alien lore -> Upgrade ship -> Jump to next system. Combat encounters with hostile ships and alien creatures break up exploration. Each session should feel like a self-contained adventure with long-term progression.",
  controls: "Keyboard + Mouse (primary), full controller support. WASD for ship movement, mouse for aiming/camera. Context-sensitive interactions. Radial menu for quick access to tools and weapons.",
  cameraType: "Third Person",
  coreVerbs: "Explore, Scan, Build, Fight, Trade, Discover",
  setting: "A galaxy on the edge of known space, filled with procedurally generated star systems. Ancient ruins dot habitable planets, left by the Architects — a civilization that vanished millennia ago. Space stations serve as trading hubs between frontier colonies.",
  timePeriod: "Far future — humanity has achieved FTL travel but is still expanding into uncharted regions",
  protagonist: "A Pathfinder — an independent explorer contracted by the Frontier Authority to chart new systems, establish outposts, and investigate Architect sites. Customizable appearance and backstory.",
  antagonist: "The Void Collective — a rogue faction that believes Architect technology should be weaponized. Also: the mystery of what destroyed the Architects themselves.",
  narrativeStyle: "Environmental Storytelling",
  themes: "Discovery, Isolation, Legacy, the cost of progress",
  visualStyle: "Stylized/Cel-Shaded",
  colorPalette: "Deep space blues and purples for void. Warm amber/gold for Architect technology. Vibrant alien biomes with each planet having a distinct color identity. UI uses amber (#F59E0B) on dark backgrounds.",
  referenceImages: "https://www.artstation.com/artwork/space-exploration-concept\nhttps://www.pinterest.com/pin/sci-fi-outpost-design\nhttps://dribbble.com/shots/space-game-ui",
  uiStyle: "Minimalist sci-fi HUD. Holographic elements that feel diegetic. Clean sans-serif fonts. Amber accent color. Information density increases in menus but gameplay HUD stays minimal — health, shield, compass, objective marker.",
  musicStyle: "Ambient electronic with orchestral swells for key moments. Synth pads for exploration, driving percussion for combat. Inspired by the soundtracks of Mass Effect, Interstellar, and Outer Wilds.",
  soundDesign: "Realistic with stylized accents. Ship engines hum, airlocks hiss, weapons have punch. Alien environments have unique ambient soundscapes. Audio cues for nearby artifacts (ethereal tones).",
  voiceActing: "Partial (Key Scenes)",
  engine: "Custom Engine (C++ with Vulkan renderer)",
  targetFPS: "60 FPS",
  minSpecs: "CPU: Intel i5-10400 / Ryzen 5 3600\nGPU: GTX 1060 / RX 580\nRAM: 8GB\nStorage: 20GB SSD",
  networking: "Singleplayer Only",
  techPlatforms: "Windows, PlayStation 5, Xbox Series X|S",
  model: "Premium (Pay Once)",
  pricePoint: "$29.99",
  iapStrategy: "No microtransactions. Post-launch DLC expansions planned — new star systems, story chapters, and ship types. First expansion ~6 months after launch.",
  prototype: "2025-11-15 — Core flight model, procedural planet generation, basic landing",
  alpha: "2026-01-30 — Combat system, outpost building, 3 hand-crafted story missions",
  beta: "2026-03-01 — Full gameplay loop, trading, 10+ star systems, save/load",
  launch: "2026-06-15 — Polished release with 50+ star systems, full story arc, Steam achievements",
  postLaunch: "Month 1: Bug fixes and QoL patches\nMonth 3: Free content update (new biomes, ship customization)\nMonth 6: Paid DLC — 'The Architect's Wake' (new story chapter, 15 new systems)\nOngoing: Community mod support tools",
};

function getGDDKey(projectId: string) {
  return `gameforge_gdd_${projectId}`;
}

function loadGDD(projectId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(getGDDKey(projectId));
  if (raw) return JSON.parse(raw);
  if (projectId === "proj_001") {
    localStorage.setItem(getGDDKey(projectId), JSON.stringify(CONSTELLAR_SEED));
    return { ...CONSTELLAR_SEED };
  }
  return {};
}

function saveGDD(projectId: string, data: Record<string, string>) {
  localStorage.setItem(getGDDKey(projectId), JSON.stringify(data));
}

export default function GDDPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    console.log("[GDDPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setData(loadGDD(projectId));
    const initial: Record<string, boolean> = {};
    GDD_SECTIONS.forEach((s) => (initial[s.id] = true));
    setExpanded(initial);
  }, [projectId, router]);

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      setDirty(true);
      setSaved(false);
    },
    []
  );

  const handleSave = useCallback(() => {
    saveGDD(projectId, data);
    setSaved(true);
    setDirty(false);
    console.log("[GDD] Saved document for project:", projectId);
    setTimeout(() => setSaved(false), 2000);
  }, [projectId, data]);

  const handleReset = useCallback(() => {
    if (!confirm("Reset all GDD fields to empty? This cannot be undone.")) return;
    const empty: Record<string, string> = {};
    setData(empty);
    saveGDD(projectId, empty);
    setDirty(false);
    console.log("[GDD] Reset document for project:", projectId);
  }, [projectId]);

  const handleExport = useCallback(() => {
    const lines: string[] = [`# ${project?.name || "Untitled"} — Game Design Document\n`];

    for (const section of GDD_SECTIONS) {
      const fieldValues = section.fields
        .filter((f) => data[f.key]?.trim())
        .map((f) => `**${f.label}:** ${data[f.key]}`);
      if (fieldValues.length === 0) continue;
      lines.push(`## ${section.title}\n`);
      for (const val of fieldValues) {
        lines.push(val);
        lines.push("");
      }
    }

    lines.push("---");
    lines.push(`\n*Generated by GameForge on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*`);

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project?.name || "untitled").toLowerCase().replace(/\s+/g, "-")}-gdd.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, data]);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filledFields = Object.values(data).filter((v) => v.trim().length > 0).length;
  const totalFields = GDD_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0);
  const completionPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  if (!project) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Game Design Document</h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Define every aspect of {project.name} in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Download className="h-3.5 w-3.5" />
              Export .md
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                saved
                  ? "bg-[#10B981] text-white"
                  : dirty
                  ? "bg-[#F59E0B] text-[#0F0F0F] hover:bg-[#F59E0B]/90"
                  : "bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {saved ? "Saved!" : dirty ? "Save Changes" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#9CA3AF]">Document Completion</span>
          <span className="font-medium text-[#F59E0B]">{completionPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
          <div
            className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">
          {filledFields} of {totalFields} fields completed
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {GDD_SECTIONS.map((section) => {
          const isOpen = expanded[section.id] ?? false;
          const sectionFilled = section.fields.filter(
            (f) => data[f.key]?.trim().length > 0
          ).length;
          const sectionTotal = section.fields.length;

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <section.icon className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold">{section.title}</span>
                  <span className="ml-2 text-xs text-[#6B7280]">
                    {sectionFilled}/{sectionTotal} filled
                  </span>
                </div>
                {sectionFilled === sectionTotal && sectionTotal > 0 ? (
                  <span className="mr-2 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">
                    Complete
                  </span>
                ) : sectionFilled > 0 ? (
                  <span className="mr-2 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                    In Progress
                  </span>
                ) : null}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-[#2A2A2A] px-5 py-5">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
                        {field.label}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          value={data[field.key] || ""}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={4}
                          className="w-full resize-y rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={data[field.key] || ""}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                        >
                          <option value="" className="text-[#6B7280]">
                            {field.placeholder}
                          </option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={data[field.key] || ""}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
