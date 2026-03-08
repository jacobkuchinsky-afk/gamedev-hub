"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Pencil,
  Check,
  ArrowUpDown,
  Target,
  TrendingUp,
  Sparkles,
  Loader2,
  Tag,
} from "lucide-react";
import {
  getProject,
  getTasks,
  addTask,
  updateTask,
  getPriorityColor,
  getSprints,
  addSprint,
  TASK_TAG_COLORS,
  ALL_TASK_TAGS,
  type Project,
  type Task,
  type TaskTag,
  type Sprint,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

const COLUMNS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#9CA3AF" },
  { key: "in-progress", label: "In Progress", color: "#F59E0B" },
  { key: "testing", label: "Testing", color: "#8B5CF6" },
  { key: "done", label: "Done", color: "#10B981" },
];

const PRIORITIES: Task["priority"][] = ["critical", "high", "medium", "low"];

const PRIORITY_ORDER: Record<Task["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type SortOption = "priority" | "name" | "date";

const SPRINT_STATUS_STYLES: Record<
  Sprint["status"],
  { bg: string; text: string }
> = {
  active: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  completed: { bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
  planned: { bg: "bg-[#9CA3AF]/10", text: "text-[#9CA3AF]" },
};

export default function TaskBoardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addToColumn, setAddToColumn] = useState<Task["status"]>("todo");
  const [filterPriority, setFilterPriority] = useState<
    Task["priority"] | "all"
  >("all");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [quickAddTexts, setQuickAddTexts] = useState<Record<string, string>>(
    {}
  );
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [flashingTask, setFlashingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newAssignee, setNewAssignee] = useState("JacobK");
  const [newSprint, setNewSprint] = useState("");
  const [newTags, setNewTags] = useState<TaskTag[]>([]);
  const [editTags, setEditTags] = useState<TaskTag[]>([]);
  const [filterTag, setFilterTag] = useState<TaskTag | "all">("all");
  const [aiDetailLoading, setAiDetailLoading] = useState(false);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>("all");
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [csName, setCsName] = useState("");
  const [csGoal, setCsGoal] = useState("");
  const [csStart, setCsStart] = useState("");
  const [csEnd, setCsEnd] = useState("");

  const reload = useCallback(() => {
    setTasks(getTasks(projectId));
    setSprints(getSprints(projectId));
  }, [projectId]);

  useEffect(() => {
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const defaultSprint = useMemo(() => {
    if (selectedSprint !== "all" && selectedSprint !== "backlog")
      return selectedSprint;
    const active = sprints.find((s) => s.status === "active");
    return (
      active?.name ||
      (sprints.length > 0 ? sprints[sprints.length - 1].name : "Sprint 1")
    );
  }, [selectedSprint, sprints]);

  useEffect(() => {
    setNewSprint(defaultSprint);
  }, [defaultSprint]);

  const nextSprintNum = useMemo(() => {
    const nums = sprints
      .map((s) => parseInt(s.name.replace(/\D/g, "")))
      .filter((n) => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }, [sprints]);

  const handleAiDetail = async () => {
    if (!newTitle.trim() || aiDetailLoading) return;
    setAiDetailLoading(true);
    try {
      const prompt = `Write a brief task description for a game development task: '${newTitle.trim()}'. Include: what needs to be done, acceptance criteria (2-3 bullet points), and estimated complexity (simple/medium/complex). Be practical and specific.`;
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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      if (content) setNewDesc(content);
    } catch {
      // silently fail
    } finally {
      setAiDetailLoading(false);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({
      projectId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: addToColumn,
      priority: newPriority,
      sprint: newSprint || defaultSprint,
      assignee: newAssignee,
      tags: newTags.length > 0 ? newTags : undefined,
    });
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewTags([]);
    setShowAddForm(false);
    reload();
  };

  const handleQuickAdd = (status: Task["status"]) => {
    const text = quickAddTexts[status]?.trim();
    if (!text) return;
    addTask({
      projectId,
      title: text,
      description: "",
      status,
      priority: "medium",
      sprint: defaultSprint,
      assignee: "JacobK",
    });
    setQuickAddTexts((p) => ({ ...p, [status]: "" }));
    reload();
  };

  const handleCreateSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csName.trim()) return;
    addSprint({
      projectId,
      name: csName.trim(),
      goal: csGoal.trim(),
      startDate: csStart,
      endDate: csEnd,
      status: "planned",
    });
    setCsName("");
    setCsGoal("");
    setCsStart("");
    setCsEnd("");
    setShowCreateSprint(false);
    reload();
  };

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    updateTask(taskId, { status: newStatus });
    setFlashingTask(taskId);
    setTimeout(() => setFlashingTask(null), 700);
    reload();
  };

  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditPriority(task.priority);
    setEditTags(task.tags || []);
  };

  const saveEdit = () => {
    if (!editingTask || !editTitle.trim()) return;
    updateTask(editingTask, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      tags: editTags.length > 0 ? editTags : undefined,
    });
    setEditingTask(null);
    reload();
  };

  const sprintSummary = useMemo(() => {
    let pool: Task[];
    if (selectedSprint === "all") pool = tasks;
    else if (selectedSprint === "backlog")
      pool = tasks.filter((t) => !t.sprint || t.sprint === "Backlog");
    else pool = tasks.filter((t) => t.sprint === selectedSprint);
    const total = pool.length;
    const done = pool.filter((t) => t.status === "done").length;
    const inProgress = pool.filter(
      (t) => t.status === "in-progress"
    ).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, pct };
  }, [tasks, selectedSprint]);

  const velocity = useMemo(() => {
    const completed = sprints.filter((s) => s.status === "completed");
    if (!completed.length) return 0;
    const count = completed.reduce(
      (sum, s) =>
        sum +
        tasks.filter((t) => t.sprint === s.name && t.status === "done").length,
      0
    );
    return count / completed.length;
  }, [tasks, sprints]);

  const currentSprintInfo = useMemo(() => {
    if (selectedSprint === "all" || selectedSprint === "backlog") return null;
    return sprints.find((s) => s.name === selectedSprint) || null;
  }, [selectedSprint, sprints]);

  const sortedFilteredTasks = useMemo(() => {
    let filtered = tasks;
    if (selectedSprint === "backlog") {
      filtered = filtered.filter(
        (t) => !t.sprint || t.sprint === "Backlog"
      );
    } else if (selectedSprint !== "all") {
      filtered = filtered.filter((t) => t.sprint === selectedSprint);
    }
    if (filterPriority !== "all") {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }
    if (filterTag !== "all") {
      filtered = filtered.filter((t) => t.tags?.includes(filterTag));
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case "name":
          return a.title.localeCompare(b.title);
        case "date":
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });
  }, [tasks, filterPriority, filterTag, sortBy, selectedSprint]);

  if (!project) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Tasks" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#6B7280]" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-8 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="priority">Sort: Priority</option>
                <option value="name">Sort: Name</option>
                <option value="date">Sort: Date</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) =>
                  setFilterPriority(e.target.value as Task["priority"] | "all")
                }
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="all">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <Tag className="h-3.5 w-3.5 text-[#6B7280]" />
              </div>
              <select
                value={filterTag}
                onChange={(e) =>
                  setFilterTag(e.target.value as TaskTag | "all")
                }
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-8 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="all">All Tags</option>
                {ALL_TASK_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <button
              onClick={() => {
                setAddToColumn("todo");
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Sprint Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSprint("all")}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedSprint === "all"
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
              : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
          }`}
        >
          All
        </button>
        {sprints.map((s) => {
          const isSelected = selectedSprint === s.name;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSprint(s.name)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
              }`}
            >
              {s.status === "completed" && (
                <Check className="h-3 w-3 text-[#10B981]" />
              )}
              {s.status === "active" && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              )}
              {s.name}
            </button>
          );
        })}
        <button
          onClick={() => setSelectedSprint("backlog")}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedSprint === "backlog"
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
              : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
          }`}
        >
          Backlog
        </button>
        <button
          onClick={() => {
            setCsName(`Sprint ${nextSprintNum}`);
            setCsGoal("");
            setCsStart("");
            setCsEnd("");
            setShowCreateSprint(true);
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-[#2A2A2A] px-3 py-1.5 text-xs text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
        >
          <Plus className="h-3 w-3" />
          New Sprint
        </button>
      </div>

      {/* Sprint Summary */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {currentSprintInfo ? (
              <>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-[#F59E0B]" />
                  <span className="font-semibold text-[#F5F5F5]">
                    {currentSprintInfo.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${SPRINT_STATUS_STYLES[currentSprintInfo.status].bg} ${SPRINT_STATUS_STYLES[currentSprintInfo.status].text}`}
                  >
                    {currentSprintInfo.status}
                  </span>
                </div>
                {(currentSprintInfo.goal || currentSprintInfo.startDate) && (
                  <p className="mt-1 truncate text-xs text-[#6B7280]">
                    {currentSprintInfo.goal}
                    {currentSprintInfo.startDate &&
                      ` · ${currentSprintInfo.startDate} — ${currentSprintInfo.endDate}`}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#F59E0B]" />
                <span className="font-semibold text-[#F5F5F5]">
                  {selectedSprint === "backlog" ? "Backlog" : "All Sprints"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-[#F5F5F5]">
                {sprintSummary.total}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                Total
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#10B981]">
                {sprintSummary.done}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                Done
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#F59E0B]">
                {sprintSummary.inProgress}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                Active
              </p>
            </div>
            <div className="w-24">
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>Progress</span>
                <span>{sprintSummary.pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full bg-[#F59E0B] transition-all"
                  style={{ width: `${sprintSummary.pct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-xs font-medium text-[#F5F5F5]">
                {velocity.toFixed(1)}
              </span>
              <span className="text-[10px] text-[#6B7280]">/sprint</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Sprint</h3>
              <button
                onClick={() => setShowCreateSprint(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Sprint Name
                </label>
                <input
                  type="text"
                  value={csName}
                  onChange={(e) => setCsName(e.target.value)}
                  placeholder="Sprint 16"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Sprint Goal
                </label>
                <input
                  type="text"
                  value={csGoal}
                  onChange={(e) => setCsGoal(e.target.value)}
                  placeholder="What should this sprint achieve?"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={csStart}
                    onChange={(e) => setCsStart(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none [color-scheme:dark] focus:border-[#F59E0B]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={csEnd}
                    onChange={(e) => setCsEnd(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none [color-scheme:dark] focus:border-[#F59E0B]/50"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Create Sprint
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Task</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">Description</label>
                  <button
                    type="button"
                    onClick={handleAiDetail}
                    disabled={!newTitle.trim() || aiDetailLoading}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {aiDetailLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI Detail
                  </button>
                </div>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(e.target.value as Task["priority"])
                    }
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Column
                  </label>
                  <select
                    value={addToColumn}
                    onChange={(e) =>
                      setAddToColumn(e.target.value as Task["status"])
                    }
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Sprint
                  </label>
                  <select
                    value={newSprint}
                    onChange={(e) => setNewSprint(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {sprints.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    <option value="Backlog">Backlog</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#6B7280]">
                  Tags (max 3)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TASK_TAGS.map((tag) => {
                    const selected = newTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setNewTags(newTags.filter((t) => t !== tag));
                          } else if (newTags.length < 3) {
                            setNewTags([...newTags, tag]);
                          }
                        }}
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-all ${
                          selected
                            ? "border-transparent"
                            : "border-[#2A2A2A] text-[#6B7280] hover:border-[#3A3A3A] hover:text-[#9CA3AF]"
                        } ${!selected && newTags.length >= 3 ? "opacity-30 cursor-not-allowed" : ""}`}
                        style={
                          selected
                            ? {
                                backgroundColor: `${TASK_TAG_COLORS[tag]}20`,
                                color: TASK_TAG_COLORS[tag],
                                borderColor: `${TASK_TAG_COLORS[tag]}40`,
                              }
                            : undefined
                        }
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column, colIndex) => {
          const columnTasks = sortedFilteredTasks.filter(
            (t) => t.status === column.key
          );
          const prevCol = colIndex > 0 ? COLUMNS[colIndex - 1] : null;
          const nextCol =
            colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1] : null;

          return (
            <div key={column.key} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <span className="text-sm font-semibold">{column.label}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${column.color}15`,
                      color: column.color,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAddToColumn(column.key);
                    setShowAddForm(true);
                  }}
                  className="rounded p-1 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Column Body */}
              <div className="min-h-[200px] space-y-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/50 p-2">
                {/* Quick Add */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={quickAddTexts[column.key] || ""}
                    onChange={(e) =>
                      setQuickAddTexts((prev) => ({
                        ...prev,
                        [column.key]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd(column.key);
                    }}
                    placeholder="Quick add..."
                    className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                  />
                  <button
                    onClick={() => handleQuickAdd(column.key)}
                    className="shrink-0 rounded-lg border border-[#2A2A2A] p-1.5 text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {columnTasks.map((task) => {
                  const isEditing = editingTask === task.id;
                  const isExpanded = expandedTask === task.id;

                  return (
                    <div key={task.id} className="group">
                      <div
                        className={`rounded-lg border bg-[#1A1A1A] p-3 transition-all duration-500 ${
                          flashingTask === task.id
                            ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/20 bg-[#F59E0B]/5"
                            : isExpanded
                              ? "border-[#F59E0B]/30"
                              : "border-[#2A2A2A] hover:border-[#F59E0B]/20"
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {prevCol && (
                            <div className="group/left relative mt-0.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTask(task.id, prevCol.key);
                                }}
                                className="rounded p-1 text-[#6B7280] transition-all hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3A3A3A] bg-[#2A2A2A] px-2 py-1 text-[10px] font-medium text-[#F5F5F5] opacity-0 shadow-lg transition-opacity group-hover/left:opacity-100">
                                Move to {prevCol.label}
                                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#2A2A2A]" />
                              </div>
                            </div>
                          )}

                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() =>
                              setExpandedTask(isExpanded ? null : task.id)
                            }
                          >
                            <p className="text-sm font-medium leading-tight">
                              {task.title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span
                                className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${getPriorityColor(task.priority)}15`,
                                  color: getPriorityColor(task.priority),
                                }}
                              >
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{
                                    backgroundColor: getPriorityColor(
                                      task.priority
                                    ),
                                  }}
                                />
                                {task.priority}
                              </span>
                              {task.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: `${TASK_TAG_COLORS[tag]}18`,
                                    color: TASK_TAG_COLORS[tag],
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                              {task.assignee && (
                                <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                                  <User className="h-3 w-3" />
                                  {task.assignee}
                                </span>
                              )}
                            </div>
                          </div>

                          {nextCol && (
                            <div className="group/right relative mt-0.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTask(task.id, nextCol.key);
                                }}
                                className="rounded p-1 text-[#6B7280] transition-all hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3A3A3A] bg-[#2A2A2A] px-2 py-1 text-[10px] font-medium text-[#F5F5F5] opacity-0 shadow-lg transition-opacity group-hover/right:opacity-100">
                                Move to {nextCol.label}
                                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#2A2A2A]" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="mt-1 space-y-3 rounded-lg border border-[#2A2A2A] bg-[#151515] p-3">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                              />
                              <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Description..."
                                rows={2}
                                className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
                              />
                              <div>
                                <label className="mb-1 block text-xs text-[#6B7280]">
                                  Priority
                                </label>
                                <select
                                  value={editPriority}
                                  onChange={(e) =>
                                    setEditPriority(
                                      e.target.value as Task["priority"]
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                                >
                                  {PRIORITIES.map((p) => (
                                    <option key={p} value={p}>
                                      {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-[#6B7280]">
                                  Tags (max 3)
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {ALL_TASK_TAGS.map((tag) => {
                                    const selected = editTags.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => {
                                          if (selected) {
                                            setEditTags(editTags.filter((t) => t !== tag));
                                          } else if (editTags.length < 3) {
                                            setEditTags([...editTags, tag]);
                                          }
                                        }}
                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                                          selected
                                            ? "border-transparent"
                                            : "border-[#2A2A2A] text-[#6B7280] hover:border-[#3A3A3A]"
                                        } ${!selected && editTags.length >= 3 ? "opacity-30 cursor-not-allowed" : ""}`}
                                        style={
                                          selected
                                            ? {
                                                backgroundColor: `${TASK_TAG_COLORS[tag]}20`,
                                                color: TASK_TAG_COLORS[tag],
                                                borderColor: `${TASK_TAG_COLORS[tag]}40`,
                                              }
                                            : undefined
                                        }
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEdit}
                                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTask(null)}
                                  className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              {task.description && (
                                <p className="text-xs leading-relaxed text-[#9CA3AF]">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                <span>Sprint: {task.sprint}</span>
                                {task.assignee && (
                                  <span>Assignee: {task.assignee}</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="mr-1 text-xs text-[#6B7280]">
                                    Move:
                                  </span>
                                  {COLUMNS.filter(
                                    (c) => c.key !== task.status
                                  ).map((c) => (
                                    <button
                                      key={c.key}
                                      onClick={() => moveTask(task.id, c.key)}
                                      className="rounded border border-[#2A2A2A] px-2 py-0.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                                    >
                                      {c.label}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => startEdit(task)}
                                  className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-2 py-1 text-xs text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-xs text-[#6B7280]">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
