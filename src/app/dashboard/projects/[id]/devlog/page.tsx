"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  Sun,
  Cloud,
  Star,
  Cog,
  Pencil,
  FileText,
} from "lucide-react";
import {
  getProject,
  getDevlog,
  addDevlogEntry,
  updateDevlogEntry,
  getMoodEmoji,
  type Project,
  type DevlogEntry,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

const MOODS: {
  key: DevlogEntry["mood"];
  label: string;
  icon: typeof Sun;
  color: string;
}[] = [
  { key: "productive", label: "Productive", icon: Sun, color: "#10B981" },
  { key: "struggling", label: "Struggling", icon: Cloud, color: "#EF4444" },
  { key: "breakthrough", label: "Breakthrough", icon: Star, color: "#F59E0B" },
  { key: "grinding", label: "Grinding", icon: Cog, color: "#9CA3AF" },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const bullet = line.slice(2);
      const html = inlineMarkdown(bullet);
      return (
        <div key={i} className="flex gap-2 text-sm leading-relaxed text-[#D1D5DB]">
          <span className="mt-0.5 text-[#F59E0B]">&bull;</span>
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    }
    const numbered = line.match(/^(\d+)\.\s+(.*)/);
    if (numbered) {
      const html = inlineMarkdown(numbered[2]);
      return (
        <div key={i} className="flex gap-2 text-sm leading-relaxed text-[#D1D5DB]">
          <span className="mt-0.5 min-w-[1.2em] text-right text-[#6B7280]">{numbered[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    }
    const processed = inlineMarkdown(line);
    return (
      <p
        key={i}
        className="text-sm leading-relaxed text-[#D1D5DB]"
        dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }}
      />
    );
  });
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F5F5F5] font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#D1D5DB]">$1</em>')
    .replace(/`(.*?)`/g, '<code class="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-xs text-[#F59E0B]">$1</code>');
}

function CalendarHeatmap({ entries }: { entries: DevlogEntry[] }) {
  const today = new Date();
  const days = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = entries.filter((e) => e.date === dateStr).length;
      result.push({ date: dateStr, count });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  const weeks: { date: string; count: number }[][] = [];
  let weekBuf: { date: string; count: number }[] = [];
  days.forEach((d, i) => {
    weekBuf.push(d);
    if (weekBuf.length === 7 || i === days.length - 1) {
      weeks.push(weekBuf);
      weekBuf = [];
    }
  });

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#F59E0B]" />
        <h3 className="text-sm font-semibold text-[#F5F5F5]">Activity (Last 30 Days)</h3>
        <span className="ml-auto text-xs text-[#6B7280]">
          {entries.length} total {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 pr-1 pt-0">
          {dayLabels.map((l, i) => (
            <div key={i} className="flex h-3.5 w-6 items-center text-[8px] text-[#6B7280]">{l}</div>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => {
                const bg = day.count === 0
                  ? "#1A1A1A"
                  : day.count === 1
                  ? "#F59E0B40"
                  : day.count === 2
                  ? "#F59E0B80"
                  : "#F59E0B";
                const formatted = new Date(day.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={day.date}
                    className="h-3.5 w-3.5 rounded-sm border border-[#2A2A2A]"
                    style={{ backgroundColor: bg }}
                    title={`${formatted}: ${day.count} ${day.count === 1 ? "entry" : "entries"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="ml-3 flex items-end gap-1">
          <span className="text-[8px] text-[#6B7280]">Less</span>
          {["#1A1A1A", "#F59E0B40", "#F59E0B80", "#F59E0B"].map((c) => (
            <div
              key={c}
              className="h-3 w-3 rounded-sm border border-[#2A2A2A]"
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="text-[8px] text-[#6B7280]">More</span>
        </div>
      </div>
    </div>
  );
}

export default function DevlogPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<DevlogEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DevlogEntry | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newMood, setNewMood] = useState<DevlogEntry["mood"]>("productive");

  const reload = useCallback(() => {
    const e = getDevlog(projectId);
    setEntries(
      [...e].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  }, [projectId]);

  useEffect(() => {
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    addDevlogEntry({
      projectId,
      title: newTitle.trim(),
      content: newContent.trim(),
      mood: newMood,
      date: new Date().toISOString().split("T")[0],
    });
    setNewTitle("");
    setNewContent("");
    setNewMood("productive");
    setShowAddForm(false);
    reload();
  };

  const handleEditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !newTitle.trim() || !newContent.trim()) return;
    updateDevlogEntry(editingEntry.id, {
      title: newTitle.trim(),
      content: newContent.trim(),
      mood: newMood,
    });
    setEditingEntry(null);
    setNewTitle("");
    setNewContent("");
    setNewMood("productive");
    reload();
  };

  const startEdit = (entry: DevlogEntry) => {
    setEditingEntry(entry);
    setNewTitle(entry.title);
    setNewContent(entry.content);
    setNewMood(entry.mood);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setNewTitle("");
    setNewContent("");
    setNewMood("productive");
  };

  if (!project) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Devlog" },
          ]}
        />
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Development Log</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            Write Entry
          </button>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <CalendarHeatmap entries={entries} />

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Devlog Entry</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Entry title"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />

              {/* Mood Selector */}
              <div>
                <label className="mb-2 block text-xs text-[#6B7280]">
                  How&apos;s it going?
                </label>
                <div className="flex gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.key}
                      type="button"
                      onClick={() => setNewMood(mood.key)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                        newMood === mood.key
                          ? "border-[#F59E0B] bg-[#F59E0B]/5"
                          : "border-[#2A2A2A] hover:border-[#6B7280]"
                      }`}
                    >
                      <mood.icon
                        className="h-5 w-5"
                        style={{ color: mood.color }}
                      />
                      <span className="text-xs text-[#9CA3AF]">
                        {mood.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">Content</label>
                  <span className="text-[10px] text-[#6B7280]">
                    {wordCount(newContent)} words
                  </span>
                </div>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="What happened today? Use **bold**, *italic*, `code`, - lists..."
                  required
                  rows={6}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Publish Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Entry</h3>
              <button
                onClick={cancelEdit}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditEntry} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Entry title"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />

              <div>
                <label className="mb-2 block text-xs text-[#6B7280]">Mood</label>
                <div className="flex gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.key}
                      type="button"
                      onClick={() => setNewMood(mood.key)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                        newMood === mood.key
                          ? "border-[#F59E0B] bg-[#F59E0B]/5"
                          : "border-[#2A2A2A] hover:border-[#6B7280]"
                      }`}
                    >
                      <mood.icon
                        className="h-5 w-5"
                        style={{ color: mood.color }}
                      />
                      <span className="text-xs text-[#9CA3AF]">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">Content</label>
                  <span className="text-[10px] text-[#6B7280]">
                    {wordCount(newContent)} words
                  </span>
                </div>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="What happened today?"
                  required
                  rows={6}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 rounded-lg border border-[#2A2A2A] py-2.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16">
          <Star className="h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">No devlog entries yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 flex items-center gap-1.5 text-sm text-[#F59E0B] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Write your first entry
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#2A2A2A]" />

          <div className="space-y-6">
            {entries.map((entry) => {
              const mood = MOODS.find((m) => m.key === entry.mood);
              const MoodIcon = mood?.icon || Sun;
              const wc = wordCount(entry.content);
              return (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#2A2A2A] bg-[#1A1A1A]"
                  >
                    <MoodIcon
                      className="h-4 w-4"
                      style={{ color: mood?.color }}
                    />
                  </div>

                  {/* Entry card */}
                  <div className="flex-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#F5F5F5]">
                          {entry.title}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="text-xs text-[#6B7280]">
                            {new Date(entry.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <span className="text-[10px] text-[#6B7280]">&bull;</span>
                          <span className="text-[10px] text-[#6B7280]">{wc} {wc === 1 ? "word" : "words"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(entry)}
                          className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                          title="Edit entry"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-lg" title={mood?.label}>
                          {getMoodEmoji(entry.mood)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {renderMarkdown(entry.content)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
