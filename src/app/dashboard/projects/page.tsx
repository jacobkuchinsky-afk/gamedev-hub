"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  FolderKanban,
  ListTodo,
  Bug,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  BookOpen,
  Clock,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  GitCompare,
  X,
} from "lucide-react";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getSprints,
  getChangelog,
  updateProject,
  type Project,
} from "@/lib/store";

const STATUS_BADGE_STYLES: Record<Project["status"], string> = {
  concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
  alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
  gold: "bg-[#10B981]/10 text-[#10B981]",
  released: "bg-[#22C55E]/10 text-[#22C55E]",
};

const STATUS_ORDER: Record<Project["status"], number> = {
  released: 0,
  gold: 1,
  beta: 2,
  alpha: 3,
  prototype: 4,
  concept: 5,
};

type SortKey = "name" | "status" | "updated";
type ViewMode = "grid" | "list";
type FilterMode = "active" | "all" | "archived";

interface ProjectData {
  project: Project;
  taskCount: number;
  completedTaskCount: number;
  inProgressTaskCount: number;
  bugCount: number;
  allBugCount: number;
  closedBugCount: number;
  overdueBugCount: number;
  devlogCount: number;
  devlogWords: number;
  loggedHours: number;
  sprintCount: number;
  activeSprintCount: number;
  completedSprintCount: number;
  changelogCount: number;
}

interface CompareMetric {
  label: string;
  a: string | number;
  b: string | number;
  higherIsBetter: boolean;
}

function getCompareMetrics(a: ProjectData, b: ProjectData): CompareMetric[] {
  return [
    { label: "Total Tasks", a: a.taskCount, b: b.taskCount, higherIsBetter: true },
    { label: "Completed Tasks", a: a.completedTaskCount, b: b.completedTaskCount, higherIsBetter: true },
    { label: "In-Progress Tasks", a: a.inProgressTaskCount, b: b.inProgressTaskCount, higherIsBetter: true },
    { label: "Completion %", a: a.taskCount ? Math.round((a.completedTaskCount / a.taskCount) * 100) : 0, b: b.taskCount ? Math.round((b.completedTaskCount / b.taskCount) * 100) : 0, higherIsBetter: true },
    { label: "Total Bugs", a: a.allBugCount, b: b.allBugCount, higherIsBetter: false },
    { label: "Open Bugs", a: a.bugCount, b: b.bugCount, higherIsBetter: false },
    { label: "Fixed Bugs", a: a.closedBugCount, b: b.closedBugCount, higherIsBetter: true },
    { label: "Devlog Entries", a: a.devlogCount, b: b.devlogCount, higherIsBetter: true },
    { label: "Devlog Words", a: a.devlogWords, b: b.devlogWords, higherIsBetter: true },
    { label: "Sprints", a: a.sprintCount, b: b.sprintCount, higherIsBetter: true },
    { label: "Active Sprints", a: a.activeSprintCount, b: b.activeSprintCount, higherIsBetter: true },
    { label: "Completed Sprints", a: a.completedSprintCount, b: b.completedSprintCount, higherIsBetter: true },
    { label: "Hours Logged", a: a.loggedHours % 1 === 0 ? a.loggedHours : +a.loggedHours.toFixed(1), b: b.loggedHours % 1 === 0 ? b.loggedHours : +b.loggedHours.toFixed(1), higherIsBetter: true },
    { label: "Changelog Versions", a: a.changelogCount, b: b.changelogCount, higherIsBetter: true },
  ];
}

function metricColor(val: number | string, other: number | string, higherIsBetter: boolean): string {
  const a = typeof val === "string" ? parseFloat(val) || 0 : val;
  const b = typeof other === "string" ? parseFloat(other) || 0 : other;
  if (a === b) return "text-[#9CA3AF]";
  const aWins = higherIsBetter ? a > b : a < b;
  return aWins ? "text-[#10B981]" : "text-[#EF4444]";
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function ProjectsPage() {
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [filter, setFilter] = useState<FilterMode>("active");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const loadData = useCallback(() => {
    const allProjects = getProjects();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const data: ProjectData[] = allProjects.map((p) => {
      const allTasks = getTasks(p.id);
      const allBugs = getBugs(p.id);
      const devlogEntries = getDevlog(p.id);
      const sprints = getSprints(p.id);
      const changelog = getChangelog(p.id);
      return {
        project: p,
        taskCount: allTasks.length,
        completedTaskCount: allTasks.filter((t) => t.status === "done").length,
        inProgressTaskCount: allTasks.filter((t) => t.status === "in-progress").length,
        bugCount: allBugs.filter((b) => b.status !== "closed").length,
        allBugCount: allBugs.length,
        closedBugCount: allBugs.filter((b) => b.status === "closed").length,
        overdueBugCount: allBugs.filter(
          (b) =>
            b.status !== "closed" &&
            new Date(b.created_at).getTime() < sevenDaysAgo
        ).length,
        devlogCount: devlogEntries.length,
        devlogWords: devlogEntries.reduce((s, e) => s + e.content.split(/\s+/).filter(Boolean).length, 0),
        loggedHours: allTasks.reduce((s, t) => s + (t.loggedHours || 0), 0),
        sprintCount: sprints.length,
        activeSprintCount: sprints.filter((s) => s.status === "active").length,
        completedSprintCount: sprints.filter((s) => s.status === "completed").length,
        changelogCount: changelog.length,
      };
    });
    setProjectData(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchive = (projectId: string, archive: boolean) => {
    updateProject(projectId, { archived: archive });
    loadData();
  };

  const toggleCompareSelect = (projectId: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(projectId)) return prev.filter((id) => id !== projectId);
      if (prev.length >= 2) return [prev[1], projectId];
      return [...prev, projectId];
    });
  };

  const compareA = projectData.find((d) => d.project.id === compareSelection[0]);
  const compareB = projectData.find((d) => d.project.id === compareSelection[1]);

  const stats = useMemo(() => ({
    activeCount: projectData.filter((d) => !d.project.archived).length,
    archivedCount: projectData.filter((d) => d.project.archived).length,
    totalTasks: projectData.reduce((s, d) => s + d.taskCount, 0),
    totalBugs: projectData.reduce((s, d) => s + d.allBugCount, 0),
    totalLoggedHours: projectData.reduce((s, d) => s + d.loggedHours, 0),
  }), [projectData]);

  const filtered = useMemo(() => {
    let items = [...projectData];

    if (filter === "active") {
      items = items.filter((d) => !d.project.archived);
    } else if (filter === "archived") {
      items = items.filter((d) => d.project.archived);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((d) => d.project.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.project.name.localeCompare(b.project.name);
        case "status":
          return (
            STATUS_ORDER[a.project.status] - STATUS_ORDER[b.project.status]
          );
        case "updated":
          return (
            new Date(b.project.updated_at).getTime() -
            new Date(a.project.updated_at).getTime()
          );
        default:
          return 0;
      }
    });

    return items;
  }, [projectData, search, sortBy, filter]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "updated", label: "Last Updated" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Manage your game development projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCompareMode((prev) => !prev);
              if (compareMode) {
                setCompareSelection([]);
                setShowCompare(false);
              }
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              compareMode
                ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            }`}
          >
            <GitCompare className="h-4 w-4" />
            {compareMode ? "Cancel" : "Compare"}
          </button>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      </div>

      {/* Projects at a Glance */}
      {projectData.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { label: "Active", value: stats.activeCount, icon: FolderKanban, color: "#10B981" },
            { label: "Archived", value: stats.archivedCount, icon: Archive, color: "#6B7280" },
            { label: "Total Tasks", value: stats.totalTasks, icon: ListTodo, color: "#3B82F6" },
            { label: "Total Bugs", value: stats.totalBugs, icon: Bug, color: "#EF4444" },
            { label: "Time Logged", value: `${stats.totalLoggedHours % 1 === 0 ? stats.totalLoggedHours : stats.totalLoggedHours.toFixed(1)}h`, icon: Clock, color: "#F59E0B" },
          ] as const).map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                {stat.label}
              </div>
              <p className="mt-1 text-xl font-bold text-[#F5F5F5]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-9 pr-3 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/40"
            />
          </div>
          {/* Quick Filters */}
          <div className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-1 py-1">
            {([
              { key: "active" as FilterMode, label: "Active Only" },
              { key: "all" as FilterMode, label: "All" },
              { key: "archived" as FilterMode, label: "Archived Only" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === opt.key
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#6B7280]" />
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center justify-center rounded-l-lg p-2 transition-colors ${
                view === "grid"
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center justify-center rounded-r-lg p-2 transition-colors ${
                view === "list"
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && projectData.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-20">
          <FolderKanban className="h-12 w-12 text-[#6B7280]" />
          <p className="mt-4 text-lg font-medium text-[#9CA3AF]">
            No projects yet
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your first game project to get started
          </p>
          <Link
            href="/dashboard/projects/new"
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      )}

      {/* No search results */}
      {filtered.length === 0 && projectData.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16">
          <Search className="h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">
            No projects match &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Compare selection bar */}
      {compareMode && (
        <div className="flex items-center justify-between rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <GitCompare className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[#9CA3AF]">
              {compareSelection.length === 0 && "Select 2 projects to compare"}
              {compareSelection.length === 1 && "Select 1 more project"}
              {compareSelection.length === 2 && "Ready to compare"}
            </span>
            {compareSelection.map((id) => {
              const p = projectData.find((d) => d.project.id === id);
              return p ? (
                <span key={id} className="flex items-center gap-1.5 rounded-md bg-[#2A2A2A] px-2.5 py-1 text-xs text-[#F5F5F5]">
                  <span className="h-2 w-2 rounded" style={{ backgroundColor: p.project.coverColor }} />
                  {p.project.name}
                  <button onClick={() => toggleCompareSelect(id)} className="ml-1 text-[#6B7280] hover:text-[#EF4444]">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
          <button
            onClick={() => setShowCompare(true)}
            disabled={compareSelection.length !== 2}
            className="rounded-lg bg-[#F59E0B] px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompare && compareA && compareB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-[#F59E0B]" />
                <h2 className="text-lg font-semibold text-[#F5F5F5]">Project Comparison</h2>
              </div>
              <button
                onClick={() => { setShowCompare(false); setCompareMode(false); setCompareSelection([]); }}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Project headers */}
              <div className="grid grid-cols-[180px_1fr_1fr] border-b border-[#2A2A2A] px-6 py-4">
                <div />
                {[compareA, compareB].map((d) => (
                  <div key={d.project.id} className="flex items-center gap-3 px-3">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: d.project.coverColor }} />
                    <div>
                      <p className="font-semibold text-[#F5F5F5]">{d.project.name}</p>
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_BADGE_STYLES[d.project.status]}`}>
                        {d.project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics rows */}
              <div className="divide-y divide-[#2A2A2A]">
                {(() => {
                  const metrics = getCompareMetrics(compareA, compareB);
                  const groups: { title: string; icon: React.ReactNode; rows: CompareMetric[] }[] = [
                    { title: "Tasks", icon: <ListTodo className="h-3.5 w-3.5 text-[#3B82F6]" />, rows: metrics.slice(0, 4) },
                    { title: "Bugs", icon: <Bug className="h-3.5 w-3.5 text-[#EF4444]" />, rows: metrics.slice(4, 7) },
                    { title: "Devlog", icon: <BookOpen className="h-3.5 w-3.5 text-[#8B5CF6]" />, rows: metrics.slice(7, 9) },
                    { title: "Sprints", icon: <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />, rows: metrics.slice(9, 12) },
                    { title: "Overall", icon: <FolderKanban className="h-3.5 w-3.5 text-[#10B981]" />, rows: metrics.slice(12) },
                  ];
                  return groups.map((group) => (
                    <div key={group.title}>
                      <div className="flex items-center gap-2 bg-[#0F0F0F] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        {group.icon}
                        {group.title}
                      </div>
                      {group.rows.map((m) => (
                        <div key={m.label} className="grid grid-cols-[180px_1fr_1fr] px-6 py-2.5 text-sm hover:bg-[#1F1F1F]">
                          <span className="text-[#9CA3AF]">{m.label}</span>
                          <span className={`px-3 font-mono font-medium ${metricColor(m.a, m.b, m.higherIsBetter)}`}>
                            {typeof m.a === "number" && m.label === "Completion %" ? `${m.a}%` : m.a}
                          </span>
                          <span className={`px-3 font-mono font-medium ${metricColor(m.b, m.a, m.higherIsBetter)}`}>
                            {typeof m.b === "number" && m.label === "Completion %" ? `${m.b}%` : m.b}
                          </span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="border-t border-[#2A2A2A] px-6 py-3">
              <button
                onClick={() => { setShowCompare(false); setCompareMode(false); setCompareSelection([]); }}
                className="w-full rounded-lg border border-[#2A2A2A] py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(
            ({
              project,
              taskCount,
              completedTaskCount,
              bugCount,
              overdueBugCount,
              devlogCount,
            }) => {
              const pct = taskCount
                ? Math.round((completedTaskCount / taskCount) * 100)
                : 0;
              const isSelected = compareSelection.includes(project.id);
              const CardWrapper = compareMode ? "div" : Link;
              const cardProps = compareMode
                ? {
                    onClick: () => toggleCompareSelect(project.id),
                    className: `group cursor-pointer rounded-xl border bg-[#1A1A1A] transition-all ${
                      isSelected
                        ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/30"
                        : project.archived
                          ? "border-dashed border-[#2A2A2A] opacity-50 hover:opacity-70"
                          : "border-[#2A2A2A] hover:border-[#F59E0B]/30"
                    }`,
                  }
                : {
                    href: `/dashboard/projects/${project.id}`,
                    className: `group rounded-xl border bg-[#1A1A1A] transition-all ${
                      project.archived
                        ? "border-dashed border-[#2A2A2A] opacity-50 hover:opacity-70"
                        : "border-[#2A2A2A] hover:border-[#F59E0B]/30"
                    }`,
                  };
              return (
                // @ts-expect-error dynamic element
                <CardWrapper key={project.id} {...cardProps}>
                  <div className="relative">
                    <div
                      className="h-2 rounded-t-xl"
                      style={{ backgroundColor: project.coverColor }}
                    />
                    {compareMode && (
                      <div className={`absolute right-2 top-4 flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#6B7280] bg-[#0F0F0F]"
                      }`}>
                        {isSelected && <span className="text-[10px] font-bold text-black">&#10003;</span>}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-[#F5F5F5] transition-colors group-hover:text-[#F59E0B]">
                        {project.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#9CA3AF]">
                      {project.description}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-[#6B7280]">
                      <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                        {project.engine}
                      </span>
                      <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                        {project.genre}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                        <span>
                          {completedTaskCount}/{taskCount} tasks
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full bg-[#F59E0B] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-t border-[#2A2A2A] pt-3 text-xs text-[#9CA3AF]">
                      <div className="flex items-center gap-1.5">
                        <ListTodo className="h-3.5 w-3.5" />
                        {taskCount}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bug className="h-3.5 w-3.5" />
                        {bugCount}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {devlogCount}
                      </div>
                      <div className="flex-1" />
                      {overdueBugCount > 0 && (
                        <div className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#EF4444]">
                          <AlertTriangle className="h-3 w-3" />
                          {overdueBugCount} overdue
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                        <Clock className="h-3 w-3" />
                        Updated {relativeTime(project.updated_at)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(project.id, !project.archived);
                        }}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                          project.archived
                            ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                            : "text-[#6B7280] opacity-0 group-hover:opacity-100 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        }`}
                      >
                        {project.archived ? (
                          <ArchiveRestore className="h-3 w-3" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        {project.archived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </div>
                </CardWrapper>
              );
            }
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && filtered.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          {/* Table header */}
          <div className={`grid gap-2 border-b border-[#2A2A2A] px-5 py-3 text-xs font-medium text-[#6B7280] ${compareMode ? "grid-cols-[28px_1fr_100px_100px_70px_80px_110px]" : "grid-cols-[1fr_100px_100px_70px_80px_110px]"}`}>
            {compareMode && <span />}
            <span>Name</span>
            <span>Status</span>
            <span className="text-center">Progress</span>
            <span className="text-center">Bugs</span>
            <span className="text-center">Alerts</span>
            <span className="text-right">Last Activity</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-[#2A2A2A]">
            {filtered.map(
              ({
                project,
                taskCount,
                completedTaskCount,
                bugCount,
                overdueBugCount,
              }) => {
                const pct = taskCount
                  ? Math.round((completedTaskCount / taskCount) * 100)
                  : 0;
                const isSelected = compareSelection.includes(project.id);
                const RowWrapper = compareMode ? "div" : Link;
                const rowProps = compareMode
                  ? {
                      onClick: () => toggleCompareSelect(project.id),
                      className: `group cursor-pointer grid items-center gap-2 px-5 py-3.5 transition-colors grid-cols-[28px_1fr_100px_100px_70px_80px_110px] ${
                        isSelected ? "bg-[#F59E0B]/5" : project.archived ? "opacity-50" : "hover:bg-[#1F1F1F]"
                      }`,
                    }
                  : {
                      href: `/dashboard/projects/${project.id}`,
                      className: `group grid grid-cols-[1fr_100px_100px_70px_80px_110px] items-center gap-2 px-5 py-3.5 transition-colors ${
                        project.archived ? "opacity-50" : "hover:bg-[#1F1F1F]"
                      }`,
                    };
                return (
                  // @ts-expect-error dynamic element
                  <RowWrapper key={project.id} {...rowProps}>
                    {compareMode && (
                      <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#6B7280] bg-[#0F0F0F]"
                      }`}>
                        {isSelected && <span className="text-[9px] font-bold text-black">&#10003;</span>}
                      </div>
                    )}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="h-3 w-3 shrink-0 rounded"
                        style={{ backgroundColor: project.coverColor }}
                      />
                      <span className="truncate text-sm font-medium text-[#F5F5F5]">
                        {project.name}
                      </span>
                    </div>
                    <span
                      className={`justify-self-start rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                    >
                      {project.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full bg-[#F59E0B]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] text-[#9CA3AF]">
                        {pct}%
                      </span>
                    </div>
                    <span className="text-center text-sm text-[#9CA3AF]">
                      {bugCount}
                    </span>
                    <div className="flex justify-center">
                      {overdueBugCount > 0 ? (
                        <span className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#EF4444]">
                          <AlertTriangle className="h-3 w-3" />
                          {overdueBugCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#4B5563]">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        <Clock className="h-3 w-3" />
                        {relativeTime(project.updated_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(project.id, !project.archived);
                        }}
                        className={`rounded p-1 transition-colors ${
                          project.archived
                            ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                            : "text-transparent group-hover:text-[#4B5563] hover:!text-[#F59E0B] hover:!bg-[#F59E0B]/10"
                        }`}
                        title={project.archived ? "Unarchive" : "Archive"}
                      >
                        {project.archived ? (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </RowWrapper>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
