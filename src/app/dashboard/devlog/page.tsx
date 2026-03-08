"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  X,
  ChevronDown,
  Calendar,
  Filter,
} from "lucide-react";
import {
  getDevlog,
  getProjects,
  addDevlogEntry,
  getMoodEmoji,
  type DevlogEntry,
  type Project,
} from "@/lib/store";

const MOOD_OPTIONS: DevlogEntry["mood"][] = [
  "productive",
  "struggling",
  "breakthrough",
  "grinding",
];

const MOOD_LABELS: Record<DevlogEntry["mood"], string> = {
  productive: "Productive",
  struggling: "Struggling",
  breakthrough: "Breakthrough",
  grinding: "Grinding",
};

const MOOD_COLORS: Record<DevlogEntry["mood"], string> = {
  productive: "#F59E0B",
  struggling: "#EF4444",
  breakthrough: "#10B981",
  grinding: "#8B5CF6",
};

export default function DevlogPage() {
  const [entries, setEntries] = useState<DevlogEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterMood, setFilterMood] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [formProject, setFormProject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formMood, setFormMood] = useState<DevlogEntry["mood"]>("productive");

  useEffect(() => {
    console.log("[DevlogPage] rendered");
    setEntries(getDevlog());
    const p = getProjects();
    setProjects(p);
    if (p.length > 0) setFormProject(p[0].id);
  }, []);

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach((p) => (map[p.id] = p));
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    let result = [...entries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q)
      );
    }
    if (filterProject) {
      result = result.filter((e) => e.projectId === filterProject);
    }
    if (filterMood) {
      result = result.filter((e) => e.mood === filterMood);
    }
    if (dateFrom) {
      result = result.filter((e) => e.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.date <= dateTo);
    }

    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [entries, search, filterProject, filterMood, dateFrom, dateTo]);

  const handleSubmit = () => {
    if (!formProject || !formTitle.trim() || !formContent.trim()) return;

    const entry = addDevlogEntry({
      projectId: formProject,
      title: formTitle.trim(),
      content: formContent.trim(),
      mood: formMood,
      date: new Date().toISOString().split("T")[0],
    });
    console.log("[DevlogPage] created entry:", entry.id);

    setEntries(getDevlog());
    setFormTitle("");
    setFormContent("");
    setFormMood("productive");
    setShowModal(false);
  };

  const activeFilterCount = [filterProject, filterMood, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFilterProject("");
    setFilterMood("");
    setDateFrom("");
    setDateTo("");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devlog</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Your daily standup — everything you&apos;ve been working on
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
        >
          <Plus className="h-4 w-4" />
          Write Entry
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              showFilters || activeFilterCount > 0
                ? "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-xs font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Filters
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#F59E0B] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  Project
                </label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                >
                  <option value="">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  Mood
                </label>
                <select
                  value={filterMood}
                  onChange={(e) => setFilterMood(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                >
                  <option value="">All moods</option>
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {getMoodEmoji(m)} {MOOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-[#6B7280]" />
            <p className="mt-3 text-sm text-[#6B7280]">
              {entries.length === 0
                ? "No devlog entries yet. Write your first one!"
                : "No entries match your filters."}
            </p>
          </div>
        )}

        {filtered.map((entry, idx) => {
          const project = projectMap[entry.projectId];
          const showDateHeader =
            idx === 0 || filtered[idx - 1].date !== entry.date;

          return (
            <div key={entry.id}>
              {showDateHeader && (
                <div className="flex items-center gap-3 py-4">
                  <Calendar className="h-4 w-4 text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#9CA3AF]">
                    {formatDate(entry.date)}
                  </span>
                  <div className="h-px flex-1 bg-[#2A2A2A]" />
                </div>
              )}
              <div className="group relative flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="h-3 w-3 rounded-full border-2 border-[#0F0F0F]"
                    style={{ backgroundColor: MOOD_COLORS[entry.mood] }}
                  />
                  {idx < filtered.length - 1 && (
                    <div className="w-px flex-1 bg-[#2A2A2A]" />
                  )}
                </div>

                {/* Card */}
                <div className="mb-4 flex-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-colors hover:border-[#2A2A2A]/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {project && (
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${project.coverColor}15`,
                          color: project.coverColor,
                        }}
                      >
                        {project.name}
                      </span>
                    )}
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${MOOD_COLORS[entry.mood]}15`,
                        color: MOOD_COLORS[entry.mood],
                      }}
                    >
                      {getMoodEmoji(entry.mood)} {MOOD_LABELS[entry.mood]}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[#F5F5F5]">
                    {entry.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#D1D5DB]">
                    {entry.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Write Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Write Devlog Entry</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[#9CA3AF]">
                  Project
                </label>
                <select
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-[#9CA3AF]">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="What did you work on?"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-[#9CA3AF]">
                  Content
                </label>
                <textarea
                  placeholder="Write about your progress, blockers, decisions..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#9CA3AF]">
                  Mood
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setFormMood(mood)}
                      className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                        formMood === mood
                          ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30"
                      }`}
                    >
                      <span className="block text-lg">
                        {getMoodEmoji(mood)}
                      </span>
                      {MOOD_LABELS[mood]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formContent.trim()}
                className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
