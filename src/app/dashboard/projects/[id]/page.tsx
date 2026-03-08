"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Sparkles,
  BarChart3,
  Copy,
  Download,
  ChevronDown,
  Flag,
  CheckCircle2,
  Circle,
  ShieldAlert,
  Settings,
  Tag,
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
  addProject,
  getAssets,
  getReferences,
  getChangelog,
  getMilestones,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
  type PlaytestResponse,
  type Sprint,
  type Milestone,
  ALL_TASK_TAGS,
  TASK_TAG_COLORS,
  type TaskTag,
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

interface ProjectSettings {
  defaultPriority: "critical" | "high" | "medium" | "low";
  sprintDuration: 1 | 2 | 3 | 4;
  projectColor: string;
  customTags: string[];
}

const DEFAULT_SETTINGS: ProjectSettings = {
  defaultPriority: "medium",
  sprintDuration: 2,
  projectColor: "#F59E0B",
  customTags: [],
};

function getProjectSettings(projectId: string): ProjectSettings {
  try {
    const raw = localStorage.getItem(`gameforge_settings_${projectId}`);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveProjectSettings(projectId: string, settings: ProjectSettings) {
  localStorage.setItem(`gameforge_settings_${projectId}`, JSON.stringify(settings));
}

const SPRINT_DURATION_OPTIONS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
];

function ProjectSettingsModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (open) {
      setSettings(getProjectSettings(projectId));
      setNewTag("");
    }
  }, [open, projectId]);

  const handleSave = () => {
    saveProjectSettings(projectId, settings);
    onClose();
  };

  const addCustomTag = () => {
    const tag = newTag.trim();
    if (!tag || settings.customTags.includes(tag)) return;
    setSettings((s) => ({ ...s, customTags: [...s.customTags, tag] }));
    setNewTag("");
  };

  const removeCustomTag = (tag: string) => {
    setSettings((s) => ({ ...s, customTags: s.customTags.filter((t) => t !== tag) }));
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Settings className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <h2 className="text-lg font-semibold">Project Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          {/* Default Priority */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Default Task Priority</label>
            <p className="mb-2 text-[10px] text-[#6B7280]">New tasks will start with this priority level</p>
            <div className="grid grid-cols-4 gap-2">
              {(["critical", "high", "medium", "low"] as const).map((p) => {
                const colors: Record<string, string> = {
                  critical: "#EF4444",
                  high: "#F97316",
                  medium: "#F59E0B",
                  low: "#10B981",
                };
                const isActive = settings.defaultPriority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setSettings((s) => ({ ...s, defaultPriority: p }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      isActive
                        ? "border-transparent"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                    }`}
                    style={isActive ? { backgroundColor: `${colors[p]}15`, color: colors[p], borderColor: `${colors[p]}40` } : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sprint Duration */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Sprint Duration</label>
            <p className="mb-2 text-[10px] text-[#6B7280]">Default length for new sprints</p>
            <div className="grid grid-cols-4 gap-2">
              {SPRINT_DURATION_OPTIONS.map((opt) => {
                const isActive = settings.sprintDuration === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSettings((s) => ({ ...s, sprintDuration: opt.value as 1 | 2 | 3 | 4 }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Color */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Project Accent Color</label>
            <p className="mb-2 text-[10px] text-[#6B7280]">Used for highlights and badges in this project</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSettings((s) => ({ ...s, projectColor: c }))}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    settings.projectColor === c ? "ring-2 ring-[#F59E0B] ring-offset-2 ring-offset-[#1A1A1A]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={settings.projectColor}
                  onChange={(e) => setSettings((s) => ({ ...s, projectColor: e.target.value }))}
                  className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] text-[#6B7280] hover:border-[#F59E0B]/50 hover:text-[#F59E0B]">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            {settings.projectColor && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: settings.projectColor }} />
                <span className="text-xs font-mono text-[#6B7280]">{settings.projectColor}</span>
              </div>
            )}
          </div>

          {/* Custom Tags */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Custom Tags</label>
            <p className="mb-2 text-[10px] text-[#6B7280]">Add project-specific tags (built-in tags are always available)</p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {ALL_TASK_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${TASK_TAG_COLORS[tag]}20`, color: TASK_TAG_COLORS[tag] }}
                >
                  {tag}
                </span>
              ))}
              {settings.customTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-[#F59E0B]/15 text-[#F59E0B]"
                >
                  {tag}
                  <button onClick={() => removeCustomTag(tag)} className="hover:text-[#EF4444] transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                placeholder="New tag name..."
                className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
              <button
                onClick={addCustomTag}
                disabled={!newTag.trim()}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
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
            className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({
  milestones,
  sprints,
}: {
  milestones: Milestone[];
  sprints: Sprint[];
}) {
  if (milestones.length === 0 && sprints.length === 0) return null;

  const allTs: number[] = [];
  milestones.forEach((ms) => allTs.push(new Date(ms.targetDate).getTime()));
  sprints.forEach((s) => {
    allTs.push(new Date(s.startDate).getTime());
    allTs.push(new Date(s.endDate).getTime());
  });
  const today = Date.now();
  allTs.push(today);

  const pad = 86400000 * 7;
  const minT = Math.min(...allTs) - pad;
  const maxT = Math.max(...allTs) + pad;
  const rangeT = maxT - minT || 1;
  const pct = (t: number) => ((t - minT) / rangeT) * 100;

  const todayPct = pct(today);
  const sortedMs = [...milestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const sortedSp = [...sprints].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const hasSprints = sortedSp.length > 0;

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#9CA3AF]">
        <Clock className="h-4 w-4" />
        Timeline
      </h2>
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {hasSprints && (
              <div className="relative mb-3" style={{ height: Math.min(sortedSp.length, 3) * 20 + 8 }}>
                {sortedSp.map((s, i) => {
                  const left = pct(new Date(s.startDate).getTime());
                  const right = pct(new Date(s.endDate).getTime());
                  const w = Math.max(right - left, 2);
                  const c = s.status === "completed" ? "#10B981" : s.status === "active" ? "#F59E0B" : "#3B82F6";
                  return (
                    <div
                      key={s.id}
                      className="absolute flex items-center rounded px-1.5 text-[10px] font-medium text-white/80 truncate"
                      style={{
                        left: `${left}%`,
                        width: `${w}%`,
                        height: 18,
                        top: (i % 3) * 20,
                        backgroundColor: c,
                        opacity: 0.7,
                        minWidth: 20,
                      }}
                      title={`${s.name} (${s.status})\n${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`}
                    >
                      {s.name}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative" style={{ height: 80 }}>
              <div className="absolute left-0 right-0 top-5 h-[2px] bg-[#2A2A2A]" />

              <div
                className="absolute z-10 flex flex-col items-center"
                style={{ left: `${todayPct}%`, transform: "translateX(-50%)", top: 0 }}
              >
                <span className="mb-0.5 whitespace-nowrap rounded-full bg-[#F59E0B]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#F59E0B]">
                  Today
                </span>
                <div className="h-6 w-[2px] rounded-full bg-[#F59E0B]" />
              </div>

              {sortedMs.map((ms) => {
                const pos = pct(new Date(ms.targetDate).getTime());
                const done = ms.status === "completed";
                const active = ms.status === "in-progress";
                const color = done ? "#10B981" : active ? "#F59E0B" : "#6B7280";
                return (
                  <button
                    key={ms.id}
                    className="group absolute z-20 flex flex-col items-center"
                    style={{ left: `${pos}%`, transform: "translateX(-50%)", top: 10 }}
                    onClick={() => document.getElementById("milestones-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    title={`${ms.name} (${ms.status})`}
                  >
                    <div
                      className="h-[14px] w-[14px] rounded-full border-[2.5px] transition-transform group-hover:scale-[1.3]"
                      style={{ borderColor: color, backgroundColor: done ? color : "#1A1A1A" }}
                    />
                    <span className="mt-1 max-w-[72px] truncate text-[10px] font-medium leading-tight" style={{ color }}>
                      {ms.name}
                    </span>
                    <span className="text-[9px] leading-tight text-[#6B7280]">
                      {new Date(ms.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-[#2A2A2A]/50 pt-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-[#10B981] bg-[#10B981]" />
                <span className="text-[#6B7280]">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-[#F59E0B] bg-[#1A1A1A]" />
                <span className="text-[#6B7280]">In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-[#6B7280] bg-[#1A1A1A]" />
                <span className="text-[#6B7280]">Upcoming</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-[2px] w-3 rounded-full bg-[#F59E0B]" />
                <span className="text-[#6B7280]">Today</span>
              </div>
              {hasSprints && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-4 rounded-sm bg-[#3B82F6] opacity-70" />
                  <span className="text-[#6B7280]">Sprint</span>
                </div>
              )}
            </div>
          </div>
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
  const [exportOpen, setExportOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [msName, setMsName] = useState("");
  const [msDate, setMsDate] = useState("");
  const [msStatus, setMsStatus] = useState<Milestone["status"]>("upcoming");

  const [aiMilestoneLoading, setAiMilestoneLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [riskLoading, setRiskLoading] = useState(false);
  const [riskCards, setRiskCards] = useState<{ title: string; level: "High" | "Medium" | "Low"; description: string; mitigation: string }[] | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setMilestones(getMilestones(projectId));
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

  const handleExportJSON = useCallback(() => {
    if (!project) return;
    const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
    const gddData = gddRaw ? JSON.parse(gddRaw) : null;
    const launchRaw = localStorage.getItem(`gameforge_launch_${projectId}`);
    const launchData = launchRaw ? JSON.parse(launchRaw) : {};

    const exportData = {
      project,
      tasks,
      bugs,
      devlog,
      gdd: gddData,
      assets: getAssets(projectId),
      references: getReferences(projectId),
      changelog: getChangelog(projectId),
      playtest,
      sprints,
      launchChecklist: launchData,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }, [project, tasks, bugs, devlog, playtest, sprints, projectId]);

  const handleExportMarkdown = useCallback(() => {
    if (!project) return;
    const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
    const gddData: Record<string, string> | null = gddRaw ? JSON.parse(gddRaw) : null;
    const changelog = getChangelog(projectId);
    const launchRaw = localStorage.getItem(`gameforge_launch_${projectId}`);
    const launchChecked: Record<string, boolean> = launchRaw ? JSON.parse(launchRaw) : {};

    const lines: string[] = [];
    lines.push(`# ${project.name}`, "");
    lines.push("## Overview");
    lines.push(`- **Status**: ${project.status}`);
    lines.push(`- **Engine**: ${project.engine}`);
    lines.push(`- **Genre**: ${project.genre}`);
    lines.push(`- **Created**: ${new Date(project.created_at).toLocaleDateString()}`);
    lines.push(`- **Last Updated**: ${new Date(project.updated_at).toLocaleDateString()}`);
    if (project.description) {
      lines.push("", project.description);
    }
    lines.push("");

    if (gddData && Object.keys(gddData).length > 0) {
      lines.push("## Game Design Document", "");
      for (const [key, val] of Object.entries(gddData)) {
        if (val) {
          const title = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
          lines.push(`### ${title}`, val, "");
        }
      }
    }

    lines.push(`## Tasks (${doneTasks}/${tasks.length} complete)`, "");
    if (tasks.length > 0) {
      lines.push("| Status | Priority | Title | Sprint | Assignee |");
      lines.push("|--------|----------|-------|--------|----------|");
      for (const t of tasks) {
        lines.push(`| ${t.status} | ${t.priority} | ${t.title} | ${t.sprint} | ${t.assignee} |`);
      }
    } else {
      lines.push("No tasks yet.");
    }
    lines.push("");

    lines.push(`## Bugs (${openBugs} open)`, "");
    if (bugs.length > 0) {
      lines.push("| Severity | Status | Title | Platform |");
      lines.push("|----------|--------|-------|----------|");
      for (const b of bugs) {
        lines.push(`| ${b.severity} | ${b.status} | ${b.title} | ${b.platform} |`);
      }
    } else {
      lines.push("No bugs reported.");
    }
    lines.push("");

    if (changelog.length > 0) {
      lines.push("## Changelog", "");
      for (const entry of changelog) {
        lines.push(`### ${entry.version} - ${entry.title} (${entry.date})`);
        for (const [cat, items] of Object.entries(entry.changes)) {
          if ((items as string[]).length > 0) {
            lines.push(`**${cat}**`);
            for (const item of items as string[]) {
              lines.push(`- ${item}`);
            }
          }
        }
        lines.push("");
      }
    }

    const totalLaunchItems = 33;
    const checkedCount = Object.values(launchChecked).filter(Boolean).length;
    const readinessPct = totalLaunchItems > 0 ? Math.round((checkedCount / totalLaunchItems) * 100) : 0;
    lines.push("## Launch Readiness");
    lines.push(`**${checkedCount}/${totalLaunchItems} items checked (${readinessPct}%)**`, "");

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }, [project, tasks, bugs, doneTasks, openBugs, projectId]);

  const generateReadme = useCallback(async () => {
    if (!project || readmeLoading) return;
    setReadmeLoading(true);

    const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
    const gddData: Record<string, string> | null = gddRaw ? JSON.parse(gddRaw) : null;

    const features = gddData
      ? Object.entries(gddData)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: ${v.slice(0, 120)}`)
          .join("; ")
      : "N/A";

    const taskSummary = `${doneTasks}/${tasks.length} tasks complete, ${inProgressTasks} in progress, ${openBugs} open bugs`;

    const prompt = `Write a GitHub README.md for an indie game called '${project.name}'. Genre: ${project.genre}. Engine: ${project.engine}. Description: ${project.description || "N/A"}. Features: ${features}. Task summary: ${taskSummary}. Include: project title with emoji, badges (genre, engine, status: ${project.status}), description, features list, getting started instructions, controls placeholder, credits section, and license. Format as proper markdown.`;

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
          max_tokens: 1024,
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

      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "README.md";
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      // silently fail
    } finally {
      setReadmeLoading(false);
    }
  }, [project, projectId, tasks, doneTasks, inProgressTasks, openBugs, readmeLoading]);

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

  const generateAiSummary = useCallback(async () => {
    setAiSummaryLoading(true);
    setAiSummary(null);

    const completedSprints = sprints.filter((s) => s.status === "completed");
    const velocity =
      completedSprints.length > 0
        ? Math.round(
            completedSprints.reduce(
              (sum, s) =>
                sum + tasks.filter((t) => t.sprint === s.name && t.status === "done").length,
              0
            ) / completedSprints.length
          )
        : 0;

    const prompt = `Write a brief project status update for '${project?.name}', a ${project?.genre} ${project?.status} game. Stats: ${doneTasks}/${tasks.length} tasks done, ${openBugs} open bugs, ${velocity} tasks/sprint velocity, ${devlog.length} devlog entries. Write 3-4 sentences summarizing the project's health, what's going well, and what needs attention. Be honest and actionable.`;

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
          max_tokens: 256,
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
      setAiSummary(content);
    } catch (err) {
      setAiSummary(
        err instanceof Error ? `Summary failed: ${err.message}` : "Failed to generate summary."
      );
    } finally {
      setAiSummaryLoading(false);
    }
  }, [project?.name, project?.genre, project?.status, tasks, sprints, doneTasks, openBugs, devlog.length]);

  const runRiskAssessment = useCallback(async () => {
    if (!project || riskLoading) return;
    setRiskLoading(true);
    setRiskError(null);
    setRiskCards(null);

    const now = new Date();
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    }).length;

    const blockerBugs = bugs.filter(
      (b) => b.severity === "blocker" && b.status !== "closed"
    ).length;

    const activeSprint = sprints.find((s) => s.status === "active");
    let sprintHealth = "N/A";
    if (activeSprint) {
      const sprintTasks = tasks.filter((t) => t.sprint === activeSprint.name);
      const sprintDone = sprintTasks.filter((t) => t.status === "done").length;
      const sprintTotal = sprintTasks.length;
      const endDate = new Date(activeSprint.endDate);
      const startDate = new Date(activeSprint.startDate);
      const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / 86400000);
      const elapsed = Math.max(0, (now.getTime() - startDate.getTime()) / 86400000);
      const timePct = Math.round((elapsed / totalDays) * 100);
      const taskPctLocal = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;
      sprintHealth = `${taskPctLocal}% done, ${timePct}% time elapsed (${sprintDone}/${sprintTotal} tasks)`;
    }

    const missedMilestones = milestones.filter(
      (m) => m.status !== "completed" && new Date(m.targetDate) < now
    ).length;

    const completion = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

    const prompt = `Analyze risks for game project '${project.name}': ${overdueTasks} overdue tasks, ${blockerBugs} blocker bugs, sprint health: ${sprintHealth}, ${missedMilestones} missed milestones, ${completion}% complete. Identify top 3 risks, rate each as High/Medium/Low, and suggest a mitigation for each. Be brief. Format your response EXACTLY as 3 blocks separated by blank lines, each block having 3 lines: Line 1: "RISK: [title]", Line 2: "LEVEL: [High/Medium/Low]", Line 3: "MITIGATION: [suggestion]". No other text.`;

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

      const blocks = content.split(/\n\s*\n/).filter((b: string) => b.trim());
      const parsed: { title: string; level: "High" | "Medium" | "Low"; description: string; mitigation: string }[] = [];

      for (const block of blocks) {
        const lines = block.trim().split("\n").map((l: string) => l.trim());
        const riskLine = lines.find((l: string) => l.toUpperCase().startsWith("RISK:"));
        const levelLine = lines.find((l: string) => l.toUpperCase().startsWith("LEVEL:"));
        const mitigationLine = lines.find((l: string) => l.toUpperCase().startsWith("MITIGATION:"));

        if (riskLine && levelLine) {
          const title = riskLine.replace(/^RISK:\s*/i, "").trim();
          const levelRaw = levelLine.replace(/^LEVEL:\s*/i, "").trim();
          const level = levelRaw.toLowerCase().includes("high")
            ? "High"
            : levelRaw.toLowerCase().includes("low")
              ? "Low"
              : "Medium";
          const mitigation = mitigationLine
            ? mitigationLine.replace(/^MITIGATION:\s*/i, "").trim()
            : "Review and address promptly.";

          parsed.push({ title, level, description: title, mitigation });
        }
      }

      if (parsed.length === 0) {
        const fallbackRisks = content.split(/\d+\.\s+/).filter((s: string) => s.trim());
        for (let i = 0; i < Math.min(3, fallbackRisks.length); i++) {
          const text = fallbackRisks[i].trim();
          const hasHigh = text.toLowerCase().includes("high");
          const hasLow = text.toLowerCase().includes("low");
          parsed.push({
            title: text.split(".")[0] || `Risk ${i + 1}`,
            level: hasHigh ? "High" : hasLow ? "Low" : "Medium",
            description: text,
            mitigation: "Review and address promptly.",
          });
        }
      }

      setRiskCards(parsed.slice(0, 3));
    } catch (err) {
      setRiskError(err instanceof Error ? err.message : "Failed to run risk analysis.");
    } finally {
      setRiskLoading(false);
    }
  }, [project, tasks, bugs, sprints, milestones, doneTasks, riskLoading]);

  const suggestMilestones = useCallback(async () => {
    if (!project || aiMilestoneLoading) return;
    setAiMilestoneLoading(true);

    const prompt = `Suggest 5 development milestones for a ${project.genre} game called '${project.name}' that is currently ${taskPct}% complete in ${project.status} stage. Include: milestone name, target date (from today ${new Date().toISOString().split("T")[0]}), and a one-line description. Format as JSON array: [{name, targetDate, description}]. Return ONLY the JSON array, no other text.`;

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

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse milestones");

      const parsed: { name: string; targetDate: string; description: string }[] = JSON.parse(jsonMatch[0]);

      for (const ms of parsed) {
        if (ms.name && ms.targetDate) {
          addMilestone({
            projectId,
            name: ms.name,
            targetDate: ms.targetDate,
            status: "upcoming",
          });
        }
      }

      setMilestones(getMilestones(projectId));
    } catch {
      // silently fail
    } finally {
      setAiMilestoneLoading(false);
    }
  }, [project, projectId, taskPct, aiMilestoneLoading]);

  const handleProjectSave = (updated: Project) => {
    setProject(updated);
  };

  const handleDuplicateProject = () => {
    const newProject = addProject({
      name: `${project.name} (Copy)`,
      description: project.description,
      engine: project.engine,
      genre: project.genre,
      status: "concept",
      coverColor: project.coverColor,
    });
    router.push(`/dashboard/projects/${newProject.id}`);
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

      <ProjectSettingsModal
        projectId={projectId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
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
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className={`h-3 w-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl">
                  <button
                    onClick={handleExportJSON}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    <FileText className="h-4 w-4 text-[#F59E0B]" />
                    Export as JSON
                  </button>
                  <div className="mx-3 border-t border-[#2A2A2A]" />
                  <button
                    onClick={handleExportMarkdown}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    <ScrollText className="h-4 w-4 text-[#3B82F6]" />
                    Export as Markdown
                  </button>
                  <div className="mx-3 border-t border-[#2A2A2A]" />
                  <button
                    onClick={generateReadme}
                    disabled={readmeLoading}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5] disabled:opacity-50"
                  >
                    {readmeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    )}
                    Generate README
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={generateAiSummary}
              disabled={aiSummaryLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 disabled:opacity-50"
            >
              {aiSummaryLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              AI Summary
            </button>
            <button
              onClick={runHealthReport}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10"
            >
              <HeartPulse className="h-3.5 w-3.5" />
              Health Report
            </button>
            <button
              onClick={runRiskAssessment}
              disabled={riskLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 disabled:opacity-50"
            >
              {riskLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              Risk Analysis
            </button>
            <button
              onClick={handleDuplicateProject}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
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

      {/* AI Summary */}
      {(aiSummaryLoading || aiSummary) && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-[#F59E0B]">AI Summary</h3>
            {!aiSummaryLoading && (
              <button
                onClick={() => setAiSummary(null)}
                className="ml-auto rounded-lg p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {aiSummaryLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
              <span className="text-sm text-[#9CA3AF]">Generating project summary...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiSummary}</p>
          )}
        </div>
      )}

      {/* AI Risk Assessment */}
      {(riskLoading || riskCards || riskError) && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">AI Risk Analysis</h3>
            </div>
            {!riskLoading && (
              <button
                onClick={() => { setRiskCards(null); setRiskError(null); }}
                className="rounded-lg p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {riskLoading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[#F59E0B]" />
              <p className="text-sm text-[#9CA3AF]">Analyzing project risks...</p>
            </div>
          )}

          {riskError && (
            <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3">
              <p className="text-sm text-[#EF4444]">{riskError}</p>
            </div>
          )}

          {!riskLoading && !riskError && riskCards && riskCards.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {riskCards.map((risk, i) => {
                const colorMap = {
                  High: { border: "#EF4444", bg: "#EF4444", text: "#FCA5A5" },
                  Medium: { border: "#F59E0B", bg: "#F59E0B", text: "#FCD34D" },
                  Low: { border: "#10B981", bg: "#10B981", text: "#6EE7B7" },
                };
                const c = colorMap[risk.level];
                return (
                  <div
                    key={i}
                    className="rounded-lg border p-4 space-y-2.5"
                    style={{ borderColor: `${c.border}30`, backgroundColor: `${c.bg}08` }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${c.bg}20`, color: c.text }}
                      >
                        {risk.level}
                      </span>
                      <ShieldAlert className="h-4 w-4" style={{ color: `${c.bg}80` }} />
                    </div>
                    <p className="text-sm font-medium text-[#F5F5F5] leading-snug">{risk.title}</p>
                    <div className="border-t pt-2" style={{ borderColor: `${c.border}15` }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">Mitigation</p>
                      <p className="text-xs leading-relaxed text-[#D1D5DB]">{risk.mitigation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!riskLoading && !riskError && riskCards && riskCards.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={runRiskAssessment}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Sparkles className="h-3 w-3" />
                Re-analyze
              </button>
            </div>
          )}
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

      {/* Milestones */}
      <div id="milestones-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#9CA3AF]">
            <Flag className="h-4 w-4" />
            Milestones
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={suggestMilestones}
              disabled={aiMilestoneLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-1.5 text-xs text-[#F59E0B] transition-colors hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 disabled:opacity-50"
            >
              {aiMilestoneLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Suggest Milestones
            </button>
            <button
              onClick={() => setShowAddMilestone(!showAddMilestone)}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Plus className="h-3 w-3" />
              Add Milestone
            </button>
          </div>
        </div>

        {showAddMilestone && (
          <div className="mb-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!msName.trim() || !msDate) return;
                addMilestone({
                  projectId,
                  name: msName.trim(),
                  targetDate: msDate,
                  status: msStatus,
                });
                setMilestones(getMilestones(projectId));
                setMsName("");
                setMsDate("");
                setMsStatus("upcoming");
                setShowAddMilestone(false);
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[#6B7280]">Milestone Name</label>
                <input
                  type="text"
                  value={msName}
                  onChange={(e) => setMsName(e.target.value)}
                  placeholder="e.g. Alpha Release"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs text-[#6B7280]">Target Date</label>
                <input
                  type="date"
                  value={msDate}
                  onChange={(e) => setMsDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none [color-scheme:dark] focus:border-[#F59E0B]/50"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs text-[#6B7280]">Status</label>
                <select
                  value={msStatus}
                  onChange={(e) => setMsStatus(e.target.value as Milestone["status"])}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          {milestones.length > 0 ? (
            <div className="divide-y divide-[#2A2A2A]">
              {[...milestones]
                .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
                .map((ms, idx, arr) => {
                  const statusColor =
                    ms.status === "completed"
                      ? "#10B981"
                      : ms.status === "in-progress"
                        ? "#F59E0B"
                        : "#6B7280";
                  const isPast = new Date(ms.targetDate) < new Date() && ms.status !== "completed";
                  const isLast = idx === arr.length - 1;

                  return (
                    <div
                      key={ms.id}
                      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                    >
                      <div className="relative flex flex-col items-center">
                        {ms.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                        ) : ms.status === "in-progress" ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#F59E0B]">
                            <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-[#4B5563]" />
                        )}
                        {!isLast && (
                          <div className="absolute top-6 h-8 w-px bg-[#2A2A2A]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            ms.status === "completed"
                              ? "text-[#9CA3AF] line-through"
                              : "text-[#F5F5F5]"
                          }`}
                        >
                          {ms.name}
                        </p>
                        <p className={`text-xs ${isPast ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
                          {new Date(ms.targetDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isPast && " (overdue)"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-medium capitalize"
                          style={{
                            backgroundColor: `${statusColor}15`,
                            color: statusColor,
                          }}
                        >
                          {ms.status === "in-progress" ? "In Progress" : ms.status}
                        </span>

                        <select
                          value={ms.status}
                          onChange={(e) => {
                            updateMilestone(ms.id, {
                              status: e.target.value as Milestone["status"],
                            });
                            setMilestones(getMilestones(projectId));
                          }}
                          className="rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#9CA3AF] opacity-0 outline-none transition-opacity focus:border-[#F59E0B]/50 group-hover:opacity-100"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <button
                          onClick={() => {
                            deleteMilestone(ms.id);
                            setMilestones(getMilestones(projectId));
                          }}
                          className="rounded p-1 text-[#6B7280] opacity-0 transition-all hover:text-[#EF4444] group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Flag className="mx-auto h-8 w-8 text-[#6B7280]" />
              <p className="mt-2 text-sm text-[#6B7280]">No milestones yet</p>
              <button
                onClick={() => setShowAddMilestone(true)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add your first milestone
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Timeline */}
      <TimelineSection milestones={milestones} sprints={sprints} />

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
