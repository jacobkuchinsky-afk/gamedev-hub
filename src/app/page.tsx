"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Target,
  Rocket,
  Palette,
  Music,
  Swords,
  BookOpen,
  Calculator,
  MessageSquare,
  ArrowRight,
  Quote,
  Sparkles,
  Zap,
  Lightbulb,
  Globe,
  Map,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Organize",
    description:
      "Project boards, sprint tracking, and task management designed for how games are actually built. From concept to gold master.",
    color: "#3B82F6",
  },
  {
    icon: Palette,
    title: "Create",
    description:
      "Built-in sprite editor, sound generator, and color palette tools. Stop context-switching between a dozen apps.",
    color: "#F59E0B",
  },
  {
    icon: Rocket,
    title: "Ship",
    description:
      "Bug tracking with severity levels, launch checklists, and platform-specific issue management. Ship with confidence.",
    color: "#10B981",
  },
];

const tools = [
  { icon: Palette, name: "Sprite Editor", desc: "Pixel art & sprite sheets", color: "#F59E0B" },
  { icon: Music, name: "Sound Generator", desc: "SFX & ambient audio", color: "#8B5CF6" },
  { icon: Sparkles, name: "Color Palettes", desc: "Game-ready color schemes", color: "#EC4899" },
  { icon: Swords, name: "Name Generator", desc: "Characters, places, items", color: "#EF4444" },
  { icon: Calculator, name: "Balance Calculator", desc: "Stat & economy tuning", color: "#3B82F6" },
  { icon: MessageSquare, name: "Dialogue Trees", desc: "Branching conversations", color: "#10B981" },
];

const testimonials = [
  {
    quote:
      "GameForge replaced my entire workflow. Trello for tasks, separate tools for sprites, another app for sound — now it's all in one place.",
    name: "Alex Chen",
    role: "Solo Indie Dev",
    game: "Starbound Drift",
  },
  {
    quote:
      "The AI features saved me hours. The dialogue tree builder with AI continuation is incredible for writing NPC interactions.",
    name: "Maya Rivers",
    role: "Narrative Designer",
    game: "Whisperwood",
  },
  {
    quote:
      "Finally, a tool that understands game development. The launch checklist alone was worth signing up.",
    name: "Sam Torres",
    role: "2-Person Studio",
    game: "Pixel Dungeons",
  },
];

const aiFeatures = [
  {
    icon: Lightbulb,
    title: "AI Idea Generator",
    description: "Generate unique game concepts with full pitches, mechanics, and hooks",
    color: "#FBBF24",
  },
  {
    icon: Globe,
    title: "AI World Builder",
    description: "Create rich game worlds with locations, factions, and plot hooks",
    color: "#34D399",
  },
  {
    icon: Map,
    title: "AI Level Designer",
    description: "Describe a level and let AI generate the tilemap for you",
    color: "#60A5FA",
  },
  {
    icon: Sparkles,
    title: "AI Code Helper",
    description: "Auto-generate bug reports, task descriptions, GDD sections, and more",
    color: "#A78BFA",
  },
];

export default function LandingPage() {
  useEffect(() => {
    console.log("[LandingPage] rendered");
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#2A2A2A] bg-[#0F0F0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Gamepad2 className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <span className="text-lg font-bold tracking-tight">GameForge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-bold text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32 md:pb-28">
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-1.5 text-sm text-[#9CA3AF]">
            <Zap className="h-3.5 w-3.5 text-[#F59E0B]" />
            Now in open beta
          </div>
          <h1 className="animate-fade-in stagger-1 mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Build Games{" "}
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
              Better
            </span>
          </h1>
          <p className="animate-fade-in stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#9CA3AF] md:text-xl">
            The productivity platform built for game developers. Organize your project,
            track bugs, design sprites, generate sounds — all in one place.
          </p>
          <div className="animate-fade-in stagger-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-[#F59E0B] px-8 py-3.5 text-base font-bold text-[#0F0F0F] shadow-lg shadow-[#F59E0B]/20 transition-all hover:bg-[#D97706] hover:shadow-[#F59E0B]/30"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#tools"
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-8 py-3.5 text-base font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#1A1A1A]"
            >
              See Tools
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`animate-fade-in stagger-${i + 1} group rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 transition-all hover:border-[${f.color}]/30 hover:shadow-lg`}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${f.color}15` }}
              >
                <f.icon className="h-6 w-6" style={{ color: f.color }} />
              </div>
              <h3 className="mb-3 text-xl font-bold">{f.title}</h3>
              <p className="leading-relaxed text-[#9CA3AF]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools Showcase */}
      <section id="tools" className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Everything You Need to{" "}
              <span className="text-[#F59E0B]">Create</span>
            </h2>
            <p className="mt-4 text-[#9CA3AF]">
              Standalone tools that work together. No more juggling 10 different apps.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <Link
                key={tool.name}
                href="/dashboard/tools"
                className={`animate-fade-in stagger-${i + 1} group flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${tool.color}15` }}
                >
                  <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
                </div>
                <div>
                  <p className="font-semibold">{tool.name}</p>
                  <p className="text-sm text-[#9CA3AF]">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI-Powered Section */}
      <section className="relative border-t border-[#2A2A2A] py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.06)_0%,_transparent_70%)]" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#F59E0B]/[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#F59E0B]/[0.03] blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/[0.06] px-4 py-1.5 text-sm font-medium text-[#F59E0B]">
              <Sparkles className="h-3.5 w-3.5" />
              24 AI features built in
            </div>
            <h2 className="text-3xl font-bold md:text-4xl">
              <span className="text-[#F59E0B]">AI-Powered</span> Game Development
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#9CA3AF]">
              24 AI features built into every tool. Generate ideas, write documentation, design levels, analyze balance, and more.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {aiFeatures.map((feat) => (
              <div
                key={feat.title}
                className="group relative rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-7 transition-all hover:border-[#F59E0B]/25 hover:bg-[#1F1F1F]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-[#F59E0B]/[0.02] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${feat.color}15` }}
                  >
                    <feat.icon className="h-6 w-6" style={{ color: feat.color }} />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-lg font-bold">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-[#9CA3AF]">{feat.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-[#2A2A2A] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Get Started in <span className="text-[#F59E0B]">Minutes</span>
            </h2>
            <p className="mt-4 text-[#9CA3AF]">
              Three steps. Zero friction. Start building your game today.
            </p>
          </div>

          <div className="relative mx-auto grid max-w-3xl gap-12 md:grid-cols-3 md:gap-8">
            <div className="absolute left-[calc(16.67%-0.5px)] right-[calc(16.67%-0.5px)] top-7 hidden h-px bg-gradient-to-r from-[#F59E0B]/40 via-[#F59E0B]/20 to-[#F59E0B]/40 md:block" />

            {[
              { step: "1", title: "Sign Up", desc: "Create your free account in seconds. No credit card, no strings." },
              { step: "2", title: "Create a Project", desc: "Name your game, pick a genre, and your workspace is ready to go." },
              { step: "3", title: "Start Building", desc: "Use tools, track progress, write your GDD, and ship your game." },
            ].map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#F59E0B] bg-[#0F0F0F] text-xl font-bold text-[#F59E0B]">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#9CA3AF]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-lg text-center">
            <BookOpen className="mx-auto mb-4 h-8 w-8 text-[#F59E0B]" />
            <p className="text-2xl font-bold">Built by game devs, for game devs</p>
            <p className="mt-3 text-[#9CA3AF]">
              We got tired of using project management tools that don&apos;t understand game
              development. So we built one that does.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`animate-fade-in stagger-${i + 1} group relative rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-7 transition-all hover:border-[#F59E0B]/25`}
              >
                <Quote className="mb-4 h-8 w-8 text-[#F59E0B]/30" />
                <p className="text-sm leading-relaxed text-[#D1D5DB]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-[#2A2A2A] pt-4">
                  <p className="text-sm font-semibold text-[#F5F5F5]">{t.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{t.role}</p>
                  <p className="mt-1 text-xs text-[#F59E0B]">Working on {t.game}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#2A2A2A] py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to forge your next game?</h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Join game developers who ship faster with GameForge.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-[#F59E0B] px-8 py-3.5 text-base font-bold text-[#0F0F0F] shadow-lg shadow-[#F59E0B]/20 transition-all hover:bg-[#D97706] hover:shadow-[#F59E0B]/30"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#tools"
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-8 py-3.5 text-base font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#1A1A1A]"
            >
              See Tools
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Gamepad2 className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <span className="font-bold">GameForge</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-[#9CA3AF]">
              <Link href="/login" className="transition-colors hover:text-[#F59E0B]">
                Sign In
              </Link>
              <Link href="/signup" className="transition-colors hover:text-[#F59E0B]">
                Sign Up
              </Link>
              <Link href="/dashboard" className="transition-colors hover:text-[#F59E0B]">
                Dashboard
              </Link>
              <Link href="/dashboard/tools" className="transition-colors hover:text-[#F59E0B]">
                Tools
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-[#2A2A2A] pt-8 text-center">
            <p className="text-sm text-[#6B7280]">
              Built for game developers &middot; &copy; 2026 GameForge
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
