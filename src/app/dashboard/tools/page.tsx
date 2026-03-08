"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Paintbrush,
  Music,
  Palette,
  ScrollText,
  Calculator,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Map,
  Sparkles,
  Film,
  Activity,
  Search,
} from "lucide-react";

type Category = "All" | "Art & Design" | "Audio" | "Game Design" | "AI-Powered" | "Level Design" | "Animation";

const TOOLS: {
  href: string;
  icon: typeof Paintbrush;
  name: string;
  description: string;
  color: string;
  category: Category;
}[] = [
  {
    href: "/dashboard/tools/sprites",
    icon: Paintbrush,
    name: "Sprite Editor",
    description:
      "Create and edit pixel art sprites with layers, animation frames, and export tools.",
    color: "#F59E0B",
    category: "Art & Design",
  },
  {
    href: "/dashboard/tools/sounds",
    icon: Music,
    name: "Sound Generator",
    description:
      "Generate retro sound effects, ambient loops, and UI sounds for your game.",
    color: "#8B5CF6",
    category: "Audio",
  },
  {
    href: "/dashboard/tools/colors",
    icon: Palette,
    name: "Color Palettes",
    description:
      "Browse curated game color palettes or generate custom ones for your art style.",
    color: "#10B981",
    category: "Art & Design",
  },
  {
    href: "/dashboard/tools/names",
    icon: ScrollText,
    name: "Name Generator",
    description:
      "Generate character names, place names, item names, and lore for your world.",
    color: "#3B82F6",
    category: "Game Design",
  },
  {
    href: "/dashboard/tools/balance",
    icon: Calculator,
    name: "Balance Calculator",
    description:
      "Crunch numbers for DPS, health pools, economy curves, and progression systems.",
    color: "#EF4444",
    category: "Game Design",
  },
  {
    href: "/dashboard/tools/dialogue",
    icon: MessageSquare,
    name: "Dialogue Trees",
    description:
      "Build branching dialogue with conditions, variables, and NPC personality.",
    color: "#EC4899",
    category: "Game Design",
  },
  {
    href: "/dashboard/tools/ideas",
    icon: Lightbulb,
    name: "AI Idea Generator",
    description:
      "Generate unique game concepts with AI \u2014 get titles, mechanics, hooks, and full pitches instantly.",
    color: "#F59E0B",
    category: "AI-Powered",
  },
  {
    href: "/dashboard/tools/tilemap",
    icon: Map,
    name: "Tilemap Painter",
    description:
      "Paint game levels tile by tile with terrain types, multiple layers, fill tool, and JSON export.",
    color: "#22C55E",
    category: "Level Design",
  },
  {
    href: "/dashboard/tools/effects",
    icon: Sparkles,
    name: "Screen Effects",
    description:
      "Preview screen shake, flash, fade, chromatic aberration, vignette, and CRT effects in real time.",
    color: "#A855F7",
    category: "Animation",
  },
  {
    href: "/dashboard/tools/animation",
    icon: Film,
    name: "Animation Frames",
    description:
      "Draw sprite animation frames, preview with onion skinning, and export as horizontal spritesheets.",
    color: "#F97316",
    category: "Animation",
  },
  {
    href: "/dashboard/tools/easing",
    icon: Activity,
    name: "Easing Visualizer",
    description:
      "Preview and compare easing functions with live animations. Copy CSS or JS code for any curve.",
    color: "#06B6D4",
    category: "Animation",
  },
];

const CATEGORIES: Category[] = ["All", "Art & Design", "Audio", "Game Design", "AI-Powered", "Level Design", "Animation"];

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");

  useEffect(() => {
    console.log("[ToolsPage] rendered");
  }, []);

  const filtered = useMemo(() => {
    return TOOLS.filter((t) => {
      const matchesCategory = category === "All" || t.category === category;
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TOOLS.length };
    TOOLS.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Dev Tools</h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          {TOOLS.length} utilities and generators to speed up your game development workflow
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat
                ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            }`}
          >
            {cat}
            <span className="ml-1.5 text-[10px] opacity-60">{categoryCounts[cat] || 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-[#2A2A2A]" />
          <p className="mt-4 text-sm text-[#6B7280]">
            No tools match &ldquo;{search}&rdquo;{category !== "All" && ` in ${category}`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#F59E0B]/30"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${tool.color}15` }}
                >
                  <tool.icon
                    className="h-6 w-6"
                    style={{ color: tool.color }}
                  />
                </div>
                <span className="rounded-md bg-[#0F0F0F] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                  {tool.category}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-[#F5F5F5] group-hover:text-[#F59E0B] transition-colors">
                {tool.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                {tool.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#F59E0B] opacity-0 transition-opacity group-hover:opacity-100">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
