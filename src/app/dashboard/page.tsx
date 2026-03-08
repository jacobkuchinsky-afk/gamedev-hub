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
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getPriorityColor,
  getSeverityColor,
  type Task,
  type Bug as BugType,
} from "@/lib/store";

interface Stats {
  activeProjects: number;
  openTasks: number;
  openBugs: number;
  devlogThisWeek: number;
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

  useEffect(() => {
    console.log("[DashboardPage] rendered");
    const projects = getProjects();
    const tasks = getTasks();
    const bugs = getBugs();
    const devlog = getDevlog();

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
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    );

    setRecentBugs(
      [...bugs]
        .filter((b) => b.status !== "closed")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
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

  const taskStatusStyles: Record<string, string> = {
    todo: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
    "in-progress": "bg-[#F59E0B]/10 text-[#F59E0B]",
    testing: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    done: "bg-[#10B981]/10 text-[#10B981]",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="text-[#F59E0B]">{user?.username}</span>
        </h1>
        <p className="mt-1 text-[#9CA3AF]">Here&apos;s what&apos;s happening with your games.</p>
      </div>

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
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="mt-3 text-sm text-[#9CA3AF]">{stat.label}</p>
          </Link>
        ))}
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
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-[#6B7280]">{task.sprint}</p>
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
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">No tasks yet.</p>
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
                <div key={bug.id} className="px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]">
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
                    <span className="text-xs text-[#6B7280]">{bug.platform}</span>
                  </div>
                </div>
              ))}
              {recentBugs.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">No open bugs.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/projects"
          className="group flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
            <Plus className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <div>
            <p className="font-semibold">New Project</p>
            <p className="text-sm text-[#9CA3AF]">Start a new game</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/dashboard/devlog"
          className="group flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#10B981]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981]/10">
            <BookOpen className="h-5 w-5 text-[#10B981]" />
          </div>
          <div>
            <p className="font-semibold">Log Entry</p>
            <p className="text-sm text-[#9CA3AF]">Write a devlog</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/dashboard/tools"
          className="group flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#8B5CF6]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
            <Wrench className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <div>
            <p className="font-semibold">Open Tools</p>
            <p className="text-sm text-[#9CA3AF]">Sprite, sound, more</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
