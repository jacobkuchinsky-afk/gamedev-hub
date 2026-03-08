"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  FileText,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Search,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  getProject,
  getChangelog,
  addChangelogEntry,
  deleteChangelogEntry,
  getTasks,
  getBugs,
  VERSION_TYPE_COLORS,
  CHANGE_CATEGORY_COLORS,
  type Project,
  type ChangelogEntry,
  type VersionType,
  type ChangeCategory,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

const VERSION_TYPES: VersionType[] = ["Major", "Minor", "Patch", "Hotfix"];
const CHANGE_CATEGORIES: ChangeCategory[] = ["Added", "Changed", "Fixed", "Removed", "Known Issues"];

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?(\+[a-zA-Z0-9._-]+)?$/;

function getNextVersion(lastVersion: string, type: VersionType): string {
  const baseMatch = lastVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!baseMatch) return "0.1.0";
  const major = parseInt(baseMatch[1]);
  const minor = parseInt(baseMatch[2]);
  const patch = parseInt(baseMatch[3]);
  switch (type) {
    case "Major":
      return `${major + 1}.0.0`;
    case "Minor":
      return `${major}.${minor + 1}.0`;
    case "Patch":
      return `${major}.${minor}.${patch + 1}`;
    case "Hotfix": {
      const hotfixMatch = lastVersion.match(/-hotfix\.(\d+)$/);
      if (hotfixMatch)
        return `${major}.${minor}.${patch}-hotfix.${parseInt(hotfixMatch[1]) + 1}`;
      return `${major}.${minor}.${patch}-hotfix.1`;
    }
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function formatVersionMarkdown(entry: ChangelogEntry): string {
  const lines: string[] = [];
  lines.push(`## [${entry.version}] — ${entry.date}`);
  lines.push(`**${entry.title}** (${entry.type})\n`);
  for (const cat of CHANGE_CATEGORIES) {
    const items = entry.changes[cat];
    if (items && items.length > 0) {
      lines.push(`### ${cat}`);
      for (const item of items) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

export default function ChangelogPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [formVersion, setFormVersion] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = useState<VersionType>("Patch");
  const [formChanges, setFormChanges] = useState<Record<ChangeCategory, string>>({
    Added: "",
    Changed: "",
    Fixed: "",
    Removed: "",
    "Known Issues": "",
  });
  const [versionError, setVersionError] = useState("");
  const [formAttempted, setFormAttempted] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);

  function getLatestVersion(): string | null {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].version;
  }

  function suggestVersion(type: VersionType): string {
    const latest = getLatestVersion();
    if (!latest) return "0.1.0";
    return getNextVersion(latest, type);
  }

  function openForm() {
    const suggested = suggestVersion(formType);
    setFormVersion(suggested);
    setVersionError("");
    setShowForm(true);
  }

  function handleTypeChange(type: VersionType) {
    setFormType(type);
    setFormVersion(suggestVersion(type));
    setVersionError("");
  }

  const handleAiWriteNotes = async () => {
    if (aiWriting) return;
    setAiWriting(true);
    try {
      const tasks = getTasks(projectId);
      const bugs = getBugs(projectId);
      const completedTasks = tasks.filter((t) => t.status === "done").map((t) => t.title).slice(0, 15);
      const fixedBugs = bugs.filter((b) => b.status === "closed").map((b) => b.title).slice(0, 15);

      const prompt = `Write changelog notes for version ${formVersion || "upcoming"} (${formType.toLowerCase()} release) of a game. Recent completed tasks: ${completedTasks.length > 0 ? completedTasks.join(", ") : "none listed"}. Recent fixed bugs: ${fixedBugs.length > 0 ? fixedBugs.join(", ") : "none listed"}. Format your response EXACTLY like this, with each section on its own line:
Added:
- item 1
- item 2
Changed:
- item 1
Fixed:
- item 1
Be specific and brief. Only include sections that have items.`;

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

      const parseSection = (label: string): string => {
        const regex = new RegExp(`${label}:\\s*\\n((?:[-*]\\s+.+\\n?)+)`, "i");
        const match = content.match(regex);
        if (!match) return "";
        return match[1]
          .split("\n")
          .map((l: string) => l.replace(/^[-*]\s+/, "").trim())
          .filter(Boolean)
          .join("\n");
      };

      setFormChanges((prev) => ({
        ...prev,
        Added: parseSection("Added") || prev.Added,
        Changed: parseSection("Changed") || prev.Changed,
        Fixed: parseSection("Fixed") || prev.Fixed,
      }));
    } catch {
      // silently fail
    } finally {
      setAiWriting(false);
    }
  };

  useEffect(() => {
    const p = getProject(projectId);
    setProject(p || null);
    const cl = getChangelog(projectId);
    setEntries(cl.sort((a, b) => b.date.localeCompare(a.date)));
    if (cl.length > 0) {
      setExpanded({ [cl.sort((a, b) => b.date.localeCompare(a.date))[0].id]: true });
    }
  }, [projectId]);

  if (!project) return null;

  const filteredEntries = searchQuery.trim()
    ? entries.filter((entry) => {
        const q = searchQuery.toLowerCase();
        if (entry.version.toLowerCase().includes(q)) return true;
        if (entry.title.toLowerCase().includes(q)) return true;
        if (entry.type.toLowerCase().includes(q)) return true;
        for (const cat of CHANGE_CATEGORIES) {
          if (entry.changes[cat]?.some((item) => item.toLowerCase().includes(q))) return true;
        }
        return false;
      })
    : entries;

  const lastUpdated = entries.length > 0 ? entries[0].date : null;

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function validateVersion(v: string) {
    if (!v.trim()) {
      setVersionError("");
      return;
    }
    if (!SEMVER_REGEX.test(v.trim())) {
      setVersionError("Must follow semver (e.g. 1.2.3 or 1.0.0-beta)");
    } else {
      setVersionError("");
    }
  }

  function handleAdd() {
    setFormAttempted(true);
    if (!formVersion.trim() || !formTitle.trim()) return;
    if (!SEMVER_REGEX.test(formVersion.trim())) {
      setVersionError("Must follow semver (e.g. 1.2.3 or 1.0.0-beta)");
      return;
    }

    const changes: Record<ChangeCategory, string[]> = {
      Added: [],
      Changed: [],
      Fixed: [],
      Removed: [],
      "Known Issues": [],
    };

    for (const cat of CHANGE_CATEGORIES) {
      changes[cat] = formChanges[cat]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }

    const entry = addChangelogEntry({
      projectId,
      version: formVersion.trim(),
      title: formTitle.trim(),
      date: formDate,
      type: formType,
      changes,
    });

    setEntries((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setExpanded((prev) => ({ ...prev, [entry.id]: true }));
    setFormVersion("");
    setFormTitle("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormType("Patch");
    setFormChanges({ Added: "", Changed: "", Fixed: "", Removed: "", "Known Issues": "" });
    setVersionError("");
    setFormAttempted(false);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteChangelogEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function copyVersionNotes(entry: ChangelogEntry) {
    const md = formatVersionMarkdown(entry);
    navigator.clipboard.writeText(md).then(() => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function copyAllAsMarkdown() {
    const lines: string[] = ["# Changelog\n"];
    for (const entry of entries) {
      lines.push(`## v${entry.version} (${entry.type}) \u2014 ${entry.date}`);
      for (const cat of CHANGE_CATEGORIES) {
        const items = entry.changes[cat];
        if (items && items.length > 0) {
          lines.push(`### ${cat}`);
          for (const item of items) {
            lines.push(`- ${item}`);
          }
        }
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }

  function exportMarkdown() {
    const lines: string[] = [`# ${project!.name} — Changelog\n`];

    for (const entry of entries) {
      lines.push(`## [${entry.version}] — ${entry.date}`);
      lines.push(`**${entry.title}** (${entry.type})\n`);

      for (const cat of CHANGE_CATEGORIES) {
        const items = entry.changes[cat];
        if (items && items.length > 0) {
          lines.push(`### ${cat}`);
          for (const item of items) {
            lines.push(`- ${item}`);
          }
          lines.push("");
        }
      }
      lines.push("---\n");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project!.name.toLowerCase().replace(/\s+/g, "-")}-changelog.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalChanges = entries.reduce((sum, e) => {
    return sum + CHANGE_CATEGORIES.reduce((s, cat) => s + (e.changes[cat]?.length || 0), 0);
  }, 0);

  const DOT_COLORS: Record<VersionType, string> = {
    Major: "#F59E0B",
    Minor: "#3B82F6",
    Patch: "#10B981",
    Hotfix: "#EF4444",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Changelog" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <FileText className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Changelog</h1>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <span>{entries.length} version{entries.length !== 1 ? "s" : ""}</span>
                <span>&middot;</span>
                <span>{totalChanges} changes tracked</span>
                {lastUpdated && (
                  <>
                    <span>&middot;</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {lastUpdated}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAllAsMarkdown}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                copiedAll
                  ? "border-[#10B981]/30 text-[#10B981]"
                  : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              }`}
            >
              {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedAll ? "Copied!" : "Copy All"}
            </button>
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Download className="h-4 w-4" />
              Export .md
            </button>
            <button
              onClick={openForm}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              New Version
            </button>
          </div>
        </div>
      </div>

      {/* Search/Filter */}
      {entries.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search versions, titles, or changes..."
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
          />
          {searchQuery && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">
              {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Version</h2>
              <button onClick={() => { setShowForm(false); setFormAttempted(false); setVersionError(""); }} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Version (semver)</label>
                  <input
                    type="text"
                    value={formVersion}
                    onChange={(e) => { setFormVersion(e.target.value); validateVersion(e.target.value); }}
                    placeholder="1.0.0 or 1.2.3-beta"
                    className={`w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 ${
                      versionError || (formAttempted && !formVersion.trim())
                        ? "border-[#EF4444]"
                        : "border-[#2A2A2A]"
                    }`}
                  />
                  {versionError ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#EF4444]">
                      <AlertCircle className="h-3 w-3" />
                      {versionError}
                    </p>
                  ) : getLatestVersion() && (
                    <p className="mt-1 text-xs text-[#6B7280]">
                      Next {formType.toLowerCase()} after <span className="font-mono text-[#F59E0B]/70">v{getLatestVersion()}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="What's the theme of this release?"
                  className={`w-full rounded-lg border bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 ${
                    formAttempted && !formTitle.trim() ? "border-[#EF4444]" : "border-[#2A2A2A]"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Type</label>
                <div className="flex gap-2">
                  {VERSION_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: formType === t ? `${VERSION_TYPE_COLORS[t]}20` : "#0F0F0F",
                        color: formType === t ? VERSION_TYPE_COLORS[t] : "#9CA3AF",
                        border: `1px solid ${formType === t ? VERSION_TYPE_COLORS[t] + "40" : "#2A2A2A"}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#9CA3AF]">Changes (one per line)</p>
                  <button
                    type="button"
                    onClick={handleAiWriteNotes}
                    disabled={aiWriting}
                    className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiWriting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiWriting ? "Writing..." : "AI Write Notes"}
                  </button>
                </div>
                {CHANGE_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium" style={{ color: CHANGE_CATEGORY_COLORS[cat] }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }} />
                      {cat}
                    </label>
                    <textarea
                      value={formChanges[cat]}
                      onChange={(e) => setFormChanges((prev) => ({ ...prev, [cat]: e.target.value }))}
                      placeholder={`${cat} items...`}
                      rows={2}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleAdd}
                disabled={!formVersion.trim() || !formTitle.trim() || !!versionError}
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40"
              >
                Publish Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Timeline */}
      {filteredEntries.length === 0 && !searchQuery ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#6B7280]">No changelog entries yet</p>
          <button
            onClick={openForm}
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Create your first version
          </button>
        </div>
      ) : filteredEntries.length === 0 && searchQuery ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#6B7280]">No results for &ldquo;{searchQuery}&rdquo;</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {filteredEntries.map((entry, idx) => {
            const isOpen = expanded[entry.id];
            const isLast = idx === filteredEntries.length - 1;
            const nonEmptyCategories = CHANGE_CATEGORIES.filter(
              (cat) => entry.changes[cat] && entry.changes[cat].length > 0
            );
            const changeCount = nonEmptyCategories.reduce(
              (s, cat) => s + entry.changes[cat].length, 0
            );
            const dotColor = DOT_COLORS[entry.type];

            return (
              <div key={entry.id} className="relative pl-12 pb-4">
                {/* Timeline connector line */}
                {!isLast && (
                  <div
                    className="absolute left-[18px] top-[28px] w-0.5"
                    style={{
                      bottom: 0,
                      background: `linear-gradient(to bottom, ${dotColor}60, ${DOT_COLORS[filteredEntries[idx + 1]?.type] ?? "#2A2A2A"}60)`,
                    }}
                  />
                )}

                {/* Timeline dot */}
                <div
                  className="absolute left-[11px] top-[14px] h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: dotColor,
                    boxShadow: `0 0 8px ${dotColor}50`,
                    border: "3px solid #1A1A1A",
                  }}
                />

                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-colors hover:border-[#3A3A3A]">
                  {/* Version Header */}
                  <button
                    onClick={() => toggleExpanded(entry.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#F5F5F5]">
                        v{entry.version}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${VERSION_TYPE_COLORS[entry.type]}15`,
                          color: VERSION_TYPE_COLORS[entry.type],
                        }}
                      >
                        {entry.type}
                      </span>
                      <span className="hidden text-sm text-[#9CA3AF] sm:inline">
                        {entry.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B7280]">{entry.date}</span>
                      <span className="text-xs text-[#6B7280]">{changeCount} changes</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyVersionNotes(entry); }}
                          className="rounded p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F59E0B]"
                          title="Copy version notes as markdown"
                        >
                          {copiedId === entry.id ? (
                            <Check className="h-3.5 w-3.5 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="rounded p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Version Details */}
                  {isOpen && (
                    <div className="border-t border-[#2A2A2A] px-5 py-4">
                      <p className="mb-4 text-sm text-[#9CA3AF] sm:hidden">{entry.title}</p>
                      <div className="space-y-4">
                        {nonEmptyCategories.map((cat) => (
                          <div key={cat}>
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }}
                              />
                              <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: CHANGE_CATEGORY_COLORS[cat] }}
                              >
                                {cat}
                              </span>
                            </div>
                            <ul className="space-y-1.5 pl-4">
                              {entry.changes[cat].map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-[#D1D5DB]"
                                >
                                  <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }}
                                  />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
