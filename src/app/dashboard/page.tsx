"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  ListTodo,
  Bug,
  BookOpen,
  Plus,
  ArrowRight,
  Wrench,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle2,
  FileText,
  Rocket,
  Hammer,
  PenLine,
  Sparkles,
  X,
  ChevronRight,
  HardDrive,
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getMoodEmoji,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
} from "@/lib/store";

interface Stats {
  activeProjects: number;
  openTasks: number;
  openBugs: number;
  devlogThisWeek: number;
}

interface ActivityEvent {
  id: string;
  type: "task" | "bug" | "devlog";
  title: string;
  projectName: string;
  timestamp: string;
  meta: string;
}

interface ProjectHealth {
  id: string;
  name: string;
  status: Project["status"];
  openBugs: number;
  totalTasks: number;
  doneTasks: number;
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

export default function DashboardPage() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<Stats>({
    activeProjects: 0,
    openTasks: 0,
    openBugs: 0,
    devlogThisWeek: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentBugs, setRecentBugs] = useState<BugType[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);
  const [allProjects, setAllProjects] = useState<(Project & { taskPct: number })[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupLoaded, setBackupLoaded] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("gameforge_welcome_dismissed") === "true";
    setWelcomeDismissed(dismissed);
    const ts = localStorage.getItem("gameforge_last_backup");
    setLastBackup(ts);
    setBackupLoaded(true);
  }, []);

  const handleDismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem("gameforge_welcome_dismissed", "true");
  };

  useEffect(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const bugs = getBugs();
    const devlog = getDevlog();

    setTotalProjects(projects.length);
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

    setAllProjects(
      projects.map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const done = pTasks.filter((t) => t.status === "done").length;
        return { ...p, taskPct: pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0 };
      })
    );

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    setStats({
      activeProjects: projects.filter(
        (p) => p.status !== "released" && p.status !== "concept"
      ).length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      openBugs: bugs.filter((b) => b.status !== "closed").length,
      devlogThisWeek: devlog.filter((d) => new Date(d.date) >= weekAgo).length,
    });

    setRecentTasks(
      [...tasks]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5)
    );

    setRecentBugs(
      [...bugs]
        .filter((b) => b.status !== "closed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 3)
    );

    const events: ActivityEvent[] = [
      ...tasks.map((t) => ({
        id: t.id,
        type: "task" as const,
        title: t.title,
        projectName: projectMap[t.projectId] || "Unknown",
        timestamp: t.created_at,
        meta: `${t.priority} priority · ${t.status}`,
      })),
      ...bugs.map((b) => ({
        id: b.id,
        type: "bug" as const,
        title: b.title,
        projectName: projectMap[b.projectId] || "Unknown",
        timestamp: b.created_at,
        meta: `${b.severity} · ${b.status}`,
      })),
      ...devlog.map((d) => ({
        id: d.id,
        type: "devlog" as const,
        title: d.title,
        projectName: projectMap[d.projectId] || "Unknown",
        timestamp: new Date(d.date).toISOString(),
        meta: `${getMoodEmoji(d.mood)} ${d.mood}`,
      })),
    ];

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setActivity(events.slice(0, 10));

    setProjectHealth(
      projects.map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const pBugs = bugs.filter(
          (b) => b.projectId === p.id && b.status !== "closed"
        );
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          openBugs: pBugs.length,
          totalTasks: pTasks.length,
          doneTasks: pTasks.filter((t) => t.status === "done").length,
        };
      })
    );
  }, []);

  const statCards = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      color: "#F59E0B",
      href: "/dashboard/projects",
    },
    {
      label: "Open Tasks",
      value: stats.openTasks,
      icon: ListTodo,
      color: "#3B82F6",
      href: "/dashboard/projects",
    },
    {
      label: "Open Bugs",
      value: stats.openBugs,
      icon: Bug,
      color: "#EF4444",
      href: "/dashboard/projects",
    },
    {
      label: "Devlog This Week",
      value: stats.devlogThisWeek,
      icon: BookOpen,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
  ];

  const quickActions = [
    {
      label: "New Project",
      desc: "Start a new game",
      icon: Plus,
      color: "#F59E0B",
      href: "/dashboard/projects/new",
    },
    {
      label: "Write Devlog",
      desc: "Log your progress",
      icon: FileText,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
    {
      label: "Open Tools",
      desc: "Sprite, sound, more",
      icon: Wrench,
      color: "#8B5CF6",
      href: "/dashboard/tools",
    },
    {
      label: "Generate Ideas",
      desc: "Brainstorm concepts",
      icon: Lightbulb,
      color: "#F97316",
      href: "/dashboard/tools/ideas",
    },
  ];

  const taskStatusStyles: Record<string, string> = {
    todo: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
    "in-progress": "bg-[#F59E0B]/10 text-[#F59E0B]",
    testing: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    done: "bg-[#10B981]/10 text-[#10B981]",
  };

  const statusBadge: Record<Project["status"], string> = {
    concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
    prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
    alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
    gold: "bg-[#10B981]/10 text-[#10B981]",
    released: "bg-[#22C55E]/10 text-[#22C55E]",
  };

  const activityIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "task":
        return <ListTodo className="h-4 w-4 text-[#3B82F6]" />;
      case "bug":
        return <AlertTriangle className="h-4 w-4 text-[#EF4444]" />;
      case "devlog":
        return <BookOpen className="h-4 w-4 text-[#10B981]" />;
    }
  };

  const activityLabel = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "task":
        return "Task";
      case "bug":
        return "Bug";
      case "devlog":
        return "Devlog";
    }
  };

  const onboardingCards = [
    {
      label: "Create Your First Project",
      desc: "Set up your game, define the genre, pick an engine, and start building.",
      icon: Rocket,
      color: "#F59E0B",
      href: "/dashboard/projects/new",
    },
    {
      label: "Explore Tools",
      desc: "Sprite generators, sound design, color palettes — all the tools you need.",
      icon: Hammer,
      color: "#8B5CF6",
      href: "/dashboard/tools",
    },
    {
      label: "Write a Devlog",
      desc: "Track your progress, mood, and wins. Your future self will thank you.",
      icon: PenLine,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
    {
      label: "Generate Game Ideas",
      desc: "Stuck on what to make? Let AI brainstorm wild concepts for you.",
      icon: Sparkles,
      color: "#F97316",
      href: "/dashboard/tools/ideas",
    },
  ];

  const showWelcomeBanner = totalProjects === 0 && !welcomeDismissed;

  const backupDaysAgo = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null;
  const backupLabel = !lastBackup
    ? "Never"
    : backupDaysAgo === 0
      ? "Today"
      : backupDaysAgo === 1
        ? "Yesterday"
        : `${backupDaysAgo} days ago`;
  const backupStale = !lastBackup || (backupDaysAgo !== null && backupDaysAgo > 7);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {showWelcomeBanner ? (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/5 via-[#1A1A1A] to-[#1A1A1A] p-8">
            <button
              onClick={handleDismissWelcome}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                <Rocket className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <h1 className="text-2xl font-bold">
                Welcome to <span className="text-[#F59E0B]">GameForge</span>!
              </h1>
            </div>
            <p className="text-[#9CA3AF] max-w-lg">
              Your all-in-one game development hub. Create projects, track bugs, write devlogs, and use AI-powered tools to ship your game faster.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Get Started</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {onboardingCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group flex items-start gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm group-hover:text-[#F59E0B] transition-colors">{card.label}</p>
                    <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">{card.desc}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5 group-hover:text-[#F59E0B]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back,{" "}
              <span className="text-[#F59E0B]">{user?.username}</span>
            </h1>
            <p className="mt-1 text-[#9CA3AF]">
              Here&apos;s what&apos;s happening with your games.
            </p>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/20"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon
                  className="h-5 w-5"
                  style={{ color: stat.color }}
                />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="mt-3 text-sm text-[#9CA3AF]">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 transition-all hover:border-[#F59E0B]/20"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <action.icon
                className="h-4 w-4"
                style={{ color: action.color }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-xs text-[#6B7280]">{action.desc}</p>
            </div>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {/* Your Projects */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Your Projects</h2>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1 text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {allProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group flex w-56 shrink-0 flex-col rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-all hover:border-[#F59E0B]/20 hover:bg-[#1F1F1F]"
              style={{ borderLeftColor: project.coverColor, borderLeftWidth: "3px" }}
            >
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{project.name}</p>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusBadge[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>Tasks</span>
                    <span className="tabular-nums">{project.taskPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${project.taskPct}%`,
                        backgroundColor: project.coverColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
          <Link
            href="/dashboard/projects/new"
            className="flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2A2A2A] bg-[#1A1A1A]/50 p-4 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B]/10">
              <Plus className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <span className="text-sm font-medium text-[#6B7280]">New Project</span>
          </Link>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Tasks */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Recent Tasks</h2>
              <Link
                href="/dashboard/projects"
                className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all
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
                    style={{
                      backgroundColor: getPriorityColor(task.priority),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-[#6B7280]">
                      {task.sprint}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      taskStatusStyles[task.status] || ""
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  No tasks yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bugs */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Open Bugs</h2>
              <Link
                href="/dashboard/projects"
                className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all
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
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  No open bugs.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <h2 className="font-semibold">Activity Feed</h2>
          <span className="text-xs text-[#6B7280]">Latest 10 events</span>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {activity.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A]">
                {activityIcon(event.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#F59E0B]">
                    {activityLabel(event.type)}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    in {event.projectName}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{event.meta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-[#6B7280]">
                <Clock className="h-3 w-3" />
                {relativeTime(event.timestamp)}
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
              No activity yet.
            </p>
          )}
        </div>
      </div>

      {/* Project Health */}
      {projectHealth.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <h2 className="font-semibold">Project Health</h2>
            <Link
              href="/dashboard/projects"
              className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {projectHealth.map((ph) => {
              const pct =
                ph.totalTasks > 0
                  ? Math.round((ph.doneTasks / ph.totalTasks) * 100)
                  : 0;
              return (
                <Link
                  key={ph.id}
                  href={`/dashboard/projects/${ph.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{ph.name}</p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusBadge[ph.status]}`}
                      >
                        {ph.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct === 100
                                ? "#10B981"
                                : pct >= 50
                                  ? "#F59E0B"
                                  : "#3B82F6",
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-[#9CA3AF]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    {ph.doneTasks}/{ph.totalTasks}
                  </div>
                  {ph.openBugs > 0 && (
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#EF4444]">
                      <Bug className="h-3.5 w-3.5" />
                      {ph.openBugs}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Backup Reminder */}
      {backupLoaded && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
            backupStale
              ? "border-[#F59E0B]/20 bg-[#F59E0B]/5"
              : "border-[#2A2A2A] bg-[#1A1A1A]"
          }`}
        >
          <HardDrive
            className={`h-4 w-4 shrink-0 ${backupStale ? "text-[#F59E0B]" : "text-[#6B7280]"}`}
          />
          <div className="min-w-0 flex-1">
            {backupStale ? (
              <p className="text-sm text-[#F59E0B]">
                {lastBackup
                  ? "It\u2019s been a while since you backed up your data."
                  : "You\u2019ve never backed up your data."}
                {" "}
                <Link
                  href="/dashboard/settings"
                  className="font-medium underline decoration-[#F59E0B]/40 underline-offset-2 transition-colors hover:decoration-[#F59E0B]"
                >
                  Export now?
                </Link>
              </p>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Last backup: {backupLabel}
              </p>
            )}
          </div>
          {!backupStale && (
            <Link
              href="/dashboard/settings"
              className="shrink-0 text-xs text-[#6B7280] transition-colors hover:text-[#F59E0B]"
            >
              Settings
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
