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
} from "lucide-react";
import {
  getProject,
  getTasks,
  getBugs,
  getDevlog,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
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

type Tab = "overview" | "tasks" | "bugs" | "assets" | "devlog" | "gdd" | "launch" | "playtest";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [devlog, setDevlog] = useState<DevlogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    console.log("[ProjectDetailPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setTasks(getTasks(projectId));
    setBugs(getBugs(projectId));
    setDevlog(getDevlog(projectId));
  }, [projectId, router]);

  if (!project) return null;

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const openBugs = bugs.filter((b) => b.status !== "closed").length;
  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);
  const recentBugs = [...bugs]
    .filter((b) => b.status !== "closed")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  const tabs: { key: Tab; label: string; href?: string; icon: typeof ListTodo }[] = [
    { key: "overview", label: "Overview", icon: ChevronRight },
    { key: "tasks", label: "Tasks", href: `/dashboard/projects/${projectId}/tasks`, icon: ListTodo },
    { key: "bugs", label: "Bugs", href: `/dashboard/projects/${projectId}/bugs`, icon: Bug },
    { key: "assets", label: "Assets", href: `/dashboard/projects/${projectId}/assets`, icon: Package },
    { key: "devlog", label: "Devlog", href: `/dashboard/projects/${projectId}/devlog`, icon: BookOpen },
    { key: "gdd", label: "GDD", href: `/dashboard/projects/${projectId}/gdd`, icon: FileText },
    { key: "launch", label: "Launch", href: `/dashboard/projects/${projectId}/launch`, icon: Rocket },
    { key: "playtest", label: "Playtest", href: `/dashboard/projects/${projectId}/playtest`, icon: Gamepad2 },
  ];

  const stats = [
    {
      label: "Total Tasks",
      value: tasks.length,
      icon: ListTodo,
      color: "#3B82F6",
    },
    {
      label: "Done",
      value: doneTasks,
      icon: ListTodo,
      color: "#10B981",
    },
    {
      label: "Open Bugs",
      value: openBugs,
      icon: Bug,
      color: "#EF4444",
    },
    {
      label: "Devlog Entries",
      value: devlog.length,
      icon: BookOpen,
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

      {/* Stats Row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <span className="text-xl font-bold">{stat.value}</span>
            </div>
            <p className="mt-2 text-xs text-[#9CA3AF]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Tasks */}
        <div className="lg:col-span-3">
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
                    style={{
                      backgroundColor: getPriorityColor(task.priority),
                    }}
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
        </div>

        {/* Recent Bugs */}
        <div className="lg:col-span-2">
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
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h3 className="text-sm font-medium text-[#9CA3AF]">
            About this project
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#D1D5DB]">
            {project.description}
          </p>
        </div>
      )}
    </div>
  );
}
