"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  AlertTriangle,
  ChevronDown,
  Monitor,
  Search,
  Bug as BugIcon,
  CheckCircle2,
  Zap,
  Sparkles,
  Loader2,
  MessageSquare,
  Send,
  RotateCcw,
  Clock,
  ArrowRight,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import {
  getProject,
  getBugs,
  addBug,
  updateBug,
  getSeverityColor,
  type Project,
  type Bug,
  type BugComment,
  type BugStatusEntry,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

const SEVERITIES: Bug["severity"][] = [
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
];
const STATUSES: Bug["status"][] = [
  "open",
  "investigating",
  "in-progress",
  "fixed",
  "closed",
];
const PLATFORMS = ["All", "Windows", "macOS", "Linux", "Web", "Mobile"];

const BUG_STATUS_STYLES: Record<Bug["status"], string> = {
  open: "bg-[#EF4444]/10 text-[#EF4444]",
  investigating: "bg-[#F59E0B]/10 text-[#F59E0B]",
  "in-progress": "bg-[#3B82F6]/10 text-[#3B82F6]",
  fixed: "bg-[#10B981]/10 text-[#10B981]",
  closed: "bg-[#6B7280]/10 text-[#6B7280]",
};

const STATUS_LABELS: Record<Bug["status"], string> = {
  open: "Open",
  investigating: "Investigating",
  "in-progress": "In Progress",
  fixed: "Fixed",
  closed: "Closed",
};

const NEXT_STATUS: Record<Bug["status"], { status: Bug["status"]; label: string } | null> = {
  open: { status: "investigating", label: "Start Investigating" },
  investigating: { status: "in-progress", label: "Start Fix" },
  "in-progress": { status: "fixed", label: "Mark Fixed" },
  fixed: { status: "closed", label: "Close Bug" },
  closed: null,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function BugTrackerPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugsState] = useState<Bug[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedBug, setExpandedBug] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Bug["severity"] | "all">("all");
  const [filterStatus, setFilterStatus] = useState<Bug["status"] | "all">("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickSeverity, setQuickSeverity] = useState<Bug["severity"]>("major");
  const [quickPlatform, setQuickPlatform] = useState("All");
  const [showQuickForm, setShowQuickForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<Bug["severity"]>("major");
  const [newPlatform, setNewPlatform] = useState("All");
  const [newReproSteps, setNewReproSteps] = useState("");
  const [newExpectedBehavior, setNewExpectedBehavior] = useState("");
  const [newActualBehavior, setNewActualBehavior] = useState("");
  const [aiSuggestingPriority, setAiSuggestingPriority] = useState(false);
  const [aiSuggestFlash, setAiSuggestFlash] = useState(false);
  const [aiImprovingDesc, setAiImprovingDesc] = useState(false);
  const [aiSuggestingPlatform, setAiSuggestingPlatform] = useState(false);
  const [aiPlatformFlash, setAiPlatformFlash] = useState(false);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [aiAnalyzingBug, setAiAnalyzingBug] = useState<string | null>(null);
  const [aiFixSuggestions, setAiFixSuggestions] = useState<Record<string, string>>({});
  const [aiFixLoading, setAiFixLoading] = useState<string | null>(null);

  const similarBugs = useMemo(() => {
    const q = newTitle.trim().toLowerCase();
    if (q.length < 3) return [];
    return bugs.filter((b) => b.title.toLowerCase().includes(q) || q.includes(b.title.toLowerCase())).slice(0, 3);
  }, [newTitle, bugs]);

  const reload = useCallback(() => {
    setBugsState(getBugs(projectId));
  }, [projectId]);

  useEffect(() => {
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

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
      expectedBehavior: newExpectedBehavior.trim() || undefined,
      actualBehavior: newActualBehavior.trim() || undefined,
    });
    setNewTitle("");
    setNewDesc("");
    setNewSeverity("major");
    setNewPlatform("All");
    setNewReproSteps("");
    setNewExpectedBehavior("");
    setNewActualBehavior("");
    setShowAddForm(false);
    reload();
  };

  const handleQuickFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addBug({
      projectId,
      title: quickTitle.trim(),
      description: "",
      severity: quickSeverity,
      status: "open",
      platform: quickPlatform,
      reproSteps: "",
    });
    setQuickTitle("");
    setQuickSeverity("major");
    setQuickPlatform("All");
    setShowQuickForm(false);
    reload();
  };

  const handleAiImproveDesc = async () => {
    if (!newTitle.trim() || aiImprovingDesc) return;
    setAiImprovingDesc(true);
    try {
      const prompt = `Improve this game bug report. Title: '${newTitle.trim()}'. Description: '${newDesc.trim() || "none"}'. Steps to Reproduce: '${newReproSteps.trim() || "none"}'. Expected Behavior: '${newExpectedBehavior.trim() || "none"}'. Actual Behavior: '${newActualBehavior.trim() || "none"}'.

Respond with EXACTLY this format (use these exact headers):
DESCRIPTION: <improved 1-2 sentence description>
STEPS:
1. <step>
2. <step>
3. <step>
EXPECTED: <what should happen>
ACTUAL: <what actually happens>

Be concise and professional. Fill in any missing sections based on the title and context.`;
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
      if (content) {
        const descMatch = content.match(/DESCRIPTION:\s*([\s\S]*?)(?=\nSTEPS:|$)/i);
        const stepsMatch = content.match(/STEPS:\s*([\s\S]*?)(?=\nEXPECTED:|$)/i);
        const expectedMatch = content.match(/EXPECTED:\s*([\s\S]*?)(?=\nACTUAL:|$)/i);
        const actualMatch = content.match(/ACTUAL:\s*([\s\S]*?)$/i);

        if (descMatch) setNewDesc(descMatch[1].trim());
        if (stepsMatch) setNewReproSteps(stepsMatch[1].trim());
        if (expectedMatch) setNewExpectedBehavior(expectedMatch[1].trim());
        if (actualMatch) setNewActualBehavior(actualMatch[1].trim());

        if (!descMatch && !stepsMatch) {
          setNewDesc(content);
        }
      }
    } catch {
      // silently fail
    } finally {
      setAiImprovingDesc(false);
    }
  };

  const handleAiSuggestPriority = async () => {
    if (!newTitle.trim() || aiSuggestingPriority) return;
    setAiSuggestingPriority(true);
    try {
      const prompt = `A game developer reported this bug: '${newTitle.trim()}'. Description: '${newDesc.trim() || "none"}'. Based on this, suggest a severity level: blocker, critical, major, or minor. Respond with ONLY one word: the severity level.`;
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
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim().toLowerCase();
      const match = content.match(/\b(blocker|critical|major|minor)\b/);
      if (match) {
        setNewSeverity(match[1] as Bug["severity"]);
        setAiSuggestFlash(true);
        setTimeout(() => setAiSuggestFlash(false), 1500);
      }
    } catch {
      // silently fail
    } finally {
      setAiSuggestingPriority(false);
    }
  };

  const handleAiSuggestPlatform = async () => {
    if (!newTitle.trim() || aiSuggestingPlatform) return;
    setAiSuggestingPlatform(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: `Based on this game bug description, which platform is most likely affected: Windows, Mac, Linux, Web, Mobile, All? Bug: '${newTitle.trim()}'. Respond with just the platform name.` }],
          stream: false,
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      const platformMap: Record<string, string> = { windows: "Windows", mac: "macOS", macos: "macOS", linux: "Linux", web: "Web", mobile: "Mobile", all: "All" };
      const key = content.toLowerCase().replace(/[^a-z]/g, "");
      const matched = Object.entries(platformMap).find(([k]) => key.includes(k));
      if (matched) {
        setNewPlatform(matched[1]);
        setAiPlatformFlash(true);
        setTimeout(() => setAiPlatformFlash(false), 1500);
      }
    } catch {
      // silently fail
    } finally {
      setAiSuggestingPlatform(false);
    }
  };

  const handleAiFixSuggestion = async (bug: Bug) => {
    if (aiFixLoading === bug.id) return;
    setAiFixLoading(bug.id);
    try {
      const prompt = `Suggest a fix approach for this game bug: '${bug.title}'. ${bug.description || ""}. Give a brief technical suggestion (2 sentences).`;
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
      setAiFixSuggestions((prev) => ({ ...prev, [bug.id]: content || "No suggestion available." }));
    } catch {
      setAiFixSuggestions((prev) => ({ ...prev, [bug.id]: "Failed to get suggestion. Try again." }));
    } finally {
      setAiFixLoading(null);
    }
  };

  const changeBugStatus = (bugId: string, newStatus: Bug["status"]) => {
    const bug = bugs.find((b) => b.id === bugId);
    const history: BugStatusEntry[] = bug?.statusHistory || [];
    const entry: BugStatusEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
    };
    updateBug(bugId, { status: newStatus, statusHistory: [...history, entry] });
    reload();
  };

  const addComment = (bugId: string) => {
    const text = commentInputs[bugId]?.trim();
    if (!text) return;
    const bug = bugs.find((b) => b.id === bugId);
    const existing: BugComment[] = bug?.comments || [];
    const newComment: BugComment = {
      id: `bc_${Date.now()}`,
      text,
      author: "JacobK",
      timestamp: new Date().toISOString(),
    };
    updateBug(bugId, { comments: [...existing, newComment] });
    setCommentInputs((p) => ({ ...p, [bugId]: "" }));
    reload();
  };

  const handleAiAnalyze = async (bug: Bug) => {
    if (aiAnalyzingBug === bug.id) return;
    setAiAnalyzingBug(bug.id);
    try {
      const prompt = `Analyze this game bug: Title: '${bug.title}'.${bug.description ? ` Description: '${bug.description}'.` : ""}${bug.reproSteps ? ` Steps: '${bug.reproSteps}'.` : ""} Platform: ${bug.platform}. Suggest the most likely root cause, where to look in the code, and a potential fix approach. Be brief and technical.`;
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
      setAiAnalysis((prev) => ({ ...prev, [bug.id]: content || "No analysis available." }));
    } catch {
      setAiAnalysis((prev) => ({ ...prev, [bug.id]: "Failed to get analysis. Try again." }));
    } finally {
      setAiAnalyzingBug(null);
    }
  };

  const exportBugReport = () => {
    if (!project || bugs.length === 0) return;
    const open = bugs.filter((b) => b.status === "open" || b.status === "investigating" || b.status === "in-progress").length;
    const fixed = bugs.filter((b) => b.status === "fixed").length;
    const closed = bugs.filter((b) => b.status === "closed").length;
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let md = `# Bug Report — ${project.name}\n\n`;
    md += `**Date:** ${date}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Count |\n|--------|-------|\n`;
    md += `| Total Bugs | ${bugs.length} |\n`;
    md += `| Open | ${open} |\n`;
    md += `| Fixed | ${fixed} |\n`;
    md += `| Closed | ${closed} |\n\n`;
    md += `---\n\n## Bugs\n\n`;

    bugs.forEach((bug, i) => {
      md += `### ${i + 1}. ${bug.title}\n\n`;
      md += `- **Severity:** ${bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)}\n`;
      md += `- **Status:** ${STATUS_LABELS[bug.status]}\n`;
      md += `- **Platform:** ${bug.platform}\n`;
      md += `- **Reported:** ${new Date(bug.created_at).toLocaleDateString()}\n\n`;

      if (bug.description) md += `**Description:**\n${bug.description}\n\n`;
      if (bug.reproSteps) md += `**Steps to Reproduce:**\n${bug.reproSteps}\n\n`;
      if (bug.expectedBehavior) md += `**Expected Behavior:**\n${bug.expectedBehavior}\n\n`;
      if (bug.actualBehavior) md += `**Actual Behavior:**\n${bug.actualBehavior}\n\n`;
      if (bug.status === "fixed" || bug.status === "closed") {
        const lastEntry = bug.statusHistory?.[bug.statusHistory.length - 1];
        if (lastEntry) {
          md += `**Resolution:** Marked as ${STATUS_LABELS[lastEntry.status as Bug["status"]] || lastEntry.status} on ${new Date(lastEntry.timestamp).toLocaleDateString()}\n\n`;
        }
      }
      md += `---\n\n`;
    });

    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-bugs.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBugCSV = () => {
    if (!project || bugs.length === 0) return;
    const escape = (v: string) => {
      if (v.includes(",") || v.includes('"') || v.includes("\n")) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    };
    const header = "ID,Title,Severity,Status,Platform,Created,Description";
    const rows = bugs.map((bug, i) =>
      [
        String(i + 1),
        escape(bug.title),
        bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1),
        STATUS_LABELS[bug.status],
        bug.platform,
        new Date(bug.created_at).toLocaleDateString(),
        escape(bug.description || ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-bugs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openBugs = useMemo(() => bugs.filter((b) => b.status !== "closed"), [bugs]);
  const closedBugs = useMemo(() => bugs.filter((b) => b.status === "closed"), [bugs]);

  const filtered = useMemo(() => {
    return bugs
      .filter((b) => b.status !== "closed")
      .filter((b) => filterSeverity === "all" || b.severity === filterSeverity)
      .filter((b) => filterStatus === "all" || b.status === filterStatus)
      .filter((b) => filterPlatform === "all" || b.platform === filterPlatform)
      .filter((b) => {
        if (!debouncedSearch) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [bugs, filterSeverity, filterStatus, filterPlatform, debouncedSearch]);

  const filteredResolved = useMemo(() => {
    return closedBugs
      .filter((b) => {
        if (!debouncedSearch) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [closedBugs, debouncedSearch]);

  const uniquePlatforms = useMemo(() => {
    const set = new Set(bugs.map((b) => b.platform));
    return Array.from(set);
  }, [bugs]);

  const bugStats = useMemo(() => {
    if (bugs.length === 0) return null;

    const resolved = bugs.filter((b) => b.status === "fixed" || b.status === "closed").length;
    const resolutionRate = Math.round((resolved / bugs.length) * 100);

    const fixedBugs = bugs.filter((b) => {
      if (b.status !== "fixed" && b.status !== "closed") return false;
      return b.statusHistory?.some((e) => e.status === "fixed" || e.status === "closed");
    });
    let avgFixDays = 0;
    if (fixedBugs.length > 0) {
      const totalDays = fixedBugs.reduce((acc, bug) => {
        const fixEntry = [...(bug.statusHistory || [])].reverse().find((e) => e.status === "fixed" || e.status === "closed");
        if (!fixEntry) return acc;
        const created = new Date(bug.created_at).getTime();
        const fixed = new Date(fixEntry.timestamp).getTime();
        return acc + (fixed - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgFixDays = Math.round((totalDays / fixedBugs.length) * 10) / 10;
    }

    const words: Record<string, number> = {};
    const stopWords = new Set(["the", "a", "an", "in", "on", "at", "to", "for", "of", "is", "it", "and", "or", "not", "bug", "when", "with", "does", "doesn", "don", "can", "from", "that", "this", "has", "have", "been", "was", "are", "but", "game"]);
    bugs.forEach((b) => {
      b.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).forEach((w) => {
        if (w.length > 2 && !stopWords.has(w)) words[w] = (words[w] || 0) + 1;
      });
    });
    const topKeyword = Object.entries(words).sort((a, b) => b[1] - a[1])[0];
    const mostBuggyArea = topKeyword ? topKeyword[0].charAt(0).toUpperCase() + topKeyword[0].slice(1) : "N/A";
    const mostBuggyCount = topKeyword ? topKeyword[1] : 0;

    const severityCounts: Record<string, number> = { blocker: 0, critical: 0, major: 0, minor: 0, trivial: 0 };
    bugs.forEach((b) => { severityCounts[b.severity] = (severityCounts[b.severity] || 0) + 1; });
    const maxSeverityCount = Math.max(...Object.values(severityCounts), 1);

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const thisWeek = bugs.filter((b) => now - new Date(b.created_at).getTime() < oneWeek).length;
    const lastWeek = bugs.filter((b) => {
      const age = now - new Date(b.created_at).getTime();
      return age >= oneWeek && age < oneWeek * 2;
    }).length;
    const trendDiff = thisWeek - lastWeek;

    const now2 = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeklyTrend: { label: string; blocker: number; critical: number; major: number; minor: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = now2 - (w + 1) * weekMs;
      const weekEnd = now2 - w * weekMs;
      const weekBugs = bugs.filter((b) => {
        const t = new Date(b.created_at).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const label = w === 0 ? "This week" : w === 1 ? "Last week" : `${w + 1}w ago`;
      weeklyTrend.push({
        label,
        blocker: weekBugs.filter((b) => b.severity === "blocker").length,
        critical: weekBugs.filter((b) => b.severity === "critical").length,
        major: weekBugs.filter((b) => b.severity === "major").length,
        minor: weekBugs.filter((b) => b.severity === "minor").length,
      });
    }
    const maxWeekTotal = Math.max(...weeklyTrend.map((w) => w.blocker + w.critical + w.major + w.minor), 1);

    return { resolutionRate, resolved, avgFixDays, fixedCount: fixedBugs.length, mostBuggyArea, mostBuggyCount, severityCounts, maxSeverityCount, thisWeek, lastWeek, trendDiff, weeklyTrend, maxWeekTotal };
  }, [bugs]);

  if (!project) return null;

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    if (parts.length <= 1) return text;
    const lowerQ = query.toLowerCase();
    return parts.map((part, i) =>
      part.toLowerCase() === lowerQ ? (
        <mark key={i} className="rounded-sm bg-[#F59E0B]/25 px-0.5 text-[#F59E0B]">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const renderBugRow = (bug: Bug, isResolved: boolean) => (
    <div key={bug.id}>
      <div
        onClick={() => setExpandedBug(expandedBug === bug.id ? null : bug.id)}
        className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F] ${
          isResolved ? "opacity-60" : ""
        }`}
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0"
          style={{ color: getSeverityColor(bug.severity) }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              isResolved ? "line-through text-[#6B7280]" : ""
            }`}
          >
            {highlightText(bug.title, debouncedSearch)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
            <Monitor className="h-3 w-3" />
            {bug.platform}
            <span>&middot;</span>
            <span>{timeAgo(bug.created_at)}</span>
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
          {STATUS_LABELS[bug.status]}
        </span>
        {bug.comments && bug.comments.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-[#2A2A2A] px-2 py-0.5 text-xs font-medium text-[#9CA3AF]">
            <MessageSquare className="h-3 w-3" />
            {bug.comments.length}
          </span>
        )}
      </div>

      {expandedBug === bug.id && (
        <div className="border-t border-[#2A2A2A] bg-[#151515] px-5 py-4 space-y-4">
          {bug.description && (
            <div>
              <p className="text-xs font-medium text-[#6B7280] mb-1">
                Description
              </p>
              <p className="text-sm text-[#D1D5DB]">{highlightText(bug.description, debouncedSearch)}</p>
            </div>
          )}
          {bug.reproSteps && (
            <div>
              <p className="text-xs font-medium text-[#6B7280] mb-1">
                Steps to Reproduce
              </p>
              <div className="rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] p-3">
                {bug.reproSteps.split("\n").map((step, i) => (
                  <p key={i} className="text-sm text-[#D1D5DB] leading-relaxed">
                    {step}
                  </p>
                ))}
              </div>
            </div>
          )}
          {(bug.expectedBehavior || bug.actualBehavior) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bug.expectedBehavior && (
                <div className="rounded-lg bg-[#0F0F0F] border border-[#10B981]/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
                    Expected Behavior
                  </p>
                  <p className="text-sm text-[#D1D5DB] leading-relaxed">{bug.expectedBehavior}</p>
                </div>
              )}
              {bug.actualBehavior && (
                <div className="rounded-lg bg-[#0F0F0F] border border-[#EF4444]/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444] mb-1.5">
                    Actual Behavior
                  </p>
                  <p className="text-sm text-[#D1D5DB] leading-relaxed">{bug.actualBehavior}</p>
                </div>
              )}
            </div>
          )}
          {/* AI Root Cause Analysis */}
          <div className="space-y-2">
            <button
              onClick={() => handleAiAnalyze(bug)}
              disabled={aiAnalyzingBug === bug.id}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiAnalyzingBug === bug.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {aiAnalysis[bug.id] ? "Re-analyze" : "AI Analyze Root Cause"}
            </button>
            {aiAnalyzingBug === bug.id && (
              <div className="flex items-center gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
                <span className="text-sm text-[#9CA3AF]">Analyzing root cause...</span>
              </div>
            )}
            {aiAnalysis[bug.id] && aiAnalyzingBug !== bug.id && (
              <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-[#F59E0B]">Root Cause Analysis</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                  {aiAnalysis[bug.id]}
                </p>
              </div>
            )}
            <button
              onClick={() => handleAiFixSuggestion(bug)}
              disabled={aiFixLoading === bug.id}
              className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-1.5 text-xs font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiFixLoading === bug.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              AI Fix Idea
            </button>
            {aiFixSuggestions[bug.id] && aiFixLoading !== bug.id && (
              <div className="rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#10B981]" />
                  <span className="text-xs font-semibold text-[#10B981]">Fix Suggestion</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                  {aiFixSuggestions[bug.id]}
                </p>
              </div>
            )}
          </div>
          {/* Comment Thread */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-xs font-medium text-[#9CA3AF]">
                Discussion
                {bug.comments && bug.comments.length > 0 && (
                  <span className="ml-1 text-[#6B7280]">({bug.comments.length})</span>
                )}
              </span>
            </div>
            {bug.comments && bug.comments.length > 0 && (
              <div className="space-y-2">
                {bug.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-[#1A1A1A] px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[#F59E0B]">{comment.author}</span>
                      <span className="text-[10px] text-[#6B7280]">{timeAgo(comment.timestamp)}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#D1D5DB]">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={commentInputs[bug.id] || ""}
                onChange={(e) => setCommentInputs((p) => ({ ...p, [bug.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") addComment(bug.id); }}
                placeholder="Add a comment..."
                className="min-w-0 flex-1 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
              />
              <button
                onClick={() => addComment(bug.id)}
                disabled={!commentInputs[bug.id]?.trim()}
                className="flex shrink-0 items-center gap-1 rounded-md bg-[#F59E0B] px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
          {/* Workflow Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {NEXT_STATUS[bug.status] && (
                <button
                  onClick={() => changeBugStatus(bug.id, NEXT_STATUS[bug.status]!.status)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  {NEXT_STATUS[bug.status]!.label}
                </button>
              )}
              {bug.status === "closed" && (
                <button
                  onClick={() => changeBugStatus(bug.id, "open")}
                  className="flex items-center gap-1.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-xs font-semibold text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </button>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-[#6B7280] mb-2">
                Set Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter((s) => s !== bug.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => changeBugStatus(bug.id, s)}
                    className={`rounded-lg border border-[#2A2A2A] px-3 py-1 text-xs font-medium transition-colors hover:border-[#F59E0B]/30 ${BUG_STATUS_STYLES[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Status History */}
          {bug.statusHistory && bug.statusHistory.length > 0 && (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span className="text-xs font-medium text-[#9CA3AF]">
                  Status History
                </span>
              </div>
              <div className="space-y-1.5">
                {bug.statusHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3A3A3A]" />
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${BUG_STATUS_STYLES[entry.status as Bug["status"]] || "bg-[#2A2A2A] text-[#9CA3AF]"}`}>
                      {STATUS_LABELS[entry.status as Bug["status"]] || entry.status}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">{timeAgo(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Bugs" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Bug Tracker</h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-[#EF4444]/10 px-3 py-1 text-xs font-semibold text-[#EF4444]">
                <BugIcon className="h-3 w-3" />
                {openBugs.length} open
              </span>
              <span className="rounded-full bg-[#2A2A2A] px-3 py-1 text-xs font-medium text-[#6B7280]">
                {bugs.length} total
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickForm(!showQuickForm)}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 px-3 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10"
            >
              <Zap className="h-3.5 w-3.5" />
              Quick File
            </button>
            {bugs.length > 0 && (
              <>
                <button
                  onClick={exportBugReport}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={exportBugCSV}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  title="Export as CSV"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </button>
              </>
            )}
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

      {/* Bug Stats */}
      {bugStats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Resolution Rate</span>
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5]">{bugStats.resolutionRate}%</p>
              <p className="mt-1 text-[10px] text-[#4B5563]">{bugStats.resolved} of {bugs.length} resolved</p>
            </div>

            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Avg Fix Time</span>
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5]">
                {bugStats.fixedCount > 0 ? (
                  <>{bugStats.avgFixDays}<span className="ml-1 text-sm font-normal text-[#6B7280]">days</span></>
                ) : (
                  <span className="text-lg text-[#4B5563]">No data</span>
                )}
              </p>
              <p className="mt-1 text-[10px] text-[#4B5563]">{bugStats.fixedCount} bug{bugStats.fixedCount !== 1 ? "s" : ""} with fix data</p>
            </div>

            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <BugIcon className="h-3.5 w-3.5 text-[#EF4444]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Hotspot</span>
              </div>
              <p className="truncate text-2xl font-bold text-[#F5F5F5]">{bugStats.mostBuggyArea}</p>
              <p className="mt-1 text-[10px] text-[#4B5563]">{bugStats.mostBuggyCount} mention{bugStats.mostBuggyCount !== 1 ? "s" : ""} in bug titles</p>
            </div>

            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                {bugStats.trendDiff <= 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-[#10B981]" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 text-[#EF4444]" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Weekly Trend</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#F5F5F5]">{bugStats.thisWeek}</p>
                <span className={`text-xs font-medium ${bugStats.trendDiff > 0 ? "text-[#EF4444]" : bugStats.trendDiff < 0 ? "text-[#10B981]" : "text-[#6B7280]"}`}>
                  {bugStats.trendDiff > 0 ? `+${bugStats.trendDiff}` : bugStats.trendDiff < 0 ? `${bugStats.trendDiff}` : "same"}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#4B5563]">this week vs {bugStats.lastWeek} last week</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Severity Distribution</span>
            </div>
            <div className="space-y-2">
              {(["blocker", "critical", "major", "minor", "trivial"] as Bug["severity"][]).map((sev) => (
                <div key={sev} className="flex items-center gap-3">
                  <span className="w-14 text-right text-[11px] font-medium capitalize text-[#9CA3AF]">{sev}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: bugStats.maxSeverityCount > 0 ? `${(bugStats.severityCounts[sev] / bugStats.maxSeverityCount) * 100}%` : "0%",
                        backgroundColor: getSeverityColor(sev),
                        minWidth: bugStats.severityCounts[sev] > 0 ? "8px" : "0px",
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-[11px] font-semibold tabular-nums text-[#6B7280]">{bugStats.severityCounts[sev]}</span>
                </div>
              ))}
            </div>
          </div>
          {bugStats.weeklyTrend.some((w) => w.blocker + w.critical + w.major + w.minor > 0) && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <BarChart3 className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Severity Trend (4 weeks)</span>
              </div>
              <div className="flex items-end gap-3" style={{ height: 120 }}>
                {bugStats.weeklyTrend.map((week, i) => {
                  const total = week.blocker + week.critical + week.major + week.minor;
                  const barHeight = bugStats.maxWeekTotal > 0 ? (total / bugStats.maxWeekTotal) * 100 : 0;
                  const segments = [
                    { count: week.blocker, color: "#991B1B", label: "Blocker" },
                    { count: week.critical, color: "#EF4444", label: "Critical" },
                    { count: week.major, color: "#F59E0B", label: "Major" },
                    { count: week.minor, color: "#3B82F6", label: "Minor" },
                  ].filter((s) => s.count > 0);
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="relative flex w-full flex-col justify-end" style={{ height: 90 }}>
                        {total === 0 ? (
                          <div className="mx-auto w-3/4 rounded-t bg-[#2A2A2A]" style={{ height: 2 }} />
                        ) : (
                          <div
                            className="mx-auto flex w-3/4 flex-col overflow-hidden rounded-t transition-all duration-500"
                            style={{ height: `${barHeight}%`, minHeight: 4 }}
                          >
                            {segments.map((seg, si) => (
                              <div
                                key={si}
                                className="w-full"
                                style={{
                                  backgroundColor: seg.color,
                                  flexGrow: seg.count,
                                }}
                                title={`${seg.label}: ${seg.count}`}
                              />
                            ))}
                          </div>
                        )}
                        {total > 0 && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums text-[#9CA3AF]">
                            {total}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-medium text-[#6B7280]">{week.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {[
                  { color: "#991B1B", label: "Blocker" },
                  { color: "#EF4444", label: "Critical" },
                  { color: "#F59E0B", label: "Major" },
                  { color: "#3B82F6", label: "Minor" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-[#6B7280]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick File Bug */}
      {showQuickForm && (
        <form
          onSubmit={handleQuickFile}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4"
        >
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Bug title — quick description"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
            />
          </div>
          <select
            value={quickSeverity}
            onChange={(e) => setQuickSeverity(e.target.value as Bug["severity"])}
            className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={quickPlatform}
            onChange={(e) => setQuickPlatform(e.target.value)}
            className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#EF4444]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            File
          </button>
          <button
            type="button"
            onClick={() => setShowQuickForm(false)}
            className="rounded-lg p-2 text-[#6B7280] hover:text-[#F5F5F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search bugs by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-10 pr-9 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={filterSeverity}
            onChange={(e) =>
              setFilterSeverity(e.target.value as Bug["severity"] | "all")
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
            {STATUSES.filter((s) => s !== "closed").map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        </div>
        <div className="relative">
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
          >
            <option value="all">All Platforms</option>
            {uniquePlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
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
              {similarBugs.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Similar bug{similarBugs.length > 1 ? "s" : ""} found
                  </div>
                  {similarBugs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setExpandedBug(b.id);
                      }}
                      className="flex w-full items-center justify-between rounded-md bg-[#0F0F0F]/60 px-2.5 py-1.5 text-left transition-colors hover:bg-[#1F1F1F]"
                    >
                      <span className="min-w-0 truncate text-xs text-[#D1D5DB]">&ldquo;{b.title}&rdquo;</span>
                      <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${BUG_STATUS_STYLES[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </button>
                  ))}
                  <p className="text-[10px] text-[#6B7280]">
                    Click to view. You can still file this bug if it&apos;s different.
                  </p>
                </div>
              )}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">Description</label>
                  <button
                    type="button"
                    onClick={handleAiImproveDesc}
                    disabled={!newTitle.trim() || aiImprovingDesc}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {aiImprovingDesc ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI Improve
                  </button>
                </div>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs text-[#6B7280]">
                      Severity
                    </label>
                    <button
                      type="button"
                      onClick={handleAiSuggestPriority}
                      disabled={!newTitle.trim() || aiSuggestingPriority}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {aiSuggestingPriority ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Suggest
                    </button>
                  </div>
                  <select
                    value={newSeverity}
                    onChange={(e) =>
                      setNewSeverity(e.target.value as Bug["severity"])
                    }
                    className={`w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-all focus:border-[#F59E0B]/50 ${
                      aiSuggestFlash
                        ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/30"
                        : "border-[#2A2A2A]"
                    }`}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs text-[#6B7280]">
                      Platform
                    </label>
                    <button
                      type="button"
                      onClick={handleAiSuggestPlatform}
                      disabled={!newTitle.trim() || aiSuggestingPlatform}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {aiSuggestingPlatform ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Suggest
                    </button>
                  </div>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className={`w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none transition-all focus:border-[#F59E0B]/50 ${
                      aiPlatformFlash
                        ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/30"
                        : "border-[#2A2A2A]"
                    }`}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Steps to Reproduce
                </label>
                <textarea
                  value={newReproSteps}
                  onChange={(e) => setNewReproSteps(e.target.value)}
                  placeholder={"1. Do this\n2. Then this\n3. Bug happens"}
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Expected Behavior
                </label>
                <textarea
                  value={newExpectedBehavior}
                  onChange={(e) => setNewExpectedBehavior(e.target.value)}
                  placeholder="What should happen?"
                  rows={2}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">
                  Actual Behavior
                </label>
                <textarea
                  value={newActualBehavior}
                  onChange={(e) => setNewActualBehavior(e.target.value)}
                  placeholder="What actually happens?"
                  rows={2}
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

      {/* Active Bug List */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            {debouncedSearch ? (
              <>
                <Search className="h-10 w-10 text-[#6B7280]" />
                <p className="mt-3 text-sm text-[#9CA3AF]">
                  No bugs match &ldquo;{debouncedSearch}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 flex items-center gap-1.5 text-sm text-[#F59E0B] hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear search
                </button>
              </>
            ) : (
              <>
                <AlertTriangle className="h-10 w-10 text-[#6B7280]" />
                <p className="mt-3 text-sm text-[#9CA3AF]">
                  {bugs.length === 0
                    ? "No bugs reported yet"
                    : openBugs.length === 0
                    ? "All bugs resolved — nice work!"
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
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {filtered.map((bug) => renderBugRow(bug, false))}
          </div>
        )}
      </div>

      {/* Resolved Section */}
      {filteredResolved.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            <h2 className="text-sm font-semibold text-[#6B7280]">
              Resolved ({filteredResolved.length})
            </h2>
            <div className="h-px flex-1 bg-[#2A2A2A]" />
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="divide-y divide-[#2A2A2A]">
              {filteredResolved.map((bug) => renderBugRow(bug, true))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
