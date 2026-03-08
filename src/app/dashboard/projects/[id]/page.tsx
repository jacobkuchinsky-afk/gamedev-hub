"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ListTodo,
  Bug,
  BookOpen,
  Plus,
  AlertTriangle,
  ChevronRight,
  Package,
  FileText,
  Rocket,
  Gamepad2,
  Image,
  ScrollText,
  Activity,
  Star,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  getProject,
  getTasks,
  getBugs,
  getDevlog,
  getPlaytestResponses,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getMoodEmoji,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
  type PlaytestResponse,
} from "@/lib/store";

const STATUS_BADGE_STYLES: Record<Project["status"], string> = {
  concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
  alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
  gold: "bg-[#10B981]/10 text-[#10B981]",
  released: "bg-[#22C55E]/10 text-[#22C55E]",
};

const TASK_STATUS_STYLES: Record<string, string> = {
  todo: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  "in-progress": "bg-[#F59E0B]/10 text-[#F59E0B]",
  testing: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  done: "bg-[#10B981]/10 text-[#10B981]",
};

interface ActivityItem {
  id: string;
  type: "task" | "bug" | "devlog";
  title: string;
  subtitle: string;
  timestamp: string;
  color: string;
  icon: typeof ListTodo;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  );
}

type Tab =
  | "overview"
  | "tasks"
  | "bugs"
  | "assets"
  | "devlog"
  | "gdd"
  | "launch"
  | "playtest"
  | "references"
  | "changelog";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [devlog, setDevlog] = useState<DevlogEntry[]>([]);
  const [playtest, setPlaytest] = useState<PlaytestResponse[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setTasks(getTasks(projectId));
    setBugs(getBugs(projectId));
    setDevlog(getDevlog(projectId));
    setPlaytest(getPlaytestResponses(projectId));
  }, [projectId, router]);

  if (!project) return null;

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const openBugs = bugs.filter((b) => b.status !== "closed").length;
  const criticalBugs = bugs.filter(
    (b) => (b.severity === "blocker" || b.severity === "critical") && b.status !== "closed"
  ).length;
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const avgRating =
    playtest.length > 0
      ? (playtest.reduce((sum, p) => sum + p.overallRating, 0) / playtest.length).toFixed(1)
      : null;
  const projectAgeDays = daysBetween(project.created_at, new Date().toISOString());

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentBugs = [...bugs]
    .filter((b) => b.status !== "closed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Unified activity feed
  const activityFeed: ActivityItem[] = [
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.status === "done" ? "Completed" : t.status === "in-progress" ? "In progress" : t.status === "testing" ? "Testing" : "Created",
      timestamp: t.created_at,
      color: getPriorityColor(t.priority),
      icon: ListTodo,
    })),
    ...bugs.map((b) => ({
      id: b.id,
      type: "bug" as const,
      title: b.title,
      subtitle: `${b.severity} - ${b.status}`,
      timestamp: b.created_at,
      color: getSeverityColor(b.severity),
      icon: Bug,
    })),
    ...devlog.map((d) => ({
      id: d.id,
      type: "devlog" as const,
      title: d.title,
      subtitle: `${getMoodEmoji(d.mood)} ${d.mood}`,
      timestamp: d.date,
      color: "#F59E0B",
      icon: BookOpen,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const tabs: { key: Tab; label: string; href?: string; icon: typeof ListTodo }[] = [
    { key: "overview", label: "Overview", icon: ChevronRight },
    { key: "tasks", label: "Tasks", href: `/dashboard/projects/${projectId}/tasks`, icon: ListTodo },
    { key: "bugs", label: "Bugs", href: `/dashboard/projects/${projectId}/bugs`, icon: Bug },
    { key: "assets", label: "Assets", href: `/dashboard/projects/${projectId}/assets`, icon: Package },
    { key: "devlog", label: "Devlog", href: `/dashboard/projects/${projectId}/devlog`, icon: BookOpen },
    { key: "gdd", label: "GDD", href: `/dashboard/projects/${projectId}/gdd`, icon: FileText },
    { key: "references", label: "References", href: `/dashboard/projects/${projectId}/references`, icon: Image },
    { key: "changelog", label: "Changelog", href: `/dashboard/projects/${projectId}/changelog`, icon: ScrollText },
    { key: "launch", label: "Launch", href: `/dashboard/projects/${projectId}/launch`, icon: Rocket },
    { key: "playtest", label: "Playtest", href: `/dashboard/projects/${projectId}/playtest`, icon: Gamepad2 },
  ];

  const glanceCards = [
    {
      label: "Completion",
      value: `${taskPct}%`,
      detail: `${doneTasks}/${tasks.length} tasks done`,
      icon: TrendingUp,
      color: taskPct >= 80 ? "#10B981" : taskPct >= 40 ? "#F59E0B" : "#EF4444",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      detail: `${tasks.filter((t) => t.status === "testing").length} in testing`,
      icon: Zap,
      color: "#3B82F6",
    },
    {
      label: "Critical Issues",
      value: criticalBugs,
      detail: `${openBugs} bugs total`,
      icon: AlertTriangle,
      color: criticalBugs > 0 ? "#EF4444" : "#10B981",
    },
    {
      label: "Playtest Score",
      value: avgRating ?? "N/A",
      detail: playtest.length > 0 ? `${playtest.length} responses` : "No feedback yet",
      icon: Star,
      color: "#F59E0B",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg"
              style={{ backgroundColor: project.coverColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                >
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-[#6B7280]">
                {project.engine} &middot; {project.genre}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/projects/${projectId}/tasks`}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Link>
            <Link
              href={`/dashboard/projects/${projectId}/bugs`}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#EF4444]/30 hover:text-[#EF4444]"
            >
              <Bug className="h-3.5 w-3.5" />
              Report Bug
            </Link>
            <Link
              href={`/dashboard/projects/${projectId}/devlog`}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#10B981]/30 hover:text-[#10B981]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Write Devlog
            </Link>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-sm leading-relaxed text-[#D1D5DB]">
            {project.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {projectAgeDays} days in development
            </span>
            <span>
              Updated {timeAgo(project.updated_at)}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#2A2A2A] scrollbar-none">
        {tabs.map((tab) => {
          const isOverview = tab.key === "overview";
          const isActive = isOverview && activeTab === "overview";
          const TabIcon = tab.icon;

          if (isOverview) {
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab("overview")}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#F59E0B] text-[#F59E0B]"
                    : "border-transparent text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {tab.label}
              </button>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href!}
              className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* At a Glance */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#9CA3AF]">
          <Activity className="h-4 w-4" />
          At a Glance
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {glanceCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
            >
              <div className="flex items-center justify-between">
                <card.icon
                  className="h-4 w-4"
                  style={{ color: card.color }}
                />
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: card.color }}
                >
                  {card.value}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-[#D1D5DB]">
                {card.label}
              </p>
              <p className="mt-0.5 text-xs text-[#6B7280]">{card.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Task Completion Progress */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#D1D5DB]">Task Progress</span>
          <span
            className="font-semibold tabular-nums"
            style={{
              color: taskPct >= 80 ? "#10B981" : taskPct >= 40 ? "#F59E0B" : "#EF4444",
            }}
          >
            {taskPct}%
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#2A2A2A]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${taskPct}%`,
              backgroundColor: taskPct >= 80 ? "#10B981" : taskPct >= 40 ? "#F59E0B" : "#EF4444",
            }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-[#6B7280]">
          <span>{tasks.filter((t) => t.status === "todo").length} to do</span>
          <span>{inProgressTasks} in progress</span>
          <span>{tasks.filter((t) => t.status === "testing").length} testing</span>
          <span>{doneTasks} done</span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Recent Tasks */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Recent Tasks</h2>
              <Link
                href={`/dashboard/projects/${projectId}/tasks`}
                className="flex items-center gap-1 text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {task.assignee} &middot; {task.sprint}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      TASK_STATUS_STYLES[task.status] || ""
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <div className="py-10 text-center">
                  <ListTodo className="mx-auto h-8 w-8 text-[#6B7280]" />
                  <p className="mt-2 text-sm text-[#6B7280]">No tasks yet</p>
                  <Link
                    href={`/dashboard/projects/${projectId}/tasks`}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add your first task
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {activityFeed.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <ItemIcon
                        className="h-3.5 w-3.5"
                        style={{ color: item.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#6B7280]">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                );
              })}
              {activityFeed.length === 0 && (
                <div className="py-10 text-center">
                  <Activity className="mx-auto h-8 w-8 text-[#6B7280]" />
                  <p className="mt-2 text-sm text-[#6B7280]">
                    No activity yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Open Bugs */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Open Bugs</h2>
              <Link
                href={`/dashboard/projects/${projectId}/bugs`}
                className="flex items-center gap-1 text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {recentBugs.map((bug) => (
                <div
                  key={bug.id}
                  className="px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: getSeverityColor(bug.severity) }}
                    />
                    <p className="truncate text-sm font-medium">{bug.title}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${getSeverityColor(bug.severity)}15`,
                        color: getSeverityColor(bug.severity),
                      }}
                    >
                      {bug.severity}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {bug.platform}
                    </span>
                  </div>
                </div>
              ))}
              {recentBugs.length === 0 && (
                <div className="py-10 text-center">
                  <Bug className="mx-auto h-8 w-8 text-[#6B7280]" />
                  <p className="mt-2 text-sm text-[#6B7280]">No open bugs</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Quick Links</h2>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {tabs
                .filter((t) => t.key !== "overview" && t.href)
                .map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <Link
                      key={tab.key}
                      href={tab.href!}
                      className="flex items-center gap-3 px-5 py-3 text-sm text-[#9CA3AF] transition-colors hover:bg-[#1F1F1F] hover:text-[#F59E0B]"
                    >
                      <TabIcon className="h-4 w-4" />
                      <span className="flex-1">{tab.label}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
