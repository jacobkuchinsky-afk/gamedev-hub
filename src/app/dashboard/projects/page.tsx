"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
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

interface ProjectData {
  project: Project;
  taskCount: number;
  bugCount: number;
  devlogCount: number;
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

  useEffect(() => {
    const allProjects = getProjects();
    const data: ProjectData[] = allProjects.map((p) => ({
      project: p,
      taskCount: getTasks(p.id).length,
      bugCount: getBugs(p.id).filter((b) => b.status !== "closed").length,
      devlogCount: getDevlog(p.id).length,
    }));
    setProjectData(data);
  }, []);

  const filtered = useMemo(() => {
    let items = [...projectData];

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
  }, [projectData, search, sortBy]);

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
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-9 pr-3 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/40"
          />
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

      {/* Grid View */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ project, taskCount, bugCount, devlogCount }) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-all hover:border-[#F59E0B]/30"
            >
              <div
                className="h-2 rounded-t-xl"
                style={{ backgroundColor: project.coverColor }}
              />
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
                <div className="mt-4 flex items-center gap-4 border-t border-[#2A2A2A] pt-3 text-xs text-[#9CA3AF]">
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && filtered.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_70px_70px_110px] gap-2 border-b border-[#2A2A2A] px-5 py-3 text-xs font-medium text-[#6B7280]">
            <span>Name</span>
            <span>Status</span>
            <span className="text-center">Tasks</span>
            <span className="text-center">Bugs</span>
            <span className="text-right">Last Activity</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-[#2A2A2A]">
            {filtered.map(({ project, taskCount, bugCount }) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="grid grid-cols-[1fr_100px_70px_70px_110px] gap-2 items-center px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                <span className="text-center text-sm text-[#9CA3AF]">
                  {taskCount}
                </span>
                <span className="text-center text-sm text-[#9CA3AF]">
                  {bugCount}
                </span>
                <span className="flex items-center justify-end gap-1 text-xs text-[#6B7280]">
                  <Clock className="h-3 w-3" />
                  {relativeTime(project.updated_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
