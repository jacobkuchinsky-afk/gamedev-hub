"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Type,
  Monitor,
  Star,
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
  {
    href: "/dashboard/tools/fonts",
    icon: Type,
    name: "Font Preview",
    description:
      "Preview how different fonts look for game UI and titles. Compare, apply effects, and copy CSS snippets.",
    color: "#E879F9",
    category: "Art & Design",
  },
  {
    href: "/dashboard/tools/resolution",
    icon: Monitor,
    name: "Resolution Guide",
    description:
      "Visual resolution comparison, aspect ratio calculator, platform recommendations, and sprite density info.",
    color: "#38BDF8",
    category: "Game Design",
  },
];

const CATEGORIES: Category[] = ["All", "Art & Design", "Audio", "Game Design", "AI-Powered", "Level Design", "Animation"];

const FAVORITES_KEY = "gameforge_fav_tools";

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const toggleFavorite = useCallback((href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(href)
        ? prev.filter((f) => f !== href)
        : [...prev, href];
      saveFavorites(next);
      return next;
    });
  }, []);

  const favTools = useMemo(
    () => TOOLS.filter((t) => favorites.includes(t.href)),
    [favorites]
  );

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

      {/* Quick Access Favorites */}
      <div>
        <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          <Star className="h-3.5 w-3.5 text-[#F59E0B]" />
          Quick Access
        </h2>
        {favTools.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {favTools.map((tool) => (
              <Link
                key={`fav-${tool.href}`}
                href={tool.href}
                className="group flex shrink-0 items-center gap-2.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2.5 transition-all hover:border-[#F59E0B]/30"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${tool.color}15` }}
                >
                  <tool.icon className="h-4 w-4" style={{ color: tool.color }} />
                </div>
                <span className="text-sm font-medium text-[#D1D5DB] group-hover:text-[#F59E0B] transition-colors">
                  {tool.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#2A2A2A] px-4 py-3">
            <Star className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="text-xs text-[#6B7280]">
              Star your most-used tools for quick access
            </span>
          </div>
        )}
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
          {filtered.map((tool) => {
            const isFav = favorites.includes(tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#F59E0B]/30"
              >
                <button
                  onClick={(e) => toggleFavorite(tool.href, e)}
                  className={`absolute right-3 top-3 rounded-md p-1.5 transition-all ${
                    isFav
                      ? "text-[#F59E0B]"
                      : "text-[#3A3A3A] opacity-0 group-hover:opacity-100 hover:text-[#F59E0B]"
                  }`}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star className={`h-4 w-4 ${isFav ? "fill-[#F59E0B]" : ""}`} />
                </button>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
