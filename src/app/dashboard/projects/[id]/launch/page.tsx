"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
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
  Plus,
  MessageSquare,
  X,
  Target,
  Check,
} from "lucide-react";
import { getProject, type Project } from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  isCustom?: boolean;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  items: ChecklistItem[];
}

const DEFAULT_CHECKLIST: ChecklistCategory[] = [
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
function getCustomItemsKey(projectId: string) {
  return `gameforge_launch_custom_${projectId}`;
}
function getNotesKey(projectId: string) {
  return `gameforge_launch_notes_${projectId}`;
}

function loadData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function saveData(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(pct: number): string {
  if (pct === 100) return "You're Ready to Launch!";
  if (pct >= 80) return "Looking Good!";
  if (pct >= 50) return "Almost There";
  if (pct >= 25) return "Making Progress";
  if (pct > 0) return "Just Getting Started";
  return "No Items Checked";
}

export default function LaunchChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<Record<string, ChecklistItem[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setChecked(loadData(getChecklistKey(projectId), {}));
    setCustomItems(loadData(getCustomItemsKey(projectId), {}));
    setNotes(loadData(getNotesKey(projectId), {}));
    const initial: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((c) => (initial[c.id] = true));
    setExpanded(initial);
  }, [projectId, router]);

  const effectiveChecklist = DEFAULT_CHECKLIST.map((cat) => ({
    ...cat,
    items: [
      ...cat.items,
      ...(customItems[cat.id] || []).map((i) => ({ ...i, isCustom: true })),
    ],
  }));

  const allItemIds = new Set(effectiveChecklist.flatMap((c) => c.items.map((i) => i.id)));
  const totalItems = effectiveChecklist.reduce((acc, c) => acc + c.items.length, 0);
  const totalChecked = Object.entries(checked).filter(([id, v]) => v && allItemIds.has(id)).length;
  const overallPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
  const allDone = totalChecked === totalItems && totalItems > 0;
  const scoreColor = getScoreColor(overallPct);

  const toggleItem = useCallback(
    (itemId: string) => {
      setChecked((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] };
        saveData(getChecklistKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleNote = useCallback((itemId: string) => {
    setOpenNotes((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const updateNote = useCallback(
    (itemId: string, text: string) => {
      setNotes((prev) => {
        const next = { ...prev, [itemId]: text };
        saveData(getNotesKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const addCustomItem = useCallback(
    (categoryId: string) => {
      const label = (newItemInputs[categoryId] || "").trim();
      if (!label) return;
      const newItem: ChecklistItem = {
        id: `custom_${categoryId}_${Date.now()}`,
        label,
        isCustom: true,
      };
      setCustomItems((prev) => {
        const next = {
          ...prev,
          [categoryId]: [...(prev[categoryId] || []), newItem],
        };
        saveData(getCustomItemsKey(projectId), next);
        return next;
      });
      setNewItemInputs((prev) => ({ ...prev, [categoryId]: "" }));
    },
    [projectId, newItemInputs]
  );

  const removeCustomItem = useCallback(
    (categoryId: string, itemId: string) => {
      setCustomItems((prev) => {
        const next = {
          ...prev,
          [categoryId]: (prev[categoryId] || []).filter((i) => i.id !== itemId),
        };
        saveData(getCustomItemsKey(projectId), next);
        return next;
      });
      setChecked((prev) => {
        const next = { ...prev };
        delete next[itemId];
        saveData(getChecklistKey(projectId), next);
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        delete next[itemId];
        saveData(getNotesKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const handleReset = useCallback(() => {
    if (!confirm("Reset all checklist items? This cannot be undone.")) return;
    setChecked({});
    saveData(getChecklistKey(projectId), {});
  }, [projectId]);

  if (!project) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Launch" },
          ]}
        />
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

      {/* Launch Readiness Score */}
      <div
        className={`relative overflow-hidden rounded-xl border p-6 transition-all ${
          allDone
            ? "border-[#10B981]/40 bg-[#10B981]/5"
            : "border-[#2A2A2A] bg-[#1A1A1A]"
        }`}
      >
        {allDone && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent" />
        )}
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          {/* Score circle */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-4"
              style={{
                borderColor: scoreColor,
                backgroundColor: `${scoreColor}10`,
              }}
            >
              {allDone ? (
                <PartyPopper className="h-10 w-10" style={{ color: scoreColor }} />
              ) : (
                <span
                  className="text-4xl font-black tabular-nums"
                  style={{ color: scoreColor }}
                >
                  {overallPct}
                </span>
              )}
            </div>
            {!allDone && (
              <span className="text-xs font-medium text-[#6B7280]">
                Readiness
              </span>
            )}
          </div>

          {/* Score details */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Target className="h-4 w-4" style={{ color: scoreColor }} />
              <h2 className="text-lg font-bold" style={{ color: scoreColor }}>
                {getScoreLabel(overallPct)}
              </h2>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              {totalChecked} of {totalItems} items completed
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${overallPct}%`,
                  backgroundColor: scoreColor,
                }}
              />
            </div>
            {allDone && (
              <p className="mt-3 text-sm text-[#10B981]/80">
                Every item is checked off. Time to ship it!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {effectiveChecklist.map((cat) => {
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catPct = cat.items.length > 0 ? Math.round((catChecked / cat.items.length) * 100) : 0;
          const catDone = catChecked === cat.items.length && cat.items.length > 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setExpanded((prev) => ({ ...prev, [cat.id]: true }));
                document.getElementById(`section-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-left transition-colors hover:border-[#3A3A3A]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                  <span className="text-sm font-medium">{cat.title}</span>
                </div>
                {catDone && (
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                )}
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
            </button>
          );
        })}
      </div>

      {/* Checklist Sections */}
      <div className="space-y-3">
        {effectiveChecklist.map((cat) => {
          const isOpen = expanded[cat.id] ?? false;
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catDone = catChecked === cat.items.length && cat.items.length > 0;

          return (
            <div
              key={cat.id}
              id={`section-${cat.id}`}
              className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              {/* Category header */}
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
                    const hasNote = !!notes[item.id];
                    const noteOpen = openNotes[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        className={
                          idx < cat.items.length - 1
                            ? "border-b border-[#2A2A2A]/50"
                            : ""
                        }
                      >
                        <div className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="mt-0.5 shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-[#10B981]" />
                            ) : (
                              <Square className="h-4 w-4 text-[#6B7280] hover:text-[#9CA3AF]" />
                            )}
                          </button>

                          {/* Label & detail */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p
                              className={`text-sm font-medium transition-colors ${
                                isChecked
                                  ? "text-[#6B7280] line-through"
                                  : "text-[#F5F5F5]"
                              }`}
                            >
                              {item.label}
                            </p>
                            {item.detail && (
                              <p className="mt-0.5 text-xs text-[#6B7280]">
                                {item.detail}
                              </p>
                            )}
                          </button>

                          {/* Note toggle */}
                          <button
                            onClick={() => toggleNote(item.id)}
                            className="mt-0.5 shrink-0 rounded p-1 transition-colors hover:bg-[#2A2A2A]"
                            title={noteOpen ? "Hide note" : "Add note"}
                          >
                            <MessageSquare
                              className={`h-3.5 w-3.5 ${
                                hasNote
                                  ? "text-[#F59E0B]"
                                  : "text-[#4B5563] hover:text-[#9CA3AF]"
                              }`}
                            />
                          </button>

                          {/* Delete custom item */}
                          {item.isCustom && (
                            <button
                              onClick={() => removeCustomItem(cat.id, item.id)}
                              className="mt-0.5 shrink-0 rounded p-1 text-[#4B5563] transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="Remove custom item"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Note textarea */}
                        {noteOpen && (
                          <div className="px-5 pb-3 pl-12">
                            <textarea
                              value={notes[item.id] || ""}
                              onChange={(e) =>
                                updateNote(item.id, e.target.value)
                              }
                              placeholder="Write a note..."
                              rows={2}
                              className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/40"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add custom item */}
                  <div className="flex items-center gap-2 border-t border-[#2A2A2A]/50 px-5 py-3">
                    <Plus className="h-3.5 w-3.5 shrink-0 text-[#4B5563]" />
                    <input
                      type="text"
                      value={newItemInputs[cat.id] || ""}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomItem(cat.id);
                      }}
                      placeholder="Add custom item..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none"
                    />
                    {(newItemInputs[cat.id] || "").trim() && (
                      <button
                        onClick={() => addCustomItem(cat.id)}
                        className="shrink-0 rounded-md bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
