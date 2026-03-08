"use client";

import { useEffect, useRef, useState } from "react";
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
  Twitter,
  Github,
  MessageCircle,
  Heart,
  ChevronDown,
  Check,
  Menu,
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

const faqs = [
  {
    q: "Is GameForge free?",
    a: "Yes, GameForge is completely free to use. All tools, AI features, and project management capabilities are included.",
  },
  {
    q: "Do I need to install anything?",
    a: "No, GameForge runs entirely in your browser. Just sign up and start building.",
  },
  {
    q: "How does the AI work?",
    a: "GameForge uses advanced AI to help with every aspect of game development - from generating ideas to writing code to planning launches. All AI features work in real-time.",
  },
  {
    q: "Can I export my data?",
    a: "Yes, every part of GameForge can be exported as JSON, Markdown, CSV, or PDF. Your data is always yours.",
  },
  {
    q: "What game engines are supported?",
    a: "GameForge is engine-agnostic. It works with Unity, Godot, Unreal, Love2D, Phaser, or any custom engine.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<number, boolean>>({});
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const navRef = useRef<HTMLElement | null>(null);
  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  useEffect(() => {
    const onScroll = () => {
      const opacity = Math.max(0, 1 - window.scrollY / 200);
      setScrollOpacity(opacity);
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let observer: IntersectionObserver | null = null;

    try {
      const elToIndex = new Map<Element, number>();
      const elements: HTMLElement[] = [];
      sectionRefs.current.forEach((el, i) => {
        if (el) {
          elToIndex.set(el, i);
          elements.push(el);
        }
      });
      if (elements.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const index = elToIndex.get(entry.target);
            if (index !== undefined && entry.isIntersecting) {
              setVisibleSections((prev) => ({ ...prev, [index]: true }));
            }
          });
        },
        { threshold: 0.1 }
      );

      elements.forEach((el) => observer?.observe(el));
    } catch {
      // IntersectionObserver not available or module resolution error
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes hero-cta-pulse {
          0%, 100% { box-shadow: 0 10px 15px -3px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 10px 30px -3px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15); }
        }
        .hero-cta-pulse {
          animation: hero-cta-pulse 3s ease-in-out infinite;
        }
      `}} />
      {/* Nav */}
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 transition-all duration-300 ease-out ${
          isScrolled
            ? "border-b border-[#2A2A2A] bg-[#0F0F0F]/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Gamepad2 className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <span className="text-lg font-bold tracking-tight">GameForge</span>
          </Link>
          {/* Desktop nav links */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="#tools"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              Tools
            </a>
            <a
              href="#ai"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              AI Features
            </a>
            <a
              href="#pricing"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              Pricing
            </a>
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
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen((o) => !o);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#F5F5F5] transition-colors hover:bg-[#1A1A1A] md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {/* Mobile dropdown */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-out md:hidden ${
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-[#2A2A2A] bg-[#0F0F0F] px-6 py-3">
            <a
              href="#tools"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1A1A1A] hover:text-[#F59E0B]"
            >
              Tools
            </a>
            <a
              href="#ai"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1A1A1A] hover:text-[#F59E0B]"
            >
              AI Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1A1A1A] hover:text-[#F59E0B]"
            >
              Pricing
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg bg-[#F59E0B] px-4 py-3 text-sm font-bold text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08)_0%,_transparent_60%)]" />
        {/* Particle background */}
        <div className="pointer-events-none absolute inset-0 print:hidden" aria-hidden>
          {[
            { left: "5%", top: "15%", delay: "0s" },
            { left: "12%", top: "60%", delay: "2.5s" },
            { left: "22%", top: "25%", delay: "5s" },
            { left: "35%", top: "75%", delay: "1s" },
            { left: "42%", top: "10%", delay: "3.5s" },
            { left: "55%", top: "45%", delay: "6s" },
            { left: "68%", top: "80%", delay: "0.5s" },
            { left: "75%", top: "30%", delay: "4s" },
            { left: "85%", top: "55%", delay: "2s" },
            { left: "92%", top: "20%", delay: "5.5s" },
            { left: "18%", top: "85%", delay: "4.5s" },
            { left: "48%", top: "35%", delay: "1.5s" },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-[#F59E0B] opacity-30"
              style={{
                left: p.left,
                top: p.top,
                animation: "particle-float 12s ease-in-out infinite",
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32 md:pb-28">
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-1.5 text-sm text-[#9CA3AF]">
            <Zap className="h-3.5 w-3.5 text-[#F59E0B]" />
            Now in open beta
          </div>
          <h1 className="animate-fade-in stagger-1 mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Build Games{" "}
            <span className="hero-gradient-text">
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
              className="hero-cta-pulse group flex items-center gap-2 rounded-xl bg-[#F59E0B] px-8 py-3.5 text-base font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706]"
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
          <a
            href="#tools"
            className="mt-12 flex flex-col items-center gap-1.5 transition-opacity duration-300"
            style={{ opacity: scrollOpacity }}
          >
            <ChevronDown className="h-5 w-5 text-[#F59E0B] animate-bounce-down" />
            <span className="text-xs text-[#9CA3AF]">Scroll to explore</span>
          </a>
        </div>
      </section>

      {/* Feature Cards */}
      <section
        ref={setSectionRef(0)}
        className="mx-auto max-w-6xl px-6 pb-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[0] ? 1 : 0,
          transform: visibleSections[0] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "0ms",
        }}
      >
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
      <section
        id="tools"
        ref={setSectionRef(1)}
        className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[1] ? 1 : 0,
          transform: visibleSections[1] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "100ms",
        }}
      >
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
      <section
        id="ai"
        ref={setSectionRef(2)}
        className="relative border-t border-[#2A2A2A] py-24 overflow-hidden transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[2] ? 1 : 0,
          transform: visibleSections[2] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "200ms",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.06)_0%,_transparent_70%)]" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#F59E0B]/[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#F59E0B]/[0.03] blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/[0.06] px-4 py-1.5 text-sm font-medium text-[#F59E0B]">
              <Sparkles className="h-3.5 w-3.5" />
              200 AI features
            </div>
            <h2 className="text-3xl font-bold md:text-4xl">
              <span className="text-[#F59E0B]">AI-Powered</span> Game Development
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#9CA3AF]">
              200 AI features built into every tool. Generate ideas, write documentation, design levels, analyze balance, and more.
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

      {/* Platform Stats */}
      <section
        ref={setSectionRef(3)}
        className="relative border-t border-[#2A2A2A] py-20 overflow-hidden transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[3] ? 1 : 0,
          transform: visibleSections[3] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "300ms",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F] via-[#131313] to-[#0F0F0F]" />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { value: "200+", label: "AI Features", desc: "Built into every tool and workflow" },
              { value: "23", label: "Game Dev Tools", desc: "Sprites, sound, dialogue, and more" },
              { value: "10+", label: "Project Templates", desc: "Hit the ground running instantly" },
            ].map((stat) => (
              <div key={stat.label} className="group text-center">
                <p className="text-5xl font-extrabold tracking-tight text-[#F59E0B] md:text-6xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-lg font-bold text-[#F5F5F5]">{stat.label}</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        ref={setSectionRef(4)}
        className="border-t border-[#2A2A2A] py-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[4] ? 1 : 0,
          transform: visibleSections[4] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "400ms",
        }}
      >
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
      <section
        ref={setSectionRef(5)}
        className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-20 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[5] ? 1 : 0,
          transform: visibleSections[5] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "500ms",
        }}
      >
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

      {/* FAQ */}
      <section
        ref={setSectionRef(6)}
        className="border-t border-[#2A2A2A] py-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[6] ? 1 : 0,
          transform: visibleSections[6] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "600ms",
        }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-colors hover:border-[#F59E0B]/30"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-[#F5F5F5]"
                >
                  {faq.q}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#F59E0B] transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openFaq === i ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="border-t border-[#2A2A2A] px-5 py-4 text-[#9CA3AF]">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        ref={setSectionRef(7)}
        className="border-t border-[#2A2A2A] py-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[7] ? 1 : 0,
          transform: visibleSections[7] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "700ms",
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-4 text-center text-lg font-medium text-[#F59E0B]">
            One plan. Everything included.
          </p>
          <div className="mx-auto max-w-md">
            <div className="relative rounded-2xl border-2 border-[#F59E0B]/50 bg-[#1A1A1A] p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-all hover:border-[#F59E0B] hover:shadow-[0_0_50px_rgba(245,158,11,0.2)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F59E0B]/[0.03] to-transparent" />
              <div className="relative">
                <h3 className="text-2xl font-bold text-[#F5F5F5]">Free Forever</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#F59E0B]">$0</span>
                </div>
                <p className="mt-1 text-sm text-[#9CA3AF]">No credit card required</p>
                <ul className="mt-6 space-y-3">
                  {[
                    "All 23 tools",
                    "200+ AI features",
                    "Unlimited projects",
                    "Data export",
                    "Print support",
                    "Keyboard shortcuts",
                    "Firebase auth",
                    "Vercel deployment",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[#D1D5DB]">
                      <Check className="h-5 w-5 shrink-0 text-[#F59E0B]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3.5 text-base font-bold text-[#0F0F0F] shadow-lg shadow-[#F59E0B]/20 transition-all hover:bg-[#D97706] hover:shadow-[#F59E0B]/30"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={setSectionRef(8)}
        className="border-t border-[#2A2A2A] py-24 transition-all duration-500 ease-out"
        style={{
          opacity: visibleSections[8] ? 1 : 0,
          transform: visibleSections[8] ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "800ms",
        }}
      >
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
      <footer className="border-t border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-8">
          <div className="mb-12">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Gamepad2 className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <span className="text-lg font-bold tracking-tight">GameForge</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#9CA3AF]">
              The all-in-one productivity platform built for game developers.
              Organize, create, and ship &mdash; faster.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F5F5]">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/dashboard" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Dashboard</Link></li>
                <li><Link href="/dashboard/tools" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Tools</Link></li>
                <li><Link href="/dashboard/projects" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Projects</Link></li>
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">AI Features</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F5F5]">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/dashboard/tools/cheatsheet" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Cheat Sheet</Link></li>
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Documentation</Link></li>
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F5F5]">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">About</Link></li>
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Contact</Link></li>
                <li><Link href="#" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">Privacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F5F5]">Social</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">
                    <MessageCircle className="h-4 w-4" />
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]">
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          <div className="mt-12 border-t border-[#2A2A2A] pt-8 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm text-[#6B7280]">
              Made with <Heart className="h-3.5 w-3.5 text-[#F59E0B]" /> for game developers &middot; &copy; 2026 GameForge
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
