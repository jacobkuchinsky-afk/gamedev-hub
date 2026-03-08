"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  AlertTriangle,
  ChevronDown,
  Monitor,
} from "lucide-react";
import {
  getProject,
  getBugs,
  addBug,
  updateBug,
  getSeverityColor,
  type Project,
  type Bug,
} from "@/lib/store";

const SEVERITIES: Bug["severity"][] = [
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
];
const STATUSES: Bug["status"][] = [
  "open",
  "confirmed",
  "fixing",
  "testing",
  "closed",
];

const BUG_STATUS_STYLES: Record<Bug["status"], string> = {
  open: "bg-[#EF4444]/10 text-[#EF4444]",
  confirmed: "bg-[#F97316]/10 text-[#F97316]",
  fixing: "bg-[#F59E0B]/10 text-[#F59E0B]",
  testing: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  closed: "bg-[#10B981]/10 text-[#10B981]",
};

export default function BugTrackerPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugsState] = useState<Bug[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedBug, setExpandedBug] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<
    Bug["severity"] | "all"
  >("all");
  const [filterStatus, setFilterStatus] = useState<Bug["status"] | "all">(
    "all"
  );

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<Bug["severity"]>("major");
  const [newPlatform, setNewPlatform] = useState("All");
  const [newReproSteps, setNewReproSteps] = useState("");

  const reload = useCallback(() => {
    setBugsState(getBugs(projectId));
  }, [projectId]);

  useEffect(() => {
    console.log("[BugTrackerPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const handleAddBug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addBug({
      projectId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      severity: newSeverity,
      status: "open",
      platform: newPlatform,
      reproSteps: newReproSteps.trim(),
    });
    console.log("[BugTrackerPage] bug added");
    setNewTitle("");
    setNewDesc("");
    setNewSeverity("major");
    setNewPlatform("All");
    setNewReproSteps("");
    setShowAddForm(false);
    reload();
  };

  const changeBugStatus = (bugId: string, newStatus: Bug["status"]) => {
    updateBug(bugId, { status: newStatus });
    console.log("[BugTrackerPage] bug status changed to", newStatus);
    reload();
  };

  const filtered = bugs
    .filter((b) => filterSeverity === "all" || b.severity === filterSeverity)
    .filter((b) => filterStatus === "all" || b.status === filterStatus)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (!project) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
          <h1 className="text-2xl font-bold">Bug Tracker</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={filterSeverity}
                onChange={(e) =>
                  setFilterSeverity(
                    e.target.value as Bug["severity"] | "all"
                  )
                }
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="all">All Severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as Bug["status"] | "all")
                }
                className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
              >
                <option value="all">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#EF4444]/90"
            >
              <Plus className="h-4 w-4" />
              Report Bug
            </button>
          </div>
        </div>
      </div>

      {/* Add Bug Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Report Bug</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddBug} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Bug title"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) =>
                      setNewSeverity(e.target.value as Bug["severity"])
                    }
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">
                    Platform
                  </label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    <option value="All">All</option>
                    <option value="Windows">Windows</option>
                    <option value="macOS">macOS</option>
                    <option value="Linux">Linux</option>
                    <option value="Web">Web</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Repro Steps
                </label>
                <textarea
                  value={newReproSteps}
                  onChange={(e) => setNewReproSteps(e.target.value)}
                  placeholder={"1. Do this\n2. Then this\n3. Bug happens"}
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#EF4444] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EF4444]/90"
              >
                Submit Bug Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bug List */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-[#6B7280]" />
            <p className="mt-3 text-sm text-[#9CA3AF]">
              {bugs.length === 0
                ? "No bugs reported yet"
                : "No bugs match your filters"}
            </p>
            {bugs.length === 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 flex items-center gap-1.5 text-sm text-[#F59E0B] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Report first bug
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {filtered.map((bug) => (
              <div key={bug.id}>
                <div
                  onClick={() =>
                    setExpandedBug(expandedBug === bug.id ? null : bug.id)
                  }
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F]"
                >
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    style={{ color: getSeverityColor(bug.severity) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{bug.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
                      <Monitor className="h-3 w-3" />
                      {bug.platform}
                      <span>&middot;</span>
                      {new Date(bug.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${getSeverityColor(bug.severity)}15`,
                      color: getSeverityColor(bug.severity),
                    }}
                  >
                    {bug.severity}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${BUG_STATUS_STYLES[bug.status]}`}
                  >
                    {bug.status}
                  </span>
                </div>

                {/* Expanded Detail */}
                {expandedBug === bug.id && (
                  <div className="border-t border-[#2A2A2A] bg-[#151515] px-5 py-4 space-y-4">
                    {bug.description && (
                      <div>
                        <p className="text-xs font-medium text-[#6B7280] mb-1">
                          Description
                        </p>
                        <p className="text-sm text-[#D1D5DB]">
                          {bug.description}
                        </p>
                      </div>
                    )}
                    {bug.reproSteps && (
                      <div>
                        <p className="text-xs font-medium text-[#6B7280] mb-1">
                          Repro Steps
                        </p>
                        <div className="rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] p-3">
                          {bug.reproSteps.split("\n").map((step, i) => (
                            <p
                              key={i}
                              className="text-sm text-[#D1D5DB] leading-relaxed"
                            >
                              {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-[#6B7280] mb-2">
                        Change Status
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.filter((s) => s !== bug.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => changeBugStatus(bug.id, s)}
                            className={`rounded-lg border border-[#2A2A2A] px-3 py-1 text-xs font-medium transition-colors hover:border-[#F59E0B]/30 ${BUG_STATUS_STYLES[s]}`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
