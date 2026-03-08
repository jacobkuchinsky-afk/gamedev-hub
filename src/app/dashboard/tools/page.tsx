"use client";

import { useEffect } from "react";
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
} from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/tools/sprites",
    icon: Paintbrush,
    name: "Sprite Editor",
    description:
      "Create and edit pixel art sprites with layers, animation frames, and export tools.",
    color: "#F59E0B",
  },
  {
    href: "/dashboard/tools/sounds",
    icon: Music,
    name: "Sound Generator",
    description:
      "Generate retro sound effects, ambient loops, and UI sounds for your game.",
    color: "#8B5CF6",
  },
  {
    href: "/dashboard/tools/colors",
    icon: Palette,
    name: "Color Palettes",
    description:
      "Browse curated game color palettes or generate custom ones for your art style.",
    color: "#10B981",
  },
  {
    href: "/dashboard/tools/names",
    icon: ScrollText,
    name: "Name Generator",
    description:
      "Generate character names, place names, item names, and lore for your world.",
    color: "#3B82F6",
  },
  {
    href: "/dashboard/tools/balance",
    icon: Calculator,
    name: "Balance Calculator",
    description:
      "Crunch numbers for DPS, health pools, economy curves, and progression systems.",
    color: "#EF4444",
  },
  {
    href: "/dashboard/tools/dialogue",
    icon: MessageSquare,
    name: "Dialogue Trees",
    description:
      "Build branching dialogue with conditions, variables, and NPC personality.",
    color: "#EC4899",
  },
  {
    href: "/dashboard/tools/ideas",
    icon: Lightbulb,
    name: "AI Idea Generator",
    description:
      "Generate unique game concepts with AI — get titles, mechanics, hooks, and full pitches instantly.",
    color: "#F59E0B",
  },
];

export default function ToolsPage() {
  useEffect(() => {
    console.log("[ToolsPage] rendered");
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Dev Tools</h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Utilities and generators to speed up your game development workflow
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#F59E0B]/30"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${tool.color}15` }}
            >
              <tool.icon
                className="h-6 w-6"
                style={{ color: tool.color }}
              />
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
    </div>
  );
}
