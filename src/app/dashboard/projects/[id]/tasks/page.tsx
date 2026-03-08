"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Lock,
  Clock,
  Timer,
  CalendarDays,
  AlertTriangle,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  Bug,
  MoreVertical,
  Copy,
  FileText,
  MessageSquare,
  Send,
  Download,
  ScrollText,
  LayoutGrid,
  List,
  Zap,
  Settings,
} from "lucide-react";
import {
  getProject,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  deleteTasks,
  addBug,
  getPriorityColor,
  getSprints,
  addSprint,
  TASK_TAG_COLORS,
  ALL_TASK_TAGS,
  type Project,
  type Task,
  type TaskTag,
  type Sprint,
  type Subtask,
  type TaskComment,
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

type SortOption = "priority" | "name" | "date" | "dueDate";

function getDueDateInfo(dueDate: string | undefined): { label: string; urgency: "overdue" | "urgent" | "normal" | "none" } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { label: abs === 1 ? "Overdue by 1 day" : `Overdue by ${abs} days`, urgency: "overdue" };
  }
  if (diffDays === 0) return { label: "Due today", urgency: "urgent" };
  if (diffDays === 1) return { label: "Due tomorrow", urgency: "urgent" };
  if (diffDays <= 2) return { label: `Due in ${diffDays} days`, urgency: "urgent" };
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, urgency: "normal" };
  if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return { label: weeks === 1 ? "Due in 1 week" : `Due in ${weeks} weeks`, urgency: "normal" };
  }
  return { label: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, urgency: "normal" };
}

const SPRINT_STATUS_STYLES: Record<
  Sprint["status"],
  { bg: string; text: string }
> = {
  active: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  completed: { bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
  planned: { bg: "bg-[#9CA3AF]/10", text: "text-[#9CA3AF]" },
};

const TASK_TEMPLATES: {
  name: string;
  icon: string;
  priority: Task["priority"];
  tags: TaskTag[];
  description: string;
}[] = [
  {
    name: "Bug Fix",
    icon: "bug",
    priority: "high",
    tags: ["Bugfix"],
    description: "Bug: [describe the issue]\nSteps to reproduce:\n1. \n2. \n3. \nExpected: \nActual: ",
  },
  {
    name: "New Feature",
    icon: "feature",
    priority: "medium",
    tags: ["Feature"],
    description: "Feature: [describe the feature]\n\nAcceptance criteria:\n- \n- \n- ",
  },
  {
    name: "UI Polish",
    icon: "ui",
    priority: "low",
    tags: ["UI", "Polish"],
    description: "Polish: [describe what needs improving]\n\nBefore: \nAfter: ",
  },
  {
    name: "Audio Work",
    icon: "audio",
    priority: "medium",
    tags: ["Audio"],
    description: "Audio task: [describe the audio work]\n\nAssets needed:\n- \n\nIntegration notes: ",
  },
  {
    name: "Art Asset",
    icon: "art",
    priority: "medium",
    tags: ["Art"],
    description: "Art asset: [describe the asset]\n\nSpecifications:\n- Resolution: \n- Format: \n- Style reference: ",
  },
];

const AVATAR_COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4", "#F97316"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const [newBlockedBy, setNewBlockedBy] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editBlockedBy, setEditBlockedBy] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<TaskTag | "all">("all");
  const [aiDetailLoading, setAiDetailLoading] = useState(false);
  const [editEstimate, setEditEstimate] = useState<Record<string, string>>({});

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>("all");
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [csName, setCsName] = useState("");
  const [csGoal, setCsGoal] = useState("");
  const [csStart, setCsStart] = useState("");
  const [csEnd, setCsEnd] = useState("");

  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [aiEstimateLoading, setAiEstimateLoading] = useState<Record<string, boolean>>({});
  const [aiEstimateNote, setAiEstimateNote] = useState<Record<string, string>>({});

  const [aiBreakdownLoading, setAiBreakdownLoading] = useState<Record<string, boolean>>({});
  const [aiSprintLoading, setAiSprintLoading] = useState(false);
  const [aiSprintResult, setAiSprintResult] = useState<string | null>(null);
  const [showAiSprintPanel, setShowAiSprintPanel] = useState(false);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);
  const [bulkAssignInput, setBulkAssignInput] = useState("");
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [convertToBugId, setConvertToBugId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const [kebabMenuTask, setKebabMenuTask] = useState<string | null>(null);
  const [kebabSubMenu, setKebabSubMenu] = useState<"priority" | "move" | null>(null);
  const [kebabDeleteConfirm, setKebabDeleteConfirm] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);

  const [retroNotes, setRetroNotes] = useState<Record<string, { wentWell: string; didntGoWell: string; improve: string }>>({});
  const [aiRetroLoading, setAiRetroLoading] = useState(false);

  const [taskExportOpen, setTaskExportOpen] = useState(false);
  const taskExportRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [listSortField, setListSortField] = useState<string>("priority");
  const [listSortDir, setListSortDir] = useState<"asc" | "desc">("asc");

  const [showPlanningPoker, setShowPlanningPoker] = useState(false);
  const [pokerIndex, setPokerIndex] = useState(0);

  const [wipLimits, setWipLimits] = useState<Record<string, number | null>>({});
  const [wipEditingCol, setWipEditingCol] = useState<string | null>(null);
  const [wipEditValue, setWipEditValue] = useState("");

  const handleConvertToBug = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    addBug({
      projectId: task.projectId,
      title: task.title,
      description: `Created from task: "${task.title}"\n\n${task.description}`,
      severity: task.priority === "critical" ? "critical" : task.priority === "high" ? "major" : "minor",
      status: "open",
      platform: "All",
      reproSteps: task.description || "Converted from task board — add repro steps.",
    });

    deleteTask(taskId);
    setConvertToBugId(null);
    setExpandedTask(null);
    reload();
  };

  const reload = useCallback(() => {
    setTasks(getTasks(projectId));
    setSprints(getSprints(projectId));
  }, [projectId]);

  useEffect(() => {
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  useEffect(() => {
    function handleClickOutsideExport(e: MouseEvent) {
      if (taskExportRef.current && !taskExportRef.current.contains(e.target as Node)) {
        setTaskExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideExport);
    return () => document.removeEventListener("mousedown", handleClickOutsideExport);
  }, []);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`retro_${projectId}`);
      if (saved) setRetroNotes(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wip_limits_${projectId}`);
      if (saved) setWipLimits(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [projectId]);

  const saveWipLimit = useCallback((colKey: string, limit: number | null) => {
    setWipLimits((prev) => {
      const updated = { ...prev, [colKey]: limit };
      localStorage.setItem(`wip_limits_${projectId}`, JSON.stringify(updated));
      return updated;
    });
  }, [projectId]);

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

  const handleAiSprintPlan = async () => {
    if (aiSprintLoading) return;
    setAiSprintLoading(true);
    setShowAiSprintPanel(true);
    setAiSprintResult(null);

    const backlogTasks = tasks.filter(
      (t) => !t.sprint || t.sprint === "Backlog"
    );
    if (backlogTasks.length === 0) {
      setAiSprintResult(
        "No backlog tasks found. Add tasks to the backlog first."
      );
      setAiSprintLoading(false);
      return;
    }

    const taskList = backlogTasks
      .map(
        (t) =>
          `- "${t.title}" (priority: ${t.priority}${t.estimatedHours ? `, estimate: ${t.estimatedHours}h` : ""}${t.tags?.length ? `, tags: ${t.tags.join(", ")}` : ""})`
      )
      .join("\n");

    const vel = velocity > 0 ? Math.round(velocity) : 5;

    const prompt = `I have these backlog tasks for my game:\n${taskList}\n\nMy sprint capacity is ${vel} tasks (based on previous sprints). Suggest which tasks to include in the next sprint. Prioritize by: critical bugs first, then high-priority features, then polish. List the task names you'd include and briefly explain why.`;

    try {
      const response = await fetch(
        "https://llm.chutes.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " +
              (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2.5-TEE",
            messages: [{ role: "user", content: prompt }],
            stream: false,
            max_tokens: 512,
            temperature: 0.7,
          }),
        }
      );
      const data = await response.json();
      const content = (
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        ""
      ).trim();
      setAiSprintResult(content || "No recommendation received.");
    } catch {
      setAiSprintResult(
        "Failed to get AI recommendation. Please try again."
      );
    } finally {
      setAiSprintLoading(false);
    }
  };

  const handleApplySprintPlan = () => {
    if (!aiSprintResult) return;
    const backlogTasks = tasks.filter(
      (t) => !t.sprint || t.sprint === "Backlog"
    );
    const targetSprint =
      sprints.find((s) => s.status === "planned")?.name ||
      sprints.find((s) => s.status === "active")?.name ||
      `Sprint ${nextSprintNum}`;

    let applied = 0;
    backlogTasks.forEach((task) => {
      if (
        aiSprintResult.toLowerCase().includes(task.title.toLowerCase())
      ) {
        updateTask(task.id, { sprint: targetSprint });
        applied++;
      }
    });

    if (applied > 0) {
      reload();
      setAiSprintResult(
        `Done! Moved ${applied} task${applied !== 1 ? "s" : ""} to ${targetSprint}.`
      );
    } else {
      setAiSprintResult(
        "Could not match any tasks from the recommendation. Try reviewing manually."
      );
    }
  };

  const applyTemplate = (tpl: typeof TASK_TEMPLATES[number]) => {
    setNewPriority(tpl.priority);
    setNewTags(tpl.tags);
    setNewDesc(tpl.description);
    setShowTemplates(false);
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
      blockedBy: newBlockedBy || undefined,
      dueDate: newDueDate || undefined,
    });
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewTags([]);
    setNewBlockedBy("");
    setNewDueDate("");
    setShowAddForm(false);
    setShowTemplates(false);
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
    setEditBlockedBy(task.blockedBy || "");
    setEditAssignee(task.assignee || "");
    setEditDueDate(task.dueDate || "");
  };

  const saveEdit = () => {
    if (!editingTask || !editTitle.trim()) return;
    updateTask(editingTask, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      assignee: editAssignee.trim(),
      tags: editTags.length > 0 ? editTags : undefined,
      blockedBy: editBlockedBy || undefined,
      dueDate: editDueDate || undefined,
    });
    setEditingTask(null);
    reload();
  };

  const handleLogTime = (taskId: string, hours: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { loggedHours: (task.loggedHours || 0) + hours });
    reload();
  };

  const handleSetEstimate = (taskId: string) => {
    const val = parseFloat(editEstimate[taskId] || "0");
    if (isNaN(val) || val < 0) return;
    updateTask(taskId, { estimatedHours: val || undefined });
    setEditEstimate((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    reload();
  };

  const handleAiEstimate = async (task: Task) => {
    setAiEstimateLoading((prev) => ({ ...prev, [task.id]: true }));
    setAiEstimateNote((prev) => { const n = { ...prev }; delete n[task.id]; return n; });

    const prompt = `Estimate the time needed for this game development task: '${task.title}'. Description: '${task.description || "No description"}'. Tags: ${(task.tags || []).join(", ") || "none"}. Priority: ${task.priority}. Give a time estimate in hours (just a number) and a one-line justification.`;

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
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";

      const hoursMatch = content.match(/(\d+(?:\.\d+)?)/);
      if (hoursMatch) {
        const hours = parseFloat(hoursMatch[1]);
        updateTask(task.id, { estimatedHours: hours });
        reload();
      }

      const justification = content.replace(/^\s*\d+(?:\.\d+)?\s*(?:hours?)?\s*[-:.]\s*/i, "").trim() || content;
      setAiEstimateNote((prev) => ({ ...prev, [task.id]: justification }));
    } catch {
      setAiEstimateNote((prev) => ({ ...prev, [task.id]: "Failed to estimate. Try again." }));
    }

    setAiEstimateLoading((prev) => ({ ...prev, [task.id]: false }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.subtasks) return;
    const updated = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    updateTask(taskId, { subtasks: updated });
    reload();
  };

  const addSubtask = (taskId: string) => {
    const text = subtaskInputs[taskId]?.trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === taskId);
    const existing: Subtask[] = task?.subtasks || [];
    const newSubtask: Subtask = {
      id: `st_${Date.now()}`,
      title: text,
      done: false,
    };
    updateTask(taskId, { subtasks: [...existing, newSubtask] });
    setSubtaskInputs((p) => ({ ...p, [taskId]: "" }));
    reload();
  };

  const handleAiBreakdown = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || aiBreakdownLoading[taskId]) return;
    setAiBreakdownLoading((p) => ({ ...p, [taskId]: true }));
    try {
      const prompt = `Break this game development task into 3-5 specific subtasks: '${task.title}'. Description: '${task.description || "No description provided."}'. Return just a numbered list of subtask titles.`;
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
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const lines = content
        .split("\n")
        .map((l: string) => l.replace(/^\d+[\.\)\-]\s*/, "").trim())
        .filter((l: string) => l.length > 0 && l.length < 200);
      if (lines.length > 0) {
        const existing: Subtask[] = task.subtasks || [];
        const newSubtasks: Subtask[] = lines.map((title: string, i: number) => ({
          id: `st_${Date.now()}_${i}`,
          title,
          done: false,
        }));
        updateTask(taskId, { subtasks: [...existing, ...newSubtasks] });
        reload();
      }
    } catch {
      // silently fail
    } finally {
      setAiBreakdownLoading((p) => ({ ...p, [taskId]: false }));
    }
  };

  const addComment = (taskId: string) => {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === taskId);
    const existing: TaskComment[] = task?.comments || [];
    const newComment: TaskComment = {
      id: `tc_${Date.now()}`,
      text,
      author: "JacobK",
      timestamp: new Date().toISOString(),
    };
    updateTask(taskId, { comments: [...existing, newComment] });
    setCommentInputs((p) => ({ ...p, [taskId]: "" }));
    reload();
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleColumnSelection = (status: Task["status"]) => {
    const columnTaskIds = sortedFilteredTasks
      .filter((t) => t.status === status)
      .map((t) => t.id);
    const allSelected = columnTaskIds.every((id) => selectedTasks.has(id));

    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        columnTaskIds.forEach((id) => next.delete(id));
      } else {
        columnTaskIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const bulkMoveTo = (status: Task["status"]) => {
    selectedTasks.forEach((id) => updateTask(id, { status }));
    setSelectedTasks(new Set());
    setBulkMoveOpen(false);
    reload();
  };

  const bulkSetPriority = (priority: Task["priority"]) => {
    selectedTasks.forEach((id) => updateTask(id, { priority }));
    setSelectedTasks(new Set());
    setBulkPriorityOpen(false);
    reload();
  };

  const bulkDelete = () => {
    deleteTasks(Array.from(selectedTasks));
    setSelectedTasks(new Set());
    setBulkDeleteConfirm(false);
    reload();
  };

  const bulkAssign = () => {
    if (!bulkAssignInput.trim()) return;
    selectedTasks.forEach((id) => updateTask(id, { assignee: bulkAssignInput.trim() }));
    setSelectedTasks(new Set());
    setBulkAssignInput("");
    setShowBulkAssign(false);
    reload();
  };

  const closeKebab = useCallback(() => {
    setKebabMenuTask(null);
    setKebabSubMenu(null);
    setKebabDeleteConfirm(false);
  }, []);

  useEffect(() => {
    if (!kebabMenuTask) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        closeKebab();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [kebabMenuTask, closeKebab]);

  const duplicateTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    addTask({
      projectId: task.projectId,
      title: `${task.title} (copy)`,
      description: task.description,
      status: task.status,
      priority: task.priority,
      sprint: task.sprint,
      assignee: task.assignee,
      tags: task.tags ? [...task.tags] : undefined,
      blockedBy: undefined,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      subtasks: task.subtasks?.map((st) => ({ ...st, id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, done: false })),
    });
    closeKebab();
    reload();
  };

  const handleKebabDelete = (taskId: string) => {
    deleteTask(taskId);
    closeKebab();
    setExpandedTask(null);
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
    const totalEstimated = pool.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalLogged = pool.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

    let goalStatus: "on-track" | "at-risk" | "behind" | "completed" | "none" = "none";
    let goalMet: boolean | null = null;
    const sprint = sprints.find((s) => s.name === selectedSprint);
    if (sprint) {
      if (sprint.status === "completed") {
        goalStatus = "completed";
        goalMet = total > 0 && done === total;
      } else if (sprint.startDate && sprint.endDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = new Date(sprint.startDate + "T00:00:00");
        const end = new Date(sprint.endDate + "T00:00:00");
        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
        const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - start.getTime()) / 86400000)));
        const timePct = elapsedDays / totalDays;
        const donePct = total > 0 ? done / total : 0;
        if (elapsedDays === 0) {
          goalStatus = "on-track";
        } else if (donePct >= timePct - 0.05) {
          goalStatus = "on-track";
        } else if (donePct >= timePct - 0.2) {
          goalStatus = "at-risk";
        } else {
          goalStatus = "behind";
        }
      }
    }

    return { total, done, inProgress, pct, totalEstimated, totalLogged, goalStatus, goalMet };
  }, [tasks, selectedSprint, sprints]);

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

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set(tasks.map((t) => t.assignee).filter(Boolean));
    return Array.from(assignees).sort();
  }, [tasks]);

  const currentSprintInfo = useMemo(() => {
    if (selectedSprint === "all" || selectedSprint === "backlog") return null;
    return sprints.find((s) => s.name === selectedSprint) || null;
  }, [selectedSprint, sprints]);

  const burndownData = useMemo(() => {
    if (
      !currentSprintInfo ||
      !currentSprintInfo.startDate ||
      !currentSprintInfo.endDate
    )
      return null;

    const sprintTasks = tasks.filter((t) => t.sprint === selectedSprint);
    const total = sprintTasks.length;
    if (total === 0) return null;

    const start = new Date(currentSprintInfo.startDate + "T00:00:00");
    const end = new Date(currentSprintInfo.endDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000)
    );
    const elapsedDays = Math.max(
      0,
      Math.min(
        totalDays,
        Math.ceil((today.getTime() - start.getTime()) / 86400000)
      )
    );

    const remaining = sprintTasks.filter((t) => t.status !== "done").length;
    const done = total - remaining;
    const idealRemaining = total - (total * elapsedDays) / totalDays;

    let health: string;
    let healthColor: string;
    if (elapsedDays === 0) {
      health = "Just Started";
      healthColor = "#9CA3AF";
    } else if (remaining <= idealRemaining) {
      health = remaining < idealRemaining * 0.7 ? "Ahead" : "On Track";
      healthColor = "#10B981";
    } else {
      health = "Behind";
      healthColor = "#EF4444";
    }

    return {
      total,
      remaining,
      done,
      totalDays,
      elapsedDays,
      idealRemaining,
      health,
      healthColor,
    };
  }, [tasks, selectedSprint, currentSprintInfo]);

  const retroStats = useMemo(() => {
    if (!currentSprintInfo || currentSprintInfo.status !== "completed") return null;
    const sprintTasks = tasks.filter((t) => t.sprint === currentSprintInfo.name);
    const completed = sprintTasks.filter((t) => t.status === "done").length;
    const total = sprintTasks.length;
    const totalEstimated = sprintTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalLogged = sprintTasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
    const avgTime = completed > 0 && totalLogged > 0 ? totalLogged / completed : 0;
    const bugsFound = sprintTasks.filter((t) => t.tags?.includes("Bugfix")).length;
    return { completed, total, totalEstimated, totalLogged, avgTime, bugsFound, velocity: completed };
  }, [tasks, currentSprintInfo]);

  const saveRetro = (sprintName: string, field: "wentWell" | "didntGoWell" | "improve", value: string) => {
    setRetroNotes((prev) => {
      const defaults = { wentWell: "", didntGoWell: "", improve: "" };
      const existing = prev[sprintName] ?? defaults;
      const merged = { ...defaults, ...existing, [field]: value };
      const updated = { ...prev, [sprintName]: merged };
      localStorage.setItem(`retro_${projectId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAiWriteRetro = async () => {
    if (aiRetroLoading || !currentSprintInfo || !retroStats) return;
    setAiRetroLoading(true);
    try {
      const sprintTasks = tasks.filter((t) => t.sprint === currentSprintInfo.name);
      const doneList = sprintTasks.filter((t) => t.status === "done").map((t) => t.title).join(", ");
      const notDone = sprintTasks.filter((t) => t.status !== "done").map((t) => `${t.title} (${t.status})`).join(", ");
      const prompt = `Write a sprint retrospective for sprint "${currentSprintInfo.name}" (goal: "${currentSprintInfo.goal || "none"}"). Stats: ${retroStats.completed}/${retroStats.total} tasks completed, velocity ${retroStats.velocity}, ${retroStats.totalLogged}h logged${retroStats.avgTime > 0 ? `, avg ${retroStats.avgTime.toFixed(1)}h/task` : ""}, ${retroStats.bugsFound} bugs found.\nDone: ${doneList || "none"}.\nNot done: ${notDone || "all completed"}.\nWrite in this EXACT format:\nWENT_WELL:\n- point 1\n- point 2\nDIDNT_GO_WELL:\n- point 1\n- point 2\nIMPROVE:\n- point 1\n- point 2\nBe specific to the data. Keep each section to 2-3 bullet points.`;
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
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      if (content) {
        const wellMatch = content.match(/WENT_WELL:\s*([\s\S]*?)(?=\nDIDNT_GO_WELL:|$)/i);
        const badMatch = content.match(/DIDNT_GO_WELL:\s*([\s\S]*?)(?=\nIMPROVE:|$)/i);
        const improveMatch = content.match(/IMPROVE:\s*([\s\S]*?)$/i);
        const name = currentSprintInfo.name;
        const updated = {
          ...retroNotes,
          [name]: {
            wentWell: wellMatch?.[1]?.trim() || retroNotes[name]?.wentWell || "",
            didntGoWell: badMatch?.[1]?.trim() || retroNotes[name]?.didntGoWell || "",
            improve: improveMatch?.[1]?.trim() || retroNotes[name]?.improve || "",
          },
        };
        setRetroNotes(updated);
        localStorage.setItem(`retro_${projectId}`, JSON.stringify(updated));
      }
    } catch { /* silently fail */ } finally {
      setAiRetroLoading(false);
    }
  };

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
    if (filterAssignee !== "all") {
      filtered = filtered.filter((t) => t.assignee === filterAssignee);
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case "name":
          return a.title.localeCompare(b.title);
        case "date":
          return b.id.localeCompare(a.id);
        case "dueDate": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        default:
          return 0;
      }
    });
  }, [tasks, filterPriority, filterTag, filterAssignee, sortBy, selectedSprint]);

  const toggleListSort = (field: string) => {
    if (listSortField === field) {
      setListSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setListSortField(field);
      setListSortDir("asc");
    }
  };

  const listSortedTasks = useMemo(() => {
    const sorted = [...sortedFilteredTasks];
    const dir = listSortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (listSortField) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "status": {
          const so: Record<string, number> = { todo: 0, "in-progress": 1, testing: 2, done: 3 };
          return dir * ((so[a.status] ?? 0) - (so[b.status] ?? 0));
        }
        case "priority":
          return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case "assignee":
          return dir * (a.assignee || "").localeCompare(b.assignee || "");
        case "sprint":
          return dir * (a.sprint || "").localeCompare(b.sprint || "");
        case "dueDate": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return dir;
          if (!b.dueDate) return -dir;
          return dir * a.dueDate.localeCompare(b.dueDate);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [sortedFilteredTasks, listSortField, listSortDir]);

  const handleExportTasksJSON = useCallback(() => {
    if (!project) return;
    const exportData = tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      sprint: t.sprint,
      assignee: t.assignee,
      dueDate: t.dueDate || "",
      loggedHours: t.loggedHours || 0,
      tags: (t.tags || []).join(", "),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-tasks.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTaskExportOpen(false);
  }, [project, tasks]);

  const handleExportTasksMarkdown = useCallback(() => {
    if (!project) return;
    const lines: string[] = [];
    lines.push(`# ${project.name} — Tasks`);
    lines.push("");
    lines.push("| Title | Status | Priority | Sprint | Assignee | Due Date | Hours | Tags |");
    lines.push("|-------|--------|----------|--------|----------|----------|-------|------|");
    for (const t of tasks) {
      lines.push(
        `| ${t.title} | ${t.status} | ${t.priority} | ${t.sprint} | ${t.assignee} | ${t.dueDate || "—"} | ${t.loggedHours || 0} | ${(t.tags || []).join(", ") || "—"} |`
      );
    }
    lines.push("");
    lines.push(`*Exported ${new Date().toLocaleString()}*`);
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-tasks.md`;
    a.click();
    URL.revokeObjectURL(url);
    setTaskExportOpen(false);
  }, [project, tasks]);

  if (!project) return null;

  const goalRingColor =
    sprintSummary.goalStatus === "completed"
      ? sprintSummary.goalMet ? "#10B981" : "#EF4444"
      : sprintSummary.goalStatus === "behind" ? "#EF4444"
      : sprintSummary.goalStatus === "at-risk" ? "#F59E0B"
      : sprintSummary.goalStatus === "on-track" ? "#10B981"
      : "#F59E0B";

  const goalStatusLabel =
    sprintSummary.goalStatus === "on-track" ? "On Track"
    : sprintSummary.goalStatus === "at-risk" ? "At Risk"
    : sprintSummary.goalStatus === "behind" ? "Behind"
    : sprintSummary.goalStatus === "completed"
      ? sprintSummary.goalMet ? "Goal Met" : "Goal Missed"
      : "";

  const goalBadgeClass =
    sprintSummary.goalStatus === "on-track" ? "bg-[#10B981]/15 text-[#10B981]"
    : sprintSummary.goalStatus === "at-risk" ? "bg-[#F59E0B]/15 text-[#F59E0B]"
    : sprintSummary.goalStatus === "behind" ? "bg-[#EF4444]/15 text-[#EF4444]"
    : sprintSummary.goalMet ? "bg-[#10B981]/15 text-[#10B981]"
    : "bg-[#EF4444]/15 text-[#EF4444]";

  const RING_R = 30;
  const RING_C = 2 * Math.PI * RING_R;

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Task Board</h1>
            <div className="flex items-center overflow-hidden rounded-lg border border-[#2A2A2A]">
              <button
                onClick={() => setViewMode("board")}
                className={`p-2 transition-colors ${viewMode === "board" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1F1F1F]"}`}
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <div className="h-5 w-px bg-[#2A2A2A]" />
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1F1F1F]"}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
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
                <option value="dueDate">Sort: Due Date</option>
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
            <div className="relative">
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <User className="h-3.5 w-3.5 text-[#6B7280]" />
              </div>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-8 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="all">All Assignees</option>
                {uniqueAssignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <div className="relative" ref={taskExportRef}>
              <button
                onClick={() => setTaskExportOpen(!taskExportOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className={`h-3 w-3 transition-transform ${taskExportOpen ? "rotate-180" : ""}`} />
              </button>
              {taskExportOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl">
                  <button
                    onClick={handleExportTasksMarkdown}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    <ScrollText className="h-4 w-4 text-[#3B82F6]" />
                    Export as Markdown
                  </button>
                  <div className="mx-3 border-t border-[#2A2A2A]" />
                  <button
                    onClick={handleExportTasksJSON}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    <FileText className="h-4 w-4 text-[#F59E0B]" />
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setPokerIndex(0);
                setShowPlanningPoker(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
            >
              <Zap className="h-3.5 w-3.5" />
              Planning Poker
            </button>
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
        <button
          onClick={handleAiSprintPlan}
          disabled={aiSprintLoading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiSprintLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          AI Plan Sprint
        </button>
      </div>

      {/* Sprint Summary */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex items-start gap-4 lg:flex-1">
            {/* Progress Ring */}
            <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
              <svg className="absolute inset-0" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={RING_R} fill="none" stroke="#2A2A2A" strokeWidth="4" />
                <circle
                  cx="36" cy="36" r={RING_R} fill="none"
                  stroke={goalRingColor}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - sprintSummary.pct / 100)}
                  transform="rotate(-90 36 36)"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="text-base font-bold text-[#F5F5F5]">{sprintSummary.pct}%</span>
            </div>

            <div className="min-w-0 flex-1">
              {currentSprintInfo ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Target className="h-4 w-4 shrink-0 text-[#F59E0B]" />
                    <span className="font-semibold text-[#F5F5F5]">
                      {currentSprintInfo.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${SPRINT_STATUS_STYLES[currentSprintInfo.status].bg} ${SPRINT_STATUS_STYLES[currentSprintInfo.status].text}`}
                    >
                      {currentSprintInfo.status}
                    </span>
                    {sprintSummary.goalStatus !== "none" && goalStatusLabel && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${goalBadgeClass}`}>
                        {goalStatusLabel}
                      </span>
                    )}
                  </div>
                  {currentSprintInfo.goal && (
                    <p className="mt-1.5 text-sm font-medium text-[#D1D5DB]">
                      &ldquo;{currentSprintInfo.goal}&rdquo;
                    </p>
                  )}
                  {currentSprintInfo.startDate && (
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {currentSprintInfo.startDate} &mdash; {currentSprintInfo.endDate}
                    </p>
                  )}
                  {sprintSummary.goalStatus === "completed" && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-2.5 py-1">
                      {sprintSummary.goalMet ? (
                        <Check className="h-3.5 w-3.5 text-[#10B981]" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />
                      )}
                      <span className={`text-xs font-medium ${sprintSummary.goalMet ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        Goal Met: {sprintSummary.goalMet ? "Yes" : "No"} &mdash; {sprintSummary.done}/{sprintSummary.total} completed
                      </span>
                    </div>
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
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:gap-5">
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
            <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-xs font-medium text-[#F5F5F5]">
                {velocity.toFixed(1)}
              </span>
              <span className="text-[10px] text-[#6B7280]">/sprint</span>
            </div>
            {sprintSummary.totalEstimated > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5">
                <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${sprintSummary.totalLogged > sprintSummary.totalEstimated ? "text-[#EF4444]" : "text-[#F5F5F5]"}`}>
                      {sprintSummary.totalLogged}h
                    </span>
                    <span className="text-[10px] text-[#6B7280]">/</span>
                    <span className="text-xs text-[#6B7280]">{sprintSummary.totalEstimated}h</span>
                  </div>
                  <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div
                      className={`h-full rounded-full transition-all ${sprintSummary.totalLogged > sprintSummary.totalEstimated ? "bg-[#EF4444]" : "bg-[#F59E0B]"}`}
                      style={{ width: `${Math.min(100, sprintSummary.totalEstimated > 0 ? (sprintSummary.totalLogged / sprintSummary.totalEstimated) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Sprint Plan Panel */}
      {showAiSprintPanel && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#1A1A1A] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                AI Sprint Recommendation
              </h3>
            </div>
            <button
              onClick={() => setShowAiSprintPanel(false)}
              className="rounded-lg p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {aiSprintLoading ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
              <span className="text-sm text-[#9CA3AF]">
                Analyzing backlog and planning sprint...
              </span>
            </div>
          ) : aiSprintResult ? (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                  {aiSprintResult}
                </p>
              </div>
              {!aiSprintResult.startsWith("Done!") &&
                !aiSprintResult.startsWith("No backlog") &&
                !aiSprintResult.startsWith("Failed") &&
                !aiSprintResult.startsWith("Could not") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplySprintPlan}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Apply to Sprint
                    </button>
                    <button
                      onClick={handleAiSprintPlan}
                      className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                    >
                      Regenerate
                    </button>
                  </div>
                )}
            </div>
          ) : null}
        </div>
      )}

      {/* Sprint Burndown Chart */}
      {burndownData && currentSprintInfo && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              Sprint Burndown
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const rows: string[] = ["Day,Ideal Remaining,Actual Remaining"];
                  const total = burndownData.total;
                  const totalDays = burndownData.totalDays;
                  const doneTasks = tasks.filter(
                    (t) => t.sprint === selectedSprint && t.status === "done"
                  ).length;
                  for (let d = 0; d <= totalDays; d++) {
                    const ideal = Math.round((total - (total * d) / totalDays) * 100) / 100;
                    const actual = d <= burndownData.elapsedDays
                      ? d === burndownData.elapsedDays
                        ? burndownData.remaining
                        : d === 0
                          ? total
                          : ""
                      : "";
                    rows.push(`${d},${ideal},${actual}`);
                  }
                  const csv = rows.join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${currentSprintInfo.name.replace(/\s+/g, "_")}_burndown.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-2 py-1 text-[10px] text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                title="Export burndown as CSV"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
              <span className="text-[10px] text-[#6B7280]">
                {currentSprintInfo.startDate?.slice(5)} &mdash;{" "}
                {currentSprintInfo.endDate?.slice(5)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${burndownData.healthColor}15`,
                  color: burndownData.healthColor,
                }}
              >
                {burndownData.health}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <svg
              viewBox="0 0 320 150"
              className="h-36 w-full max-w-md"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Axes */}
              <line
                x1="35"
                y1="10"
                x2="35"
                y2="125"
                stroke="#2A2A2A"
                strokeWidth="1"
              />
              <line
                x1="35"
                y1="125"
                x2="305"
                y2="125"
                stroke="#2A2A2A"
                strokeWidth="1"
              />
              {/* Horizontal grid lines */}
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1="35"
                  y1={10 + (1 - f) * 115}
                  x2="305"
                  y2={10 + (1 - f) * 115}
                  stroke="#1F1F1F"
                  strokeWidth="1"
                />
              ))}
              {/* Y-axis labels */}
              <text
                x="30"
                y="15"
                fill="#6B7280"
                fontSize="9"
                textAnchor="end"
              >
                {burndownData.total}
              </text>
              <text
                x="30"
                y="60"
                fill="#4B5563"
                fontSize="8"
                textAnchor="end"
              >
                {Math.round(burndownData.total * 0.5)}
              </text>
              <text
                x="30"
                y="129"
                fill="#6B7280"
                fontSize="9"
                textAnchor="end"
              >
                0
              </text>
              {/* X-axis day markers */}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={35 + f * 270}
                  y1="125"
                  x2={35 + f * 270}
                  y2="128"
                  stroke="#3A3A3A"
                  strokeWidth="1"
                />
              ))}
              <text
                x="35"
                y="140"
                fill="#6B7280"
                fontSize="8"
                textAnchor="start"
              >
                Day 0
              </text>
              <text
                x="305"
                y="140"
                fill="#6B7280"
                fontSize="8"
                textAnchor="end"
              >
                Day {burndownData.totalDays}
              </text>
              {/* Ideal burndown line (dashed) */}
              <line
                x1="35"
                y1="10"
                x2="305"
                y2="125"
                stroke="#2A2A2A"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              {/* Today marker */}
              {burndownData.elapsedDays > 0 &&
                burndownData.elapsedDays < burndownData.totalDays && (
                  <line
                    x1={
                      35 +
                      (burndownData.elapsedDays / burndownData.totalDays) * 270
                    }
                    y1="10"
                    x2={
                      35 +
                      (burndownData.elapsedDays / burndownData.totalDays) * 270
                    }
                    y2="125"
                    stroke="#F59E0B"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.3"
                  />
                )}
              {/* Actual burndown line */}
              {burndownData.elapsedDays > 0 && (
                <>
                  <line
                    x1="35"
                    y1="10"
                    x2={
                      35 +
                      (burndownData.elapsedDays / burndownData.totalDays) * 270
                    }
                    y2={
                      10 +
                      (1 - burndownData.remaining / burndownData.total) * 115
                    }
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={
                      35 +
                      (burndownData.elapsedDays / burndownData.totalDays) * 270
                    }
                    cy={
                      10 +
                      (1 - burndownData.remaining / burndownData.total) * 115
                    }
                    r="4"
                    fill="#F59E0B"
                  />
                  <circle
                    cx={
                      35 +
                      (burndownData.elapsedDays / burndownData.totalDays) * 270
                    }
                    cy={
                      10 +
                      (1 - burndownData.remaining / burndownData.total) * 115
                    }
                    r="7"
                    fill="#F59E0B"
                    opacity="0.2"
                  />
                </>
              )}
              {/* Start point */}
              <circle cx="35" cy="10" r="3" fill="#6B7280" />
              {/* Legend */}
              <line
                x1="50"
                y1="148"
                x2="66"
                y2="148"
                stroke="#2A2A2A"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <text x="70" y="150" fill="#6B7280" fontSize="7">
                Ideal
              </text>
              <line
                x1="100"
                y1="148"
                x2="116"
                y2="148"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              <text x="120" y="150" fill="#6B7280" fontSize="7">
                Actual
              </text>
            </svg>
            <div className="flex shrink-0 flex-col gap-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Remaining
                </p>
                <p className="text-xl font-bold text-[#F5F5F5]">
                  {burndownData.remaining}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Completed
                </p>
                <p className="text-xl font-bold text-[#10B981]">
                  {burndownData.done}
                </p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] px-2.5 py-1.5 text-center">
                <p className="text-[10px] text-[#6B7280]">
                  Day {burndownData.elapsedDays} / {burndownData.totalDays}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Retrospective */}
      {currentSprintInfo?.status === "completed" && retroStats && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Sprint Retrospective</h3>
              <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">Completed</span>
            </div>
            <button
              onClick={handleAiWriteRetro}
              disabled={aiRetroLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiRetroLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Write Retro
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
              <p className="text-xl font-bold text-[#10B981]">{retroStats.completed}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Completed</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
              <p className="text-xl font-bold text-[#F59E0B]">{retroStats.velocity}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Velocity</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
              <p className="text-xl font-bold text-[#F5F5F5]">{retroStats.avgTime > 0 ? `${retroStats.avgTime.toFixed(1)}h` : "N/A"}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Avg/Task</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
              <p className="text-xl font-bold text-[#EF4444]">{retroStats.bugsFound}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Bugs Found</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <label className="text-xs font-medium text-[#10B981]">What Went Well</label>
              </div>
              <textarea
                value={retroNotes[currentSprintInfo.name]?.wentWell || ""}
                onChange={(e) => saveRetro(currentSprintInfo.name, "wentWell", e.target.value)}
                placeholder="Things that worked great..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[#10B981]/20 bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none focus:border-[#10B981]/50"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                <label className="text-xs font-medium text-[#EF4444]">What Didn&apos;t Go Well</label>
              </div>
              <textarea
                value={retroNotes[currentSprintInfo.name]?.didntGoWell || ""}
                onChange={(e) => saveRetro(currentSprintInfo.name, "didntGoWell", e.target.value)}
                placeholder="Challenges and blockers..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[#EF4444]/20 bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none focus:border-[#EF4444]/50"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                <label className="text-xs font-medium text-[#3B82F6]">What to Improve</label>
              </div>
              <textarea
                value={retroNotes[currentSprintInfo.name]?.improve || ""}
                onChange={(e) => saveRetro(currentSprintInfo.name, "improve", e.target.value)}
                placeholder="Action items for next sprint..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[#3B82F6]/20 bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none focus:border-[#3B82F6]/50"
              />
            </div>
          </div>
        </div>
      )}

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
            {/* Template Picker */}
            <div className="relative mb-4">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10"
              >
                <FileText className="h-3.5 w-3.5" />
                Use Template
                <ChevronDown className={`h-3 w-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
              </button>
              {showTemplates && (
                <div className="mt-2 grid grid-cols-1 gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2">
                  {TASK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#1A1A1A]"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]/10 text-[#F59E0B]">
                        {tpl.icon === "bug" && <Bug className="h-3.5 w-3.5" />}
                        {tpl.icon === "feature" && <Sparkles className="h-3.5 w-3.5" />}
                        {tpl.icon === "ui" && <Target className="h-3.5 w-3.5" />}
                        {tpl.icon === "audio" && <TrendingUp className="h-3.5 w-3.5" />}
                        {tpl.icon === "art" && <Pencil className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#F5F5F5]">{tpl.name}</p>
                        <p className="text-[10px] text-[#6B7280]">
                          {tpl.priority} priority &middot; {tpl.tags.join(", ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Blocked By
                  </label>
                  <select
                    value={newBlockedBy}
                    onChange={(e) => setNewBlockedBy(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    <option value="">None</option>
                    {tasks
                      .filter((t) => t.projectId === projectId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none [color-scheme:dark] focus:border-[#F59E0B]/50"
                  />
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

      {/* List View */}
      {viewMode === "list" && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#151515]">
                  <th className="w-10 px-3 py-3">
                    <button
                      onClick={() => {
                        const allSelected = listSortedTasks.length > 0 && listSortedTasks.every((t) => selectedTasks.has(t.id));
                        if (allSelected) {
                          setSelectedTasks(new Set());
                        } else {
                          setSelectedTasks(new Set(listSortedTasks.map((t) => t.id)));
                        }
                      }}
                      className="rounded p-0.5 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                    >
                      {listSortedTasks.length > 0 && listSortedTasks.every((t) => selectedTasks.has(t.id)) ? (
                        <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  {[
                    { key: "title", label: "Title", sortable: true },
                    { key: "status", label: "Status", sortable: true },
                    { key: "priority", label: "Priority", sortable: true },
                    { key: "assignee", label: "Assignee", sortable: true },
                    { key: "sprint", label: "Sprint", sortable: true },
                    { key: "dueDate", label: "Due Date", sortable: true },
                    { key: "tags", label: "Tags", sortable: false },
                    { key: "time", label: "Time", sortable: false },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280] ${col.sortable ? "cursor-pointer select-none hover:text-[#F59E0B] transition-colors" : ""}`}
                      onClick={col.sortable ? () => toggleListSort(col.key) : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && listSortField === col.key && (
                          <ChevronDown className={`h-3 w-3 text-[#F59E0B] transition-transform ${listSortDir === "asc" ? "rotate-180" : ""}`} />
                        )}
                        {col.sortable && listSortField !== col.key && (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/60">
                {listSortedTasks.map((task) => {
                  const col = COLUMNS.find((c) => c.key === task.status);
                  const dueDateInfo = getDueDateInfo(task.dueDate);
                  const isSelected = selectedTasks.has(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors hover:bg-[#1F1F1F] ${isSelected ? "bg-[#F59E0B]/5" : ""}`}
                    >
                      <td className="w-10 px-3 py-2.5">
                        <button
                          onClick={() => toggleTaskSelection(task.id)}
                          className="rounded p-0.5 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="max-w-[280px] px-3 py-2.5">
                        <button
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          className="text-left"
                        >
                          <span className="text-sm font-medium text-[#F5F5F5] hover:text-[#F59E0B] transition-colors">
                            {task.title}
                          </span>
                          {task.blockedBy && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-[#EF4444]">
                              <Lock className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                          style={{
                            backgroundColor: `${col?.color || "#9CA3AF"}15`,
                            color: col?.color || "#9CA3AF",
                          }}
                        >
                          {col?.label || task.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap"
                          style={{
                            backgroundColor: `${getPriorityColor(task.priority)}15`,
                            color: getPriorityColor(task.priority),
                          }}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {task.assignee && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: getAvatarColor(task.assignee) }}
                            >
                              {getInitials(task.assignee)}
                            </div>
                            <span className="text-xs text-[#9CA3AF] whitespace-nowrap">{task.assignee}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-[#9CA3AF] whitespace-nowrap">{task.sprint}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {dueDateInfo ? (
                          <span
                            className={`text-xs whitespace-nowrap ${
                              dueDateInfo.urgency === "overdue"
                                ? "text-[#EF4444]"
                                : dueDateInfo.urgency === "urgent"
                                  ? "text-[#F59E0B]"
                                  : "text-[#9CA3AF]"
                            }`}
                          >
                            {dueDateInfo.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[#4B5563]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(task.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
                              style={{
                                backgroundColor: `${TASK_TAG_COLORS[tag]}20`,
                                color: TASK_TAG_COLORS[tag],
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {(task.loggedHours || task.estimatedHours) ? (
                          <span className="text-xs tabular-nums text-[#9CA3AF] whitespace-nowrap">
                            {task.loggedHours || 0}h
                            {task.estimatedHours ? (
                              <span className="text-[#6B7280]">/{task.estimatedHours}h</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-[#4B5563]">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {listSortedTasks.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <p className="text-sm text-[#6B7280]">No tasks match your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-2.5">
            <span className="text-xs text-[#6B7280]">
              {listSortedTasks.length} task{listSortedTasks.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-[#6B7280]">
              {listSortedTasks.filter((t) => t.status === "done").length} done
            </span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === "board" && <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column, colIndex) => {
          const columnTasks = sortedFilteredTasks.filter(
            (t) => t.status === column.key
          );
          const prevCol = colIndex > 0 ? COLUMNS[colIndex - 1] : null;
          const nextCol =
            colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1] : null;
          const wipLimit = wipLimits[column.key] ?? null;
          const isOverWip = wipLimit !== null && columnTasks.length > wipLimit;

          return (
            <div key={column.key} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleColumnSelection(column.key)}
                    className="rounded p-0.5 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                    title={`Select all ${column.label}`}
                  >
                    {columnTasks.length > 0 && columnTasks.every((t) => selectedTasks.has(t.id)) ? (
                      <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isOverWip ? "#EF4444" : column.color }}
                  />
                  <span className="text-sm font-semibold">{column.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isOverWip ? "animate-pulse" : ""}`}
                    style={{
                      backgroundColor: isOverWip ? "rgba(239,68,68,0.15)" : `${column.color}15`,
                      color: isOverWip ? "#EF4444" : column.color,
                    }}
                  >
                    {wipLimit !== null ? `${columnTasks.length}/${wipLimit}` : columnTasks.length}
                  </span>
                  {isOverWip && (
                    <span className="flex items-center gap-1 rounded-md bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#EF4444]">
                      <AlertTriangle className="h-3 w-3" /> Over limit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (wipEditingCol === column.key) {
                          setWipEditingCol(null);
                        } else {
                          setWipEditingCol(column.key);
                          setWipEditValue(wipLimit !== null ? String(wipLimit) : "");
                        }
                      }}
                      className={`rounded p-1 transition-colors ${wipLimit !== null ? "text-[#F59E0B]" : "text-[#6B7280]"} hover:text-[#F59E0B]`}
                      title="Set WIP limit"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    {wipEditingCol === column.key && (
                      <div className="absolute right-0 top-full z-20 mt-1.5 w-48 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 shadow-xl">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          WIP Limit
                        </p>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={wipEditValue}
                            onChange={(e) => setWipEditValue(e.target.value)}
                            placeholder="No limit"
                            className="min-w-0 flex-1 rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5 text-xs text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseInt(wipEditValue);
                                saveWipLimit(column.key, isNaN(val) || val < 1 ? null : val);
                                setWipEditingCol(null);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const val = parseInt(wipEditValue);
                              saveWipLimit(column.key, isNaN(val) || val < 1 ? null : val);
                              setWipEditingCol(null);
                            }}
                            className="shrink-0 rounded-md bg-[#F59E0B] px-2 py-1.5 text-xs font-medium text-black hover:bg-[#D97706]"
                          >
                            Set
                          </button>
                        </div>
                        {wipLimit !== null && (
                          <button
                            onClick={() => {
                              saveWipLimit(column.key, null);
                              setWipEditingCol(null);
                            }}
                            className="mt-2 w-full rounded-md border border-[#2A2A2A] px-2 py-1 text-[10px] text-[#9CA3AF] hover:border-red-400/30 hover:text-red-400 transition-colors"
                          >
                            Remove limit
                          </button>
                        )}
                      </div>
                    )}
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
              </div>

              {isOverWip && (
                <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-1.5 text-[11px] text-[#EF4444]">
                  This column has {columnTasks.length} tasks but a limit of {wipLimit}. Move or complete tasks to reduce WIP.
                </div>
              )}

              {/* Column Body */}
              <div className={`min-h-[200px] space-y-2 rounded-xl border p-2 ${isOverWip ? "border-[#EF4444]/40 bg-[#EF4444]/[0.03]" : "border-[#2A2A2A] bg-[#1A1A1A]/50"}`}>
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
                  const isSelected = selectedTasks.has(task.id);
                  const blockingTask = task.blockedBy
                    ? tasks.find((t) => t.id === task.blockedBy)
                    : null;
                  const isBlocked = blockingTask
                    ? blockingTask.status !== "done"
                    : false;
                  const dueDateInfo = task.status !== "done" ? getDueDateInfo(task.dueDate) : null;

                  return (
                    <div
                      key={task.id}
                      className={`group ${isBlocked ? "opacity-60" : ""}`}
                    >
                      <div
                        className={`rounded-lg border bg-[#1A1A1A] p-3 transition-all duration-500 ${
                          isSelected
                            ? "border-[#F59E0B]/60 bg-[#F59E0B]/5 ring-1 ring-[#F59E0B]/20"
                            : flashingTask === task.id
                              ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/20 bg-[#F59E0B]/5"
                              : dueDateInfo?.urgency === "overdue"
                                ? "border-[#EF4444]/60 bg-[#EF4444]/5"
                                : dueDateInfo?.urgency === "urgent"
                                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                                  : isExpanded
                                    ? "border-[#F59E0B]/30"
                                    : "border-[#2A2A2A] hover:border-[#F59E0B]/20"
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskSelection(task.id);
                            }}
                            className="mt-0.5 shrink-0 rounded p-0.5 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-[#F59E0B]" />
                            ) : (
                              <Square className="h-3.5 w-3.5" />
                            )}
                          </button>
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
                              {isBlocked && (
                                <Lock className="mr-1 inline h-3 w-3 text-[#F59E0B]/70" />
                              )}
                              {task.title}
                            </p>
                            {isBlocked && blockingTask && (
                              <p className="mt-0.5 text-[10px] text-[#F59E0B]/70">
                                Blocked by: {blockingTask.title}
                              </p>
                            )}
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
                                <span
                                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold leading-none"
                                  style={{ backgroundColor: `${getAvatarColor(task.assignee)}20`, color: getAvatarColor(task.assignee) }}
                                  title={task.assignee}
                                >
                                  {getInitials(task.assignee)}
                                </span>
                              )}
                              {task.subtasks && task.subtasks.length > 0 && (() => {
                                const done = task.subtasks.filter((s) => s.done).length;
                                const total = task.subtasks.length;
                                const allDone = done === total;
                                return (
                                  <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${allDone ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#2A2A2A] text-[#9CA3AF]"}`}>
                                    {allDone && <Check className="h-2.5 w-2.5" />}
                                    {done}/{total} subtasks
                                  </span>
                                );
                              })()}
                              {task.comments && task.comments.length > 0 && (
                                <span className="flex items-center gap-1 rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {task.comments.length}
                                </span>
                              )}
                              {dueDateInfo && (
                                <span
                                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    dueDateInfo.urgency === "overdue"
                                      ? "bg-[#EF4444]/15 text-[#EF4444]"
                                      : dueDateInfo.urgency === "urgent"
                                        ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                                        : "bg-[#2A2A2A] text-[#9CA3AF]"
                                  }`}
                                >
                                  {dueDateInfo.urgency === "overdue" ? (
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                  ) : (
                                    <CalendarDays className="h-2.5 w-2.5" />
                                  )}
                                  {dueDateInfo.label}
                                </span>
                              )}
                              {!dueDateInfo && task.dueDate && task.status === "done" && (
                                <span className="flex items-center gap-1 rounded bg-[#10B981]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#10B981]">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  Completed
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

                          {/* Kebab Menu */}
                          <div className="relative mt-0.5 shrink-0" ref={kebabMenuTask === task.id ? kebabRef : undefined}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (kebabMenuTask === task.id) {
                                  closeKebab();
                                } else {
                                  setKebabMenuTask(task.id);
                                  setKebabSubMenu(null);
                                  setKebabDeleteConfirm(false);
                                }
                              }}
                              className={`rounded p-1 transition-all ${
                                kebabMenuTask === task.id
                                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                                  : "text-[#6B7280] opacity-0 group-hover:opacity-100 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                              }`}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {kebabMenuTask === task.id && (
                              <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl shadow-black/40">
                                {kebabSubMenu === null && !kebabDeleteConfirm && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(task);
                                        setExpandedTask(task.id);
                                        closeKebab();
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKebabSubMenu("priority");
                                      }}
                                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <Target className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                        Change Priority
                                      </span>
                                      <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKebabSubMenu("move");
                                      }}
                                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                        Move to...
                                      </span>
                                      <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        duplicateTask(task.id);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                      Duplicate
                                    </button>
                                    <div className="mx-2 my-0.5 border-t border-[#2A2A2A]" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConvertToBugId(task.id);
                                        setExpandedTask(task.id);
                                        closeKebab();
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                                    >
                                      <Bug className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                      Convert to Bug
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKebabDeleteConfirm(true);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </>
                                )}
                                {kebabSubMenu === "priority" && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKebabSubMenu(null);
                                      }}
                                      className="flex w-full items-center gap-2 border-b border-[#2A2A2A] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                                    >
                                      <ChevronLeft className="h-3 w-3" />
                                      Priority
                                    </button>
                                    {PRIORITIES.map((p) => (
                                      <button
                                        key={p}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateTask(task.id, { priority: p });
                                          closeKebab();
                                          reload();
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-[#2A2A2A] ${
                                          task.priority === p ? "text-[#F59E0B] font-medium" : "text-[#D1D5DB]"
                                        }`}
                                      >
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: getPriorityColor(p) }}
                                        />
                                        <span className="capitalize">{p}</span>
                                        {task.priority === p && <Check className="ml-auto h-3 w-3" />}
                                      </button>
                                    ))}
                                  </>
                                )}
                                {kebabSubMenu === "move" && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setKebabSubMenu(null);
                                      }}
                                      className="flex w-full items-center gap-2 border-b border-[#2A2A2A] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                                    >
                                      <ChevronLeft className="h-3 w-3" />
                                      Move to
                                    </button>
                                    {COLUMNS.map((c) => (
                                      <button
                                        key={c.key}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveTask(task.id, c.key);
                                          closeKebab();
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-[#2A2A2A] ${
                                          task.status === c.key ? "text-[#F59E0B] font-medium" : "text-[#D1D5DB]"
                                        }`}
                                      >
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: c.color }}
                                        />
                                        {c.label}
                                        {task.status === c.key && <Check className="ml-auto h-3 w-3" />}
                                      </button>
                                    ))}
                                  </>
                                )}
                                {kebabDeleteConfirm && (
                                  <div className="p-3 space-y-2">
                                    <p className="text-xs font-medium text-[#EF4444]">Delete this task?</p>
                                    <p className="text-[10px] leading-relaxed text-[#9CA3AF]">This action cannot be undone.</p>
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleKebabDelete(task.id);
                                        }}
                                        className="flex items-center gap-1 rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#DC2626]"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setKebabDeleteConfirm(false);
                                          setKebabSubMenu(null);
                                        }}
                                        className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
                              <div>
                                <label className="mb-1 block text-xs text-[#6B7280]">
                                  Assignee
                                </label>
                                <input
                                  type="text"
                                  value={editAssignee}
                                  onChange={(e) => setEditAssignee(e.target.value)}
                                  placeholder="Assignee name"
                                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs text-[#6B7280]">
                                    Blocked By
                                  </label>
                                  <select
                                    value={editBlockedBy}
                                    onChange={(e) => setEditBlockedBy(e.target.value)}
                                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                                  >
                                    <option value="">None</option>
                                    {tasks
                                      .filter((t) => t.projectId === projectId && t.id !== editingTask)
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.title}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-[#6B7280]">
                                    Due Date
                                  </label>
                                  <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-sm text-[#F5F5F5] outline-none [color-scheme:dark] focus:border-[#F59E0B]/50"
                                  />
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
                              {/* Time Tracking */}
                              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF]">
                                  <Timer className="h-3.5 w-3.5 text-[#F59E0B]" />
                                  Time Tracking
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Estimate</p>
                                    {editEstimate[task.id] !== undefined ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={editEstimate[task.id]}
                                          onChange={(e) => setEditEstimate((p) => ({ ...p, [task.id]: e.target.value }))}
                                          onKeyDown={(e) => { if (e.key === "Enter") handleSetEstimate(task.id); }}
                                          className="w-16 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                                          autoFocus
                                        />
                                        <span className="text-[10px] text-[#6B7280]">hrs</span>
                                        <button
                                          onClick={() => handleSetEstimate(task.id)}
                                          className="rounded p-0.5 text-[#F59E0B] hover:bg-[#F59E0B]/10"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditEstimate((p) => { const n = { ...p }; delete n[task.id]; return n; })}
                                          className="rounded p-0.5 text-[#6B7280] hover:text-[#F5F5F5]"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => setEditEstimate((p) => ({ ...p, [task.id]: String(task.estimatedHours || "") }))}
                                          className="text-xs text-[#F5F5F5] hover:text-[#F59E0B] transition-colors"
                                        >
                                          {task.estimatedHours ? `${task.estimatedHours}h` : "Set estimate"}
                                        </button>
                                        <button
                                          onClick={() => handleAiEstimate(task)}
                                          disabled={aiEstimateLoading[task.id]}
                                          title="AI Estimate"
                                          className="flex items-center gap-1 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 disabled:opacity-50"
                                        >
                                          {aiEstimateLoading[task.id] ? (
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                          ) : (
                                            <Sparkles className="h-2.5 w-2.5" />
                                          )}
                                          AI
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Logged</p>
                                    <p className="text-xs font-medium text-[#F5F5F5]">{task.loggedHours || 0}h</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#6B7280] mr-0.5">Log:</span>
                                  {[0.5, 1, 2, 4].map((h) => (
                                    <button
                                      key={h}
                                      onClick={() => handleLogTime(task.id, h)}
                                      className="rounded border border-[#2A2A2A] px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                                    >
                                      +{h}h
                                    </button>
                                  ))}
                                </div>
                                {task.estimatedHours && task.estimatedHours > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] mb-1">
                                      <span>Progress</span>
                                      <span className={(task.loggedHours || 0) > task.estimatedHours ? "text-[#EF4444]" : ""}>
                                        {Math.round(((task.loggedHours || 0) / task.estimatedHours) * 100)}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                                      <div
                                        className={`h-full rounded-full transition-all ${(task.loggedHours || 0) > task.estimatedHours ? "bg-[#EF4444]" : "bg-[#F59E0B]"}`}
                                        style={{ width: `${Math.min(100, ((task.loggedHours || 0) / task.estimatedHours) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                                {aiEstimateNote[task.id] && (
                                  <div className="flex items-start gap-1.5 rounded-md border border-[#F59E0B]/10 bg-[#F59E0B]/5 px-2.5 py-1.5">
                                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#F59E0B]" />
                                    <p className="text-[10px] leading-relaxed text-[#9CA3AF]">{aiEstimateNote[task.id]}</p>
                                  </div>
                                )}
                              </div>
                              {/* Subtasks Checklist */}
                              {(task.subtasks && task.subtasks.length > 0 || expandedTask === task.id) && (
                                <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-[#9CA3AF]">
                                      Subtasks
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <span className="ml-1.5 text-[#6B7280]">
                                          ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
                                        </span>
                                      )}
                                    </span>
                                    {task.subtasks && task.subtasks.length > 0 && task.subtasks.every((s) => s.done) && (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#10B981]">
                                        <Check className="h-3 w-3" />
                                        All done
                                      </span>
                                    )}
                                  </div>
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <>
                                      <div className="h-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                                        <div
                                          className="h-full rounded-full bg-[#10B981] transition-all"
                                          style={{ width: `${(task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100}%` }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        {task.subtasks.map((st) => (
                                          <button
                                            key={st.id}
                                            onClick={() => toggleSubtask(task.id, st.id)}
                                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[#1A1A1A]"
                                          >
                                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${st.done ? "border-[#10B981] bg-[#10B981]" : "border-[#3A3A3A]"}`}>
                                              {st.done && <Check className="h-2.5 w-2.5 text-black" />}
                                            </div>
                                            <span className={`text-xs ${st.done ? "text-[#6B7280] line-through" : "text-[#D1D5DB]"}`}>
                                              {st.title}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                  <div className="flex gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      value={subtaskInputs[task.id] || ""}
                                      onChange={(e) => setSubtaskInputs((p) => ({ ...p, [task.id]: e.target.value }))}
                                      onKeyDown={(e) => { if (e.key === "Enter") addSubtask(task.id); }}
                                      placeholder="Add subtask..."
                                      className="min-w-0 flex-1 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                                    />
                                    <button
                                      onClick={() => addSubtask(task.id)}
                                      className="shrink-0 rounded-md border border-[#2A2A2A] px-2 py-1.5 text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleAiBreakdown(task.id)}
                                    disabled={!!aiBreakdownLoading[task.id]}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5 py-1.5 text-[11px] font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50"
                                  >
                                    {aiBreakdownLoading[task.id] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3 w-3" />
                                    )}
                                    {aiBreakdownLoading[task.id] ? "Breaking down..." : "AI Break Down"}
                                  </button>
                                </div>
                              )}
                              {/* Comments Thread */}
                              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF]">
                                  <MessageSquare className="h-3.5 w-3.5 text-[#F59E0B]" />
                                  Comments
                                  {task.comments && task.comments.length > 0 && (
                                    <span className="text-[#6B7280]">({task.comments.length})</span>
                                  )}
                                </div>
                                {task.comments && task.comments.length > 0 && (
                                  <div className="space-y-2">
                                    {task.comments.map((comment) => (
                                      <div key={comment.id} className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold leading-none"
                                            style={{ backgroundColor: `${getAvatarColor(comment.author)}20`, color: getAvatarColor(comment.author) }}
                                          >
                                            {getInitials(comment.author)}
                                          </span>
                                          <span className="text-[11px] font-medium text-[#D1D5DB]">{comment.author}</span>
                                          <span className="text-[10px] text-[#6B7280]">
                                            {new Date(comment.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            {" "}
                                            {new Date(comment.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                          </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-[#D1D5DB]">{comment.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-1.5 pt-0.5">
                                  <input
                                    type="text"
                                    value={commentInputs[task.id] || ""}
                                    onChange={(e) => setCommentInputs((p) => ({ ...p, [task.id]: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === "Enter") addComment(task.id); }}
                                    placeholder="Add a comment..."
                                    className="min-w-0 flex-1 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                                  />
                                  <button
                                    onClick={() => addComment(task.id)}
                                    disabled={!commentInputs[task.id]?.trim()}
                                    className="shrink-0 rounded-md border border-[#2A2A2A] px-2.5 py-1.5 text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Send className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                <span>Sprint: {task.sprint}</span>
                                {task.assignee && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold leading-none"
                                      style={{ backgroundColor: `${getAvatarColor(task.assignee)}20`, color: getAvatarColor(task.assignee) }}
                                    >
                                      {getInitials(task.assignee)}
                                    </span>
                                    {task.assignee}
                                  </span>
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
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setConvertToBugId(task.id)}
                                    className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-2 py-1 text-xs text-[#6B7280] transition-colors hover:border-[#EF4444]/30 hover:text-[#EF4444]"
                                  >
                                    <Bug className="h-3 w-3" />
                                    Convert to Bug
                                  </button>
                                  <button
                                    onClick={() => startEdit(task)}
                                    className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-2 py-1 text-xs text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Convert to Bug Confirmation */}
                              {convertToBugId === task.id && (
                                <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-3 space-y-2">
                                  <p className="text-xs font-medium text-[#EF4444]">Convert this task to a bug report?</p>
                                  <p className="text-[10px] leading-relaxed text-[#9CA3AF]">
                                    This will create a new bug with this task&apos;s title and description, then remove the task from the board.
                                  </p>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => handleConvertToBug(task.id)}
                                      className="flex items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#DC2626]"
                                    >
                                      <Bug className="h-3 w-3" />
                                      Convert
                                    </button>
                                    <button
                                      onClick={() => setConvertToBugId(null)}
                                      className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
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
      </div>}

      {/* Floating Bulk Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/30 bg-[#1A1A1A] px-4 py-3 shadow-2xl shadow-black/50">
            <span className="mr-1 text-sm font-medium text-[#F5F5F5]">
              {selectedTasks.size} selected
            </span>

            <div className="mx-1 h-5 w-px bg-[#2A2A2A]" />

            {/* Move to */}
            <div className="relative">
              <button
                onClick={() => {
                  setBulkMoveOpen(!bulkMoveOpen);
                  setBulkPriorityOpen(false);
                  setShowBulkAssign(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Move to...
                <ChevronDown className={`h-3 w-3 transition-transform ${bulkMoveOpen ? "rotate-180" : ""}`} />
              </button>
              {bulkMoveOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-40 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl">
                  {COLUMNS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => bulkMoveTo(c.key)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Set Priority */}
            <div className="relative">
              <button
                onClick={() => {
                  setBulkPriorityOpen(!bulkPriorityOpen);
                  setBulkMoveOpen(false);
                  setShowBulkAssign(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Target className="h-3.5 w-3.5" />
                Priority...
                <ChevronDown className={`h-3 w-3 transition-transform ${bulkPriorityOpen ? "rotate-180" : ""}`} />
              </button>
              {bulkPriorityOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-36 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] shadow-xl">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => bulkSetPriority(p)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#D1D5DB] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getPriorityColor(p) }} />
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign to */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowBulkAssign(!showBulkAssign);
                  setBulkMoveOpen(false);
                  setBulkPriorityOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <User className="h-3.5 w-3.5" />
                Assign...
              </button>
              {showBulkAssign && (
                <div className="absolute bottom-full left-0 mb-1.5 w-48 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-2 shadow-xl">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={bulkAssignInput}
                      onChange={(e) => setBulkAssignInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") bulkAssign(); }}
                      placeholder="Assignee name..."
                      autoFocus
                      className="min-w-0 flex-1 rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                    />
                    <button
                      onClick={bulkAssign}
                      disabled={!bulkAssignInput.trim()}
                      className="shrink-0 rounded-md bg-[#F59E0B] px-2 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {uniqueAssignees.length > 0 && (
                    <div className="mt-1.5 border-t border-[#2A2A2A] pt-1.5">
                      {uniqueAssignees.map((a) => (
                        <button
                          key={a}
                          onClick={() => {
                            setBulkAssignInput(a);
                            selectedTasks.forEach((id) => updateTask(id, { assignee: a }));
                            setSelectedTasks(new Set());
                            setShowBulkAssign(false);
                            reload();
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                        >
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
                            style={{ backgroundColor: `${getAvatarColor(a)}20`, color: getAvatarColor(a) }}
                          >
                            {getInitials(a)}
                          </span>
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mx-1 h-5 w-px bg-[#2A2A2A]" />

            {/* Delete Selected */}
            {bulkDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#EF4444]">Delete {selectedTasks.size}?</span>
                <button
                  onClick={bulkDelete}
                  className="rounded-lg bg-[#EF4444] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#DC2626]"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="rounded-lg border border-[#2A2A2A] px-2.5 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#EF4444]/20 px-3 py-1.5 text-xs font-medium text-[#EF4444]/70 transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/5 hover:text-[#EF4444]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}

            <div className="mx-1 h-5 w-px bg-[#2A2A2A]" />

            {/* Clear Selection */}
            <button
              onClick={() => {
                setSelectedTasks(new Set());
                setBulkDeleteConfirm(false);
                setBulkMoveOpen(false);
                setBulkPriorityOpen(false);
                setShowBulkAssign(false);
              }}
              className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#9CA3AF] transition-colors hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Planning Poker Modal */}
      {showPlanningPoker && (() => {
        const unestimated = tasks.filter((t) => !t.estimatedHours);
        const total = unestimated.length;
        const current = unestimated[pokerIndex];
        const POKER_VALUES = [0.5, 1, 2, 4, 8, 16];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                    <Zap className="h-4.5 w-4.5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Planning Poker</h3>
                    <p className="text-xs text-[#6B7280]">Quick sprint estimation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlanningPoker(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <CheckSquare className="h-10 w-10 text-[#10B981]" />
                    <p className="text-sm font-medium text-[#F5F5F5]">All tasks estimated!</p>
                    <p className="text-xs text-[#6B7280]">Every task has an hour estimate assigned.</p>
                    <button
                      onClick={() => setShowPlanningPoker(false)}
                      className="mt-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90"
                    >
                      Done
                    </button>
                  </div>
                ) : !current ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <CheckSquare className="h-10 w-10 text-[#10B981]" />
                    <p className="text-sm font-medium text-[#F5F5F5]">Session complete!</p>
                    <p className="text-xs text-[#6B7280]">You estimated {total - (total - pokerIndex)} tasks this round.</p>
                    <button
                      onClick={() => setShowPlanningPoker(false)}
                      className="mt-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#F59E0B]">
                          {pokerIndex + 1}/{total} tasks
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {total - pokerIndex} remaining
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-1.5 rounded-full bg-[#F59E0B] transition-all"
                          style={{ width: `${((pokerIndex) / total) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-5 mb-5">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getPriorityColor(current.priority) }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[#F5F5F5] mb-1">{current.title}</h4>
                          {current.description && (
                            <p className="text-xs text-[#6B7280] line-clamp-3">{current.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF] capitalize">
                              {current.priority}
                            </span>
                            <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF] capitalize">
                              {current.status}
                            </span>
                            {current.tags?.map((tag) => (
                              <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: (TASK_TAG_COLORS as Record<string, string>)[tag] + "20", color: (TASK_TAG_COLORS as Record<string, string>)[tag] }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B7280] mb-3 text-center">How many hours will this take?</p>

                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {POKER_VALUES.map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            updateTask(current.id, { estimatedHours: val });
                            reload();
                            if (pokerIndex < total - 1) {
                              setPokerIndex(pokerIndex + 1);
                            } else {
                              setPokerIndex(total);
                            }
                          }}
                          className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] py-3 text-center transition-all hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/5 active:scale-95"
                        >
                          <span className="text-lg font-bold text-[#F5F5F5]">{val}</span>
                          <span className="text-[10px] text-[#6B7280]">hrs</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (pokerIndex < total - 1) {
                            setPokerIndex(pokerIndex + 1);
                          } else {
                            setPokerIndex(total);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs text-[#9CA3AF] transition-colors hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                      >
                        Skip
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {pokerIndex > 0 && (
                        <button
                          onClick={() => setPokerIndex(Math.max(0, pokerIndex - 1))}
                          className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs text-[#9CA3AF] transition-colors hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
