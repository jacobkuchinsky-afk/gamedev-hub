"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Pencil,
  X,
  Trash2,
  HeartPulse,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  getProject,
  getTasks,
  getBugs,
  getDevlog,
  getPlaytestResponses,
  getSprints,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getMoodEmoji,
  updateProject,
  deleteProject,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
  type PlaytestResponse,
  type Sprint,
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

const STATUS_OPTIONS: Project["status"][] = ["concept", "prototype", "alpha", "beta", "gold", "released"];
const PRESET_COLORS = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4", "#84CC16"];

function EditProjectModal({
  project,
  open,
  onClose,
  onSave,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<Project["status"]>(project.status);
  const [engine, setEngine] = useState(project.engine);
  const [genre, setGenre] = useState(project.genre);
  const [coverColor, setCoverColor] = useState(project.coverColor);

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setEngine(project.engine);
      setGenre(project.genre);
      setCoverColor(project.coverColor);
    }
  }, [open, project]);

  const handleSave = () => {
    const updated = updateProject(project.id, { name, description, status, engine, genre, coverColor });
    if (updated) onSave(updated);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <h2 className="text-lg font-semibold">Edit Project</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    status === s
                      ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Engine</label>
              <input
                type="text"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCoverColor(c)}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    coverColor === c ? "ring-2 ring-[#F59E0B] ring-offset-2 ring-offset-[#1A1A1A]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={coverColor}
                  onChange={(e) => setCoverColor(e.target.value)}
                  className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] text-[#6B7280] hover:border-[#F59E0B]/50 hover:text-[#F59E0B]">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#2A2A2A] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteProjectModal({
  project,
  open,
  onClose,
  onConfirm,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  const canDelete = confirmText === project.name;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#EF4444]/20 bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#EF4444]/20 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EF4444]/10">
            <Trash2 className="h-4.5 w-4.5 text-[#EF4444]" />
          </div>
          <h2 className="text-lg font-semibold text-[#EF4444]">Delete Project</h2>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-[#D1D5DB]">
            Delete <span className="font-semibold text-[#F5F5F5]">{project.name}</span>? This will
            permanently delete all tasks, bugs, devlogs, and data for this project.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Type <span className="font-mono text-[#EF4444]">{project.name}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={project.name}
              className="w-full rounded-lg border border-[#EF4444]/20 bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#EF4444]/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#2A2A2A] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

function HealthReportModal({
  open,
  onClose,
  report,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  report: string | null;
  loading: boolean;
  error: string | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <HeartPulse className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <h2 className="text-lg font-semibold">Health Report</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
              <p className="text-sm text-[#9CA3AF]">Analyzing project health...</p>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3">
              <p className="text-sm text-[#EF4444]">{error}</p>
            </div>
          )}
          {!loading && !error && report && (
            <div className="prose-invert space-y-3 text-sm leading-relaxed text-[#D1D5DB]">
              {report.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />;
                if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
                  return (
                    <h3 key={i} className="mt-3 text-base font-semibold text-[#F5F5F5]">
                      {line.replace(/^#+\s*/, "")}
                    </h3>
                  );
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return (
                    <div key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                      <span>{line.replace(/^[-*]\s*/, "")}</span>
                    </div>
                  );
                }
                const ratingMatch = line.match(/(\d+)\s*\/\s*10/);
                if (ratingMatch) {
                  const score = parseInt(ratingMatch[1]);
                  const scoreColor = score >= 7 ? "#10B981" : score >= 4 ? "#F59E0B" : "#EF4444";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{ color: scoreColor }}>
                        {score}
                      </span>
                      <span className="text-xs text-[#6B7280]">/ 10</span>
                      <span className="ml-1 text-sm">{line.replace(/\d+\s*\/\s*10/, "").trim()}</span>
                    </div>
                  );
                }
                if (line.match(/^\d+\.\s/)) {
                  return (
                    <div key={i} className="flex gap-2">
                      <span className="shrink-0 text-[#F59E0B]">{line.match(/^\d+/)?.[0]}.</span>
                      <span>{line.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={i} className="font-semibold text-[#F5F5F5]">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          )}
          {!loading && !error && !report && (
            <p className="py-8 text-center text-sm text-[#6B7280]">No report generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductivitySection({
  tasks,
  bugs,
  devlog,
  sprints,
}: {
  tasks: Task[];
  bugs: BugType[];
  devlog: DevlogEntry[];
  sprints: Sprint[];
}) {
  const sprintBurndown = useMemo(() => {
    const sorted = [...sprints]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-5);

    return sorted.map((s) => {
      const sprintTasks = tasks.filter((t) => t.sprint === s.name);
      const remaining = sprintTasks.filter((t) => t.status !== "done").length;
      const total = sprintTasks.length;
      return { name: s.name.replace("Sprint ", "S"), remaining, total, status: s.status };
    });
  }, [tasks, sprints]);

  const maxBurndown = Math.max(...sprintBurndown.map((s) => s.total), 1);

  const closedBugs = bugs.filter((b) => b.status === "closed").length;
  const totalBugs = bugs.length;
  const openBugsCount = totalBugs - closedBugs;
  const closedPct = totalBugs > 0 ? Math.round((closedBugs / totalBugs) * 100) : 0;
  const openPct = 100 - closedPct;

  const devlogWeeks = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
      const count = devlog.filter((d) => {
        const date = new Date(d.date);
        return date >= weekStart && date < weekEnd;
      }).length;
      weeks.push({
        label: i === 0 ? "This wk" : i === 1 ? "Last wk" : `${i}w ago`,
        count,
      });
    }
    return weeks;
  }, [devlog]);

  const maxDevlog = Math.max(...devlogWeeks.map((w) => w.count), 1);

  const donutRadius = 36;
  const donutStroke = 8;
  const circumference = 2 * Math.PI * donutRadius;
  const closedDash = (closedPct / 100) * circumference;
  const openDash = (openPct / 100) * circumference;

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#9CA3AF]">
        <BarChart3 className="h-4 w-4" />
        Productivity
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Sprint Burndown */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-medium text-[#9CA3AF]">Task Burndown</p>
          <p className="mb-3 text-[10px] text-[#6B7280]">Remaining tasks per sprint</p>
          {sprintBurndown.length > 0 ? (
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {sprintBurndown.map((s) => {
                const totalH = s.total > 0 ? (s.total / maxBurndown) * 100 : 0;
                return (
                  <div key={s.name} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tabular-nums text-[#D1D5DB]">
                      {s.remaining}
                    </span>
                    <div className="relative w-full overflow-hidden rounded-sm" style={{ height: `${totalH}%`, minHeight: 4 }}>
                      <div className="absolute inset-0 bg-[#2A2A2A]" />
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-500"
                        style={{
                          height: `${s.total > 0 ? (s.remaining / s.total) * 100 : 0}%`,
                          backgroundColor: s.status === "completed" ? "#10B981" : s.status === "active" ? "#F59E0B" : "#3B82F6",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7280]">{s.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center">
              <span className="text-xs text-[#6B7280]">No sprints yet</span>
            </div>
          )}
        </div>

        {/* Bug Resolution Donut */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-medium text-[#9CA3AF]">Bug Resolution</p>
          <p className="mb-3 text-[10px] text-[#6B7280]">Open vs closed bugs</p>
          {totalBugs > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <svg width="88" height="88" viewBox="0 0 88 88">
                  <circle
                    cx="44"
                    cy="44"
                    r={donutRadius}
                    fill="none"
                    stroke="#2A2A2A"
                    strokeWidth={donutStroke}
                  />
                  <circle
                    cx="44"
                    cy="44"
                    r={donutRadius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={donutStroke}
                    strokeDasharray={`${closedDash} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="44"
                    cy="44"
                    r={donutRadius}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={donutStroke}
                    strokeDasharray={`${openDash} ${circumference}`}
                    strokeDashoffset={-closedDash}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums text-[#F5F5F5]">{closedPct}%</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[#D1D5DB]">Closed</span>
                  <span className="ml-auto font-medium tabular-nums text-[#D1D5DB]">{closedBugs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[#D1D5DB]">Open</span>
                  <span className="ml-auto font-medium tabular-nums text-[#D1D5DB]">{openBugsCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center">
              <span className="text-xs text-[#6B7280]">No bugs reported</span>
            </div>
          )}
        </div>

        {/* Devlog Frequency */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-xs font-medium text-[#9CA3AF]">Devlog Frequency</p>
          <p className="mb-3 text-[10px] text-[#6B7280]">Entries per week (last 4 weeks)</p>
          <div className="flex items-end gap-3" style={{ height: 80 }}>
            {devlogWeeks.map((w) => {
              const h = w.count > 0 ? (w.count / maxDevlog) * 100 : 0;
              return (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium tabular-nums text-[#D1D5DB]">
                    {w.count}
                  </span>
                  <div
                    className="w-full rounded-sm bg-[#F59E0B] transition-all duration-500"
                    style={{ height: `${h}%`, minHeight: w.count > 0 ? 4 : 2, opacity: w.count > 0 ? 1 : 0.2 }}
                  />
                  <span className="text-[10px] text-[#6B7280]">{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [devlog, setDevlog] = useState<DevlogEntry[]>([]);
  const [playtest, setPlaytest] = useState<PlaytestResponse[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [healthReport, setHealthReport] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

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
    setSprints(getSprints(projectId));
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

  const runHealthReport = useCallback(async () => {
    setHealthOpen(true);
    setHealthLoading(true);
    setHealthError(null);
    setHealthReport(null);

    const severityDist = bugs.reduce<Record<string, number>>((acc, b) => {
      if (b.status !== "closed") acc[b.severity] = (acc[b.severity] || 0) + 1;
      return acc;
    }, {});

    const sprintGroups = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
      const s = t.sprint || "Unassigned";
      if (!acc[s]) acc[s] = { total: 0, done: 0 };
      acc[s].total++;
      if (t.status === "done") acc[s].done++;
      return acc;
    }, {});

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const recentDevlogs = devlog.filter((d) => new Date(d.date) >= thirtyDaysAgo).length;

    const data = {
      totalTasks: tasks.length,
      completedTasks: doneTasks,
      inProgressTasks,
      openBugs,
      criticalBugs,
      severityDistribution: severityDist,
      sprintVelocity: sprintGroups,
      devlogFrequency: `${recentDevlogs} entries in last 30 days`,
      projectAge: `${projectAgeDays} days`,
      status: project?.status,
    };

    const prompt = `Analyze this game project's health: ${JSON.stringify(data)}. Rate overall health 1-10. Identify the top risk, the strongest area, and suggest 3 specific actions to improve. Be brief and actionable.`;

    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      const content =
        result.choices?.[0]?.message?.content ||
        result.choices?.[0]?.message?.reasoning ||
        "";

      if (!content) throw new Error("No response from AI");
      setHealthReport(content);
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : "Failed to generate health report. Try again later."
      );
    } finally {
      setHealthLoading(false);
    }
  }, [tasks, bugs, devlog, doneTasks, inProgressTasks, openBugs, criticalBugs, projectAgeDays, project?.status]);

  const handleProjectSave = (updated: Project) => {
    setProject(updated);
  };

  const handleDeleteProject = () => {
    deleteProject(projectId);
    router.replace("/dashboard/projects");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {project && (
        <>
          <EditProjectModal
            project={project}
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSave={handleProjectSave}
          />
          <DeleteProjectModal
            project={project}
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDeleteProject}
          />
        </>
      )}

      <HealthReportModal
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        report={healthReport}
        loading={healthLoading}
        error={healthError}
      />

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
            <button
              onClick={runHealthReport}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10"
            >
              <HeartPulse className="h-3.5 w-3.5" />
              Health Report
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Project
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#EF4444]/20 px-3 py-2 text-sm text-[#EF4444]/70 transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/5 hover:text-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Productivity Analytics */}
      <ProductivitySection tasks={tasks} bugs={bugs} devlog={devlog} sprints={sprints} />

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
