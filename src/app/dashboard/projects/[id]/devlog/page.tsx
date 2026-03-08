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
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  CalendarDays,
  Download,
} from "lucide-react";
import {
  getProject,
  getDevlog,
  addDevlogEntry,
  updateDevlogEntry,
  getMoodEmoji,
  type Project,
  type DevlogEntry,
  type DevlogNote,
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
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [aiReflections, setAiReflections] = useState<Record<string, string>>({});
  const [aiReflectLoading, setAiReflectLoading] = useState<string | null>(null);
  const [aiRatings, setAiRatings] = useState<Record<string, string>>({});
  const [aiRatingLoading, setAiRatingLoading] = useState<string | null>(null);
  const [monthlyRecap, setMonthlyRecap] = useState("");
  const [monthlyRecapLoading, setMonthlyRecapLoading] = useState(false);
  const [aiMoodLoading, setAiMoodLoading] = useState(false);
  const [aiTagLoading, setAiTagLoading] = useState<string | null>(null);
  const [aiTags, setAiTags] = useState<Record<string, string>>({});

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

  const handleAddNote = (entryId: string) => {
    const text = noteInputs[entryId]?.trim();
    if (!text) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const existing: DevlogNote[] = entry.notes || [];
    const newNote: DevlogNote = {
      id: `note_${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
    };
    updateDevlogEntry(entryId, { notes: [...existing, newNote] } as Partial<Omit<DevlogEntry, "id" | "projectId">>);
    setNoteInputs((p) => ({ ...p, [entryId]: "" }));
    reload();
  };

  const handleAiMoodSuggest = async () => {
    if (!newContent.trim() || aiMoodLoading) return;
    setAiMoodLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Based on this devlog: '${newContent.trim().slice(0, 200)}'. What mood? (productive/struggling/breakthrough/grinding). Just the mood.` }], stream: false, max_tokens: 32, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim().toLowerCase();
      const moodMap: Record<string, DevlogEntry["mood"]> = { productive: "productive", struggling: "struggling", breakthrough: "breakthrough", grinding: "grinding", creative: "breakthrough", stuck: "struggling", excited: "breakthrough" };
      const matched = Object.entries(moodMap).find(([k]) => content.includes(k));
      if (matched) setNewMood(matched[1]);
    } catch { /* silently fail */ }
    finally { setAiMoodLoading(false); }
  };

  const handleAiRating = async (entry: DevlogEntry) => {
    if (aiRatingLoading === entry.id) return;
    setAiRatingLoading(entry.id);
    try {
      const snippet = (entry.content || "").slice(0, 50);
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Rate this devlog entry quality (1-5 stars) and give a brief reason: '${entry.title}' - '${snippet}'. Format: X/5 — reason.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiRatings((prev) => ({ ...prev, [entry.id]: content || "No rating available." }));
    } catch {
      setAiRatings((prev) => ({ ...prev, [entry.id]: "Failed to rate." }));
    } finally { setAiRatingLoading(null); }
  };

  const handleAiReflect = async (entry: DevlogEntry) => {
    if (aiReflectLoading === entry.id) return;
    setAiReflectLoading(entry.id);
    try {
      const prompt = `Based on this devlog entry about '${entry.title}': '${entry.content}', suggest a one-sentence reflection or takeaway that could help the developer improve.`;
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
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiReflections((prev) => ({ ...prev, [entry.id]: content || "No reflection available." }));
    } catch {
      setAiReflections((prev) => ({ ...prev, [entry.id]: "Failed to generate reflection." }));
    } finally {
      setAiReflectLoading(null);
    }
  };

  const handleAiTag = async (entry: DevlogEntry) => {
    if (aiTagLoading === entry.id) return;
    setAiTagLoading(entry.id);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest a hashtag for devlog '${entry.title}'. Just the hashtag.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      setAiTags((prev) => ({ ...prev, [entry.id]: (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim() }));
    } catch { /* silently fail */ }
    finally { setAiTagLoading(null); }
  };

  const handleMonthlyRecap = async () => {
    if (monthlyRecapLoading) return;
    setMonthlyRecapLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentEntries = entries.filter(
        (e) => new Date(e.date) >= thirtyDaysAgo
      );
      if (recentEntries.length === 0) {
        setMonthlyRecap("No devlog entries in the past 30 days to summarize.");
        return;
      }
      const entrySummaries = recentEntries
        .map((e) => `[${e.date}] ${e.title} (${e.mood}): ${e.content}`)
        .join("\n");
      const prompt = `Write a monthly development recap based on these devlog entries: ${entrySummaries}. Highlight: top 3 accomplishments, biggest challenge overcome, and goals for next month. 4-5 sentences.`;
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
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setMonthlyRecap(content || "Could not generate recap.");
    } catch {
      setMonthlyRecap("Failed to generate monthly recap.");
    } finally {
      setMonthlyRecapLoading(false);
    }
  };

  const handleExportAllEntries = () => {
    if (entries.length === 0) return;
    const projectSlug = (project?.name || "project").replace(/\s+/g, "-").toLowerCase();
    const lines: string[] = [];
    lines.push(`# ${project?.name || "Project"} — Development Log`);
    lines.push("");
    lines.push(`_Exported on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}_`);
    lines.push(`_${entries.length} ${entries.length === 1 ? "entry" : "entries"}_`);
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const entry of entries) {
      const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      lines.push(`## ${entry.title}`);
      lines.push("");
      lines.push(`**Date:** ${dateStr}  `);
      lines.push(`**Mood:** ${getMoodEmoji(entry.mood)} ${entry.mood}`);
      lines.push("");
      lines.push(entry.content);

      if (entry.notes && entry.notes.length > 0) {
        lines.push("");
        lines.push("### Notes");
        for (const note of entry.notes) {
          const ts = new Date(note.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          lines.push(`- ${note.text} _(${ts})_`);
        }
      }

      lines.push("");
      lines.push("---");
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectSlug}-devlog.md`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAllEntries}
              disabled={entries.length === 0}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export .md
            </button>
            <button
              onClick={handleMonthlyRecap}
              disabled={monthlyRecapLoading}
              className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {monthlyRecapLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              AI Monthly Recap
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              Write Entry
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <CalendarHeatmap entries={entries} />

      {/* AI Monthly Recap Panel */}
      {(monthlyRecap || monthlyRecapLoading) && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#1A1A1A] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Monthly Recap</h3>
            </div>
            {!monthlyRecapLoading && (
              <button
                onClick={() => setMonthlyRecap("")}
                className="rounded-md p-1 text-[#6B7280] hover:text-[#F5F5F5]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {monthlyRecapLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
              <span className="text-sm text-[#9CA3AF]">Generating recap from the last 30 days...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {renderMarkdown(monthlyRecap)}
            </div>
          )}
        </div>
      )}

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
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">How&apos;s it going?</label>
                  <button type="button" onClick={handleAiMoodSuggest} disabled={!newContent.trim() || aiMoodLoading} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                    {aiMoodLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI Mood
                  </button>
                </div>
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

                    {/* AI Reflection & Rating */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleAiReflect(entry)}
                        disabled={aiReflectLoading === entry.id}
                        className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiReflectLoading === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI Reflect
                      </button>
                      <button
                        onClick={() => handleAiRating(entry)}
                        disabled={aiRatingLoading === entry.id}
                        className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-1.5 text-xs font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiRatingLoading === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        AI Rate
                      </button>
                      <button
                        onClick={() => handleAiTag(entry)}
                        disabled={aiTagLoading === entry.id}
                        className="flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 px-3 py-1.5 text-xs font-medium text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiTagLoading === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        AI Tag
                      </button>
                    </div>
                    {aiTags[entry.id] && aiTagLoading !== entry.id && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#8B5CF6]">
                        {aiTags[entry.id]}
                      </span>
                    )}
                    {aiReflections[entry.id] && aiReflectLoading !== entry.id && (
                      <div className="mt-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                          <span className="text-[10px] font-semibold text-[#F59E0B]">Reflection</span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiReflections[entry.id]}</p>
                      </div>
                    )}
                    {aiRatings[entry.id] && aiRatingLoading !== entry.id && (
                      <div className="mt-2 rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-[#10B981]" />
                          <span className="text-[10px] font-semibold text-[#10B981]">Quality Rating</span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiRatings[entry.id]}</p>
                      </div>
                    )}

                    {/* Notes Section */}
                    <div className="mt-4 border-t border-[#2A2A2A] pt-3">
                      <button
                        onClick={() =>
                          setExpandedNotes((p) => ({
                            ...p,
                            [entry.id]: !p[entry.id],
                          }))
                        }
                        className="flex items-center gap-1.5 text-xs text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {entry.notes && entry.notes.length > 0
                          ? `${entry.notes.length} note${entry.notes.length !== 1 ? "s" : ""}`
                          : "Add Note"}
                      </button>

                      {(expandedNotes[entry.id] || (entry.notes && entry.notes.length > 0)) && (
                        <div className="mt-2.5 space-y-2">
                          {entry.notes && entry.notes.length > 0 && (
                            <div className="space-y-2">
                              {entry.notes.map((note) => (
                                <div
                                  key={note.id}
                                  className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2"
                                >
                                  <p className="text-sm text-[#D1D5DB]">{note.text}</p>
                                  <p className="mt-1 text-[10px] text-[#6B7280]">
                                    {new Date(note.timestamp).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={noteInputs[entry.id] || ""}
                              onChange={(e) =>
                                setNoteInputs((p) => ({
                                  ...p,
                                  [entry.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddNote(entry.id);
                              }}
                              placeholder="Add a note..."
                              className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                            />
                            <button
                              onClick={() => handleAddNote(entry.id)}
                              className="shrink-0 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5 text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
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
