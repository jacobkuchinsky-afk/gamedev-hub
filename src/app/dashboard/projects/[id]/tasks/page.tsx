"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  GripVertical,
  ChevronDown,
  User,
} from "lucide-react";
import {
  getProject,
  getTasks,
  addTask,
  updateTask,
  getPriorityColor,
  type Project,
  type Task,
} from "@/lib/store";

const COLUMNS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#9CA3AF" },
  { key: "in-progress", label: "In Progress", color: "#F59E0B" },
  { key: "testing", label: "Testing", color: "#8B5CF6" },
  { key: "done", label: "Done", color: "#10B981" },
];

const PRIORITIES: Task["priority"][] = ["critical", "high", "medium", "low"];

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

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newAssignee, setNewAssignee] = useState("JacobK");
  const [newSprint, setNewSprint] = useState("Sprint 1");

  const reload = useCallback(() => {
    setTasks(getTasks(projectId));
  }, [projectId]);

  useEffect(() => {
    console.log("[TaskBoardPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({
      projectId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: addToColumn,
      priority: newPriority,
      sprint: newSprint,
      assignee: newAssignee,
    });
    console.log("[TaskBoardPage] task added");
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setShowAddForm(false);
    reload();
  };

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    updateTask(taskId, { status: newStatus });
    console.log("[TaskBoardPage] task moved to", newStatus);
    reload();
  };

  const filteredTasks =
    filterPriority === "all"
      ? tasks
      : tasks.filter((t) => t.priority === filterPriority);

  if (!project) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <div className="flex items-center gap-3">
            {/* Priority Filter */}
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

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
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
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
              />
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
                  <input
                    type="text"
                    value={newSprint}
                    onChange={(e) => setNewSprint(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
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

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter(
            (t) => t.status === column.key
          );
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
                  <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#9CA3AF]">
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
                {columnTasks.map((task) => (
                  <div key={task.id} className="group">
                    <div
                      onClick={() =>
                        setExpandedTask(
                          expandedTask === task.id ? null : task.id
                        )
                      }
                      className="cursor-pointer rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 transition-all hover:border-[#F59E0B]/20"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {task.title}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${getPriorityColor(task.priority)}15`,
                                color: getPriorityColor(task.priority),
                              }}
                            >
                              {task.priority}
                            </span>
                            {task.assignee && (
                              <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                                <User className="h-3 w-3" />
                                {task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expandedTask === task.id && (
                      <div className="mt-1 rounded-lg border border-[#2A2A2A] bg-[#151515] p-3 space-y-3">
                        {task.description && (
                          <p className="text-xs text-[#9CA3AF] leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-[#6B7280]">
                          Sprint: {task.sprint}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs text-[#6B7280] mr-1">
                            Move:
                          </span>
                          {COLUMNS.filter((c) => c.key !== task.status).map(
                            (c) => (
                              <button
                                key={c.key}
                                onClick={() => moveTask(task.id, c.key)}
                                className="rounded border border-[#2A2A2A] px-2 py-0.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                              >
                                {c.label}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
