"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  X,
  Calendar,
  Filter,
  Flame,
  Type,
  Sparkles,
  Loader2,
  BarChart3,
  Download,
  Share2,
  Check,
} from "lucide-react";
import {
  getDevlog,
  getProjects,
  addDevlogEntry,
  getMoodEmoji,
  type DevlogEntry,
  type Project,
} from "@/lib/store";
import { useToast } from "@/components/Toast";

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

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <span
            key={i}
            className="rounded-sm bg-[#F59E0B]/25 px-0.5 text-[#F59E0B]"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function renderMarkdown(text: string, searchQuery?: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) elements.push(<br key={`br-${lineIdx}`} />);

    const isBullet = /^[\-\*]\s/.test(line);
    const isNumbered = /^\d+\.\s/.test(line);
    const content = isBullet
      ? line.replace(/^[\-\*]\s/, "")
      : isNumbered
      ? line.replace(/^\d+\.\s/, "")
      : line;

    const parts: React.ReactNode[] = [];
    let remaining = content;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const codeMatch = remaining.match(/`(.+?)`/);

      const matches = [
        boldMatch && { type: "bold", match: boldMatch },
        italicMatch && { type: "italic", match: italicMatch },
        codeMatch && { type: "code", match: codeMatch },
      ]
        .filter(Boolean)
        .sort(
          (a, b) => (a!.match!.index ?? Infinity) - (b!.match!.index ?? Infinity)
        );

      if (matches.length === 0) {
        parts.push(searchQuery ? highlightText(remaining, searchQuery) : remaining);
        break;
      }

      const first = matches[0]!;
      const idx = first.match!.index!;
      if (idx > 0) parts.push(searchQuery ? highlightText(remaining.slice(0, idx), searchQuery) : remaining.slice(0, idx));

      const inner = first.match![1];
      if (first.type === "bold") {
        parts.push(
          <strong key={`${lineIdx}-${keyIdx++}`} className="font-semibold text-[#F5F5F5]">
            {searchQuery ? highlightText(inner, searchQuery) : inner}
          </strong>
        );
      } else if (first.type === "italic") {
        parts.push(
          <em key={`${lineIdx}-${keyIdx++}`} className="italic text-[#D1D5DB]">
            {searchQuery ? highlightText(inner, searchQuery) : inner}
          </em>
        );
      } else if (first.type === "code") {
        parts.push(
          <code
            key={`${lineIdx}-${keyIdx++}`}
            className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-xs font-mono text-[#F59E0B]"
          >
            {inner}
          </code>
        );
      }

      remaining = remaining.slice(idx + first.match![0].length);
    }

    if (isBullet || isNumbered) {
      elements.push(
        <span key={`li-${lineIdx}`} className="flex gap-2 ml-2">
          <span className="text-[#6B7280] shrink-0">
            {isBullet ? "\u2022" : line.match(/^\d+/)![0] + "."}
          </span>
          <span>{parts}</span>
        </span>
      );
    } else {
      elements.push(
        <span key={`p-${lineIdx}`}>{parts}</span>
      );
    }
  });

  return elements;
}

export default function DevlogPage() {
  const { toast } = useToast();
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopicLoading, setAiTopicLoading] = useState(false);
  const [aiTitleLoading, setAiTitleLoading] = useState(false);
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [weeklySummary, setWeeklySummary] = useState("");
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleExport = () => {
    if (entries.length === 0) {
      toast({ title: "Nothing to export", description: "Write some entries first.", type: "error" });
      return;
    }

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const totalW = sorted.reduce((s, e) => s + wordCount(e.content), 0);
    const moods: Record<string, number> = {};
    sorted.forEach((e) => { moods[e.mood] = (moods[e.mood] || 0) + 1; });

    const lines = ["# Game Development Devlog\n"];
    sorted.forEach((e) => {
      const moodLabel = `${getMoodEmoji(e.mood)} ${MOOD_LABELS[e.mood]}`;
      lines.push(`## ${e.date} — ${e.title} (${moodLabel})`);
      lines.push(e.content);
      lines.push("\n---\n");
    });

    lines.push("## Stats");
    lines.push(`- **Entries:** ${sorted.length}`);
    lines.push(`- **Total words:** ${totalW.toLocaleString()}`);
    lines.push(`- **Avg. words/entry:** ${sorted.length > 0 ? Math.round(totalW / sorted.length) : 0}`);
    Object.entries(moods).forEach(([m, c]) => {
      lines.push(`- **${MOOD_LABELS[m as DevlogEntry["mood"]]}:** ${c}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devlog-export.md";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: `${sorted.length} entries saved as devlog-export.md`, type: "success" });
  };

  const handleShare = async (entry: DevlogEntry) => {
    const moodLabel = `${getMoodEmoji(entry.mood)} ${MOOD_LABELS[entry.mood]}`;
    const formatted = `\uD83D\uDCDD Devlog \u2014 ${entry.title}\n${formatDate(entry.date)} | Mood: ${moodLabel}\n\n${entry.content}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Clipboard access denied.", type: "error" });
    }
  };

  const handleWeeklySummary = async () => {
    setWeeklySummaryLoading(true);
    setShowWeeklySummary(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const recentEntries = entries.filter((e) => e.date >= weekAgoStr);

      if (recentEntries.length === 0) {
        setWeeklySummary("No devlog entries from the past 7 days to summarize. Start writing!");
        return;
      }

      const entriesText = recentEntries
        .map((e) => `[${e.date}] ${e.title} (${e.mood}): ${e.content}`)
        .join("\n\n");

      const prompt = `Summarize these game development devlog entries from the past week: ${entriesText}. Write a brief weekly progress report (3-4 sentences) highlighting: what was accomplished, what challenges were faced, and what the focus should be next week.`;

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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setWeeklySummary(content || "Couldn't generate a summary. Try again later.");
    } catch {
      setWeeklySummary("Failed to generate summary. Check your connection and try again.");
    } finally {
      setWeeklySummaryLoading(false);
    }
  };

  const handleAiAssist = async () => {
    setAiLoading(true);
    try {
      const prompt = `Help me write a game dev log entry. Title: ${formTitle || "Untitled"}. What I've written so far: ${formContent || "nothing yet"}. Write a thoughtful devlog entry about game development progress. Be personal, practical, and specific. 150-250 words.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      if (content) {
        setFormContent(content);
      } else {
        toast({ title: "AI couldn't generate content", description: "Try again or write manually.", type: "error" });
      }
    } catch {
      toast({ title: "AI assist failed", description: "Check your connection and try again.", type: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiTitle = async () => {
    if (!formContent.trim() || aiTitleLoading) return;
    setAiTitleLoading(true);
    try {
      const snippet = formContent.trim().slice(0, 100);
      const prompt = `Suggest a catchy devlog title for this game development entry: '${snippet}'. Max 8 words. Just the title.`;
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
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim().replace(/^["']|["']$/g, "");
      if (content) setFormTitle(content);
    } catch { /* silently fail */ }
    finally { setAiTitleLoading(false); }
  };

  const handleAiTopics = async () => {
    setAiTopicLoading(true);
    setAiTopics([]);
    try {
      const selectedProject = projects.find((p) => p.id === formProject);
      const genre = selectedProject?.genre || "indie";
      const status = selectedProject?.status || "development";
      const tasks = entries.filter((e) => e.projectId === formProject);
      const tasksDone = tasks.length;

      const prompt = `Suggest 5 game devlog topics for a developer working on a ${genre} game. The game is currently in ${status} stage with ${tasksDone} tasks completed. Include topics about: technical challenges, design decisions, art progress, community building, and personal reflections. Just a numbered list of titles.`;

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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const parsed = content
        .split("\n")
        .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((line: string) => line.length > 0 && line.length < 120);
      setAiTopics(parsed.slice(0, 5));
    } catch {
      setAiTopics(["Failed to generate topics. Try again."]);
    } finally {
      setAiTopicLoading(false);
    }
  };

  const reload = useCallback(() => {
    setEntries(getDevlog());
  }, []);

  useEffect(() => {
    reload();
    const p = getProjects();
    setProjects(p);
    if (p.length > 0) setFormProject(p[0].id);
  }, [reload]);

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach((p) => (map[p.id] = p));
    return map;
  }, [projects]);

  const moodSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const uniqueDates = [...new Set(entries.map((e) => e.date))].sort(
      (a, b) => b.localeCompare(a)
    );

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let count = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const curr = new Date(uniqueDates[i] + "T00:00:00");
      const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
      if (diffDays === 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [entries]);

  const longestStreak = useMemo(() => {
    if (entries.length === 0) return 0;
    const uniqueDates = [...new Set(entries.map((e) => e.date))].sort();
    let maxStreak = 1;
    let current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const curr = new Date(uniqueDates[i] + "T00:00:00");
      if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
        current++;
        maxStreak = Math.max(maxStreak, current);
      } else {
        current = 1;
      }
    }
    return maxStreak;
  }, [entries]);

  const totalWords = useMemo(
    () => entries.reduce((sum, e) => sum + wordCount(e.content), 0),
    [entries]
  );

  const avgEntryLength = useMemo(
    () => (entries.length > 0 ? Math.round(totalWords / entries.length) : 0),
    [entries, totalWords]
  );

  const mostProductiveDay = useMemo(() => {
    if (entries.length === 0) return "\u2014";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const day = days[new Date(e.date + "T00:00:00").getDay()];
      counts[day] = (counts[day] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [entries]);

  const filtered = useMemo(() => {
    let result = [...entries];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.mood.toLowerCase().includes(q) ||
          MOOD_LABELS[e.mood].toLowerCase().includes(q)
      );
    }
    if (filterProject) result = result.filter((e) => e.projectId === filterProject);
    if (filterMood) result = result.filter((e) => e.mood === filterMood);
    if (dateFrom) result = result.filter((e) => e.date >= dateFrom);
    if (dateTo) result = result.filter((e) => e.date <= dateTo);
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [entries, search, filterProject, filterMood, dateFrom, dateTo]);

  const handleSubmit = () => {
    if (!formProject || !formTitle.trim() || !formContent.trim()) return;
    addDevlogEntry({
      projectId: formProject,
      title: formTitle.trim(),
      content: formContent.trim(),
      mood: formMood,
      date: new Date().toISOString().split("T")[0],
    });
    reload();
    toast({ title: "Entry saved!", description: formTitle.trim(), type: "success" });
    setFormTitle("");
    setFormContent("");
    setFormMood("productive");
    setShowModal(false);
  };

  const activeFilterCount = [filterProject, filterMood, dateFrom, dateTo].filter(
    Boolean
  ).length;

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

  const MAX_CHARS = 5000;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devlog</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Your daily standup &mdash; everything you&apos;ve been working on
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleWeeklySummary}
            disabled={weeklySummaryLoading}
            className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {weeklySummaryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI Weekly Summary
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
          >
            <Plus className="h-4 w-4" />
            Write Entry
          </button>
        </div>
      </div>

      {showWeeklySummary && (
        <div className="relative overflow-hidden rounded-xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/5 via-[#1A1A1A] to-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#F59E0B]/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
              </div>
              <h2 className="text-sm font-semibold text-[#F59E0B]">Weekly Summary</h2>
            </div>
            <button
              onClick={() => setShowWeeklySummary(false)}
              className="rounded-lg p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {weeklySummaryLoading ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                <span className="text-sm text-[#9CA3AF]">Analyzing your week...</span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[#D1D5DB]">{weeklySummary}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total Entries", value: String(entries.length), icon: BookOpen, color: "#F59E0B" },
            { label: "Words Written", value: totalWords.toLocaleString(), icon: Type, color: "#3B82F6" },
            { label: "Longest Streak", value: `${longestStreak}d`, icon: Flame, color: "#EF4444" },
            { label: "Best Day", value: mostProductiveDay, icon: Calendar, color: "#10B981" },
            { label: "Avg. Length", value: `${avgEntryLength}w`, icon: BarChart3, color: "#8B5CF6" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-[#F5F5F5]">{stat.value}</p>
              <p className="mt-0.5 text-xs text-[#6B7280]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Word Count Chart */}
      {entries.length > 1 && (() => {
        const last10 = [...entries]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)
          .reverse();
        const counts = last10.map((e) => wordCount(e.content));
        const maxWc = Math.max(...counts, 1);
        const avg = Math.round(counts.reduce((s, c) => s + c, 0) / counts.length);
        const avgPct = (avg / maxWc) * 100;

        return (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-sm font-semibold text-[#F5F5F5]">Words per Entry</span>
              </div>
              <span className="text-xs text-[#6B7280]">Last {last10.length} entries</span>
            </div>
            <div className="relative flex items-end gap-1.5" style={{ height: 120 }}>
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#F59E0B]/30"
                style={{ bottom: `${avgPct}%` }}
              >
                <span className="absolute -top-4 right-0 text-[10px] font-medium text-[#F59E0B]">
                  avg {avg}
                </span>
              </div>
              {last10.map((entry, i) => {
                const pct = (counts[i] / maxWc) * 100;
                return (
                  <div key={entry.id} className="group/bar flex flex-1 flex-col items-center gap-1" style={{ height: "100%" }}>
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[32px] rounded-t-md bg-[#F59E0B]/20 transition-colors group-hover/bar:bg-[#F59E0B]/40"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                      <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] opacity-0 shadow transition-opacity group-hover/bar:opacity-100">
                        {counts[i]}
                      </div>
                    </div>
                    <span className="w-full truncate text-center text-[9px] text-[#6B7280]" title={entry.title}>
                      {entry.title.length > 6 ? entry.title.slice(0, 6) + ".." : entry.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
            <BookOpen className="mx-auto h-12 w-12 text-[#F59E0B]/30" />
            {entries.length === 0 ? (
              <>
                <p className="mt-4 text-base font-semibold text-[#F5F5F5]">
                  Start your devlog journey
                </p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Every day counts. Document your progress, wins, and blockers.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
                >
                  <Plus className="h-4 w-4" />
                  Write your first entry
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#6B7280]">
                No entries match your filters.
              </p>
            )}
          </div>
        )}

        {filtered.map((entry, idx) => {
          const project = projectMap[entry.projectId];
          const showDateHeader =
            idx === 0 || filtered[idx - 1].date !== entry.date;
          const wc = wordCount(entry.content);

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
                <div className="flex flex-col items-center">
                  <div
                    className="h-3 w-3 rounded-full border-2 border-[#0F0F0F]"
                    style={{ backgroundColor: MOOD_COLORS[entry.mood] }}
                  />
                  {idx < filtered.length - 1 && (
                    <div className="w-px flex-1 bg-[#2A2A2A]" />
                  )}
                </div>

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
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-[#6B7280]">
                        {wc} word{wc !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => handleShare(entry)}
                        className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F59E0B]"
                        title="Copy to clipboard"
                      >
                        {copiedId === entry.id ? (
                          <Check className="h-3.5 w-3.5 text-[#10B981]" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[#F5F5F5]">
                    {highlightText(entry.title, search)}
                  </h3>
                  <div className="mt-2 text-sm leading-relaxed text-[#D1D5DB]">
                    {renderMarkdown(entry.content, search)}
                  </div>
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
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
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
              <div className="grid grid-cols-2 gap-3">
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
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="What did you work on?"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                    />
                    <button
                      type="button"
                      onClick={handleAiTitle}
                      disabled={!formContent.trim() || aiTitleLoading}
                      title="AI suggest title from content"
                      className="flex shrink-0 items-center justify-center rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-2.5 text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/15 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {aiTitleLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm text-[#9CA3AF]">Title Ideas</label>
                  <button
                    type="button"
                    onClick={handleAiTopics}
                    disabled={aiTopicLoading}
                    className="flex items-center gap-1.5 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-2.5 py-1 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiTopicLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {aiTopicLoading ? "Thinking..." : "AI Suggest Topics"}
                  </button>
                </div>
                {(aiTopics.length > 0 || aiTopicLoading) && (
                  <div className="flex flex-wrap gap-2">
                    {aiTopicLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                        <span className="text-xs text-[#6B7280]">Generating topic ideas...</span>
                      </div>
                    ) : (
                      aiTopics.map((topic, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFormTitle(topic);
                            setAiTopics([]);
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            formTitle === topic
                              ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                              : "border-[#2A2A2A] text-[#D1D5DB] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                          }`}
                        >
                          {topic}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm text-[#9CA3AF]">Content</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAiAssist}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-2.5 py-1 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {aiLoading ? "Writing..." : "AI Assist"}
                    </button>
                    <span
                      className={`text-xs ${
                        formContent.length > MAX_CHARS * 0.9
                          ? "text-[#EF4444]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {formContent.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                      &middot; {wordCount(formContent)} words
                    </span>
                  </div>
                </div>
                <textarea
                  placeholder="Write about your progress, blockers, decisions... Supports **bold**, *italic*, `code`, and - bullet lists."
                  value={formContent}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS)
                      setFormContent(e.target.value);
                  }}
                  rows={10}
                  className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-sm leading-relaxed text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 font-mono"
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
