"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Check,
  Square,
  CheckSquare,
  Rocket,
  Store,
  Hammer,
  Megaphone,
  Scale,
  Users,
  CalendarClock,
  RotateCcw,
  PartyPopper,
} from "lucide-react";
import { getProject, type Project } from "@/lib/store";

interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  items: ChecklistItem[];
}

const CHECKLIST: ChecklistCategory[] = [
  {
    id: "storePage",
    title: "Store Page",
    icon: Store,
    color: "#3B82F6",
    items: [
      { id: "sp_title", label: "Title finalized", detail: "Confirmed no trademark conflicts" },
      { id: "sp_desc", label: "Store description written", detail: "Short and long descriptions, localized if needed" },
      { id: "sp_screenshots", label: "Screenshots ready (5+)", detail: "High-res, showcasing core gameplay moments" },
      { id: "sp_trailer", label: "Trailer uploaded", detail: "60-90 seconds, gameplay-focused, no spoilers" },
      { id: "sp_capsule", label: "Capsule art designed", detail: "Header, small capsule, library hero, logo" },
      { id: "sp_tags", label: "Tags & categories set", detail: "Genre, features, controller support, etc." },
      { id: "sp_sysreq", label: "System requirements listed", detail: "Minimum and recommended specs" },
    ],
  },
  {
    id: "build",
    title: "Build",
    icon: Hammer,
    color: "#F59E0B",
    items: [
      { id: "b_release", label: "Release build tested", detail: "Not a debug build — final, optimized binary" },
      { id: "b_nodebug", label: "No debug code remaining", detail: "Console logs, debug UI, dev cheats removed" },
      { id: "b_perf", label: "Performance profiled", detail: "Meets target FPS on min-spec hardware" },
      { id: "b_crash", label: "Crash reporting enabled", detail: "Sentry, Backtrace, or platform-native crash reporter" },
      { id: "b_install", label: "Install/uninstall tested", detail: "Clean install, verify all files present" },
      { id: "b_saves", label: "Save/load regression test", detail: "Old saves still load correctly" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    color: "#EC4899",
    items: [
      { id: "m_presskit", label: "Press kit ready", detail: "Screenshots, logos, fact sheet, team bios" },
      { id: "m_influencers", label: "Influencer list compiled", detail: "YouTubers, streamers, journalists — keys sent" },
      { id: "m_social", label: "Social media posts scheduled", detail: "Launch day, day-1 patch, first week content plan" },
      { id: "m_landing", label: "Landing page / website live", detail: "With trailer, store links, mailing list signup" },
      { id: "m_devlog", label: "Launch devlog / blog post written", detail: "Behind-the-scenes, lessons learned, thank yous" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    icon: Scale,
    color: "#8B5CF6",
    items: [
      { id: "l_eula", label: "EULA / Terms of Service drafted", detail: "Reviewed by legal if possible" },
      { id: "l_privacy", label: "Privacy policy published", detail: "Required for most storefronts and GDPR compliance" },
      { id: "l_rating", label: "Age rating obtained", detail: "ESRB, PEGI, or IARC rating via platform" },
      { id: "l_credits", label: "Credits screen complete", detail: "All team members, middleware, assets, licenses" },
      { id: "l_licenses", label: "Third-party licenses reviewed", detail: "Fonts, music, middleware — all license-compliant" },
    ],
  },
  {
    id: "community",
    title: "Community",
    icon: Users,
    color: "#10B981",
    items: [
      { id: "c_discord", label: "Discord server set up", detail: "Channels, roles, welcome message, moderation bots" },
      { id: "c_guidelines", label: "Community guidelines posted", detail: "Code of conduct, reporting process" },
      { id: "c_bugreport", label: "Bug report form ready", detail: "Template with repro steps, specs, screenshots" },
      { id: "c_feedback", label: "Feedback channel created", detail: "Dedicated space for suggestions and feature requests" },
      { id: "c_faq", label: "FAQ / known issues page", detail: "Common questions and workarounds" },
    ],
  },
  {
    id: "postLaunch",
    title: "Post-Launch",
    icon: CalendarClock,
    color: "#F97316",
    items: [
      { id: "pl_dayone", label: "Day-1 patch plan documented", detail: "Known issues to fix, timeline for first patch" },
      { id: "pl_monitoring", label: "Monitoring dashboard set up", detail: "Crash rates, player counts, performance metrics" },
      { id: "pl_hotfix", label: "Hotfix process established", detail: "Who can deploy? How fast? Rollback plan?" },
      { id: "pl_roadmap", label: "Roadmap published", detail: "Public-facing plan for updates and content" },
      { id: "pl_support", label: "Support email / system ready", detail: "Player-facing contact for bugs and refunds" },
    ],
  },
];

function getChecklistKey(projectId: string) {
  return `gameforge_launch_${projectId}`;
}

function loadChecklist(projectId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(getChecklistKey(projectId));
  if (raw) return JSON.parse(raw);
  return {};
}

function saveChecklist(projectId: string, data: Record<string, boolean>) {
  localStorage.setItem(getChecklistKey(projectId), JSON.stringify(data));
}

export default function LaunchChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log("[LaunchChecklist] rendered, id:", projectId);
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setChecked(loadChecklist(projectId));
    const initial: Record<string, boolean> = {};
    CHECKLIST.forEach((c) => (initial[c.id] = true));
    setExpanded(initial);
  }, [projectId, router]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setChecked((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] };
        saveChecklist(projectId, next);
        console.log("[LaunchChecklist] toggled:", itemId, "->", next[itemId]);
        return next;
      });
    },
    [projectId]
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm("Reset all checklist items? This cannot be undone.")) return;
    setChecked({});
    saveChecklist(projectId, {});
    console.log("[LaunchChecklist] reset all items for project:", projectId);
  }, [projectId]);

  const totalItems = CHECKLIST.reduce((acc, c) => acc + c.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const overallPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
  const allDone = totalChecked === totalItems && totalItems > 0;

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Launch Checklist</h1>
              <Rocket className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Everything you need to ship {project.name}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-red-500/30 hover:text-red-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className={`rounded-xl border p-5 transition-colors ${allDone ? "border-[#10B981]/30 bg-[#10B981]/5" : "border-[#2A2A2A] bg-[#1A1A1A]"}`}>
        {allDone ? (
          <div className="flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-[#10B981]" />
            <div>
              <p className="font-semibold text-[#10B981]">Ready to Launch!</p>
              <p className="text-sm text-[#6B7280]">All {totalItems} items completed. Ship it.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9CA3AF]">Overall Progress</span>
              <span className="font-medium text-[#F59E0B]">
                {totalChecked}/{totalItems} ({overallPct}%)
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Category Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CHECKLIST.map((cat) => {
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catPct = Math.round((catChecked / cat.items.length) * 100);
          const catDone = catChecked === cat.items.length;
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
            >
              <div className="flex items-center gap-2">
                <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                <span className="text-sm font-medium">{cat.title}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${catPct}%`,
                    backgroundColor: catDone ? "#10B981" : cat.color,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280]">
                {catChecked}/{cat.items.length}
              </p>
            </div>
          );
        })}
      </div>

      {/* Checklist Sections */}
      <div className="space-y-3">
        {CHECKLIST.map((cat) => {
          const isOpen = expanded[cat.id] ?? false;
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catDone = catChecked === cat.items.length;

          return (
            <div
              key={cat.id}
              className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              <button
                onClick={() => toggleSection(cat.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold">{cat.title}</span>
                  <span className="ml-2 text-xs text-[#6B7280]">
                    {catChecked}/{cat.items.length}
                  </span>
                </div>
                {catDone && (
                  <span className="mr-2 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">
                    Done
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-[#2A2A2A]">
                  {cat.items.map((item, idx) => {
                    const isChecked = checked[item.id] || false;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#1F1F1F] ${
                          idx < cat.items.length - 1 ? "border-b border-[#2A2A2A]/50" : ""
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium transition-colors ${
                              isChecked ? "text-[#6B7280] line-through" : "text-[#F5F5F5]"
                            }`}
                          >
                            {item.label}
                          </p>
                          {item.detail && (
                            <p className="mt-0.5 text-xs text-[#6B7280]">
                              {item.detail}
                            </p>
                          )}
                        </div>
                        {isChecked && (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                        )}
                      </button>
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
